const fs = require('node:fs/promises');

const SONAR_URL = 'https://sonarcloud.io';

class DiagnosticError extends Error {}

function safeValue(value) {
  if (value === undefined || value === null || value === '') {
    return 'No disponible';
  }
  const text = String(value);
  if (!/^[\w.+%=-]{1,80}$/.test(text)) {
    throw new DiagnosticError('SonarCloud devolvio un valor de condicion invalido.');
  }
  return text;
}

function taskIdFromMetadata(metadata) {
  const matches = [...metadata.matchAll(/^ceTaskId=([A-Za-z0-9_-]+)\r?$/gm)];
  if (matches.length !== 1) {
    throw new DiagnosticError('No se encontro un identificador de tarea valido.');
  }
  return matches[0][1];
}

async function requestJson(path, token, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(`${SONAR_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new DiagnosticError('No se pudo conectar con la API de SonarCloud.');
  }
  if (!response.ok) {
    throw new DiagnosticError(`La API de SonarCloud respondio HTTP ${response.status}.`);
  }
  try {
    return await response.json();
  } catch {
    throw new DiagnosticError('La API de SonarCloud devolvio una respuesta invalida.');
  }
}

async function getReport({ metadata, token, project, scannerOutcome, fetchImpl = fetch }) {
  if (!token) {
    throw new DiagnosticError('No hay un token disponible para consultar SonarCloud.');
  }
  if (!['backend', 'frontend'].includes(project)) {
    throw new DiagnosticError('Proyecto de diagnostico invalido.');
  }
  if (scannerOutcome !== undefined && !['success', 'failure'].includes(scannerOutcome)) {
    throw new DiagnosticError('Resultado del scanner invalido.');
  }

  const taskId = taskIdFromMetadata(metadata);
  const taskResult = await requestJson(`/api/ce/task?id=${taskId}`, token, fetchImpl);
  if (taskResult.task?.status !== 'SUCCESS') {
    const status = safeValue(taskResult.task?.status ?? 'desconocido');
    throw new DiagnosticError(`La tarea de SonarCloud no termino correctamente: ${status}.`);
  }
  const analysisId = taskResult.task.analysisId;
  if (typeof analysisId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(analysisId)) {
    throw new DiagnosticError('La tarea no tiene un identificador de analisis valido.');
  }

  const result = await requestJson(
    `/api/qualitygates/project_status?analysisId=${analysisId}`,
    token,
    fetchImpl,
  );
  const gate = result.projectStatus;
  if (!gate || !['OK', 'WARN', 'ERROR', 'NONE'].includes(gate.status) || !Array.isArray(gate.conditions)) {
    throw new DiagnosticError('SonarCloud no devolvio las condiciones del Quality Gate.');
  }
  if (scannerOutcome === 'success' && gate.status !== 'OK') {
    throw new DiagnosticError(`El scanner informo exito, pero el Quality Gate devolvio ${gate.status}.`);
  }

  const failed = gate.conditions.filter((condition) => condition.status === 'ERROR');
  if (gate.status === 'OK' && failed.length > 0) {
    throw new DiagnosticError('SonarCloud devolvio un Quality Gate aprobado con condiciones fallidas.');
  }
  let conditions = [];
  const lines = [
    `## Quality Gate - ${project}`,
    '',
    `Estado del analisis: **${gate.status}**.`,
    '',
  ];

  if (gate.status === 'OK') {
    lines.push('Quality Gate aprobado para este analisis.');
    if (scannerOutcome === 'failure') {
      lines.push('El scanner fallo por otra causa; revisa su registro.');
    }
    conditions = gate.conditions;
    if (conditions.length === 0) {
      lines.push('SonarCloud no devolvio condiciones para este analisis.');
    }
  } else if (gate.status === 'NONE') {
    lines.push('SonarCloud devolvio NONE: no hay un resultado del Quality Gate disponible para este analisis.');
  } else if (failed.length === 0) {
    lines.push('SonarCloud no devolvio condiciones fallidas para este analisis. Revisa el registro del scanner.');
  } else {
    conditions = failed;
  }
  if (conditions.length > 0) {
    lines.push('| Metrica | Comparador | Umbral | Valor |', '|---|---|---|---|');
    for (const condition of conditions) {
      lines.push(`| ${safeValue(condition.metricKey)} | ${safeValue(condition.comparator)} | ${safeValue(condition.errorThreshold)} | ${safeValue(condition.actualValue)} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  let summary;
  let failed = false;
  try {
    if (!process.env.SONAR_TASK_FILE) {
      throw new DiagnosticError('No se indico el archivo de la tarea de SonarCloud.');
    }
    let metadata;
    try {
      metadata = await fs.readFile(process.env.SONAR_TASK_FILE, 'utf8');
    } catch {
      throw new DiagnosticError('El scanner no genero el archivo de la tarea de SonarCloud.');
    }
    summary = await getReport({
      metadata,
      token: process.env.SONAR_TOKEN,
      project: process.argv[2],
      scannerOutcome: process.env.SONAR_SCAN_OUTCOME,
    });
  } catch (error) {
    failed = true;
    const message = error instanceof DiagnosticError ? error.message : 'Error inesperado al obtener el diagnostico.';
    summary = `## Diagnostico de SonarCloud no disponible\n\n${message}\n`;
  }

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  if (failed) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch(() => {
    console.error('No se pudo escribir el diagnostico de SonarCloud.');
    process.exitCode = 1;
  });
}

module.exports = { DiagnosticError, getReport, taskIdFromMetadata };
