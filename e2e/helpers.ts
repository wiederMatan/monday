import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Next keeps previously visited routes mounted (hidden) for instant back-navigation,
 * so locators are scoped to what's visible.
 */
export function visible(page: Page, selector: string, hasText?: string | RegExp): Locator {
  return page.locator(`${selector}:visible`, hasText ? { hasText } : undefined);
}

export function row(page: Page, itemName: string): Locator {
  return visible(page, "[data-item-id]", itemName).first();
}

export function group(page: Page, title: string): Locator {
  return page.locator(`section[aria-label="${title}"]:visible`).first();
}

export async function openBoard(page: Page, name: string): Promise<void> {
  await page.goto("/");
  await page.locator("aside a:visible", { hasText: name }).first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

export async function openView(page: Page, name: string): Promise<void> {
  await page.locator("[role=tablist]:visible a", { hasText: name }).first().click();
}

/** Drags with real pointer events, in steps, so dnd-kit's activation distance is met. */
export async function drag(page: Page, from: Locator, to: Locator, offset = { x: 0, y: 0 }): Promise<void> {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error("drag: element not visible");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 4, a.y + a.height / 2 + 12, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2 + offset.x, b.y + b.height / 2 + offset.y, { steps: 20 });
  await page.mouse.up();
}
