/**
 * Pure state transitions. Every function mutates a `DataState` in place, which in the
 * app is an immer draft (see store.ts) and in tests is a draft from `produce`.
 */
import { current, isDraft } from "immer";
import {
  describeAutomation,
  describeTrigger,
  matchingAutomations,
  segmentsToText,
  type AutomationEvent,
} from "./automations";
import { buildBoard, buildColumn, createView, defaultSubitemColumns, VIEW_NAMES, type BoardSpec } from "./builder";
import { AVATAR_COLORS, nextGroupColor, nextLabelColor } from "./colors";
import { asStringArray, cellText, columnsFor, findColumn, getLabel, GROUP_PSEUDO_COLUMN_ID, indexUsers } from "./columns";
import { toISODate } from "./dates";
import type {
  Activity,
  AppNotification,
  Automation,
  AutomationAction,
  AutomationTrigger,
  Board,
  BoardView,
  CellValue,
  ColumnSettings,
  ColumnType,
  DataState,
  ID,
  Item,
  StatusLabel,
  ThemeName,
  User,
  ViewType,
} from "./types";
import { clamp, uid } from "./utils";

export interface MutationContext {
  now: number;
  userId: ID;
  id: (prefix: string) => string;
  today: Date;
}

export function createContext(s: Pick<DataState, "currentUserId">): MutationContext {
  return { now: Date.now(), userId: s.currentUserId, id: uid, today: new Date() };
}

export const ACTIVITY_LIMIT = 1500;
const NOTIFICATION_LIMIT = 200;
const MAX_AUTOMATION_DEPTH = 3;

export type InsertPosition = "top" | "bottom" | { before: ID } | { after: ID };

function clone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  const plain = isDraft(value) ? (current(value as never) as T) : value;
  return structuredClone(plain);
}

function sameValue(a: CellValue, b: CellValue): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function insertId(list: ID[], id: ID, position: InsertPosition): void {
  if (position === "top") list.unshift(id);
  else if (position === "bottom") list.push(id);
  else if ("before" in position) {
    const index = list.indexOf(position.before);
    list.splice(index < 0 ? list.length : index, 0, id);
  } else {
    const index = list.indexOf(position.after);
    list.splice(index < 0 ? list.length : index + 1, 0, id);
  }
}

function removeId(list: ID[], id: ID): void {
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
}

