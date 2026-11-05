const { test, expect } = require("@playwright/test");

for (const viewport of [
  { width: 360, height: 800 },
  { width: 800, height: 360 },
  { width: 1280, height: 720 },
]) {
  test(`CP-ACC-02: botones de inicio y menú de al menos 44x44 a ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await page.getByTestId("input-nombre-usuario").fill("admin");
    await page.getByTestId("input-password").fill("admin");
    await page.getByTestId("button-login").click();
    await expect(page).toHaveURL(/\/home$/);

    const checkSize = async (button) => {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      console.log(`${await button.getAttribute("aria-label") || await button.innerText()}: ${box.width} x ${box.height} px`);
    };

    await checkSize(page.getByRole("button", { name: "Editar Empresa", exact: true }));
    await checkSize(page.getByRole("button", { name: "Editar Usuario", exact: true }));
    const menu = page.getByTestId("button-layout-menu");
    if (await menu.isVisible()) {
      await checkSize(menu);
      await menu.click();
      await checkSize(page.getByRole("button", { name: "Cerrar menú", exact: true }));
    }
    await checkSize(page.getByTestId("button-layout-editar-cuenta"));
    await checkSize(page.getByTestId("button-layout-logout"));
    await page.getByTestId("button-layout-logout").click();
    await expect(page).toHaveURL(/\/login$/);
  });
}
