import { expect, test } from "@playwright/test";
import { openBoard, row } from "./helpers";

test("home greets the user and lists recent boards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Matan!");
  await expect(page.getByText("Recently visited")).toBeVisible();
  await page.getByRole("link", { name: /Bug Tracker/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Bug Tracker" })).toBeVisible();
});

test("creates a board from a template", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add new" }).click();
  await page.getByRole("menuitem", { name: "Board" }).click();
  const dialog = page.getByRole("dialog", { name: "Create board" });
  await dialog.getByRole("textbox").first().fill("Launch plan");
  await dialog.getByRole("radio", { name: /Project management/ }).click();
  await dialog.getByRole("button", { name: "Create board" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Launch plan" })).toBeVisible();
  await expect(row(page, "Define project scope")).toBeVisible();
  await expect(page.locator("aside a:visible", { hasText: "Launch plan" })).toBeVisible();
});

test("changes survive a reload", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  const add = page.getByRole("textbox", { name: "Add task to Next sprint" });
  await add.fill("Persisted task");
  await add.press("Enter");
  await expect(row(page, "Persisted task")).toBeVisible();
  // Writes are batched; give them a moment before reloading.
  await page.waitForTimeout(500);
  await page.reload();
  await expect(row(page, "Persisted task")).toBeVisible();
});

test("command palette finds and opens an item", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Search everything/ }).click();
  await page.getByRole("combobox", { name: "Search" }).fill("acme");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Acme Corp — Enterprise plan" })).toBeVisible();
});

test("switches to the dark theme and remembers it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("my work lists the current user's items", async ({ page }) => {
  await page.goto("/my-work");
  await expect(page.getByRole("heading", { level: 1, name: "My work" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Redesign onboarding flow" })).toBeVisible();
});
