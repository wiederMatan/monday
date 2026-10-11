import { expect, test } from "@playwright/test";
import { drag, group, openBoard, openView, row, visible } from "./helpers";

test("Cmd/Ctrl+Z undoes the last change", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  await row(page, "Dark mode support").getByRole("button", { name: "Priority: Medium" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Low", exact: true }).click();
  await expect(row(page, "Dark mode support").getByRole("button", { name: "Priority: Low" })).toBeVisible();
  await page.locator("body").click({ position: { x: 5, y: 600 } });
  await page.keyboard.press("ControlOrMeta+z");
  await expect(row(page, "Dark mode support").getByRole("button", { name: "Priority: Medium" })).toBeVisible();
});

test("resizes and reorders columns", async ({ page }) => {
  await openBoard(page, "Bug Tracker");
  const header = (name: string) => visible(page, "[role=columnheader]", name).first();
  const before = (await header("Severity").boundingBox())!.width;
  const handle = page.getByRole("separator", { name: "Resize Severity" }).first();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await header("Severity").boundingBox())!.width).toBeGreaterThan(before + 60);

  // Drag "Developer" onto "Status": it becomes the first column.
  await drag(page, header("Developer"), header("Status"), { x: -20, y: 0 });
  await expect
    .poll(async () => {
      const titles = await visible(page, "section[aria-label='Open bugs'] [role=columnheader]").allInnerTexts();
      return titles.indexOf("Developer") < titles.indexOf("Status");
    })
    .toBe(true);
});

test("collapses and renames a group", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  await page.getByRole("button", { name: "Collapse This sprint" }).click();
  await expect(visible(page, "[data-item-id]", "Dark mode support")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Expand This sprint" })).toBeVisible();
  await page.getByRole("button", { name: "Expand This sprint" }).click();
  await expect(row(page, "Dark mode support")).toBeVisible();

  await group(page, "Backlog").hover();
  await page.getByRole("button", { name: "Backlog group options" }).click({ force: true });
  await page.getByRole("menuitem", { name: "Rename group" }).click();
  const input = page.getByRole("textbox", { name: "Group name" });
  await input.fill("Icebox");
  await input.press("Enter");
  await expect(group(page, "Icebox")).toBeVisible();
});

test("edits numbers, tags and links", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  const r = row(page, "Dark mode support");
  await r.getByRole("button", { name: "Effort: 5" }).click();
  await page.getByRole("textbox", { name: "Effort" }).fill("12");
  await page.keyboard.press("Enter");
  await expect(r.getByRole("button", { name: "Effort: 12" })).toBeVisible();
  // This sprint total: 8 + 13 + 12 + 8 + 3
  await expect(group(page, "This sprint").getByText("44 pts")).toBeVisible();

  await r.getByRole("button", { name: /^Area:/ }).click();
  const tagInput = page.getByRole("textbox", { name: "Search or create a tag" });
  await tagInput.fill("Accessibility");
  await tagInput.press("Enter");
  await page.keyboard.press("Escape");
  await expect(r.getByRole("button", { name: /^Area:.*Accessibility/ })).toBeVisible();

  await openBoard(page, "Marketing Campaigns");
  const campaign = row(page, "Customer webinar: automations");
  await campaign.getByRole("button", { name: /^Brief:/ }).click();
  await page.getByRole("textbox", { name: "Web address" }).fill("example.com/webinar");
  await page.getByRole("textbox", { name: "Text to display" }).fill("Webinar page");
  await page.getByRole("button", { name: "Save" }).click();
  const link = campaign.getByRole("link", { name: "Webinar page" });
  await expect(link).toHaveAttribute("href", "https://example.com/webinar");
});

