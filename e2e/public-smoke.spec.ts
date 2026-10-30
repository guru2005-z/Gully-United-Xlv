import { expect, test } from "@playwright/test";

test.describe("public smoke journeys", () => {
  test("health endpoint responds successfully", async ({ request }) => {
    const response = await request.get("/api/public/health");
    expect(response.ok()).toBeTruthy();
  });

  test("visitor can open the landing and booking pages", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Gully United/i);

    await page.goto("/book");
    await expect(page).toHaveURL(/\/book$/);
    await expect(page.locator("body")).toContainText(/book|slot|turf/i);
  });

  test("public pages render without horizontal overflow on mobile", async ({ page }) => {
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  });
});
