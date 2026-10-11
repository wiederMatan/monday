"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  EyeOff,
  Filter,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { COLUMN_ICONS } from "@/components/cells/meta";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { asStringArray, GROUP_PSEUDO_COLUMN_ID, isFilterable, NAME_COLUMN_ID } from "@/lib/columns";
import { activeFilterCount, filterOptions, visibleGroups, type FilterOption } from "@/lib/filters";
import { useBoardItems, useItemPanel, useToday, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, BoardView, ID, SortRule, User } from "@/lib/types";
import { setEditItemId, setSearch, useUI } from "@/lib/ui";
import { capitalize, cn, plural } from "@/lib/utils";
import { AutomationsDialog } from "./AutomationsDialog";

function ToolbarButton({
  icon: Icon,
  children,
  active = false,
  className,
  ...props
}: React.ComponentProps<"button"> & { icon: typeof Search; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] px-2 text-sm transition-colors",
        active ? "bg-primary-soft text-fg" : "hover:bg-hover",
        className,
      )}
      {...props}
    >
      <Icon size={16} className={active ? "text-primary" : "text-fg-muted"} />
      {children}
    </button>
  );
}

export function BoardToolbar({ board, view }: { board: Board; view: BoardView }) {
  const panel = useItemPanel();
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const activeAutomations = board.automations.filter((a) => a.enabled).length;
  const noun = board.itemNoun;

  const addNewItem = () => {
    const group = board.groups[0];
    if (!group) return;
    const id = actions.addItem(board.id, group.id, { name: `New ${noun}`, position: "top" });
    if (!id) return;
    if (group.collapsed) actions.setGroupCollapsed(board.id, group.id, false);
    if (view.type === "table") setEditItemId(id);
    else panel.open(id);
  };

  return (
    <div className="flex items-center gap-1 px-8 py-3">
      <div className="flex shrink-0">
        <button
          type="button"
          onClick={addNewItem}
          className="h-8 rounded-l-[4px] bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
        >
          New {noun}
        </button>
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label="More ways to add"
              className="flex h-8 items-center rounded-r-[4px] border-l border-white/30 bg-primary px-1.5 text-white hover:bg-primary-hover"
            >
              <ChevronDown size={16} />
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon={Plus} onSelect={addNewItem}>
              New {noun}
            </MenuItem>
            <MenuItem icon={FolderPlus} onSelect={() => actions.addGroup(board.id, { position: "top" })}>
              New group of {plural(noun)}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div className="ml-2 flex min-w-0 items-center gap-0.5 overflow-x-auto">
        <SearchBox boardId={board.id} />
        <PersonFilter board={board} view={view} />
        <FilterButton board={board} view={view} />
        {view.type !== "calendar" && view.type !== "chart" ? <SortButton board={board} view={view} /> : null}
        {view.type === "table" ? <HideButton board={board} view={view} /> : null}
      </div>
      <div className="ml-auto shrink-0 pl-2">
        <ToolbarButton icon={Zap} onClick={() => setAutomationsOpen(true)} active={automationsOpen}>
          Automate{activeAutomations ? ` / ${activeAutomations}` : ""}
        </ToolbarButton>
      </div>
      <AutomationsDialog board={board} open={automationsOpen} onOpenChange={setAutomationsOpen} />
    </div>
  );
}

function SearchBox({ boardId }: { boardId: ID }) {
  const search = useUI((s) => s.search[boardId] ?? "");
  const [expanded, setExpanded] = useState(false);

  if (!expanded && !search) {
    return (
      <ToolbarButton icon={Search} onClick={() => setExpanded(true)}>
        Search
      </ToolbarButton>
    );
  }
  return (
    <div className="flex h-8 w-52 shrink-0 items-center gap-1.5 rounded-[4px] border border-primary px-2">
      <Search size={15} className="text-fg-muted" />
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(boardId, e.target.value)}
        onBlur={() => {
          if (!search) setExpanded(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSearch(boardId, "");
            setExpanded(false);
          }
        }}
        placeholder="Search this board"
        aria-label="Search this board"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      {search ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setSearch(boardId, "");
            setExpanded(false);
          }}
          className="text-fg-muted hover:text-fg"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

