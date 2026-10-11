import {
  asStringArray,
  cellText,
  compareItems,
  EMPTY_TOKEN,
  filterTokens,
  getTag,
  GROUP_PSEUDO_COLUMN_ID,
  HAS_VALUE_TOKEN,
  NAME_COLUMN_ID,
  type UserIndex,
} from "./columns";
import { DATE_BUCKET_LABELS } from "./dates";
import type { Board, Column, Group, ID, Item, SortRule, ViewFilter } from "./types";

export interface VisibleGroup {
  group: Group;
  itemIds: ID[];
  /** Number of (non-archived) items in the group before filtering. */
  total: number;
}

export function emptyFilter(): ViewFilter {
  return { rules: {}, personId: null };
}

export function activeFilterCount(filter: ViewFilter): number {
  return Object.values(filter.rules).reduce((sum, tokens) => sum + tokens.length, 0);
}

export function isFiltering(filter: ViewFilter, search: string): boolean {
  return activeFilterCount(filter) > 0 || !!filter.personId || search.trim().length > 0;
}

export function itemMatchesSearch(board: Board, item: Item, query: string, users: UserIndex): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.name.toLowerCase().includes(q)) return true;
  for (const column of board.columns) {
    if (column.type === "last_updated") continue;
    if (cellText(column, item.values[column.id], { users, item }).toLowerCase().includes(q)) return true;
  }
  return false;
}

export function itemMatchesFilter(board: Board, item: Item, filter: ViewFilter, today: Date): boolean {
  for (const [key, tokens] of Object.entries(filter.rules)) {
    if (!tokens.length) continue;
    if (key === GROUP_PSEUDO_COLUMN_ID) {
      if (!tokens.includes(item.groupId)) return false;
      continue;
    }
    const column = board.columns.find((c) => c.id === key);
    if (!column) continue;
    const itemTokens = filterTokens(column, item, today);
    if (!itemTokens.some((t) => tokens.includes(t))) return false;
  }
  if (filter.personId) {
    const people = board.columns.filter((c) => c.type === "people");
    if (!people.some((c) => asStringArray(item.values[c.id]).includes(filter.personId!))) return false;
  }
  return true;
}

export function sortItemIds(board: Board, itemIds: ID[], items: Record<ID, Item>, sort: SortRule[], users: UserIndex): ID[] {
  const rules = sort
    .map((rule) => ({ rule, column: board.columns.find((c) => c.id === rule.columnId) }))
    .filter((r) => r.rule.columnId === NAME_COLUMN_ID || r.column);
  if (!rules.length) return itemIds;
  return itemIds.slice().sort((aId, bId) => {
    const a = items[aId];
    const b = items[bId];
    for (const { rule, column } of rules) {
      let result: number;
      if (rule.columnId === NAME_COLUMN_ID) {
        result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        if (rule.direction === "desc") result = -result;
      } else {
        result = compareItems(column as Column, a, b, users, rule.direction);
      }
      if (result !== 0) return result;
    }
    return 0;
  });
}

/** Items of every group after search, filters and sorting — what a view should render. */
export function visibleGroups(
  board: Board,
  items: Record<ID, Item>,
  options: { filter: ViewFilter; sort: SortRule[]; search: string; users: UserIndex; today: Date },
): VisibleGroup[] {
  return board.groups.map((group) => {
    const live = group.itemIds.filter((id) => items[id] && !items[id].archivedAt);
    const matching = live.filter((id) => {
      const item = items[id];
      return (
        itemMatchesFilter(board, item, options.filter, options.today) &&
        (itemMatchesSearch(board, item, options.search, options.users) ||
          group.title.toLowerCase().includes(options.search.trim().toLowerCase()))
      );
    });
    return {
      group,
      itemIds: options.sort.length ? sortItemIds(board, matching, items, options.sort, options.users) : matching,
      total: live.length,
    };
  });
}

export interface FilterOption {
  token: string;
  label: string;
  color?: string;
  userId?: ID;
  count: number;
}

const TIMELINE_TOKEN_LABELS: Record<string, string> = {
  active: "In progress",
  upcoming: "Upcoming",
  past: "Past",
};

/** The selectable values for a column's quick filter, with how many items match each. */
export function filterOptions(
  board: Board,
  key: string,
  items: Item[],
  users: UserIndex,
  today: Date,
): FilterOption[] {
  if (key === GROUP_PSEUDO_COLUMN_ID) {
    return board.groups.map((g) => ({
      token: g.id,
      label: g.title,
      color: g.color,
      count: items.filter((i) => i.groupId === g.id).length,
    }));
  }
  const column = board.columns.find((c) => c.id === key);
  if (!column) return [];
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const token of filterTokens(column, item, today)) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const count = (token: string) => counts.get(token) ?? 0;
  const emptyOption: FilterOption = { token: EMPTY_TOKEN, label: "Blank", count: count(EMPTY_TOKEN) };

  switch (column.type) {
    case "status":
      return [
        ...(column.settings.labels ?? []).map((l) => ({ token: l.id, label: l.name, color: l.color, count: count(l.id) })),
        emptyOption,
      ];
    case "people": {
      const ids = Array.from(counts.keys()).filter((t) => t !== EMPTY_TOKEN && users[t]);
      ids.sort((a, b) => users[a].name.localeCompare(users[b].name));
      return [...ids.map((id) => ({ token: id, label: users[id].name, userId: id, count: count(id) })), emptyOption];
    }
    case "tags": {
      const tags = (column.settings.tags ?? []).filter((t) => counts.has(t.id));
      return [
        ...tags.map((t) => ({ token: t.id, label: getTag(column, t.id)?.name ?? t.name, color: t.color, count: count(t.id) })),
        emptyOption,
      ];
    }
    case "date":
      return [
        ...(["overdue", "today", "this_week", "next_week", "later"] as const).map(
          (bucket): FilterOption => ({ token: bucket, label: DATE_BUCKET_LABELS[bucket], count: count(bucket) }),
        ),
        emptyOption,
      ];
    case "timeline":
      return [
        ...["active", "upcoming", "past"].map(
          (t): FilterOption => ({ token: t, label: TIMELINE_TOKEN_LABELS[t], count: count(t) }),
        ),
        emptyOption,
      ];
    case "checkbox":
      return [
        { token: "checked", label: "Checked", count: count("checked") },
        { token: "unchecked", label: "Unchecked", count: count("unchecked") },
      ];
    case "rating": {
      const max = column.settings.maxRating ?? 5;
      return Array.from({ length: max + 1 }, (_, i) => max - i).map((n) => ({
        token: String(n),
        label: n === 0 ? "No rating" : "★".repeat(n),
        count: count(String(n)),
      }));
    }
    case "numbers":
    case "text":
    case "link":
      return [{ token: HAS_VALUE_TOKEN, label: "Has a value", count: count(HAS_VALUE_TOKEN) }, emptyOption];
    case "last_updated":
      return [];
  }
}
