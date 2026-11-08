const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { DiagnosticError, getReport, taskIdFromMetadata } = require('./sonar-quality-gate-report');

const metadata = 'projectKey=example\nceTaskId=task-123\n';

function mockFetch(task, gate, calls) {
  return async (url, options) => {
    calls.push({ url, options });
    const body = url.includes('/api/ce/task?') ? task : gate;
    return { ok: true, json: async () => body };
  };
}

test('reports only failed conditions for the specific analysis', async () => {
  const calls = [];
  const report = await getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    scannerOutcome: 'failure',
    fetchImpl: mockFetch(
      { task: { status: 'SUCCESS', analysisId: 'analysis-123' } },
      { projectStatus: { status: 'ERROR', conditions: [
        { status: 'ERROR', metricKey: 'new_coverage', comparator: 'LT', errorThreshold: '80', actualValue: '72.5' },
        { status: 'OK', metricKey: 'new_bugs', comparator: 'GT', errorThreshold: '0', actualValue: '0' },
      ] } },
      calls,
    ),
  });
  assert.match(report, /new_coverage \| LT \| 80 \| 72\.5/);
  assert.doesNotMatch(report, /new_bugs|test-token/);
  assert.equal(calls[0].url, 'https://sonarcloud.io/api/ce/task?id=task-123');
  assert.equal(calls[1].url, 'https://sonarcloud.io/api/qualitygates/project_status?analysisId=analysis-123');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
  assert.equal(calls[0].options.redirect, 'error');
});

test('reports the approved gate and its conditions', async () => {
  const report = await getReport({
    metadata,
    token: 'test-token',
    project: 'frontend',
    scannerOutcome: 'success',
    fetchImpl: mockFetch(
      { task: { status: 'SUCCESS', analysisId: 'a1' } },
      { projectStatus: { status: 'OK', conditions: [
        { status: 'OK', metricKey: 'new_coverage', comparator: 'LT', errorThreshold: '80', actualValue: '95.5' },
      ] } },
      [],
    ),
  });
  assert.match(report, /Quality Gate aprobado/);
  assert.match(report, /new_coverage \| LT \| 80 \| 95\.5/);
});

test('reports when the scanner failed but the gate passed', async () => {
  const report = await getReport({
    metadata,
    token: 'test-token',
    project: 'frontend',
    scannerOutcome: 'failure',
    fetchImpl: mockFetch(
      { task: { status: 'SUCCESS', analysisId: 'a1' } },
      { projectStatus: { status: 'OK', conditions: [] } },
      [],
    ),
  });
  assert.match(report, /Quality Gate aprobado/);
  assert.match(report, /El scanner fallo por otra causa/);
  assert.match(report, /no devolvio condiciones para este analisis/);
});

test('rejects a successful scanner result when the quality gate is not approved', async () => {
  for (const status of ['WARN', 'ERROR', 'NONE']) {
    await assert.rejects(getReport({
      metadata,
      token: 'test-token',
      project: 'backend',
      scannerOutcome: 'success',
      fetchImpl: mockFetch(
        { task: { status: 'SUCCESS', analysisId: 'a1' } },
        { projectStatus: { status, conditions: [] } },
        [],
      ),
    }), /El scanner informo exito, pero el Quality Gate devolvio/);
  }
});

test('rejects an approved gate containing failed conditions', async () => {
  await assert.rejects(getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    scannerOutcome: 'success',
    fetchImpl: mockFetch(
      { task: { status: 'SUCCESS', analysisId: 'a1' } },
      { projectStatus: { status: 'OK', conditions: [
        { status: 'ERROR', metricKey: 'new_coverage', comparator: 'LT', errorThreshold: '80', actualValue: '72' },
      ] } },
      [],
    ),
  }), /Quality Gate aprobado con condiciones fallidas/);
});

test('rejects invalid scanner outcomes', async () => {
  await assert.rejects(getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    scannerOutcome: 'skipped',
  }), /Resultado del scanner invalido/);
});

test('reports when SonarCloud has no quality gate result', async () => {
  const report = await getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    fetchImpl: mockFetch(
      { task: { status: 'SUCCESS', analysisId: 'a1' } },
      { projectStatus: { status: 'NONE', conditions: [], periods: [] } },
      [],
    ),
  });
  assert.match(report, /Estado del analisis: \*\*NONE\*\*/);
  assert.match(report, /no hay un resultado del Quality Gate disponible/);
});

test('makes missing condition values explicit', async () => {
  const report = await getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    fetchImpl: mockFetch(
      { task: { status: 'SUCCESS', analysisId: 'a1' } },
      { projectStatus: { status: 'ERROR', conditions: [
        { status: 'ERROR', metricKey: 'new_coverage', comparator: 'LT', errorThreshold: '80' },
      ] } },
      [],
    ),
  });
  assert.match(report, /new_coverage \| LT \| 80 \| No disponible/);
});

test('rejects missing or ambiguous task metadata', () => {
  assert.throws(() => taskIdFromMetadata(''), DiagnosticError);
  assert.throws(() => taskIdFromMetadata(`${metadata}ceTaskId=other\n`), DiagnosticError);
  assert.throws(() => taskIdFromMetadata('ceTaskId=../wrong\n'), DiagnosticError);
});

test('reports incomplete tasks and does not query a different analysis', async () => {
  const calls = [];
  await assert.rejects(getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    fetchImpl: mockFetch({ task: { status: 'PENDING' } }, {}, calls),
  }), /no termino correctamente: PENDING/);
  assert.equal(calls.length, 1);
});

test('reports API errors without exposing response content or tokens', async () => {
  await assert.rejects(getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    fetchImpl: async () => ({ ok: false, status: 403 }),
  }), (error) => error.message === 'La API de SonarCloud respondio HTTP 403.');

  await assert.rejects(getReport({
    metadata,
    token: 'test-token',
    project: 'backend',
    fetchImpl: async () => { throw new Error('test-token'); },
  }), (error) => !error.message.includes('test-token'));
});

test('rejects invalid gate responses and unsafe condition data', async () => {
  const task = { task: { status: 'SUCCESS', analysisId: 'a1' } };
  for (const gate of [
    { projectStatus: { status: 'ERROR' } },
    { projectStatus: { status: 'ERROR', conditions: [
      { status: 'ERROR', metricKey: 'invalid|metric', comparator: 'GT', errorThreshold: '0', actualValue: '1' },
    ] } },
  ]) {
    await assert.rejects(getReport({ metadata, token: 'test-token', project: 'backend', fetchImpl: mockFetch(task, gate, []) }), DiagnosticError);
  }
});

test('CLI reports missing metadata without exposing the token', () => {
  const result = spawnSync(process.execPath, ['.github/scripts/sonar-quality-gate-report.js', 'backend'], {
    env: { ...process.env, SONAR_TASK_FILE: '', SONAR_TOKEN: 'test-token', GITHUB_STEP_SUMMARY: '' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Diagnostico de SonarCloud no disponible/);
  assert.doesNotMatch(result.stdout + result.stderr, /test-token/);
});
