const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("Reto 2: accesibilidad de clientes con sesión iniciada", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.getByTestId("input-nombre-usuario").fill("admin");
  await page.getByTestId("input-password").fill("admin");
  await page.getByTestId("button-login").click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto("/clientes");
  const tabla = page.getByRole("table");
  await expect(tabla).toBeVisible();
  await expect(
    tabla.getByText("María González", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Cargando clientes...", { exact: true })
  ).toBeHidden();

  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  await testInfo.attach("resultado-axe-clientes", {
    body: JSON.stringify(resultado, null, 2),
    contentType: "application/json",
  });

  console.log(`Proyecto: ${testInfo.project.name}`);
  for (const problema of resultado.violations) {
    console.log(
      `[${problema.impact}] ${problema.id}: ${problema.help} (${problema.nodes.length} elementos)`
    );
  }

  const graves = resultado.violations.filter(
    (problema) =>
      problema.impact === "critical" || problema.impact === "serious"
  );

  console.log(`Reglas con infracciones críticas o serias: ${graves.length}`);
  expect(graves.length, "Infracciones críticas o serias en clientes").toBe(0);
});