function PersonFilter({ board, view }: { board: Board; view: BoardView }) {
  const items = useBoardItems(board.id);
  const users = useUserIndex();
  const personId = view.filter.personId;
  const person = personId ? users[personId] : undefined;

  const people = useMemo(() => {
    const ids = new Set<ID>(board.memberIds);
    for (const column of board.columns) {
      if (column.type !== "people") continue;
      for (const item of items) for (const id of asStringArray(item.values[column.id])) ids.add(id);
    }
    return Array.from(ids)
      .map((id) => users[id])
      .filter((u): u is User => !!u)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [board, items, users]);

  const setPerson = (id: ID | null) => actions.updateView(board.id, view.id, { filter: { ...view.filter, personId: id } });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] px-2 text-sm transition-colors",
            person ? "bg-primary-soft" : "hover:bg-hover",
          )}
        >
          {person ? <Avatar user={person} size={20} /> : <UserRound size={16} className="text-fg-muted" />}
          Person
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-medium">Filter by person</h3>
          {person ? (
            <button type="button" onClick={() => setPerson(null)} className="text-xs text-primary hover:underline">
              Clear
            </button>
          ) : null}
        </div>
        <p className="mb-3 text-xs text-fg-muted">Show {plural(board.itemNoun)} assigned to one person in any people column.</p>
        <div className="flex flex-wrap gap-1.5">
          {people.map((u) => (
            <button
              key={u.id}
              type="button"
              aria-pressed={personId === u.id}
              aria-label={u.name}
              title={u.name}
              onClick={() => setPerson(personId === u.id ? null : u.id)}
              className={cn("rounded-full p-0.5 transition-opacity", personId === u.id ? "ring-2 ring-primary" : personId ? "opacity-40 hover:opacity-100" : "hover:opacity-80")}
            >
              <Avatar user={u} size={32} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionSwatch({ option, users }: { option: FilterOption; users: Record<ID, User> }) {
  if (option.userId) return <Avatar user={users[option.userId]} size={18} />;
  if (option.color) return <span className="size-3.5 shrink-0 rounded-[3px]" style={{ background: option.color }} />;
  return null;
}

function FilterButton({ board, view }: { board: Board; view: BoardView }) {
  const items = useBoardItems(board.id);
  const users = useUserIndex();
  const today = useToday();
  const allItems = useStore((s) => s.items);
  const search = useUI((s) => s.search[board.id] ?? "");
  const count = activeFilterCount(view.filter);

  const shown = useMemo(
    () =>
      visibleGroups(board, allItems, { filter: view.filter, sort: [], search, users, today }).reduce((n, g) => n + g.itemIds.length, 0),
    [board, allItems, view.filter, search, users, today],
  );

  const keys = [GROUP_PSEUDO_COLUMN_ID, ...board.columns.filter(isFilterable).map((c) => c.id)];
  const toggle = (key: string, token: string) => {
    const current = view.filter.rules[key] ?? [];
    const next = current.includes(token) ? current.filter((t) => t !== token) : [...current, token];
    const rules = { ...view.filter.rules, [key]: next };
    if (!next.length) delete rules[key];
    actions.updateView(board.id, view.id, { filter: { ...view.filter, rules } });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton icon={Filter} active={count > 0}>
          Filter{count ? ` / ${count}` : ""}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent className="w-[min(1120px,calc(100vw-40px))] p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium">Quick filters</h3>
            <p className="text-xs text-fg-muted">
              Showing {shown} of {items.length} {plural(board.itemNoun)}
            </p>
          </div>
          {count ? (
            <button
              type="button"
              onClick={() => actions.updateView(board.id, view.id, { filter: { ...view.filter, rules: {} } })}
              className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-hover"
            >
              Clear all
            </button>
          ) : null}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {keys.map((key) => {
            const column = board.columns.find((c) => c.id === key);
            const options = filterOptions(board, key, items, users, today);
            const selected = view.filter.rules[key] ?? [];
            const Icon = column ? COLUMN_ICONS[column.type] : FolderPlus;
            return (
              <div key={key} className="w-40 shrink-0">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                  <Icon size={13} />
                  <span className="truncate">{column?.title ?? "Group"}</span>
                </div>
                <div className="flex max-h-64 flex-col gap-1 overflow-auto">
                  {options.map((option) => {
                    const on = selected.includes(option.token);
                    return (
                      <button
                        key={option.token}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(key, option.token)}
                        className={cn(
                          "flex h-8 shrink-0 items-center gap-2 rounded px-2 text-left text-[13px] transition-colors",
                          on ? "bg-primary-soft ring-1 ring-primary" : "bg-sunken hover:bg-hover",
                          option.count === 0 && !on && "opacity-50",
                        )}
                      >
                        <OptionSwatch option={option} users={users} />
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        <span className="text-xs text-fg-muted">{option.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SELECT =
  "h-8 rounded-[4px] border border-line-strong bg-surface px-2 text-sm outline-none hover:border-fg-muted focus:border-primary";

function SortButton({ board, view }: { board: Board; view: BoardView }) {
  const options = [{ id: NAME_COLUMN_ID, title: capitalize(board.itemNoun) }, ...board.columns.map((c) => ({ id: c.id, title: c.title }))];
  const setSort = (sort: SortRule[]) => actions.updateView(board.id, view.id, { sort });
  const unused = options.filter((o) => !view.sort.some((r) => r.columnId === o.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton icon={ArrowUpDown} active={view.sort.length > 0}>
          Sort{view.sort.length ? ` / ${view.sort.length}` : ""}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">Sort by</h3>
          {view.sort.length ? (
            <button type="button" onClick={() => setSort([])} className="text-xs font-medium text-primary hover:underline">
              Clear all
            </button>
          ) : null}
        </div>
        <div className="space-y-2">
          {view.sort.map((rule, index) => (
            <div key={rule.columnId} className="flex items-center gap-2">
              <select
                value={rule.columnId}
                onChange={(e) => setSort(view.sort.map((r, i) => (i === index ? { ...r, columnId: e.target.value } : r)))}
                className={cn(SELECT, "min-w-0 flex-1")}
                aria-label="Sort column"
              >
                {options
                  .filter((o) => o.id === rule.columnId || !view.sort.some((r) => r.columnId === o.id))
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setSort(view.sort.map((r, i) => (i === index ? { ...r, direction: r.direction === "asc" ? "desc" : "asc" } : r)))
                }
                className={cn(SELECT, "flex w-36 items-center gap-1.5")}
                aria-label="Toggle direction"
              >
                {rule.direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {rule.direction === "asc" ? "Ascending" : "Descending"}
              </button>
              <button
                type="button"
                aria-label="Remove sort"
                onClick={() => setSort(view.sort.filter((_, i) => i !== index))}
                className="flex size-8 items-center justify-center rounded text-fg-muted hover:bg-hover hover:text-negative"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        {unused.length ? (
          <button
            type="button"
            onClick={() => setSort([...view.sort, { columnId: unused[0].id, direction: "asc" }])}
            className="mt-3 flex h-8 items-center gap-1.5 rounded px-2 text-sm text-primary hover:bg-hover"
          >
            <Plus size={15} /> New sort
          </button>
        ) : null}
        {view.sort.length ? (
          <p className="mt-2 text-xs text-fg-muted">Drag and drop is paused while sorting.</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function HideButton({ board, view }: { board: Board; view: BoardView }) {
  const [query, setQuery] = useState("");
  const hidden = view.hiddenColumnIds;
  const columns = board.columns.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()));
  const setHidden = (ids: ID[]) => actions.updateView(board.id, view.id, { hiddenColumnIds: ids });
  const visibleCount = board.columns.length - hidden.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton icon={EyeOff} active={hidden.length > 0}>
          Hide{hidden.length ? ` / ${hidden.length}` : ""}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <h3 className="mb-2 font-medium">Display columns</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find columns to show/hide"
          aria-label="Find columns"
          className="mb-2 h-8 w-full rounded border border-line-strong bg-transparent px-2 text-sm outline-none focus:border-primary"
        />
        <label className="flex h-8 cursor-pointer items-center gap-2.5 rounded px-1.5 text-sm hover:bg-hover">
          <Checkbox
            label="All columns"
            checked={hidden.length === 0}
            indeterminate={hidden.length > 0 && visibleCount > 0}
            onChange={(on) => setHidden(on ? [] : board.columns.map((c) => c.id))}
          />
          All columns <span className="text-xs text-fg-muted">({visibleCount} shown)</span>
        </label>
        <div className="my-1 h-px bg-line-soft" />
        <div className="max-h-72 overflow-auto">
          {columns.map((column) => {
            const Icon = COLUMN_ICONS[column.type];
            const shown = !hidden.includes(column.id);
            return (
              <label key={column.id} className="flex h-8 cursor-pointer items-center gap-2.5 rounded px-1.5 text-sm hover:bg-hover">
                <Checkbox
                  label={column.title}
                  checked={shown}
                  onChange={(on) => setHidden(on ? hidden.filter((id) => id !== column.id) : [...hidden, column.id])}
                />
                <Icon size={15} className="text-fg-muted" />
                <span className="truncate">{column.title}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
