import { expect, test, type Page } from "@playwright/test";

const FIXTURE_QUESTION = "Where is the moonstone key kept?";
const FIXTURE_ANSWER = /eastern observatory/i;
const FIXTURE_EXCERPT = /moonstone key beneath the eastern observatory/i;

async function signInAsGuest(page: Page): Promise<void> {
  await page.goto("/login");
  await Promise.all([
    page.waitForURL(/\/chat(?:\/|$)/, { timeout: 30_000 }),
    page.getByRole("button", { name: /continue as guest/i }).click(),
  ]);
}

async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await Promise.all([
    page.waitForURL(/\/chat(?:\/|$)/, { timeout: 30_000 }),
    page.getByRole("button", { name: /continue as e2e admin/i }).click(),
  ]);
}

async function askBooks(page: Page, question: string): Promise<void> {
  const composer = page.getByLabel("Ask the books");
  const askButton = page.getByRole("button", { name: /^ask$/i });

  await expect(composer).toBeEnabled({ timeout: 15_000 });
  await composer.fill(question);
  await askButton.click();

  await expect(page.getByText("Searching the stacks")).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(
    page.getByRole("listitem").filter({ hasText: FIXTURE_ANSWER }).last(),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("guest cited chat flow", () => {
  test("streams a cited answer, opens the passage, persists history, and caps quota", async ({
    page,
  }) => {
    await signInAsGuest(page);
    await expect(page.getByText(/guest session/i)).toBeVisible();

    await askBooks(page, FIXTURE_QUESTION);
    await expect(page.getByRole("button", { name: "Citation 1" })).toBeVisible();

    await page.getByRole("button", { name: "Citation 1" }).click();
    await expect(page.getByRole("region", { name: "The Lantern Academy" })).toBeVisible();
    await expect(page.getByText(FIXTURE_EXCERPT)).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("listitem").filter({ hasText: FIXTURE_ANSWER }).last(),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: FIXTURE_QUESTION }).first(),
    ).toBeVisible();

    for (let index = 1; index < 5; index += 1) {
      await askBooks(page, `Follow-up question ${index}?`);
    }

    await expect(page.getByRole("status")).toContainText(/daily limit reached/i, {
      timeout: 15_000,
    });
    await expect(page.getByLabel("Ask the books")).toBeDisabled();
  });
});

test.describe("admin quota bypass", () => {
  test("allows a sixth message for an admin session", async ({ page }) => {
    await signInAsAdmin(page);
    await expect(page.getByText(/admin — unlimited/i)).toBeVisible();
    await expect(page.getByText(/books not ingested yet/i)).not.toBeVisible();

    for (let index = 0; index < 6; index += 1) {
      await askBooks(page, `Admin question ${index + 1}?`);
    }

    await expect(page.getByLabel("Ask the books")).toBeEnabled();
    await expect(page.getByText(/daily limit reached/i)).not.toBeVisible();
  });
});
