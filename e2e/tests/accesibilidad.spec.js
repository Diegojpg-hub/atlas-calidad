const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
 
test("CP-ACC-01: la página de login no tiene problemas graves de accesibilidad", async ({ page }) => {
  await page.goto("/login");
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
 
  // Mostramos en consola cada problema encontrado, para documentarlo
  for (const v of resultado.violations) {
    console.log(`[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} elementos)`);
  }
 
  const graves = resultado.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(graves, "Problemas de accesibilidad críticos o serios").toEqual([]);
});