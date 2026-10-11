export type ID = string;

export type ColumnType =
  | "status"
  | "people"
  | "date"
  | "timeline"
  | "numbers"
  | "text"
  | "tags"
  | "checkbox"
  | "rating"
  | "link"
  | "last_updated";

export interface StatusLabel {
  id: ID;
  name: string;
  color: string;
}

export interface TagOption {
  id: ID;
  name: string;
  color: string;
}

export type NumberSummary = "sum" | "avg" | "min" | "max" | "count" | "none";

export interface ColumnSettings {
  /** status: ordered labels. A `null` cell value renders as the blank default label. */
  labels?: StatusLabel[];
  /** status: the label that marks an item as done (drives My Work, overdue flags and charts). */
  doneLabelId?: ID | null;
  /** numbers */
  unit?: string;
  unitPosition?: "left" | "right";
  summary?: NumberSummary;
  /** rating */
  maxRating?: number;
  /** tags */
  tags?: TagOption[];
}

export interface Column {
  id: ID;
  type: ColumnType;
  title: string;
  width: number;
  settings: ColumnSettings;
}

/** Inclusive date range, both ends formatted as `yyyy-MM-dd`. */
export interface Timeline {
  start: string;
  end: string;
}

export interface LinkValue {
  url: string;
  text: string;
}

/**
 * Cell values by column type:
 * status → label id | null, people → user ids, date → `yyyy-MM-dd` | null,
 * timeline → Timeline | null, numbers → number | null, text → string,
 * tags → tag ids, checkbox → boolean, rating → number, link → LinkValue | null.
 */
export type CellValue =
  | string
  | number
  | boolean
  | string[]
  | Timeline
  | LinkValue
  | null
  | undefined;

export interface Item {
  id: ID;
  boardId: ID;
  groupId: ID;
  name: string;
  values: Record<ID, CellValue>;
  createdAt: number;
  createdBy: ID;
  updatedAt: number;
  updatedBy: ID;
  /** Archived items are kept (restorable) but removed from their group's ordering. */
  archivedAt?: number | null;
  /** Set on subitems: the item they belong to. Subitems never appear in `Group.itemIds`. */
  parentId?: ID | null;
  /** Ordered ids of this item's (non-archived) subitems. */
  subitemIds?: ID[];
}

export interface Group {
  id: ID;
  title: string;
  color: string;
  collapsed: boolean;
  itemIds: ID[];
}

export type ViewType = "table" | "kanban" | "calendar" | "timeline" | "chart";

/** Quick-filter selections: column id (or a pseudo column like `__group`) → selected tokens. */
export interface ViewFilter {
  rules: Record<string, string[]>;
  personId: ID | null;
}

export interface SortRule {
  /** A column id, or `__name` for the item name. */
  columnId: ID;
  direction: "asc" | "desc";
}

export interface ViewSettings {
  statusColumnId?: ID;
  dateColumnId?: ID;
  timelineColumnId?: ID;
  peopleColumnId?: ID;
  numbersColumnId?: ID;
}

export interface BoardView {
  id: ID;
  type: ViewType;
  name: string;
  filter: ViewFilter;
  sort: SortRule[];
  hiddenColumnIds: ID[];
  settings: ViewSettings;
}

export type AutomationTrigger =
  | { type: "status_changes"; columnId: ID; labelId: ID | null }
  | { type: "item_created" }
  | { type: "person_assigned"; columnId: ID };

export type AutomationAction =
  | { type: "move_to_group"; groupId: ID }
  | { type: "set_status"; columnId: ID; labelId: ID }
  | { type: "assign_person"; columnId: ID; userId: ID }
  | { type: "set_date_today"; columnId: ID }
  | { type: "notify"; userId: ID }
  | { type: "archive_item" };

export interface Automation {
  id: ID;
  enabled: boolean;
  trigger: AutomationTrigger;
  action: AutomationAction;
  createdAt: number;
  createdBy: ID;
  runs: number;
  lastRunAt: number | null;
}

export interface Board {
  id: ID;
  workspaceId: ID;
  name: string;
  description: string;
  favorite: boolean;
  columns: Column[];
  groups: Group[];
  views: BoardView[];
  automations: Automation[];
  memberIds: ID[];
  ownerId: ID;
  /** Singular noun for items on this board, e.g. "task", "bug", "deal". */
  itemNoun: string;
  /** Width of the item-name column in the table, in px. */
  nameWidth?: number;
  /** Columns shown on subitems (monday's "subitems board"). */
  subitemColumns?: Column[];
  createdAt: number;
  updatedAt: number;
}

export interface Reply {
  id: ID;
  authorId: ID;
  body: string;
  createdAt: number;
  likes: ID[];
}

export interface Update {
  id: ID;
  boardId: ID;
  itemId: ID;
  authorId: ID;
  body: string;
  createdAt: number;
  editedAt: number | null;
  likes: ID[];
  replies: Reply[];
  pinned: boolean;
}

export type ActivityKind =
  | "item_created"
  | "item_deleted"
  | "item_archived"
  | "item_restored"
  | "item_renamed"
  | "item_moved"
  | "item_duplicated"
  | "value_changed"
  | "group_created"
  | "group_deleted"
  | "group_renamed"
  | "column_created"
  | "column_deleted"
  | "board_created"
  | "automation_ran"
  | "update_posted";

export interface Activity {
  id: ID;
  boardId: ID;
  itemId: ID | null;
  itemName: string | null;
  userId: ID;
  kind: ActivityKind;
  createdAt: number;
  columnId?: ID;
  columnTitle?: string;
  columnType?: ColumnType;
  /** Human readable before/after values. */
  from?: string;
  to?: string;
  /** Status label colors, so the log can render colored pills even after labels change. */
  fromColor?: string;
  toColor?: string;
  text?: string;
}

export type NotificationKind = "mention" | "assigned" | "automation" | "reply" | "update";

export interface AppNotification {
  id: ID;
  actorId: ID;
  kind: NotificationKind;
  text: string;
  boardId: ID | null;
  itemId: ID | null;
  createdAt: number;
  read: boolean;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  title: string;
  color: string;
}

export interface Workspace {
  id: ID;
  name: string;
  color: string;
}

export type ThemeName = "light" | "dark" | "night";

export interface Preferences {
  theme: ThemeName;
  sidebarCollapsed: boolean;
}

export interface DataState {
  schemaVersion: number;
  currentUserId: ID;
  users: User[];
  workspaces: Workspace[];
  activeWorkspaceId: ID;
  boards: Record<ID, Board>;
  boardOrder: ID[];
  items: Record<ID, Item>;
  updates: Record<ID, Update>;
  /** Newest first, capped. */
  activity: Activity[];
  /** Newest first. */
  notifications: AppNotification[];
  recentBoardIds: ID[];
  preferences: Preferences;
}