function uniqueName(existing: string[], base: string): string {
  if (!existing.includes(base)) return base;
  let n = 1;
  while (existing.includes(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

function log(
  s: DataState,
  ctx: MutationContext,
  entry: Omit<Activity, "id" | "createdAt" | "userId" | "itemId" | "itemName"> & {
    itemId?: ID | null;
    itemName?: string | null;
  },
): void {
  s.activity.unshift({
    ...entry,
    id: ctx.id("act"),
    createdAt: ctx.now,
    userId: ctx.userId,
    itemId: entry.itemId ?? null,
    itemName: entry.itemName ?? null,
  });
  if (s.activity.length > ACTIVITY_LIMIT) s.activity.splice(ACTIVITY_LIMIT);
}

function touchItem(item: Item, ctx: MutationContext): void {
  item.updatedAt = ctx.now;
  item.updatedBy = ctx.userId;
}

function touchBoard(board: Board, ctx: MutationContext): void {
  board.updatedAt = ctx.now;
}

function boardItems(s: DataState, boardId: ID): Item[] {
  return Object.values(s.items).filter((item) => item.boardId === boardId);
}

function columnOf(s: DataState, boardId: ID, columnId: ID) {
  const board = s.boards[boardId];
  return board ? findColumn(board, columnId) : null;
}

/** An item plus all of its subitems. */
function withSubitems(s: DataState, itemIds: ID[]): ID[] {
  const out = new Set<ID>();
  for (const id of itemIds) {
    const item = s.items[id];
    if (!item) continue;
    out.add(id);
    for (const child of Object.values(s.items)) if (child.parentId === id) out.add(child.id);
  }
  return Array.from(out);
}

/** Copies an item (and its subitems) under new ids; returns the copy's id. */
function cloneItemTree(
  s: DataState,
  ctx: MutationContext,
  source: Item,
  overrides: Partial<Pick<Item, "boardId" | "groupId" | "parentId">>,
): ID {
  const id = ctx.id("item");
  const base = clone(source);
  const copy: Item = {
    ...base,
    ...overrides,
    id,
    createdAt: ctx.now,
    createdBy: ctx.userId,
    updatedAt: ctx.now,
    updatedBy: ctx.userId,
    archivedAt: null,
    subitemIds: [],
  };
  s.items[id] = copy;
  for (const childId of source.subitemIds ?? []) {
    const child = s.items[childId];
    if (!child || child.archivedAt) continue;
    const childCopy = cloneItemTree(s, ctx, child, {
      boardId: copy.boardId,
      groupId: copy.groupId,
      parentId: id,
    });
    s.items[id].subitemIds!.push(childCopy);
  }
  return id;
}

export function ensureSubitemColumns(board: Board, ctx: MutationContext) {
  if (!board.subitemColumns) board.subitemColumns = defaultSubitemColumns(ctx).columns;
  return board.subitemColumns;
}

// ---------------------------------------------------------------- boards

export function addBoard(
  s: DataState,
  ctx: MutationContext,
  spec: BoardSpec,
  workspaceId: ID = s.activeWorkspaceId,
): ID {
  const built = buildBoard(spec, workspaceId, ctx);
  built.board.createdAt = ctx.now;
  built.board.updatedAt = ctx.now;
  s.boards[built.board.id] = built.board;
  s.boardOrder.push(built.board.id);
  for (const item of built.items) {
    item.createdAt = ctx.now;
    item.updatedAt = ctx.now;
    s.items[item.id] = item;
  }
  for (const update of built.updates) s.updates[update.id] = update;
  log(s, ctx, { boardId: built.board.id, kind: "board_created", text: built.board.name });
  return built.board.id;
}

export function renameBoard(s: DataState, ctx: MutationContext, boardId: ID, name: string): void {
  const board = s.boards[boardId];
  const next = name.trim();
  if (!board || !next) return;
  board.name = next;
  touchBoard(board, ctx);
}

export function setBoardDescription(s: DataState, boardId: ID, description: string): void {
  const board = s.boards[boardId];
  if (board) board.description = description;
}

export function setBoardFavorite(s: DataState, boardId: ID, favorite: boolean): void {
  const board = s.boards[boardId];
  if (board) board.favorite = favorite;
}

export function setItemNoun(s: DataState, boardId: ID, noun: string): void {
  const board = s.boards[boardId];
  const next = noun.trim().toLowerCase();
  if (board && next) board.itemNoun = next;
}

export function moveBoardToWorkspace(s: DataState, boardId: ID, workspaceId: ID): void {
  const board = s.boards[boardId];
  if (board && s.workspaces.some((w) => w.id === workspaceId)) board.workspaceId = workspaceId;
}

export function duplicateBoard(s: DataState, ctx: MutationContext, boardId: ID, withItems: boolean): ID | null {
  const source = s.boards[boardId];
  if (!source) return null;
  const copy: Board = clone(source);
  copy.id = ctx.id("board");
  copy.name = `Duplicate of ${source.name}`;
  copy.favorite = false;
  copy.createdAt = ctx.now;
  copy.updatedAt = ctx.now;
  copy.automations = copy.automations.map((a) => ({ ...a, id: ctx.id("auto"), runs: 0, lastRunAt: null }));
  copy.views = copy.views.map((v) => ({ ...v, id: ctx.id("view") }));

  // Group ids are remapped; column and label ids stay, they are scoped to the board.
  const groupIdMap = new Map<ID, ID>();
  for (const group of copy.groups) {
    const newId = ctx.id("group");
    groupIdMap.set(group.id, newId);
    group.id = newId;
  }
  for (const automation of copy.automations) {
    if (automation.action.type === "move_to_group") {
      automation.action.groupId = groupIdMap.get(automation.action.groupId) ?? automation.action.groupId;
    }
  }
  for (const view of copy.views) {
    const groupRule = view.filter.rules[GROUP_PSEUDO_COLUMN_ID];
    if (groupRule) view.filter.rules[GROUP_PSEUDO_COLUMN_ID] = groupRule.map((id) => groupIdMap.get(id) ?? id);
  }

  for (const group of copy.groups) {
    const sourceItemIds = group.itemIds;
    group.itemIds = [];
    if (!withItems) continue;
    for (const itemId of sourceItemIds) {
      const item = s.items[itemId];
      if (!item) continue;
      group.itemIds.push(cloneItemTree(s, ctx, item, { boardId: copy.id, groupId: group.id, parentId: null }));
    }
  }

  s.boards[copy.id] = copy;
  const index = s.boardOrder.indexOf(boardId);
  s.boardOrder.splice(index < 0 ? s.boardOrder.length : index + 1, 0, copy.id);
  log(s, ctx, { boardId: copy.id, kind: "board_created", text: copy.name });
  return copy.id;
}

export function deleteBoard(s: DataState, boardId: ID): void {
  if (!s.boards[boardId]) return;
  delete s.boards[boardId];
  removeId(s.boardOrder, boardId);
  s.recentBoardIds = s.recentBoardIds.filter((id) => id !== boardId);
  for (const [id, item] of Object.entries(s.items)) if (item.boardId === boardId) delete s.items[id];
  for (const [id, update] of Object.entries(s.updates)) if (update.boardId === boardId) delete s.updates[id];
  s.activity = s.activity.filter((a) => a.boardId !== boardId);
  s.notifications = s.notifications.filter((n) => n.boardId !== boardId);
}

export function visitBoard(s: DataState, boardId: ID): void {
  if (s.recentBoardIds[0] === boardId) return;
  s.recentBoardIds = [boardId, ...s.recentBoardIds.filter((id) => id !== boardId)].slice(0, 12);
}

// ---------------------------------------------------------------- groups

export function addGroup(
  s: DataState,
  ctx: MutationContext,
  boardId: ID,
  opts: { title?: string; color?: string; position?: "top" | "bottom" | { after: ID } } = {},
): ID | null {
  const board = s.boards[boardId];
  if (!board) return null;
  const id = ctx.id("group");
  const group = {
    id,
    title: opts.title?.trim() || "New Group",
    color: opts.color ?? nextGroupColor(board.groups.map((g) => g.color)),
    collapsed: false,
    itemIds: [] as ID[],
  };
  const position = opts.position ?? "top";
  if (position === "top") board.groups.unshift(group);
  else if (position === "bottom") board.groups.push(group);
  else {
    const index = board.groups.findIndex((g) => g.id === position.after);
    board.groups.splice(index < 0 ? board.groups.length : index + 1, 0, group);
  }
  touchBoard(board, ctx);
  log(s, ctx, { boardId, kind: "group_created", text: group.title });
  return id;
}

export function renameGroup(s: DataState, ctx: MutationContext, boardId: ID, groupId: ID, title: string): void {
  const group = s.boards[boardId]?.groups.find((g) => g.id === groupId);
  const next = title.trim();
  if (!group || !next || next === group.title) return;
  log(s, ctx, { boardId, kind: "group_renamed", from: group.title, to: next });
  group.title = next;
}

export function setGroupColor(s: DataState, boardId: ID, groupId: ID, color: string): void {
  const group = s.boards[boardId]?.groups.find((g) => g.id === groupId);
  if (group) group.color = color;
}

export function setGroupCollapsed(s: DataState, boardId: ID, groupId: ID, collapsed: boolean): void {
  const group = s.boards[boardId]?.groups.find((g) => g.id === groupId);
  if (group) group.collapsed = collapsed;
}

export function setAllGroupsCollapsed(s: DataState, boardId: ID, collapsed: boolean): void {
  for (const group of s.boards[boardId]?.groups ?? []) group.collapsed = collapsed;
}

export function moveGroup(s: DataState, boardId: ID, groupId: ID, toIndex: number): void {
  const board = s.boards[boardId];
  if (!board) return;
  const from = board.groups.findIndex((g) => g.id === groupId);
  if (from < 0) return;
  const [group] = board.groups.splice(from, 1);
  board.groups.splice(clamp(toIndex, 0, board.groups.length), 0, group);
}

export function duplicateGroup(s: DataState, ctx: MutationContext, boardId: ID, groupId: ID): ID | null {
  const board = s.boards[boardId];
  const index = board?.groups.findIndex((g) => g.id === groupId) ?? -1;
  if (!board || index < 0) return null;
  const source = board.groups[index];
  const id = ctx.id("group");
  const itemIds: ID[] = [];
  for (const itemId of source.itemIds) {
    const item = s.items[itemId];
    if (item) itemIds.push(cloneItemTree(s, ctx, item, { groupId: id }));
  }
  board.groups.splice(index + 1, 0, {
    id,
    title: `Duplicate of ${source.title}`,
    color: source.color,
    collapsed: false,
    itemIds,
  });
  touchBoard(board, ctx);
  log(s, ctx, { boardId, kind: "group_created", text: `Duplicate of ${source.title}` });
  return id;
}

/** Deletes a group and its items. A board always keeps at least one group. */
export function deleteGroup(s: DataState, ctx: MutationContext, boardId: ID, groupId: ID): boolean {
  const board = s.boards[boardId];
  if (!board || board.groups.length <= 1) return false;
  const index = board.groups.findIndex((g) => g.id === groupId);
  if (index < 0) return false;
  const [group] = board.groups.splice(index, 1);
  const doomed = new Set(withSubitems(s, group.itemIds));
  for (const itemId of doomed) delete s.items[itemId];
  for (const [id, update] of Object.entries(s.updates)) if (doomed.has(update.itemId)) delete s.updates[id];
  board.automations = board.automations.filter(
    (a) => !(a.action.type === "move_to_group" && a.action.groupId === groupId),
  );
  for (const view of board.views) {
    const rule = view.filter.rules[GROUP_PSEUDO_COLUMN_ID];
    if (rule) view.filter.rules[GROUP_PSEUDO_COLUMN_ID] = rule.filter((id) => id !== groupId);
  }
  touchBoard(board, ctx);
  log(s, ctx, { boardId, kind: "group_deleted", text: group.title });
  return true;
}

// ---------------------------------------------------------------- columns

export function addColumn(
  s: DataState,
  ctx: MutationContext,
  boardId: ID,
  type: ColumnType,
  opts: { title?: string; afterColumnId?: ID | null; preset?: "priority"; target?: "items" | "subitems" } = {},
): ID | null {
  const board = s.boards[boardId];
  if (!board) return null;
  const list = opts.target === "subitems" ? ensureSubitemColumns(board, ctx) : board.columns;
  const column = buildColumn({ type, title: opts.title, preset: opts.preset }, ctx);
  column.title = uniqueName(
    list.map((c) => c.title),
    column.title,
  );
  const afterIndex = opts.afterColumnId ? list.findIndex((c) => c.id === opts.afterColumnId) : -1;
  if (afterIndex >= 0) list.splice(afterIndex + 1, 0, column);
  else list.push(column);
  if (opts.target === "subitems") {
    touchBoard(board, ctx);
    return column.id;
  }
  // Views that had nothing to show for this column type pick it up automatically.
  for (const view of board.views) {
    if (type === "status") view.settings.statusColumnId ??= column.id;
    if (type === "date") view.settings.dateColumnId ??= column.id;
    if (type === "timeline") view.settings.timelineColumnId ??= column.id;
    if (type === "people") view.settings.peopleColumnId ??= column.id;
    if (type === "numbers") view.settings.numbersColumnId ??= column.id;
  }
  touchBoard(board, ctx);
  log(s, ctx, { boardId, kind: "column_created", text: column.title, columnType: type });
  return column.id;
}

export function renameColumn(s: DataState, boardId: ID, columnId: ID, title: string): void {
  const column = columnOf(s, boardId, columnId)?.column;
  const next = title.trim();
  if (column && next) column.title = next;
}

export const MIN_COLUMN_WIDTH = 70;
export const MAX_COLUMN_WIDTH = 600;

export function setColumnWidth(s: DataState, boardId: ID, columnId: ID, width: number): void {
  const column = columnOf(s, boardId, columnId)?.column;
  if (column) column.width = clamp(Math.round(width), MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH);
}

export function setNameWidth(s: DataState, boardId: ID, width: number): void {
  const board = s.boards[boardId];
  if (board) board.nameWidth = clamp(Math.round(width), 200, 700);
}

export function moveColumn(s: DataState, boardId: ID, columnId: ID, toIndex: number): void {
  const found = columnOf(s, boardId, columnId);
  if (!found) return;
  const { list } = found;
  const from = list.findIndex((c) => c.id === columnId);
  const [column] = list.splice(from, 1);
  list.splice(clamp(toIndex, 0, list.length), 0, column);
}

export function duplicateColumn(s: DataState, ctx: MutationContext, boardId: ID, columnId: ID): ID | null {
  const board = s.boards[boardId];
  const found = columnOf(s, boardId, columnId);
  if (!board || !found) return null;
  const { list, column: source } = found;
  const index = list.indexOf(source);
  const copy = { ...clone(source), id: ctx.id("col") };
  copy.title = uniqueName(
    list.map((c) => c.title),
    `${source.title} copy`,
  );
  list.splice(index + 1, 0, copy);
  for (const item of boardItems(s, boardId)) {
    if (columnId in item.values) item.values[copy.id] = clone(item.values[columnId]);
  }
  touchBoard(board, ctx);
  return copy.id;
}

function automationUsesColumn(a: Automation, columnId: ID): boolean {
  const t = a.trigger;
  const act = a.action;
  return (
    ((t.type === "status_changes" || t.type === "person_assigned") && t.columnId === columnId) ||
    ((act.type === "set_status" || act.type === "assign_person" || act.type === "set_date_today") &&
      act.columnId === columnId)
  );
}

export function deleteColumn(s: DataState, ctx: MutationContext, boardId: ID, columnId: ID): void {
  const board = s.boards[boardId];
  const found = columnOf(s, boardId, columnId);
  if (!board || !found) return;
  const [removed] = found.list.splice(found.list.indexOf(found.column), 1);
  for (const item of boardItems(s, boardId)) delete item.values[columnId];
  if (found.subitems) {
    touchBoard(board, ctx);
    return;
  }
  for (const view of board.views) {
    view.hiddenColumnIds = view.hiddenColumnIds.filter((id) => id !== columnId);
    view.sort = view.sort.filter((r) => r.columnId !== columnId);
    delete view.filter.rules[columnId];
    const settings = view.settings;
    const firstOf = (type: ColumnType) => board.columns.find((c) => c.type === type)?.id;
    if (settings.statusColumnId === columnId) settings.statusColumnId = firstOf("status");
    if (settings.dateColumnId === columnId) settings.dateColumnId = firstOf("date");
    if (settings.timelineColumnId === columnId) settings.timelineColumnId = firstOf("timeline");
    if (settings.peopleColumnId === columnId) settings.peopleColumnId = firstOf("people");
    if (settings.numbersColumnId === columnId) settings.numbersColumnId = firstOf("numbers");
  }
  board.automations = board.automations.filter((a) => !automationUsesColumn(a, columnId));
  touchBoard(board, ctx);
  log(s, ctx, { boardId, kind: "column_deleted", text: removed.title, columnType: removed.type });
}

export function updateColumnSettings(s: DataState, boardId: ID, columnId: ID, patch: Partial<ColumnSettings>): void {
  const column = columnOf(s, boardId, columnId)?.column;
  if (column) Object.assign(column.settings, patch);
}

export function addStatusLabel(
  s: DataState,
  ctx: MutationContext,
  boardId: ID,
  columnId: ID,
  name = "New label",
  color?: string,
): ID | null {
  const column = columnOf(s, boardId, columnId)?.column;
  if (!column || column.type !== "status") return null;
  const labels = (column.settings.labels ??= []);
  const id = ctx.id("lbl");
  labels.push({ id, name, color: color ?? nextLabelColor(labels.map((l) => l.color)) });
  return id;
}

export function updateStatusLabel(
  s: DataState,
  boardId: ID,
  columnId: ID,
  labelId: ID,
  patch: Partial<Pick<StatusLabel, "name" | "color">>,
): void {
  const column = columnOf(s, boardId, columnId)?.column;
  const label = column?.settings.labels?.find((l) => l.id === labelId);
  if (label) Object.assign(label, patch);
}

export function deleteStatusLabel(s: DataState, boardId: ID, columnId: ID, labelId: ID): void {
  const board = s.boards[boardId];
  const column = columnOf(s, boardId, columnId)?.column;
  if (!board || !column?.settings.labels) return;
  column.settings.labels = column.settings.labels.filter((l) => l.id !== labelId);
  if (column.settings.doneLabelId === labelId) column.settings.doneLabelId = null;
  for (const item of boardItems(s, boardId)) if (item.values[columnId] === labelId) item.values[columnId] = null;
  for (const view of board.views) {
    const rule = view.filter.rules[columnId];
    if (rule) view.filter.rules[columnId] = rule.filter((t) => t !== labelId);
  }
  board.automations = board.automations.filter(
    (a) =>
      !(a.trigger.type === "status_changes" && a.trigger.labelId === labelId) &&
      !(a.action.type === "set_status" && a.action.labelId === labelId),
  );
}

export function addTagOption(
  s: DataState,
  ctx: MutationContext,
  boardId: ID,
  columnId: ID,
  name: string,
  color?: string,
): ID | null {
  const column = columnOf(s, boardId, columnId)?.column;
  const trimmed = name.trim();
  if (!column || column.type !== "tags" || !trimmed) return null;
  const tags = (column.settings.tags ??= []);
  const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing.id;
  const id = ctx.id("tag");
  tags.push({ id, name: trimmed, color: color ?? nextLabelColor(tags.map((t) => t.color)) });
  return id;
}

export function deleteTagOption(s: DataState, boardId: ID, columnId: ID, tagId: ID): void {
  const column = columnOf(s, boardId, columnId)?.column;
  if (!column?.settings.tags) return;
  column.settings.tags = column.settings.tags.filter((t) => t.id !== tagId);
  for (const item of boardItems(s, boardId)) {
    const value = item.values[columnId];
    if (Array.isArray(value)) item.values[columnId] = asStringArray(value).filter((id) => id !== tagId);
  }
}

// ---------------------------------------------------------------- items

export function addItem(
  s: DataState,
  ctx: MutationContext,
  boardId: ID,
  groupId: ID | null,
  opts: { name: string; values?: Record<ID, CellValue>; position?: InsertPosition },
): ID | null {
  const board = s.boards[boardId];
  if (!board) return null;
  const group = board.groups.find((g) => g.id === groupId) ?? board.groups[0];
  if (!group) return null;
  const id = ctx.id("item");
  const name = opts.name.trim() || `New ${board.itemNoun}`;
  s.items[id] = {
    id,
    boardId,
    groupId: group.id,
    name,
    values: opts.values ? clone(opts.values) : {},
    createdAt: ctx.now,
    createdBy: ctx.userId,
    updatedAt: ctx.now,
    updatedBy: ctx.userId,
    archivedAt: null,
  };
  insertId(group.itemIds, id, opts.position ?? "bottom");
  touchBoard(board, ctx);
  log(s, ctx, { boardId, itemId: id, itemName: name, kind: "item_created", text: group.title });
  runAutomations(s, ctx, boardId, id, { type: "item_created" }, 0);
  return id;
}

export function renameItem(s: DataState, ctx: MutationContext, itemId: ID, name: string): void {
  const item = s.items[itemId];
  const next = name.trim();
  if (!item || !next || next === item.name) return;
  log(s, ctx, { boardId: item.boardId, itemId, itemName: next, kind: "item_renamed", from: item.name, to: next });
  item.name = next;
  touchItem(item, ctx);
}

export function setCellValue(
  s: DataState,
  ctx: MutationContext,
  itemId: ID,
  columnId: ID,
  value: CellValue,
  depth = 0,
): void {
  const item = s.items[itemId];
  const board = item ? s.boards[item.boardId] : undefined;
  const column = board && item ? columnsFor(board, item).find((c) => c.id === columnId) : undefined;
  if (!item || !board || !column || column.type === "last_updated") return;
  const previous = item.values[columnId];
  if (sameValue(previous, value)) return;

  const users = indexUsers(s.users);
  const fromText = cellText(column, previous, { users });
  const fromColor = column.type === "status" ? getLabel(column, previous)?.color : undefined;
  item.values[columnId] = value === undefined ? null : clone(value);
  touchItem(item, ctx);
  touchBoard(board, ctx);
  log(s, ctx, {
    boardId: board.id,
    itemId,
    itemName: item.name,
    kind: "value_changed",
    columnId,
    columnTitle: column.title,
    columnType: column.type,
    from: fromText,
    to: cellText(column, value, { users }),
    fromColor,
    toColor: column.type === "status" ? getLabel(column, value)?.color : undefined,
  });

  if (item.parentId) return; // Automations run on items, not subitems.
  if (column.type === "status") {
    runAutomations(
      s,
      ctx,
      board.id,
      itemId,
      {
        type: "status_changed",
        columnId,
        from: typeof previous === "string" ? previous : null,
        to: typeof value === "string" ? value : null,
      },
      depth,
    );
  } else if (column.type === "people") {
    const before = asStringArray(previous);
    const added = asStringArray(value).filter((id) => !before.includes(id));
    if (added.length) runAutomations(s, ctx, board.id, itemId, { type: "people_added", columnId, added }, depth);
  }
}

export function moveItem(
  s: DataState,
  ctx: MutationContext,
  itemId: ID,
  toGroupId: ID,
  position: InsertPosition = "bottom",
): void {
  const item = s.items[itemId];
  const board = item ? s.boards[item.boardId] : undefined;
  const target = board?.groups.find((g) => g.id === toGroupId);
  if (!item || !board || !target) return;
  const source = board.groups.find((g) => g.id === item.groupId);
  if (item.archivedAt) {
    item.groupId = target.id;
    return;
  }
  if (source) removeId(source.itemIds, itemId);
  insertId(target.itemIds, itemId, position);
  if (source?.id !== target.id) {
    for (const childId of item.subitemIds ?? []) {
      const child = s.items[childId];
      if (child) child.groupId = target.id;
    }
    log(s, ctx, {
      boardId: board.id,
      itemId,
      itemName: item.name,
      kind: "item_moved",
      from: source?.title ?? "",
      to: target.title,
      fromColor: source?.color,
      toColor: target.color,
    });
    item.groupId = target.id;
    touchItem(item, ctx);
  }
  touchBoard(board, ctx);
}

export function moveItemsToGroup(s: DataState, ctx: MutationContext, itemIds: ID[], groupId: ID): void {
  for (const id of itemIds) moveItem(s, ctx, id, groupId, "bottom");
}

export function duplicateItem(s: DataState, ctx: MutationContext, itemId: ID): ID | null {
  const item = s.items[itemId];
  const board = item ? s.boards[item.boardId] : undefined;
  if (!item || !board || item.archivedAt) return null;
  if (item.parentId) {
    const parent = s.items[item.parentId];
    if (!parent) return null;
    const id = cloneItemTree(s, ctx, item, {});
    insertId((parent.subitemIds ??= []), id, { after: itemId });
    log(s, ctx, { boardId: board.id, itemId: id, itemName: item.name, kind: "item_duplicated" });
    return id;
  }
  const group = board.groups.find((g) => g.id === item.groupId);
  if (!group) return null;
  const id = cloneItemTree(s, ctx, item, {});
  insertId(group.itemIds, id, { after: itemId });
  touchBoard(board, ctx);
  log(s, ctx, { boardId: board.id, itemId: id, itemName: item.name, kind: "item_duplicated" });
  return id;
}

export function deleteItems(s: DataState, ctx: MutationContext, itemIds: ID[]): void {
  const removed = new Set<ID>();
  for (const itemId of withSubitems(s, itemIds)) {
    const item = s.items[itemId];
    if (!item) continue;
    const board = s.boards[item.boardId];
    if (board) {
      for (const group of board.groups) removeId(group.itemIds, itemId);
      touchBoard(board, ctx);
    }
    const parent = item.parentId ? s.items[item.parentId] : undefined;
    if (parent?.subitemIds) removeId(parent.subitemIds, itemId);
    if (!item.parentId || !itemIds.includes(item.parentId)) {
      log(s, ctx, { boardId: item.boardId, itemName: item.name, kind: "item_deleted" });
    }
    delete s.items[itemId];
    removed.add(itemId);
  }
  if (removed.size === 0) return;
  for (const [id, update] of Object.entries(s.updates)) if (removed.has(update.itemId)) delete s.updates[id];
  s.notifications = s.notifications.filter((n) => !n.itemId || !removed.has(n.itemId));
}

/**
 * Archived items leave their group. A parent's subitems are archived with it (and
 * come back with it); an archived subitem leaves its parent's list.
 */
export function archiveItems(s: DataState, ctx: MutationContext, itemIds: ID[]): void {
  for (const itemId of itemIds) {
    const item = s.items[itemId];
    if (!item || item.archivedAt) continue;
    const board = s.boards[item.boardId];
    if (board) {
      for (const group of board.groups) removeId(group.itemIds, itemId);
      touchBoard(board, ctx);
    }
    const parent = item.parentId ? s.items[item.parentId] : undefined;
    if (parent?.subitemIds) removeId(parent.subitemIds, itemId);
    item.archivedAt = ctx.now;
    for (const childId of item.subitemIds ?? []) {
      const child = s.items[childId];
      if (child && !child.archivedAt) child.archivedAt = ctx.now;
    }
    log(s, ctx, { boardId: item.boardId, itemId, itemName: item.name, kind: "item_archived" });
  }
}

export function restoreItem(s: DataState, ctx: MutationContext, itemId: ID): void {
  const item = s.items[itemId];
  const board = item ? s.boards[item.boardId] : undefined;
  if (!item?.archivedAt || !board) return;
  const parent = item.parentId ? s.items[item.parentId] : undefined;
  if (parent) {
    item.archivedAt = null;
    const siblings = (parent.subitemIds ??= []);
    if (!siblings.includes(itemId)) siblings.push(itemId);
    touchBoard(board, ctx);
    log(s, ctx, { boardId: board.id, itemId, itemName: item.name, kind: "item_restored", text: parent.name });
    return;
  }
  // A subitem whose parent is gone comes back as a regular item.
  item.parentId = null;
  const group = board.groups.find((g) => g.id === item.groupId) ?? board.groups[0];
  if (!group) return;
  const archivedAt = item.archivedAt;
  item.groupId = group.id;
  item.archivedAt = null;
  group.itemIds.push(itemId);
  for (const childId of item.subitemIds ?? []) {
    const child = s.items[childId];
    if (child && child.archivedAt === archivedAt) {
      child.archivedAt = null;
      child.groupId = group.id;
    }
  }
  touchBoard(board, ctx);
  log(s, ctx, { boardId: board.id, itemId, itemName: item.name, kind: "item_restored", text: group.title });
}

export function addSubitem(
  s: DataState,
  ctx: MutationContext,
  parentId: ID,
  opts: { name: string; values?: Record<ID, CellValue> },
): ID | null {
  const parent = s.items[parentId];
  const board = parent ? s.boards[parent.boardId] : undefined;
  if (!parent || !board || parent.parentId || parent.archivedAt) return null;
  ensureSubitemColumns(board, ctx);
  const id = ctx.id("item");
  const name = opts.name.trim() || "New subitem";
  s.items[id] = {
    id,
    boardId: board.id,
    groupId: parent.groupId,
    parentId,
    name,
    values: opts.values ? clone(opts.values) : {},
    createdAt: ctx.now,
    createdBy: ctx.userId,
    updatedAt: ctx.now,
    updatedBy: ctx.userId,
    archivedAt: null,
  };
  (parent.subitemIds ??= []).push(id);
  touchBoard(board, ctx);
  log(s, ctx, { boardId: board.id, itemId: id, itemName: name, kind: "item_created", text: `Subitem of ${parent.name}` });
  return id;
}

// ---------------------------------------------------------------- automations

export function addAutomation(
  s: DataState,
  ctx: MutationContext,
  boardId: ID,
  trigger: AutomationTrigger,
  action: AutomationAction,
): ID | null {
  const board = s.boards[boardId];
  if (!board) return null;
  const id = ctx.id("auto");
  board.automations.push({
    id,
    enabled: true,
    trigger,
    action,
    createdAt: ctx.now,
    createdBy: ctx.userId,
    runs: 0,
    lastRunAt: null,
  });
  return id;
}

export function setAutomationEnabled(s: DataState, boardId: ID, automationId: ID, enabled: boolean): void {
  const automation = s.boards[boardId]?.automations.find((a) => a.id === automationId);
  if (automation) automation.enabled = enabled;
}

export function deleteAutomation(s: DataState, boardId: ID, automationId: ID): void {
  const board = s.boards[boardId];
  if (board) board.automations = board.automations.filter((a) => a.id !== automationId);
}

function runAutomations(
  s: DataState,
  ctx: MutationContext,
  boardId: ID,
  itemId: ID,
  event: AutomationEvent,
  depth: number,
): void {
  // Actions may trigger further automations; the depth limit stops ping-pong loops.
  if (depth >= MAX_AUTOMATION_DEPTH) return;
  const board = s.boards[boardId];
  if (!board) return;
  for (const automation of matchingAutomations(board, event)) {
    const item = s.items[itemId];
    if (!item || item.archivedAt) return;
    const ran = applyAutomationAction(s, ctx, board, automation, item, depth + 1);
    if (!ran) continue;
    automation.runs += 1;
    automation.lastRunAt = ctx.now;
    log(s, ctx, {
      boardId,
      itemId,
      itemName: item.name,
      kind: "automation_ran",
      text: segmentsToText(describeAutomation(board, automation, s.users)),
    });
  }
}

function applyAutomationAction(
  s: DataState,
  ctx: MutationContext,
  board: Board,
  automation: Automation,
  item: Item,
  depth: number,
): boolean {
  const action = automation.action;
  switch (action.type) {
    case "move_to_group":
      if (item.groupId === action.groupId) return false;
      moveItem(s, ctx, item.id, action.groupId, "top");
      return true;
    case "set_status":
      if (item.values[action.columnId] === action.labelId) return false;
      setCellValue(s, ctx, item.id, action.columnId, action.labelId, depth);
      return true;
    case "assign_person": {
      const assigned = asStringArray(item.values[action.columnId]);
      if (assigned.includes(action.userId)) return false;
      setCellValue(s, ctx, item.id, action.columnId, [...assigned, action.userId], depth);
      return true;
    }
    case "set_date_today": {
      const today = toISODate(ctx.today);
      if (item.values[action.columnId] === today) return false;
      setCellValue(s, ctx, item.id, action.columnId, today, depth);
      return true;
    }
    case "notify":
      // Notifications are the signed-in user's inbox; other recipients only appear in the log.
      if (action.userId === s.currentUserId) {
        addNotification(s, ctx, {
          actorId: ctx.userId,
          kind: "automation",
          text: `${segmentsToText(describeTrigger(board, automation.trigger))}: “${item.name}”`,
          boardId: board.id,
          itemId: item.id,
        });
      }
      return true;
    case "archive_item":
      archiveItems(s, ctx, [item.id]);
      return true;
  }
}

// ---------------------------------------------------------------- updates

export function postUpdate(s: DataState, ctx: MutationContext, itemId: ID, body: string): ID | null {
  const item = s.items[itemId];
  const text = body.trim();
  if (!item || !text) return null;
  const id = ctx.id("upd");
  s.updates[id] = {
    id,
    boardId: item.boardId,
    itemId,
    authorId: ctx.userId,
    body: text,
    createdAt: ctx.now,
    editedAt: null,
    likes: [],
    replies: [],
    pinned: false,
  };
  touchItem(item, ctx);
  log(s, ctx, { boardId: item.boardId, itemId, itemName: item.name, kind: "update_posted", text: text.slice(0, 140) });
  return id;
}

export function editUpdate(s: DataState, ctx: MutationContext, updateId: ID, body: string): void {
  const update = s.updates[updateId];
  const text = body.trim();
  if (!update || !text || text === update.body) return;
  update.body = text;
  update.editedAt = ctx.now;
}

export function deleteUpdate(s: DataState, updateId: ID): void {
  delete s.updates[updateId];
}

function toggleIn(list: ID[], id: ID): void {
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
  else list.push(id);
}

export function toggleUpdateLike(s: DataState, ctx: MutationContext, updateId: ID): void {
  const update = s.updates[updateId];
  if (update) toggleIn(update.likes, ctx.userId);
}

export function toggleUpdatePinned(s: DataState, updateId: ID): void {
  const update = s.updates[updateId];
  if (update) update.pinned = !update.pinned;
}

export function addReply(s: DataState, ctx: MutationContext, updateId: ID, body: string): ID | null {
  const update = s.updates[updateId];
  const text = body.trim();
  if (!update || !text) return null;
  const id = ctx.id("rep");
  update.replies.push({ id, authorId: ctx.userId, body: text, createdAt: ctx.now, likes: [] });
  return id;
}

export function toggleReplyLike(s: DataState, ctx: MutationContext, updateId: ID, replyId: ID): void {
  const reply = s.updates[updateId]?.replies.find((r) => r.id === replyId);
  if (reply) toggleIn(reply.likes, ctx.userId);
}

export function deleteReply(s: DataState, updateId: ID, replyId: ID): void {
  const update = s.updates[updateId];
  if (update) update.replies = update.replies.filter((r) => r.id !== replyId);
}

// ---------------------------------------------------------------- views

export function addView(s: DataState, ctx: MutationContext, boardId: ID, type: ViewType, name?: string): ID | null {
  const board = s.boards[boardId];
  if (!board) return null;
  const id = ctx.id("view");
  const viewName =
    name?.trim() ||
    uniqueName(
      board.views.map((v) => v.name),
      VIEW_NAMES[type],
    );
  board.views.push(createView(board, type, id, viewName));
  return id;
}

export function renameView(s: DataState, boardId: ID, viewId: ID, name: string): void {
  const view = s.boards[boardId]?.views.find((v) => v.id === viewId);
  const next = name.trim();
  if (view && next) view.name = next;
}

export function deleteView(s: DataState, boardId: ID, viewId: ID): boolean {
  const board = s.boards[boardId];
  if (!board || board.views.length <= 1) return false;
  board.views = board.views.filter((v) => v.id !== viewId);
  return true;
}

export function duplicateView(s: DataState, ctx: MutationContext, boardId: ID, viewId: ID): ID | null {
  const board = s.boards[boardId];
  const index = board?.views.findIndex((v) => v.id === viewId) ?? -1;
  if (!board || index < 0) return null;
  const copy: BoardView = { ...clone(board.views[index]), id: ctx.id("view") };
  copy.name = uniqueName(
    board.views.map((v) => v.name),
    `${board.views[index].name} copy`,
  );
  board.views.splice(index + 1, 0, copy);
  return copy.id;
}

export function updateView(
  s: DataState,
  boardId: ID,
  viewId: ID,
  patch: Partial<Pick<BoardView, "filter" | "sort" | "hiddenColumnIds" | "settings">>,
): void {
  const view = s.boards[boardId]?.views.find((v) => v.id === viewId);
  if (!view) return;
  if (patch.filter) view.filter = clone(patch.filter);
  if (patch.sort) view.sort = clone(patch.sort);
  if (patch.hiddenColumnIds) view.hiddenColumnIds = patch.hiddenColumnIds.slice();
  if (patch.settings) Object.assign(view.settings, patch.settings);
}

// ---------------------------------------------------------------- workspaces, users, prefs

export function addWorkspace(s: DataState, ctx: MutationContext, name: string, color?: string): ID {
  const id = ctx.id("ws");
  s.workspaces.push({
    id,
    name: name.trim() || "New workspace",
    color: color ?? AVATAR_COLORS[s.workspaces.length % AVATAR_COLORS.length],
  });
  s.activeWorkspaceId = id;
  return id;
}

export function renameWorkspace(s: DataState, workspaceId: ID, name: string): void {
  const workspace = s.workspaces.find((w) => w.id === workspaceId);
  const next = name.trim();
  if (workspace && next) workspace.name = next;
}

/** Deletes a workspace and its boards. The last workspace can't be deleted. */
export function deleteWorkspace(s: DataState, workspaceId: ID): boolean {
  if (s.workspaces.length <= 1) return false;
  for (const board of Object.values(s.boards)) if (board.workspaceId === workspaceId) deleteBoard(s, board.id);
  s.workspaces = s.workspaces.filter((w) => w.id !== workspaceId);
  if (s.activeWorkspaceId === workspaceId) s.activeWorkspaceId = s.workspaces[0].id;
  return true;
}

export function setActiveWorkspace(s: DataState, workspaceId: ID): void {
  if (s.workspaces.some((w) => w.id === workspaceId)) s.activeWorkspaceId = workspaceId;
}

export function updateProfile(s: DataState, patch: Partial<Pick<User, "name" | "title" | "email" | "color">>): void {
  const user = s.users.find((u) => u.id === s.currentUserId);
  if (!user) return;
  if (patch.name !== undefined && patch.name.trim()) user.name = patch.name.trim();
  if (patch.title !== undefined) user.title = patch.title.trim();
  if (patch.email !== undefined && patch.email.trim()) user.email = patch.email.trim();
  if (patch.color) user.color = patch.color;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
      .join(" ") || email
  );
}

/** Adds teammates by email (or finds existing ones) and optionally subscribes them to a board. */
export function inviteUsers(s: DataState, ctx: MutationContext, emails: string[], boardId?: ID): ID[] {
  const ids: ID[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!isValidEmail(email)) continue;
    let user = s.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      user = {
        id: ctx.id("user"),
        name: nameFromEmail(email),
        email,
        title: "Invited member",
        color: AVATAR_COLORS[s.users.length % AVATAR_COLORS.length],
      };
      s.users.push(user);
    }
    ids.push(user.id);
  }
  const board = boardId ? s.boards[boardId] : undefined;
  if (board) board.memberIds = Array.from(new Set([...board.memberIds, ...ids]));
  return ids;
}

export function addNotification(
  s: DataState,
  ctx: MutationContext,
  notification: Omit<AppNotification, "id" | "createdAt" | "read">,
): void {
  s.notifications.unshift({ ...notification, id: ctx.id("ntf"), createdAt: ctx.now, read: false });
  if (s.notifications.length > NOTIFICATION_LIMIT) s.notifications.splice(NOTIFICATION_LIMIT);
}

export function setNotificationRead(s: DataState, notificationId: ID, read: boolean): void {
  const notification = s.notifications.find((n) => n.id === notificationId);
  if (notification) notification.read = read;
}

export function markAllNotificationsRead(s: DataState): void {
  for (const notification of s.notifications) notification.read = true;
}

export function setTheme(s: DataState, theme: ThemeName): void {
  s.preferences.theme = theme;
}

export function setSidebarCollapsed(s: DataState, collapsed: boolean): void {
  s.preferences.sidebarCollapsed = collapsed;
}
