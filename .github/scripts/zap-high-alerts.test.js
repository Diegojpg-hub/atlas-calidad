const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getHighAlerts } = require('./zap-high-alerts');

test('detects High alerts without blocking lower risks', () => {
  const report = {
    site: [{
      '@name': 'http://localhost:3351',
      alerts: [
        { riskcode: '3', pluginid: '90001', alert: 'High finding' },
        { riskcode: '2', pluginid: '10020', alert: 'Medium finding' },
        { riskcode: '1', pluginid: '10021', alert: 'Low finding' },
        { riskcode: '0', pluginid: '10023', alert: 'Informational finding' },
      ],
    }],
  };

  assert.deepEqual(getHighAlerts(report), [{
    site: 'http://localhost:3351',
    pluginId: '90001',
    name: 'High finding',
  }]);

  report.site[0].alerts.shift();
  assert.deepEqual(getHighAlerts(report), []);
});

test('accepts numeric risk codes and checks every site', () => {
  const alerts = getHighAlerts({
    site: [
      { '@name': 'http://frontend', alerts: [] },
      { '@name': 'http://api', alerts: [{ riskcode: 3, pluginid: '40018', alert: 'SQL injection' }] },
    ],
  });

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].site, 'http://api');
});

test('rejects malformed or incomplete reports', () => {
  for (const report of [
    null,
    {},
    { site: [] },
    { site: [{ alerts: {} }] },
    { site: [{ alerts: [{}] }] },
    { site: [{ alerts: [{ riskcode: 4 }] }] },
  ]) {
    assert.throws(() => getHighAlerts(report), /informe de ZAP/);
  }
});
