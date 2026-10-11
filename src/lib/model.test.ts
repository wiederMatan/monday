import { produce } from "immer";
import { describe, expect, it } from "vitest";
import { columnsFor, getLabel, indexUsers } from "./columns";
import { boardToCSV, toCSV } from "./csv";
import { dateBucket, formatTimeline, fromISODate } from "./dates";
import { visibleGroups } from "./filters";
import * as model from "./model";
import { createSeedState, ME } from "./seed";
import type { Board, DataState } from "./types";

const NOW = new Date(2026, 9, 9, 12, 0).getTime(); // Fri Oct 9 2026, noon
const TODAY = new Date(2026, 9, 9);

function seed(): DataState {
  return createSeedState(NOW, TODAY);
}

function context(): model.MutationContext {
  let n = 0;
  return { now: NOW, userId: ME, id: (prefix) => `${prefix}_t${++n}`, today: TODAY };
}

function apply<T>(state: DataState, fn: (s: DataState, ctx: model.MutationContext) => T): [DataState, T] {
  let result!: T;
  const next = produce(state, (draft) => {
    result = fn(draft, context());
  });
  return [next, result];
}

function boardNamed(state: DataState, name: string): Board {
  const board = Object.values(state.boards).find((b) => b.name === name);
  if (!board) throw new Error(`No board ${name}`);
  return board;
}

function column(board: Board, title: string) {
  const col = board.columns.find((c) => c.title === title);
  if (!col) throw new Error(`No column ${title}`);
  return col;
}

function label(board: Board, columnTitle: string, name: string): string {
  const id = column(board, columnTitle).settings.labels?.find((l) => l.name === name)?.id;
  if (!id) throw new Error(`No label ${name}`);
  return id;
}

function itemNamed(state: DataState, name: string) {
  const item = Object.values(state.items).find((i) => i.name === name);
  if (!item) throw new Error(`No item ${name}`);
  return item;
}

describe("seed", () => {
  it("is internally consistent", () => {
    const s = seed();
    expect(s.boardOrder).toHaveLength(4);
    for (const board of Object.values(s.boards)) {
      for (const group of board.groups) {
        for (const id of group.itemIds) {
          expect(s.items[id]?.boardId).toBe(board.id);
          expect(s.items[id]?.groupId).toBe(group.id);
        }
      }
      expect(board.views[0].type).toBe("table");
    }
    for (const update of Object.values(s.updates)) expect(s.items[update.itemId]).toBeDefined();
  });

  it("produces stable ids so seeded URLs survive a reload", () => {
    expect(seed().boardOrder).toEqual(seed().boardOrder);
  });
});

