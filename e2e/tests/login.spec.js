const { test, expect } = require("@playwright/test");
 
test.describe("Inicio de sesión", () => {
  test("CP-E2E-01: login exitoso redirige al inicio", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("input-nombre-usuario").fill("admin");
    await page.getByTestId("input-password").fill("admin");
    await page.getByTestId("button-login").click();
 
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText("Sesión iniciada")).toBeVisible();
  });
 
  test("CP-E2E-02: login con contraseña incorrecta muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("input-nombre-usuario").fill("admin");
    await page.getByTestId("input-password").fill("clave-equivocada");
    await page.getByTestId("button-login").click();
 
    await expect(page.getByText("Credenciales inválidas").first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
 
  test("CP-E2E-03: una ruta privada sin sesión redirige al login", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/login$/);
  });
});