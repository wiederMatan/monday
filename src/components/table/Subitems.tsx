"use client";

import { Archive, Copy, Maximize2, MessageCircle, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Cell } from "@/components/cells/Cell";
import { EditableText } from "@/components/ui/EditableText";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "@/lib/model";
import { useStore } from "@/lib/store";
import type { Board, Column, Item } from "@/lib/types";
import { setEditItemId, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { ResizeHandle, type ResizeHandler } from "./HeaderRow";
import { ADD_COLUMN, CHECK, columnWidth, GUTTER, STRIP } from "./layout";
import { ColumnTypeGrid } from "./menus";

/** How far subitems are indented under their parent's name. */
const INDENT = 30;

interface SubitemsProps {
  board: Board;
  parent: Item;
  groupColor: string;
  updateCounts: Record<string, number>;
  onOpen: (itemId: string) => void;
  onResize: ResizeHandler;
  onResizeEnd: ResizeHandler;
}

/** The nested subitem table shown under an expanded item. */
export const SubitemsBlock = memo(function SubitemsBlock({
  board,
  parent,
  groupColor,
  updateCounts,
  onOpen,
  onResize,
  onResizeEnd,
}: SubitemsProps) {
  const columns = board.subitemColumns ?? [];
  const children = useStore(
    useShallow((s) => (parent.subitemIds ?? []).map((id) => s.items[id]).filter((i): i is Item => !!i && !i.archivedAt)),
  );

  return (
    <div role="rowgroup" aria-label={`Subitems of ${parent.name}`}>
      <SubHeader board={board} columns={columns} groupColor={groupColor} onResize={onResize} onResizeEnd={onResizeEnd} />
      {children.map((child) => (
        <SubitemRow
          key={child.id}
          board={board}
          item={child}
          columns={columns}
          groupColor={groupColor}
          updatesCount={updateCounts[child.id] ?? 0}
          onOpen={onOpen}
        />
      ))}
      <AddSubitemRow parent={parent} groupColor={groupColor} />
    </div>
  );
});

/** The left, sticky part shared by subitem rows: gutter, faded group strip and the tree connector. */
function Lead({ groupColor, children, last = false }: { groupColor: string; children?: React.ReactNode; last?: boolean }) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-end bg-surface pr-0.5" style={{ width: GUTTER }}>
        {children}
      </div>
      <div className="shrink-0 opacity-40" style={{ width: STRIP, background: groupColor }} />
      <div className="relative shrink-0 bg-surface" style={{ width: CHECK + INDENT }} aria-hidden>
        <span className={cn("absolute left-[19px] top-0 w-px bg-line", last ? "h-1/2" : "h-full")} />
        <span className="absolute left-[19px] top-1/2 h-px w-6 bg-line" />
      </div>
    </>
  );
}

