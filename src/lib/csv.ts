import { cellText, type UserIndex } from "./columns";
import type { Board, ID, Item } from "./types";

function escapeField(field: string): string {
  return /[",\n\r]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

export function toCSV(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\r\n");
}

/**
 * Board → CSV in board order. Prefixed with a UTF-8 BOM so Excel opens non-Latin
 * text (e.g. Hebrew) correctly.
 */
export function boardToCSV(
  board: Board,
  items: Record<ID, Item>,
  users: UserIndex,
  options: { itemIds?: ID[]; groupId?: ID } = {},
): string {
  const only = options.itemIds ? new Set(options.itemIds) : null;
  const header = ["Name", "Group", ...board.columns.map((c) => c.title)];
  const rows: string[][] = [header];
  for (const group of board.groups) {
    if (options.groupId && group.id !== options.groupId) continue;
    for (const id of group.itemIds) {
      const item = items[id];
      if (!item || item.archivedAt || (only && !only.has(id))) continue;
      rows.push([
        item.name,
        group.title,
        ...board.columns.map((column) => cellText(column, item.values[column.id], { users, item, mode: "export" })),
      ]);
    }
  }
  return "﻿" + toCSV(rows);
}
