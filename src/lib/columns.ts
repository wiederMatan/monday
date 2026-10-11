import { EMPTY_LABEL_COLOR, PALETTE } from "./colors";
import { formatDate, formatTimeline, fromISODate, isValidISODate, timeAgo, dateBucket } from "./dates";
import type {
  Board,
  CellValue,
  Column,
  ColumnSettings,
  ColumnType,
  ID,
  Item,
  LinkValue,
  StatusLabel,
  TagOption,
  Timeline,
  User,
} from "./types";
import { formatNumber } from "./utils";

export interface ColumnTypeInfo {
  type: ColumnType;
  label: string;
  description: string;
  defaultTitle: string;
  defaultWidth: number;
}

export const COLUMN_TYPES: ColumnTypeInfo[] = [
  { type: "status", label: "Status", description: "Track where every item stands", defaultTitle: "Status", defaultWidth: 140 },
  { type: "people", label: "People", description: "Assign owners and collaborators", defaultTitle: "Person", defaultWidth: 120 },
  { type: "date", label: "Date", description: "Deadlines and key dates", defaultTitle: "Date", defaultWidth: 130 },
  { type: "timeline", label: "Timeline", description: "A start and end date", defaultTitle: "Timeline", defaultWidth: 170 },
  { type: "numbers", label: "Numbers", description: "Budgets, estimates, scores", defaultTitle: "Numbers", defaultWidth: 120 },
  { type: "text", label: "Text", description: "Free-form text", defaultTitle: "Text", defaultWidth: 180 },
  { type: "tags", label: "Tags", description: "Categorize with colored tags", defaultTitle: "Tags", defaultWidth: 170 },
  { type: "checkbox", label: "Checkbox", description: "Check things off", defaultTitle: "Check", defaultWidth: 100 },
  { type: "rating", label: "Rating", description: "Rate anything with stars", defaultTitle: "Rating", defaultWidth: 140 },
  { type: "link", label: "Link", description: "Link to any website", defaultTitle: "Link", defaultWidth: 160 },
  { type: "last_updated", label: "Last updated", description: "Who changed the item last, and when", defaultTitle: "Last updated", defaultWidth: 150 },
];

export const COLUMN_TYPE_INFO: Record<ColumnType, ColumnTypeInfo> = Object.fromEntries(
  COLUMN_TYPES.map((info) => [info.type, info]),
) as Record<ColumnType, ColumnTypeInfo>;

export const NAME_COLUMN_ID = "__name";
export const GROUP_PSEUDO_COLUMN_ID = "__group";
export const EMPTY_TOKEN = "__empty";
export const HAS_VALUE_TOKEN = "__has_value";

type IdGen = (prefix: string) => string;

export function defaultStatusLabels(idGen: IdGen): StatusLabel[] {
  return [
    { id: idGen("lbl"), name: "Working on it", color: PALETTE.workingOrange },
    { id: idGen("lbl"), name: "Done", color: PALETTE.doneGreen },
    { id: idGen("lbl"), name: "Stuck", color: PALETTE.stuckRed },
  ];
}

export function priorityLabels(idGen: IdGen): StatusLabel[] {
  return [
    { id: idGen("lbl"), name: "Critical ⚠️", color: PALETTE.blackish },
    { id: idGen("lbl"), name: "High", color: PALETTE.darkIndigo },
    { id: idGen("lbl"), name: "Medium", color: PALETTE.indigo },
    { id: idGen("lbl"), name: "Low", color: PALETTE.brightBlue },
  ];
}

export function defaultSettings(type: ColumnType, idGen: IdGen): ColumnSettings {
  switch (type) {
    case "status": {
      const labels = defaultStatusLabels(idGen);
      return { labels, doneLabelId: labels[1].id };
    }
    case "numbers":
      return { unit: "", unitPosition: "left", summary: "sum" };
    case "rating":
      return { maxRating: 5 };
    case "tags":
      return { tags: [] };
    default:
      return {};
  }
}

export type UserIndex = Record<ID, User>;

export function indexUsers(users: User[]): UserIndex {
  const index: UserIndex = {};
  for (const user of users) index[user.id] = user;
  return index;
}

export function getLabel(column: Column, labelId: unknown): StatusLabel | undefined {
  if (typeof labelId !== "string") return undefined;
  return column.settings.labels?.find((l) => l.id === labelId);
}

export function getTag(column: Column, tagId: string): TagOption | undefined {
  return column.settings.tags?.find((t) => t.id === tagId);
}

export function asStringArray(value: CellValue): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function asTimeline(value: CellValue): Timeline | null {
  if (value && typeof value === "object" && !Array.isArray(value) && "start" in value) {
    const t = value as Timeline;
    if (isValidISODate(t.start) && isValidISODate(t.end)) return t;
  }
  return null;
}