describe("items", () => {
  it("adds an item to the bottom of a group and logs it", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const group = board.groups[0];
    const [next, id] = apply(s, (d, ctx) => model.addItem(d, ctx, board.id, group.id, { name: "  Ship it  " }));
    expect(id).toBeTruthy();
    const g = next.boards[board.id].groups[0];
    expect(g.itemIds.at(-1)).toBe(id);
    expect(next.items[id!].name).toBe("Ship it");
    expect(next.activity[0]).toMatchObject({ kind: "item_created", itemId: id });
  });

  it("moves items between groups relative to another item", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const [first, second] = board.groups;
    const moving = first.itemIds[0];
    const anchor = second.itemIds[1];
    const [next] = apply(s, (d, ctx) => model.moveItem(d, ctx, moving, second.id, { before: anchor }));
    const target = next.boards[board.id].groups[1];
    expect(target.itemIds.indexOf(moving)).toBe(target.itemIds.indexOf(anchor) - 1);
    expect(next.boards[board.id].groups[0].itemIds).not.toContain(moving);
    expect(next.items[moving].groupId).toBe(second.id);
    expect(next.activity[0]).toMatchObject({ kind: "item_moved", to: second.title });
  });

  it("duplicates an item right after the original with a copy of its values", () => {
    const s = seed();
    const original = itemNamed(s, "Dark mode support");
    const [next, copyId] = apply(s, (d, ctx) => model.duplicateItem(d, ctx, original.id));
    const group = next.boards[original.boardId].groups.find((g) => g.id === original.groupId)!;
    expect(group.itemIds.indexOf(copyId!)).toBe(group.itemIds.indexOf(original.id) + 1);
    expect(next.items[copyId!].values).toEqual(original.values);
    expect(next.items[copyId!].values).not.toBe(original.values);
  });

  it("archives and restores an item", () => {
    const s = seed();
    const item = itemNamed(s, "Dark mode support");
    const [archived] = apply(s, (d, ctx) => model.archiveItems(d, ctx, [item.id]));
    expect(archived.items[item.id].archivedAt).toBe(NOW);
    expect(archived.boards[item.boardId].groups.flatMap((g) => g.itemIds)).not.toContain(item.id);
    const [restored] = apply(archived, (d, ctx) => model.restoreItem(d, ctx, item.id));
    expect(restored.items[item.id].archivedAt).toBeNull();
    expect(restored.boards[item.boardId].groups.find((g) => g.id === item.groupId)!.itemIds).toContain(item.id);
  });

  it("deletes items together with their updates", () => {
    const s = seed();
    const item = itemNamed(s, "Redesign onboarding flow");
    expect(Object.values(s.updates).some((u) => u.itemId === item.id)).toBe(true);
    const [next] = apply(s, (d, ctx) => model.deleteItems(d, ctx, [item.id]));
    expect(next.items[item.id]).toBeUndefined();
    expect(Object.values(next.updates).some((u) => u.itemId === item.id)).toBe(false);
    expect(next.notifications.some((n) => n.itemId === item.id)).toBe(false);
  });

  it("records readable before/after values for cell changes", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const item = itemNamed(s, "Dark mode support");
    const priority = column(board, "Priority");
    const [next] = apply(s, (d, ctx) => model.setCellValue(d, ctx, item.id, priority.id, label(board, "Priority", "High")));
    expect(next.activity[0]).toMatchObject({ kind: "value_changed", from: "Medium", to: "High", columnTitle: "Priority" });
  });
});

describe("automations", () => {
  it("moves an item when its status changes to Done", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const item = itemNamed(s, "Dark mode support");
    const status = column(board, "Status");
    const [next] = apply(s, (d, ctx) => model.setCellValue(d, ctx, item.id, status.id, label(board, "Status", "Done")));
    const completed = next.boards[board.id].groups.find((g) => g.title === "Completed")!;
    expect(completed.itemIds[0]).toBe(item.id);
    expect(next.items[item.id].groupId).toBe(completed.id);
    const automation = next.boards[board.id].automations.find((a) => a.action.type === "move_to_group")!;
    expect(automation.runs).toBe(1);
    expect(next.activity.map((a) => a.kind)).toEqual(expect.arrayContaining(["automation_ran", "item_moved", "value_changed"]));
  });

  it("notifies the current user when a status becomes Stuck", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const item = itemNamed(s, "Dark mode support");
    const [next] = apply(s, (d, ctx) => model.setCellValue(d, ctx, item.id, column(board, "Status").id, label(board, "Status", "Stuck")));
    expect(next.notifications[0]).toMatchObject({ kind: "automation", itemId: item.id, read: false });
  });

  it("sets a default status on new items", () => {
    const s = seed();
    const board = boardNamed(s, "Bug Tracker");
    const [next, id] = apply(s, (d, ctx) => model.addItem(d, ctx, board.id, board.groups[0].id, { name: "New bug" }));
    expect(next.items[id!].values[column(board, "Status").id]).toBe(label(board, "Status", "New"));
  });

  it("stops automations that trigger each other forever", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const status = column(board, "Status").id;
    const working = label(board, "Status", "Working on it");
    const review = label(board, "Status", "In review");
    const item = itemNamed(s, "Dark mode support");
    const [withLoop] = apply(s, (d, ctx) => {
      model.addAutomation(d, ctx, board.id, { type: "status_changes", columnId: status, labelId: review }, { type: "set_status", columnId: status, labelId: working });
      model.addAutomation(d, ctx, board.id, { type: "status_changes", columnId: status, labelId: working }, { type: "set_status", columnId: status, labelId: review });
    });
    const [next] = apply(withLoop, (d, ctx) => model.setCellValue(d, ctx, item.id, status, review));
    expect(next.items[item.id].values[status]).toBeDefined();
    const runs = next.boards[board.id].automations.reduce((sum, a) => sum + a.runs, 0);
    expect(runs).toBeLessThanOrEqual(3);
  });

  it("drops automations that point at a deleted column", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const status = column(board, "Status");
    const [next] = apply(s, (d, ctx) => model.deleteColumn(d, ctx, board.id, status.id));
    expect(next.boards[board.id].automations).toHaveLength(0);
    expect(Object.values(next.items).some((i) => status.id in i.values)).toBe(false);
    expect(next.boards[board.id].views.every((v) => v.settings.statusColumnId !== status.id)).toBe(true);
  });
});

