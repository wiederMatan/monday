import { expect, test } from "@playwright/test";
import { drag, group, openBoard, openView, row, visible } from "./helpers";

test.describe("main table", () => {
  test("changing a status to Done runs the board automation", async ({ page }) => {
    await openBoard(page, "Product Roadmap");
    await row(page, "Dark mode support").getByRole("button", { name: "Status: Working on it" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Done", exact: true }).click();

    // Automation: "When Status changes to Done, move item to Completed".
    await expect(group(page, "Completed").locator("[data-item-id]", { hasText: "Dark mode support" })).toBeVisible();
    await expect(group(page, "This sprint").locator("[data-item-id]", { hasText: "Dark mode support" })).toHaveCount(0);
  });

  test("adds, renames and deletes an item, with undo", async ({ page }) => {
    await openBoard(page, "Product Roadmap");
    const add = page.getByRole("textbox", { name: "Add task to This sprint" });
    await add.fill("Write release notes");
    await add.press("Enter");
    await expect(row(page, "Write release notes")).toBeVisible();

    await row(page, "Write release notes").getByRole("button", { name: "Write release notes", exact: true }).click();
    const input = page.getByRole("textbox", { name: "task name" });
    await input.fill("Write the release notes");
    await input.press("Enter");
    await expect(row(page, "Write the release notes")).toBeVisible();

    await row(page, "Write the release notes").getByRole("button", { name: "Write the release notes options" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(visible(page, "[data-item-id]", "Write the release notes")).toHaveCount(0);

    await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
    await expect(row(page, "Write the release notes")).toBeVisible();
  });

  test("drags a row into another group", async ({ page }) => {
    await openBoard(page, "Product Roadmap");
    await drag(page, row(page, "Dark mode support").getByRole("button", { name: "Dark mode support", exact: true }), row(page, "Public API v2"));
    await expect(group(page, "Next sprint").locator("[data-item-id]", { hasText: "Dark mode support" })).toBeVisible();
  });

  test("search and quick filters narrow the table", async ({ page }) => {
    await openBoard(page, "Product Roadmap");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("textbox", { name: "Search this board" }).fill("onboarding");
    await expect(visible(page, "[data-item-id]")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear search" }).click();

    await page.getByRole("button", { name: /^Filter/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Stuck/ }).first().click();
    await page.keyboard.press("Escape");
    await expect(visible(page, "[data-item-id]")).toHaveCount(1);
    await expect(row(page, "Two-factor authentication")).toBeVisible();
    await expect(page.getByRole("button", { name: "Filter / 1" })).toBeVisible();
  });

  test("adds a column from the + menu", async ({ page }) => {
    await openBoard(page, "Bug Tracker");
    await page.getByRole("button", { name: "Add column" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: /^Rating/ }).click();
    await expect(visible(page, "[role=columnheader]", "Rating").first()).toBeVisible();
  });

  test("selecting items shows the bulk actions bar", async ({ page }) => {
    await openBoard(page, "Product Roadmap");
    await row(page, "Dark mode support").getByRole("checkbox").click();
    await row(page, "Public API v2").getByRole("checkbox").click();
    const bar = page.getByRole("toolbar", { name: "Bulk actions" });
    await expect(bar).toContainText("Tasks selected");
    await bar.getByRole("button", { name: "Archive" }).click();
    await expect(visible(page, "[data-item-id]", "Public API v2")).toHaveCount(0);
    await expect(bar).toHaveCount(0);
  });
});

test.describe("item card", () => {
  test("posts an update with a mention", async ({ page }) => {
    await openBoard(page, "Product Roadmap");
    await row(page, "Dark mode support").hover();
    await row(page, "Dark mode support").getByRole("button", { name: "Open" }).click();
    const panel = page.getByRole("dialog", { name: "Dark mode support" });
    await expect(panel).toBeVisible();

    await panel.getByRole("button", { name: "Write an update and mention others with @" }).click();
    const box = panel.getByRole("textbox", { name: "Write an update and mention others with @" });
    await box.pressSequentially("Ready for QA @Tam");
    await page.getByRole("option", { name: /Tamar Katz/ }).click();
    await box.pressSequentially("please take a look");
    await panel.getByRole("button", { name: "Update", exact: true }).click();

    await expect(panel.getByText("@Tamar Katz")).toBeVisible();
    await expect(panel.getByRole("tab", { name: "Updates / 1" })).toBeVisible();
    await expect(page).toHaveURL(/\?item=/);
  });
});

test.describe("views", () => {
  test("kanban: dragging a card to another lane changes its status", async ({ page }) => {
    await openBoard(page, "Bug Tracker");
    await openView(page, "Kanban");
    const fixed = page.locator("section[aria-label='Fixed']:visible");
    await drag(page, visible(page, "article", "Typo in billing email").first(), fixed);
    // The board's automation also files Fixed bugs into the Fixed group; the card stays in the Fixed lane.
    await expect(fixed.getByText("Typo in billing email")).toBeVisible();
  });

  test("timeline, calendar and chart views render", async ({ page }) => {
    await openBoard(page, "Product Roadmap");
    await openView(page, "Timeline");
    await expect(page.getByRole("radiogroup", { name: "Zoom" })).toBeVisible();
    await openView(page, "Calendar");
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
    await openView(page, "Chart");
    await expect(page.getByText("Status overview").locator("visible=true")).toBeVisible();
    await page.locator("button:visible", { hasText: "Table" }).first().click();
    await expect(page.locator("th:visible", { hasText: "Share" })).toBeVisible();
  });
});
