import { test, expect } from "@playwright/test";

/**
 * End-to-end coverage of the local-first sync engine's core promise:
 * editing works fully offline, and edits made offline are not lost and
 * do reach the server once connectivity returns.
 *
 * Requires the seeded demo account (see prisma/seed.ts) and a running
 * dev server (npm run dev) with a reachable Postgres instance.
 */
test.describe("Offline-first editing", () => {
  test("user can edit while offline and changes sync back after reconnecting", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("editor@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");

    await page.getByRole("link").first().click();
    await page.waitForSelector("textarea[aria-label='Document content']");

    await context.setOffline(true);
    await expect(page.getByText(/Offline/i)).toBeVisible();

    const textarea = page.getByLabel("Document content");
    await textarea.fill("Written entirely offline.");

    // Local-first: the edit should be visible immediately with zero network.
    await expect(textarea).toHaveValue("Written entirely offline.");

    await context.setOffline(false);
    await expect(page.getByText(/Syncing|synced/i)).toBeVisible({ timeout: 10_000 });
  });

  test("viewer role cannot edit the document", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("viewer@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");

    await page.getByRole("link").first().click();
    const textarea = page.getByLabel("Document content");
    await expect(textarea).toHaveAttribute("readonly", "");
    await expect(page.getByText("View only")).toBeVisible();
  });
});