describe("groups, columns and boards", () => {
  it("never deletes the last group", () => {
    const s = seed();
    let state = s;
    const board = boardNamed(s, "Bug Tracker");
    for (const group of board.groups) [state] = apply(state, (d, ctx) => model.deleteGroup(d, ctx, board.id, group.id));
    expect(state.boards[board.id].groups).toHaveLength(1);
  });

  it("clears values when a status label is deleted", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const status = column(board, "Status");
    const stuck = label(board, "Status", "Stuck");
    const [next] = apply(s, (d) => model.deleteStatusLabel(d, board.id, status.id, stuck));
    expect(Object.values(next.items).some((i) => i.values[status.id] === stuck)).toBe(false);
    expect(getLabel(next.boards[board.id].columns.find((c) => c.id === status.id)!, stuck)).toBeUndefined();
  });

  it("duplicates a board with fresh group ids and remapped automations", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const [next, copyId] = apply(s, (d, ctx) => model.duplicateBoard(d, ctx, board.id, true));
    const copy = next.boards[copyId!];
    expect(copy.name).toBe("Duplicate of Product Roadmap");
    const groupIds = new Set(copy.groups.map((g) => g.id));
    expect(board.groups.some((g) => groupIds.has(g.id))).toBe(false);
    for (const a of copy.automations) if (a.action.type === "move_to_group") expect(groupIds.has(a.action.groupId)).toBe(true);
    const copiedItems = Object.values(next.items).filter((i) => i.boardId === copyId && !i.parentId);
    expect(copiedItems.length).toBe(board.groups.reduce((n, g) => n + g.itemIds.length, 0));
  });

  it("gives new columns unique titles and inserts them after a column", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const owner = column(board, "Owner");
    const [next, id] = apply(s, (d, ctx) => model.addColumn(d, ctx, board.id, "status", { afterColumnId: owner.id }));
    const columns = next.boards[board.id].columns;
    expect(columns[1].id).toBe(id);
    expect(columns[1].title).toBe("Status 1");
  });

  it("invites users by email once", () => {
    const s = seed();
    const board = boardNamed(s, "Bug Tracker");
    const [next, ids] = apply(s, (d, ctx) => model.inviteUsers(d, ctx, ["jane.doe@acme.io", "bad-email", "JANE.DOE@acme.io"], board.id));
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
    expect(next.users.find((u) => u.id === ids[0])?.name).toBe("Jane Doe");
    expect(next.boards[board.id].memberIds).toContain(ids[0]);
  });
});