function SubHeader({
  board,
  columns,
  groupColor,
  onResize,
  onResizeEnd,
}: {
  board: Board;
  columns: Column[];
  groupColor: string;
  onResize: ResizeHandler;
  onResizeEnd: ResizeHandler;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex h-8 text-[13px]">
      <div className="sticky-cell sticky left-0 z-10 flex h-full shrink-0 bg-surface">
        <Lead groupColor={groupColor} />
        <div
          className="flex shrink-0 items-center justify-center border-y border-l border-r border-line-soft bg-sunken font-medium text-fg-muted"
          style={{ width: `calc(var(--name-w) - ${INDENT}px)` }}
        >
          Subitem
        </div>
      </div>
      {columns.map((column) => (
        <SubColumnHeader key={column.id} board={board} column={column} onResize={onResize} onResizeEnd={onResizeEnd} />
      ))}
      <div className="flex shrink-0 items-center justify-center border-y border-r border-line-soft bg-sunken" style={{ width: ADD_COLUMN }}>
        <Popover open={adding} onOpenChange={setAdding}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Add subitem column"
              className={cn("flex size-6 items-center justify-center rounded text-fg-muted hover:bg-hover hover:text-fg", adding && "bg-primary-soft text-primary")}
            >
              <Plus size={15} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[420px] p-3">
            <ColumnTypeGrid
              onPick={(type, preset) => {
                actions.addColumn(board.id, type, { preset, target: "subitems" });
                setAdding(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function SubColumnHeader({
  board,
  column,
  onResize,
  onResizeEnd,
}: {
  board: Board;
  column: Column;
  onResize: ResizeHandler;
  onResizeEnd: ResizeHandler;
}) {
  const [renaming, setRenaming] = useState(false);
  return (
    <div
      role="columnheader"
      className="group/col relative flex h-full shrink-0 items-center justify-center border-y border-r border-line-soft bg-sunken px-6 text-fg-muted"
      style={{ width: columnWidth(column.id) }}
    >
      {renaming ? (
        <EditableText
          value={column.title}
          editing
          onEditingChange={setRenaming}
          onCommit={(title) => actions.renameColumn(board.id, column.id, title)}
          inputClassName="h-6 w-full text-center text-[13px]"
          ariaLabel="Subitem column title"
          maxLength={60}
        />
      ) : (
        <span className="truncate" title={column.title}>
          {column.title}
        </span>
      )}
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={`${column.title} subitem column options`}
            className="absolute right-1 flex size-5 items-center justify-center rounded opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover/col:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={Pencil} onSelect={() => setRenaming(true)}>
            Rename
          </MenuItem>
          <MenuItem icon={Copy} onSelect={() => actions.duplicateColumn(board.id, column.id)}>
            Duplicate column
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={Trash2} danger onSelect={() => actions.deleteColumn(board.id, column.id, column.title)}>
            Delete column
          </MenuItem>
        </MenuContent>
      </Menu>
      <ResizeHandle
        label={`Resize ${column.title}`}
        min={MIN_COLUMN_WIDTH}
        max={MAX_COLUMN_WIDTH}
        onResize={(w) => onResize(column.id, w)}
        onResizeEnd={(w) => onResizeEnd(column.id, w)}
      />
    </div>
  );
}

function SubitemRow({
  board,
  item,
  columns,
  groupColor,
  updatesCount,
  onOpen,
}: {
  board: Board;
  item: Item;
  columns: Column[];
  groupColor: string;
  updatesCount: number;
  onOpen: (itemId: string) => void;
}) {
  const editRequested = useUI((s) => s.editItemId === item.id);
  const [editing, setEditing] = useState(false);

  return (
    <div
      data-subitem-id={item.id}
      className="group/sub flex h-9 bg-[var(--row-bg)] [--row-bg:var(--surface)] hover:[--row-bg:var(--row-hover)]"
    >
      <div className="sticky-cell sticky left-0 z-10 flex h-full shrink-0">
        <Lead groupColor={groupColor}>
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={`${item.name} options`}
                className="flex size-6 items-center justify-center rounded text-fg-muted opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover/sub:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal size={16} />
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={Maximize2} onSelect={() => onOpen(item.id)}>
                Open subitem
              </MenuItem>
              <MenuItem icon={Copy} onSelect={() => actions.duplicateItem(item.id)}>
                Duplicate
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={Archive} onSelect={() => actions.archiveItems([item.id], "subitem")}>
                Archive
              </MenuItem>
              <MenuItem icon={Trash2} danger onSelect={() => actions.deleteItems([item.id], "subitem")}>
                Delete
              </MenuItem>
            </MenuContent>
          </Menu>
        </Lead>
        <div
          className="flex shrink-0 items-center gap-1 border-b border-l border-r border-line-soft bg-[var(--row-bg)] pl-2 pr-1.5"
          style={{ width: `calc(var(--name-w) - ${INDENT}px)` }}
        >
          <div className="min-w-0 flex-1">
            <EditableText
              value={item.name}
              editing={editing || editRequested}
              onEditingChange={(next) => {
                setEditing(next);
                if (!next && editRequested) setEditItemId(null);
              }}
              onCommit={(name) => actions.renameItem(item.id, name)}
              className="block max-w-full py-0.5 text-[13px]"
              inputClassName="h-7 w-full text-[13px]"
              ariaLabel="Subitem name"
            />
          </div>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="hidden h-6 shrink-0 items-center gap-1 rounded px-1.5 text-xs text-fg-muted hover:bg-active hover:text-fg group-hover/sub:flex"
          >
            <Maximize2 size={12} /> Open
          </button>
          {updatesCount ? (
            <button
              type="button"
              aria-label={`${updatesCount} updates`}
              onClick={() => onOpen(item.id)}
              className="flex h-6 shrink-0 items-center gap-0.5 rounded px-1 text-xs text-primary hover:bg-active"
            >
              <MessageCircle size={15} /> {updatesCount}
            </button>
          ) : null}
        </div>
      </div>
      {columns.map((column) => (
        <div key={column.id} className="h-full shrink-0 border-b border-r border-line-soft" style={{ width: columnWidth(column.id) }}>
          <Cell board={board} column={column} item={item} groupColor={groupColor} />
        </div>
      ))}
    </div>
  );
}

function AddSubitemRow({ parent, groupColor }: { parent: Item; groupColor: string }) {
  const [text, setText] = useState("");
  const submit = () => {
    const name = text.trim();
    if (!name) return;
    actions.addSubitem(parent.id, { name });
    setText("");
  };
  return (
    <div className="flex h-9">
      <div className="sticky-cell sticky left-0 z-10 flex h-full shrink-0 bg-surface">
        <Lead groupColor={groupColor} last />
        <div className="flex shrink-0 items-center border-b border-l border-line-soft px-1.5" style={{ width: `calc(var(--name-w) - ${INDENT}px)` }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setText("");
                e.currentTarget.blur();
              }
            }}
            onBlur={submit}
            placeholder="+ Add subitem"
            aria-label={`Add subitem to ${parent.name}`}
            className="h-7 w-full rounded-[4px] border border-transparent bg-transparent px-2 text-[13px] outline-none hover:border-line-strong focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}
