const fs = require('node:fs');

function getHighAlerts(report) {
  if (!report || !Array.isArray(report.site) || report.site.length === 0) {
    throw new Error('El informe de ZAP no contiene una lista de sitios valida.');
  }

  const highAlerts = [];
  for (const site of report.site) {
    if (!site || !Array.isArray(site.alerts)) {
      throw new Error('El informe de ZAP contiene un sitio sin una lista de alertas valida.');
    }

    for (const alert of site.alerts) {
      if (!alert || !['0', '1', '2', '3', 0, 1, 2, 3].includes(alert.riskcode)) {
        throw new Error('El informe de ZAP contiene una alerta sin un riskcode valido.');
      }

      if (String(alert.riskcode) === '3') {
        highAlerts.push({
          site: site['@name'] || 'sitio desconocido',
          pluginId: alert.pluginid || 'ID desconocido',
          name: alert.alert || 'alerta sin nombre',
        });
      }
    }
  }

  return highAlerts;
}

function main() {
  const reportPath = process.argv[2];
  if (!reportPath) {
    throw new Error('Indica la ruta del informe JSON de ZAP.');
  }

  const highAlerts = getHighAlerts(JSON.parse(fs.readFileSync(reportPath, 'utf8')));
  if (highAlerts.length > 0) {
    console.error(`ZAP encontro ${highAlerts.length} alerta(s) High:`);
    for (const alert of highAlerts) {
      console.error(`- ${alert.site}: ${alert.name} [${alert.pluginId}]`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('ZAP no encontro alertas High.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`No se pudo evaluar el informe de ZAP: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { getHighAlerts };
