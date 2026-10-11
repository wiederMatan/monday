import { nextGroupColor } from "./colors";
import { COLUMN_TYPE_INFO, defaultSettings, priorityLabels } from "./columns";
import { addDaysISO, toISODate } from "./dates";
import type {
  AutomationAction,
  AutomationTrigger,
  Board,
  BoardView,
  CellValue,
  Column,
  ColumnType,
  ID,
  Item,
  NumberSummary,
  StatusLabel,
  Update,
  ViewType,
} from "./types";

export interface BuildContext {
  id: (prefix: string) => string;
  now: number;
  today: Date;
  userId: ID;
}

export interface ColumnSpec {
  key: string;
  type: ColumnType;
  title?: string;
  width?: number;
  /** status: custom labels as [name, color] */
  labels?: Array<[string, string]>;
  preset?: "priority";
  /** status: name of the label that means "done" */
  done?: string;
  /** tags: available tags as [name, color] */
  tags?: Array<[string, string]>;
  unit?: string;
  unitPosition?: "left" | "right";
  summary?: NumberSummary;
}

/**
 * Compact cell values, interpreted per column type:
 * status → label name, people → user ids, date → day offset from today (or ISO),
 * timeline → [startOffset, endOffset], tags → tag names, link → { url, text }.
 */
export type ValueSpec =
  | string
  | number
  | boolean
  | string[]
  | [number, number]
  | { url: string; text?: string }
  | null
  | undefined;

export interface ReplySpec {
  authorId: ID;
  body: string;
  hoursAgo: number;
  likes?: ID[];
}

export interface UpdateSpec {
  authorId: ID;
  body: string;
  hoursAgo: number;
  likes?: ID[];
  pinned?: boolean;
  replies?: ReplySpec[];
}

export interface SubitemSpec {
  name: string;
  /** Keyed by the default subitem columns: `owner`, `status`, `date`. */
  values?: Record<string, ValueSpec>;
  createdBy?: ID;
}

export interface ItemSpec {
  name: string;
  values?: Record<string, ValueSpec>;
  createdBy?: ID;
  /** How long ago the item was created (defaults to a few days). */
  daysAgo?: number;
  updates?: UpdateSpec[];
  subitems?: SubitemSpec[];
}

export interface GroupSpec {
  title: string;
  color?: string;
  collapsed?: boolean;
  items: ItemSpec[];
}

export interface BoardRefs {
  column(key: string): ID;
  label(columnKey: string, labelName: string): ID;
  group(title: string): ID;
}

export interface AutomationSpec {
  trigger: AutomationTrigger;
  action: AutomationAction;
  enabled?: boolean;
}

export interface BoardSpec {
  name: string;
  description?: string;
  itemNoun?: string;
  favorite?: boolean;
  memberIds?: ID[];
  columns: ColumnSpec[];
  groups: GroupSpec[];
  /** Extra views besides the main table. */
  views?: ViewType[];
  automations?: (refs: BoardRefs) => AutomationSpec[];
}

export interface BuiltBoard {
  board: Board;
  items: Item[];
  updates: Update[];
}

export const VIEW_NAMES: Record<ViewType, string> = {
  table: "Main table",
  kanban: "Kanban",
  calendar: "Calendar",
  timeline: "Timeline",
  chart: "Chart",
};

/** A view preconfigured with the board's first relevant columns. */
export function createView(board: Pick<Board, "columns">, type: ViewType, id: ID, name?: string): BoardView {
  const first = (t: ColumnType) => board.columns.find((c) => c.type === t)?.id;
  return {
    id,
    type,
    name: name ?? VIEW_NAMES[type],
    filter: { rules: {}, personId: null },
    sort: [],
    hiddenColumnIds: [],
    settings: {
      statusColumnId: first("status"),
      dateColumnId: first("date"),
      timelineColumnId: first("timeline"),
      peopleColumnId: first("people"),
      numbersColumnId: first("numbers"),
    },
  };
}

