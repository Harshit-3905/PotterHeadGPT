import { expect, test } from "@playwright/test";

test("landing page loads with brand and chat CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /potterheadgpt/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /ask the books/i })).toBeVisible();
});

test("login page offers guest and Google paths", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /continue as guest/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});