describe("filters and sorting", () => {
  it("filters by status, person and search text", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const users = indexUsers(s.users);
    const status = column(board, "Status");
    const base = { sort: [], users, today: TODAY };
    const count = (groups: ReturnType<typeof visibleGroups>) => groups.reduce((n, g) => n + g.itemIds.length, 0);

    const stuckOnly = visibleGroups(board, s.items, { ...base, filter: { rules: { [status.id]: [label(board, "Status", "Stuck")] }, personId: null }, search: "" });
    expect(count(stuckOnly)).toBe(1);

    const omer = visibleGroups(board, s.items, { ...base, filter: { rules: {}, personId: "user_omer" }, search: "" });
    expect(count(omer)).toBeGreaterThan(2);

    const search = visibleGroups(board, s.items, { ...base, filter: { rules: {}, personId: null }, search: "onboarding" });
    expect(count(search)).toBe(1);
  });

  it("sorts numbers descending with empty cells last", () => {
    const s = seed();
    const board = boardNamed(s, "Marketing Campaigns");
    const users = indexUsers(s.users);
    const leads = column(board, "Leads");
    const groups = visibleGroups(board, s.items, { filter: { rules: {}, personId: null }, sort: [{ columnId: leads.id, direction: "desc" }], search: "", users, today: TODAY });
    const values = groups[1].itemIds.map((id) => s.items[id].values[leads.id]);
    expect(values).toEqual([312, 140, 86]);
    const q4 = groups[0].itemIds.map((id) => s.items[id].values[leads.id] ?? null);
    expect(q4.every((v) => v === null)).toBe(true);
  });
});

describe("csv", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(toCSV([["a,b", 'say "hi"', "line\nbreak", "plain"]])).toBe('"a,b","say ""hi""","line\nbreak",plain');
  });

  it("exports a board with a BOM and one row per item", () => {
    const s = seed();
    const board = boardNamed(s, "Sales Pipeline");
    const csv = boardToCSV(board, s.items, indexUsers(s.users));
    expect(csv.startsWith("﻿Name,Group,Owner,Stage")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(1 + 7);
    expect(csv).toContain("Acme Corp — Enterprise plan,Active deals,Alex Morgan,Negotiation,48000,70,");
  });
});

describe("dates", () => {
  it("buckets dates relative to today", () => {
    expect(dateBucket("2026-10-08", TODAY)).toBe("overdue");
    expect(dateBucket("2026-10-09", TODAY)).toBe("today");
    expect(dateBucket("2026-10-10", TODAY)).toBe("this_week");
    expect(dateBucket("2026-10-13", TODAY)).toBe("next_week");
    expect(dateBucket("2026-10-30", TODAY)).toBe("later");
    expect(dateBucket(null, TODAY)).toBe("none");
  });

  it("formats timelines compactly", () => {
    const now = fromISODate("2026-10-09");
    expect(formatTimeline({ start: "2026-10-03", end: "2026-10-10" }, now)).toBe("Oct 3 - 10");
    expect(formatTimeline({ start: "2026-10-28", end: "2026-11-04" }, now)).toBe("Oct 28 - Nov 4");
    expect(formatTimeline({ start: "2026-12-28", end: "2027-01-04" }, now)).toBe("Dec 28, 2026 - Jan 4, 2027");
  });
});