test("people filter shows one person's items", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  await page.getByRole("button", { name: "Person" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tamar Katz", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(visible(page, "[data-item-id]")).toHaveCount(2);
  await expect(row(page, "Fix flaky checkout tests")).toBeVisible();
});

test("archives an item and restores it from the archive", async ({ page }) => {
  await openBoard(page, "Bug Tracker");
  await row(page, "Typo in billing email").hover();
  await row(page, "Typo in billing email").getByRole("button", { name: "Typo in billing email options" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(visible(page, "[data-item-id]", "Typo in billing email")).toHaveCount(0);

  await page.getByRole("button", { name: "Board options" }).click();
  await page.getByRole("menuitem", { name: "Archived items" }).click();
  const dialog = page.getByRole("dialog", { name: "Archived items" });
  await dialog.getByRole("button", { name: "Restore" }).click();
  await page.keyboard.press("Escape");
  await expect(row(page, "Typo in billing email")).toBeVisible();
});

test("a custom automation assigns new items", async ({ page }) => {
  await openBoard(page, "Bug Tracker");
  await page.getByRole("button", { name: /^Automate/ }).click();
  const dialog = page.getByRole("dialog", { name: /Automations/ });
  await dialog.getByRole("combobox", { name: "Trigger" }).selectOption("item_created");
  await dialog.getByRole("combobox", { name: "Action" }).selectOption("assign_person");
  await dialog.getByRole("combobox", { name: "Person" }).selectOption({ label: "Omer Shapira" });
  await dialog.getByRole("button", { name: "Create automation" }).click();
  await expect(dialog.getByText("When an item is created, assign Omer Shapira in Developer")).toBeVisible();
  await page.keyboard.press("Escape");

  const add = page.getByRole("textbox", { name: "Add bug to Open bugs" });
  await add.fill("Checkout button misaligned");
  await add.press("Enter");
  const created = row(page, "Checkout button misaligned");
  await expect(created.getByRole("button", { name: "Developer: Omer Shapira" })).toBeVisible();
  // The board's own automation still sets the status of new bugs.
  await expect(created.getByRole("button", { name: "Status: New" })).toBeVisible();
});

test("timeline: dragging a bar reschedules the item", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  const timelineBefore = await row(page, "Public API v2").getByRole("button", { name: /^Timeline:/ }).getAttribute("aria-label");
  await openView(page, "Timeline");
  await page.getByRole("radio", { name: "Days" }).click();
  const bar = visible(page, "[role=button]", "Public API v2").filter({ hasNot: page.locator("button") }).last();
  const box = (await bar.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 34 * 3, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await openView(page, "Main table");
  await expect(row(page, "Public API v2").getByRole("button", { name: /^Timeline:/ })).not.toHaveAttribute("aria-label", timelineBefore!);
});

test("calendar: dragging a chip changes the date", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  await openView(page, "Calendar");
  const chip = visible(page, "button[title='Dark mode support']").first();
  const before = await chip.evaluate((el) => el.closest("[class*='group/day']")?.textContent?.match(/^\d+/)?.[0]);
  const cells = visible(page, "[class*='group/day']");
  const target = cells.nth(0);
  await drag(page, chip, target);
  const after = await visible(page, "button[title='Dark mode support']")
    .first()
    .evaluate((el) => el.closest("[class*='group/day']")?.textContent?.match(/^\d+/)?.[0]);
  expect(after).not.toBe(before);
});

test("duplicates and deletes a board, with undo", async ({ page }) => {
  await openBoard(page, "Bug Tracker");
  await page.getByRole("button", { name: "Board options" }).click();
  await page.getByRole("menuitem", { name: "Duplicate board" }).hover();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitem", { name: "Structure and items" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Duplicate of Bug Tracker" })).toBeVisible();
  await expect(row(page, "Typo in billing email")).toBeVisible();

  await page.getByRole("button", { name: "Board options" }).click();
  await page.getByRole("menuitem", { name: "Delete board" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete board" }).click();
  await expect(page.getByText("Recently visited")).toBeVisible();
  await expect(page.locator("aside a:visible", { hasText: "Duplicate of Bug Tracker" })).toHaveCount(0);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("aside a:visible", { hasText: "Duplicate of Bug Tracker" })).toBeVisible();
});

test("exports a backup and imports it after a reset", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  const add = page.getByRole("textbox", { name: "Add task to Backlog" });
  await add.fill("Item from the backup");
  await add.press("Enter");

  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: "Backup & restore" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export backup" }).click()]);
  const file = await download.path();

  await page.getByRole("button", { name: "Reset workspace" }).click();
  await page.getByRole("dialog", { name: "Reset all data?" }).getByRole("button", { name: "Reset" }).click();
  await openBoard(page, "Product Roadmap");
  await expect(visible(page, "[data-item-id]", "Item from the backup")).toHaveCount(0);

  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: "Backup & restore" }).click();
  await page.locator("input[type=file]").setInputFiles(file);
  await expect(page.getByRole("status").filter({ hasText: "Backup restored" })).toBeVisible();
  await expect(row(page, "Item from the backup")).toBeVisible();
});

test("adds subitems under an item and edits them", async ({ page }) => {
  await openBoard(page, "Product Roadmap");
  await page.getByRole("button", { name: "Show subitems of Redesign onboarding flow" }).click();
  const block = page.getByRole("rowgroup", { name: "Subitems of Redesign onboarding flow" });
  await expect(block.getByText("Welcome screen")).toBeVisible();

  const add = page.getByRole("textbox", { name: "Add subitem to Redesign onboarding flow" });
  await add.fill("Usability test");
  await add.press("Enter");
  const sub = block.locator("[data-subitem-id]", { hasText: "Usability test" });
  await expect(sub).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide subitems of Redesign onboarding flow" })).toContainText("4");

  await sub.getByRole("button", { name: "Status: empty" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Working on it", exact: true }).click();
  await expect(sub.getByRole("button", { name: "Status: Working on it" })).toBeVisible();

  // Subitems open in the item card, with a breadcrumb back to the parent.
  await sub.hover();
  await sub.getByRole("button", { name: "Open" }).click();
  const card = page.getByRole("dialog", { name: "Usability test" });
  await expect(card.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Redesign onboarding flow");
});