export function asLink(value: CellValue): LinkValue | null {
  if (value && typeof value === "object" && !Array.isArray(value) && "url" in value) {
    const link = value as LinkValue;
    return link.url ? link : null;
  }
  return null;
}

export function asNumber(value: CellValue): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asDate(value: CellValue): string | null {
  return isValidISODate(value) ? value : null;
}

export function isEmptyValue(column: Column, value: CellValue): boolean {
  switch (column.type) {
    case "status":
      return !getLabel(column, value);
    case "people":
    case "tags":
      return asStringArray(value).length === 0;
    case "date":
      return asDate(value) === null;
    case "timeline":
      return asTimeline(value) === null;
    case "numbers":
      return asNumber(value) === null;
    case "text":
      return typeof value !== "string" || value.trim() === "";
    case "checkbox":
      return value !== true;
    case "rating":
      return !(typeof value === "number" && value > 0);
    case "link":
      return asLink(value) === null;
    case "last_updated":
      return false;
  }
}

export function formatNumberValue(column: Column, value: number): string {
  const unit = column.settings.unit ?? "";
  const formatted = formatNumber(value);
  if (!unit) return formatted;
  if (column.settings.unitPosition !== "right") return `${unit}${formatted}`;
  return unit === "%" ? `${formatted}%` : `${formatted} ${unit}`;
}

export interface CellTextContext {
  users: UserIndex;
  item?: Item;
  /** `export` prefers machine-friendly output (ISO dates, raw URLs). */
  mode?: "display" | "export";
}

/** Plain-text rendering of a cell, used for search, CSV export and the activity log. */
export function cellText(column: Column, value: CellValue, ctx: CellTextContext): string {
  const exporting = ctx.mode === "export";
  switch (column.type) {
    case "status":
      return getLabel(column, value)?.name ?? "";
    case "people":
      return asStringArray(value)
        .map((id) => ctx.users[id]?.name)
        .filter(Boolean)
        .join(", ");
    case "date": {
      const date = asDate(value);
      if (!date) return "";
      return exporting ? date : formatDate(date);
    }
    case "timeline": {
      const t = asTimeline(value);
      if (!t) return "";
      return exporting ? `${t.start} - ${t.end}` : formatTimeline(t);
    }
    case "numbers": {
      const n = asNumber(value);
      if (n === null) return "";
      return exporting ? String(n) : formatNumberValue(column, n);
    }
    case "text":
      return typeof value === "string" ? value : "";
    case "tags":
      return asStringArray(value)
        .map((id) => getTag(column, id)?.name)
        .filter(Boolean)
        .join(", ");
    case "checkbox":
      return value === true ? (exporting ? "Yes" : "✓") : "";
    case "rating": {
      const n = typeof value === "number" ? value : 0;
      if (!n) return "";
      return exporting ? String(n) : `${n}/${column.settings.maxRating ?? 5}`;
    }
    case "link": {
      const link = asLink(value);
      if (!link) return "";
      return exporting ? link.url : link.text || link.url;
    }
    case "last_updated": {
      const item = ctx.item;
      if (!item) return "";
      const who = ctx.users[item.updatedBy]?.name ?? "";
      return exporting ? new Date(item.updatedAt).toISOString() : `${who} · ${timeAgo(item.updatedAt)}`;
    }
  }
}

/** The value a cell sorts by. Empty cells are handled by the caller. */
function sortKey(column: Column, item: Item, users: UserIndex): number | string {
  const value = item.values[column.id];
  switch (column.type) {
    case "status": {
      const index = column.settings.labels?.findIndex((l) => l.id === value) ?? -1;
      return index;
    }
    case "people":
      return users[asStringArray(value)[0]]?.name.toLowerCase() ?? "";
    case "tags": {
      const first = asStringArray(value)[0];
      return first ? (getTag(column, first)?.name.toLowerCase() ?? "") : "";
    }
    case "date":
      return asDate(value) ?? "";
    case "timeline":
      return asTimeline(value)?.start ?? "";
    case "numbers":
      return asNumber(value) ?? 0;
    case "text":
      return typeof value === "string" ? value.toLowerCase() : "";
    case "checkbox":
      return value === true ? 1 : 0;
    case "rating":
      return typeof value === "number" ? value : 0;
    case "link": {
      const link = asLink(value);
      return (link?.text || link?.url || "").toLowerCase();
    }
    case "last_updated":
      return item.updatedAt;
  }
}