export function buildColumn(spec: Omit<ColumnSpec, "key">, ctx: Pick<BuildContext, "id">): Column {
  const info = COLUMN_TYPE_INFO[spec.type];
  const settings = defaultSettings(spec.type, ctx.id);
  let title = spec.title ?? info.defaultTitle;
  if (spec.type === "status") {
    let labels: StatusLabel[] | undefined;
    if (spec.preset === "priority") {
      labels = priorityLabels(ctx.id);
      title = spec.title ?? "Priority";
    } else if (spec.labels) {
      labels = spec.labels.map(([name, color]) => ({ id: ctx.id("lbl"), name, color }));
    }
    if (labels) {
      settings.labels = labels;
      settings.doneLabelId =
        spec.preset === "priority" ? null : (labels.find((l) => l.name === (spec.done ?? "Done"))?.id ?? null);
    }
  }
  if (spec.type === "tags" && spec.tags) {
    settings.tags = spec.tags.map(([name, color]) => ({ id: ctx.id("tag"), name, color }));
  }
  if (spec.type === "numbers") {
    if (spec.unit !== undefined) settings.unit = spec.unit;
    if (spec.unitPosition) settings.unitPosition = spec.unitPosition;
    if (spec.summary) settings.summary = spec.summary;
  }
  // Wide enough for the header text, so long titles don't truncate by default.
  const fitted = Math.min(260, Math.round(title.length * 7.5 + 64));
  return { id: ctx.id("col"), type: spec.type, title, width: spec.width ?? Math.max(info.defaultWidth, fitted), settings };
}

/** Every board starts with Owner / Status / Date on its subitems, like monday. */
export function defaultSubitemColumns(ctx: Pick<BuildContext, "id">): { columns: Column[]; byKey: Map<string, Column> } {
  const specs: Array<Omit<ColumnSpec, "key"> & { key: string }> = [
    { key: "owner", type: "people", title: "Owner" },
    { key: "status", type: "status" },
    { key: "date", type: "date", title: "Date" },
  ];
  const byKey = new Map<string, Column>();
  const columns = specs.map(({ key, ...spec }) => {
    const column = buildColumn(spec, ctx);
    byKey.set(key, column);
    return column;
  });
  return { columns, byKey };
}