describe("subitems", () => {
  const parentName = "Redesign onboarding flow";
  const subStatus = (s: DataState, boardName: string) => {
    const board = boardNamed(s, boardName);
    return board.subitemColumns!.find((c) => c.type === "status")!;
  };

  it("are seeded under their parent and kept out of group ordering", () => {
    const s = seed();
    const parent = itemNamed(s, parentName);
    expect(parent.subitemIds).toHaveLength(3);
    const child = s.items[parent.subitemIds![0]];
    expect(child.parentId).toBe(parent.id);
    expect(s.boards[parent.boardId].groups.flatMap((g) => g.itemIds)).not.toContain(child.id);
    expect(columnsFor(s.boards[parent.boardId], child)).toBe(s.boards[parent.boardId].subitemColumns);
  });

  it("adds a subitem and edits it with the subitem columns, without running automations", () => {
    const s = seed();
    const parent = itemNamed(s, "Dark mode support");
    const [withSub, subId] = apply(s, (d, ctx) => model.addSubitem(d, ctx, parent.id, { name: "Contrast audit" }));
    expect(withSub.items[parent.id].subitemIds).toEqual([subId]);
    const status = subStatus(withSub, "Product Roadmap");
    const done = status.settings.labels!.find((l) => l.name === "Done")!.id;
    const [next] = apply(withSub, (d, ctx) => model.setCellValue(d, ctx, subId!, status.id, done));
    expect(next.items[subId!].values[status.id]).toBe(done);
    // The "Done → Completed" automation is for items; the parent stays put.
    expect(next.items[parent.id].groupId).toBe(parent.groupId);
    // A main-board column can't be written on a subitem.
    const mainStatus = column(boardNamed(s, "Product Roadmap"), "Status");
    const [unchanged] = apply(next, (d, ctx) => model.setCellValue(d, ctx, subId!, mainStatus.id, "x"));
    expect(unchanged.items[subId!].values[mainStatus.id]).toBeUndefined();
  });

  it("are deleted with their parent", () => {
    const s = seed();
    const parent = itemNamed(s, parentName);
    const [next] = apply(s, (d, ctx) => model.deleteItems(d, ctx, [parent.id]));
    for (const id of parent.subitemIds!) expect(next.items[id]).toBeUndefined();
  });

  it("are archived and restored with their parent", () => {
    const s = seed();
    const parent = itemNamed(s, parentName);
    const [archived] = apply(s, (d, ctx) => model.archiveItems(d, ctx, [parent.id]));
    for (const id of parent.subitemIds!) expect(archived.items[id].archivedAt).toBe(NOW);
    const [restored] = apply(archived, (d, ctx) => model.restoreItem(d, ctx, parent.id));
    for (const id of parent.subitemIds!) expect(restored.items[id].archivedAt).toBeNull();
    expect(restored.items[parent.id].subitemIds).toEqual(parent.subitemIds);
  });

  it("archiving one subitem detaches it until restored", () => {
    const s = seed();
    const parent = itemNamed(s, parentName);
    const childId = parent.subitemIds![1];
    const [archived] = apply(s, (d, ctx) => model.archiveItems(d, ctx, [childId]));
    expect(archived.items[parent.id].subitemIds).not.toContain(childId);
    const [restored] = apply(archived, (d, ctx) => model.restoreItem(d, ctx, childId));
    expect(restored.items[parent.id].subitemIds).toContain(childId);
    expect(restored.items[childId].parentId).toBe(parent.id);
  });

  it("are copied when the parent is duplicated", () => {
    const s = seed();
    const parent = itemNamed(s, parentName);
    const [next, copyId] = apply(s, (d, ctx) => model.duplicateItem(d, ctx, parent.id));
    const copy = next.items[copyId!];
    expect(copy.subitemIds).toHaveLength(3);
    for (const id of copy.subitemIds!) {
      expect(parent.subitemIds).not.toContain(id);
      expect(next.items[id].parentId).toBe(copyId);
    }
  });

  it("follow their parent to another group", () => {
    const s = seed();
    const parent = itemNamed(s, parentName);
    const target = s.boards[parent.boardId].groups[1];
    const [next] = apply(s, (d, ctx) => model.moveItem(d, ctx, parent.id, target.id));
    for (const id of parent.subitemIds!) expect(next.items[id].groupId).toBe(target.id);
  });

  it("supports adding and deleting subitem columns", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const [withColumn, colId] = apply(s, (d, ctx) => model.addColumn(d, ctx, board.id, "numbers", { target: "subitems" }));
    expect(withColumn.boards[board.id].subitemColumns!.map((c) => c.id)).toContain(colId);
    expect(withColumn.boards[board.id].columns.map((c) => c.id)).not.toContain(colId);
    const [without] = apply(withColumn, (d, ctx) => model.deleteColumn(d, ctx, board.id, colId!));
    expect(without.boards[board.id].subitemColumns!.map((c) => c.id)).not.toContain(colId);
    expect(without.boards[board.id].automations).toHaveLength(2);
  });

  it("are copied with a duplicated board", () => {
    const s = seed();
    const board = boardNamed(s, "Product Roadmap");
    const [next, copyId] = apply(s, (d, ctx) => model.duplicateBoard(d, ctx, board.id, true));
    const copiedParent = Object.values(next.items).find((i) => i.boardId === copyId && i.name === parentName)!;
    expect(copiedParent.subitemIds).toHaveLength(3);
    for (const id of copiedParent.subitemIds!) expect(next.items[id].boardId).toBe(copyId);
  });
});