/** Ascending comparison; empty cells always sort last. */
export function compareItems(column: Column, a: Item, b: Item, users: UserIndex, direction: "asc" | "desc"): number {
  const aEmpty = column.type !== "last_updated" && column.type !== "checkbox" && isEmptyValue(column, a.values[column.id]);
  const bEmpty = column.type !== "last_updated" && column.type !== "checkbox" && isEmptyValue(column, b.values[column.id]);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  const ka = sortKey(column, a, users);
  const kb = sortKey(column, b, users);
  let result: number;
  if (typeof ka === "number" && typeof kb === "number") result = ka - kb;
  else result = String(ka).localeCompare(String(kb), undefined, { numeric: true });
  return direction === "asc" ? result : -result;
}

export type TimelineToken = "active" | "upcoming" | "past";

/** Quick-filter tokens that an item's cell matches. */
export function filterTokens(column: Column, item: Item, today: Date): string[] {
  const value = item.values[column.id];
  switch (column.type) {
    case "status":
      return [getLabel(column, value)?.id ?? EMPTY_TOKEN];
    case "people":
    case "tags": {
      const ids = asStringArray(value);
      return ids.length ? ids : [EMPTY_TOKEN];
    }
    case "date": {
      const bucket = dateBucket(asDate(value), today);
      return [bucket === "none" ? EMPTY_TOKEN : bucket];
    }
    case "timeline": {
      const t = asTimeline(value);
      if (!t) return [EMPTY_TOKEN];
      const start = fromISODate(t.start);
      const end = fromISODate(t.end);
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (end < day) return ["past"];
      if (start > day) return ["upcoming"];
      return ["active"];
    }
    case "checkbox":
      return [value === true ? "checked" : "unchecked"];
    case "rating":
      return [String(typeof value === "number" ? value : 0)];
    case "numbers":
    case "text":
    case "link":
      return [isEmptyValue(column, value) ? EMPTY_TOKEN : HAS_VALUE_TOKEN];
    case "last_updated":
      return [];
  }
}

export function isFilterable(column: Column): boolean {
  return column.type !== "last_updated";
}

/** The columns that apply to an item: the board's, or its subitem columns for subitems. */
export function columnsFor(board: Board, item: Pick<Item, "parentId">): Column[] {
  return item.parentId ? (board.subitemColumns ?? []) : board.columns;
}

/** Finds a column among the board's item columns or its subitem columns. */
export function findColumn(board: Board, columnId: ID): { column: Column; list: Column[]; subitems: boolean } | null {
  const main = board.columns.find((c) => c.id === columnId);
  if (main) return { column: main, list: board.columns, subitems: false };
  const sub = board.subitemColumns?.find((c) => c.id === columnId);
  if (sub && board.subitemColumns) return { column: sub, list: board.subitemColumns, subitems: true };
  return null;
}

/** Whether the item's first status column (with a configured done label) is marked done. */
export function isItemDone(board: Board, item: Item): boolean {
  for (const column of columnsFor(board, item)) {
    if (column.type === "status" && column.settings.doneLabelId) {
      return item.values[column.id] === column.settings.doneLabelId;
    }
  }
  return false;
}

export function primaryColumn(board: Board, type: ColumnType): Column | undefined {
  return board.columns.find((c) => c.type === type);
}

export interface DistributionSegment {
  key: string;
  name: string;
  color: string;
  count: number;
}

export function statusDistribution(column: Column, items: Item[]): DistributionSegment[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(column, item.values[column.id]);
    const key = label?.id ?? EMPTY_TOKEN;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const segments: DistributionSegment[] = [];
  for (const label of column.settings.labels ?? []) {
    const count = counts.get(label.id);
    if (count) segments.push({ key: label.id, name: label.name, color: label.color, count });
  }
  const empty = counts.get(EMPTY_TOKEN);
  if (empty) segments.push({ key: EMPTY_TOKEN, name: "Not set", color: EMPTY_LABEL_COLOR, count: empty });
  return segments;
}

export function numbersSummary(column: Column, items: Item[]): number | null {
  const values = items.map((i) => asNumber(i.values[column.id])).filter((n): n is number => n !== null);
  const mode = column.settings.summary ?? "sum";
  if (mode === "none") return null;
  if (mode === "count") return values.length;
  if (values.length === 0) return mode === "sum" ? 0 : null;
  switch (mode) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

export function dateRange(column: Column, items: Item[]): Timeline | null {
  let start: string | null = null;
  let end: string | null = null;
  for (const item of items) {
    const value = item.values[column.id];
    const range: Timeline | null =
      column.type === "timeline" ? asTimeline(value) : asDate(value) ? { start: value as string, end: value as string } : null;
    if (!range) continue;
    if (!start || range.start < start) start = range.start;
    if (!end || range.end > end) end = range.end;
  }
  return start && end ? { start, end } : null;
}