function resolveValue(column: Column, value: ValueSpec, today: Date): CellValue {
  if (value === null || value === undefined) return null;
  const todayIso = toISODate(today);
  switch (column.type) {
    case "status": {
      const label = column.settings.labels?.find((l) => l.name === value);
      return label?.id ?? null;
    }
    case "people":
      return Array.isArray(value) ? (value as string[]).slice() : [];
    case "date":
      if (typeof value === "number") return addDaysISO(todayIso, value);
      return typeof value === "string" ? value : null;
    case "timeline":
      if (Array.isArray(value) && typeof value[0] === "number") {
        const [a, b] = value as [number, number];
        return { start: addDaysISO(todayIso, a), end: addDaysISO(todayIso, b) };
      }
      return null;
    case "numbers":
      return typeof value === "number" ? value : null;
    case "text":
      return typeof value === "string" ? value : "";
    case "tags": {
      const names = Array.isArray(value) ? (value as string[]) : [];
      return names
        .map((name) => column.settings.tags?.find((t) => t.name === name)?.id)
        .filter((id): id is string => !!id);
    }
    case "checkbox":
      return value === true;
    case "rating":
      return typeof value === "number" ? value : 0;
    case "link":
      if (typeof value === "object" && !Array.isArray(value) && value && "url" in value) {
        return { url: value.url, text: value.text ?? "" };
      }
      return null;
    case "last_updated":
      return null;
  }
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function buildBoard(spec: BoardSpec, workspaceId: ID, ctx: BuildContext): BuiltBoard {
  const boardId = ctx.id("board");
  const columnsByKey = new Map<string, Column>();
  const columns = spec.columns.map((colSpec) => {
    const column = buildColumn(colSpec, ctx);
    columnsByKey.set(colSpec.key, column);
    return column;
  });

  const items: Item[] = [];
  const updates: Update[] = [];
  const usedColors: string[] = [];
  const subitemColumns = defaultSubitemColumns(ctx);
  let itemIndex = 0;

  const groups = spec.groups.map((groupSpec) => {
    const color = groupSpec.color ?? nextGroupColor(usedColors);
    usedColors.push(color);
    const groupId = ctx.id("group");
    const itemIds: ID[] = [];
    for (const itemSpec of groupSpec.items) {
      const itemId = ctx.id("item");
      const values: Record<ID, CellValue> = {};
      for (const [key, raw] of Object.entries(itemSpec.values ?? {})) {
        const column = columnsByKey.get(key);
        if (column) values[column.id] = resolveValue(column, raw, ctx.today);
      }
      const createdBy = itemSpec.createdBy ?? ctx.userId;
      // Stagger creation times so "last updated" and the activity log look natural.
      const createdAt = ctx.now - (itemSpec.daysAgo ?? 3) * DAY - itemIndex * 7 * 60 * 1000;
      itemIndex += 1;
      const subitemIds: ID[] = [];
      for (const subSpec of itemSpec.subitems ?? []) {
        const subId = ctx.id("item");
        const subValues: Record<ID, CellValue> = {};
        for (const [key, raw] of Object.entries(subSpec.values ?? {})) {
          const column = subitemColumns.byKey.get(key);
          if (column) subValues[column.id] = resolveValue(column, raw, ctx.today);
        }
        const subCreatedBy = subSpec.createdBy ?? createdBy;
        items.push({
          id: subId,
          boardId,
          groupId,
          name: subSpec.name,
          values: subValues,
          createdAt: createdAt + 60 * 60 * 1000,
          createdBy: subCreatedBy,
          updatedAt: createdAt + 60 * 60 * 1000,
          updatedBy: subCreatedBy,
          archivedAt: null,
          parentId: itemId,
        });
        subitemIds.push(subId);
      }
      items.push({
        id: itemId,
        boardId,
        groupId,
        name: itemSpec.name,
        values,
        createdAt,
        createdBy,
        updatedAt: createdAt,
        updatedBy: createdBy,
        archivedAt: null,
        subitemIds,
      });
      itemIds.push(itemId);
      for (const updateSpec of itemSpec.updates ?? []) {
        updates.push({
          id: ctx.id("upd"),
          boardId,
          itemId,
          authorId: updateSpec.authorId,
          body: updateSpec.body,
          createdAt: ctx.now - updateSpec.hoursAgo * HOUR,
          editedAt: null,
          likes: updateSpec.likes ?? [],
          pinned: updateSpec.pinned ?? false,
          replies: (updateSpec.replies ?? []).map((r) => ({
            id: ctx.id("rep"),
            authorId: r.authorId,
            body: r.body,
            createdAt: ctx.now - r.hoursAgo * HOUR,
            likes: r.likes ?? [],
          })),
        });
      }
    }
    return { id: groupId, title: groupSpec.title, color, collapsed: groupSpec.collapsed ?? false, itemIds };
  });

  const board: Board = {
    id: boardId,
    workspaceId,
    name: spec.name,
    description: spec.description ?? "",
    favorite: spec.favorite ?? false,
    columns,
    groups,
    views: [],
    automations: [],
    memberIds: spec.memberIds ?? [ctx.userId],
    ownerId: ctx.userId,
    itemNoun: spec.itemNoun ?? "item",
    subitemColumns: subitemColumns.columns,
    createdAt: ctx.now - 14 * DAY,
    updatedAt: ctx.now,
  };

  board.views = [createView(board, "table", ctx.id("view")), ...(spec.views ?? []).map((t) => createView(board, t, ctx.id("view")))];

  if (spec.automations) {
    const refs: BoardRefs = {
      column: (key) => {
        const column = columnsByKey.get(key);
        if (!column) throw new Error(`Unknown column key "${key}"`);
        return column.id;
      },
      label: (columnKey, labelName) => {
        const label = columnsByKey.get(columnKey)?.settings.labels?.find((l) => l.name === labelName);
        if (!label) throw new Error(`Unknown label "${labelName}" in "${columnKey}"`);
        return label.id;
      },
      group: (title) => {
        const group = groups.find((g) => g.title === title);
        if (!group) throw new Error(`Unknown group "${title}"`);
        return group.id;
      },
    };
    board.automations = spec.automations(refs).map((a) => ({
      id: ctx.id("auto"),
      enabled: a.enabled ?? true,
      trigger: a.trigger,
      action: a.action,
      createdAt: ctx.now - 7 * DAY,
      createdBy: ctx.userId,
      runs: 0,
      lastRunAt: null,
    }));
  }

  return { board, items, updates };
}
