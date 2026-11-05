const { test, expect } = require("@playwright/test");
 
// Antes de cada prueba iniciamos sesión (precondición del caso de prueba)
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("input-nombre-usuario").fill("admin");
  await page.getByTestId("input-password").fill("admin");
  await page.getByTestId("button-login").click();
  await expect(page).toHaveURL(/\/home$/);
});
 
test("CP-E2E-04: el listado de clientes muestra los datos de la empresa", async ({ page }) => {
  await page.goto("/clientes");
  await expect(page.getByText("María González")).toBeVisible();
  await expect(page.getByText("Pedro Morales")).toBeVisible();
});
 
test("CP-E2E-05: cerrar sesión vuelve al login", async ({ page }) => {
  const menu = page.getByTestId("button-layout-menu");
  if (await menu.isVisible()) {
    await menu.click();
  }
  await expect(page.getByTestId("button-layout-logout")).toBeVisible();
  await page.getByTestId("button-layout-logout").click();
  await expect(page).toHaveURL(/\/login$/);
});