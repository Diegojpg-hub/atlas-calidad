const { test, expect } = require("@playwright/test");

for (const viewport of [
  { width: 400, height: 896 },
  { width: 896, height: 400 },
]) {
  test(`CP-RESP-01: navegación y desplazamiento a ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await page.getByTestId("input-nombre-usuario").fill("admin");
    await page.getByTestId("input-password").fill("admin");
    await page.getByTestId("button-login").click();
    await expect(page).toHaveURL(/\/home$/);

    await expect(page.getByTestId("button-layout-menu")).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar Empresa", exact: true })).toBeVisible();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1
    )).toBe(true);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, 0));

    for (const [link, route] of [
      ["link-nav-clientes", "/clientes"],
      ["link-nav-contratos", "/contratos"],
      ["link-nav-usuarios", "/usuarios"],
      ["link-nav-auditoría", "/auditoria"],
    ]) {
      await page.getByTestId("button-layout-menu").click();
      await page.getByTestId(link).click();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByTestId("button-layout-logout")).not.toBeVisible();
      expect(await page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1
      )).toBe(true);
      const scroller = page.locator(".MuiTableContainer-root");
      const dimensions = await scroller.evaluate(element => {
        element.scrollLeft = element.scrollWidth;
        return {
          width: element.clientWidth,
          contentWidth: element.scrollWidth,
          left: element.scrollLeft,
        };
      });
      if (dimensions.contentWidth > dimensions.width + 1) {
        expect(dimensions.left).toBeGreaterThan(0);
      }

    }

    await page.getByTestId("button-layout-menu").click();
    await page.getByTestId("button-layout-logout").scrollIntoViewIfNeeded();
    await page.getByTestId("button-layout-logout").click();
    await expect(page).toHaveURL(/\/login$/);
  });
}

test.describe("Ampliación táctil", () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 800, height: 360 },
    { width: 412, height: 924 },
    { width: 924, height: 412 },
  ]) {
    test(`CP-RESP-02: desplazamiento ampliado a ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const session = await page.context().newCDPSession(page);
      const swipe = async (x, y, dx, dy) => {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart", touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 12; step++) {
          await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + dx * step / 12, y: y + dy * step / 12 }],
          });
          await page.waitForTimeout(20);
        }
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd", touchPoints: [],
        });
      };

      await page.goto("/login");
      await page.getByTestId("input-nombre-usuario").fill("admin");
      await page.getByTestId("input-password").fill("admin");
      await page.getByTestId("button-login").click();
      await expect(page).toHaveURL(/\/home$/);

      for (const route of ["/clientes", "/contratos", "/usuarios", "/auditoria", "/login"]) {
        for (const scale of [1.5, 2]) {
          await page.goto(route);
          await expect(route === "/login"
            ? page.getByTestId("button-login")
            : page.locator("main")).toBeVisible();
          await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: scale });
          await swipe(60, 90, -45, 0);
          await expect.poll(() => page.evaluate(() => visualViewport.pageLeft)).toBeGreaterThan(0);
          await swipe(viewport.width / 2 - 20, 150, 0, -100);
          await expect.poll(() => page.evaluate(() => visualViewport.pageTop)).toBeGreaterThan(0);
          await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
        }
      }
      await session.detach();
    });
  }
});
