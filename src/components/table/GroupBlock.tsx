"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { memo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { EditableText } from "@/components/ui/EditableText";
import { Menu, MenuContent, MenuTrigger } from "@/components/ui/Menu";
import * as actions from "@/lib/actions";
import type { VisibleGroup } from "@/lib/filters";
import { useStore } from "@/lib/store";
import type { Board, BoardView, Column, Group, Item } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { HeaderRow, type ResizeHandler } from "./HeaderRow";
import { ItemRow } from "./ItemRow";
import { CHECK, columnWidth, GUTTER, STRIP } from "./layout";
import { GroupMenuItems } from "./menus";
import { SummaryCell, SummaryRow } from "./SummaryRow";

interface GroupBlockProps {
  board: Board;
  view: BoardView;
  vg: VisibleGroup;
  columns: Column[];
  dragDisabled: boolean;
  selectedIds: string[];
  updateCounts: Record<string, number>;
  onOpen: (itemId: string) => void;
  onResize: ResizeHandler;
  onResizeEnd: ResizeHandler;
}

export const GroupBlock = memo(function GroupBlock({
  board,
  view,
  vg,
  columns,
  dragDisabled,
  selectedIds,
  updateCounts,
  onOpen,
  onResize,
  onResizeEnd,
}: GroupBlockProps) {
  const { group } = vg;
  const items = useStore(useShallow((s) => vg.itemIds.map((id) => s.items[id]).filter((i): i is Item => !!i)));
  const { setNodeRef, isOver, active } = useDroppable({ id: `group:${group.id}`, data: { type: "group", groupId: group.id } });
  const [renaming, setRenaming] = useState(false);
  const dropTarget = isOver && !!active && active.data.current?.groupId !== group.id;

  const menu = (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label={`${group.title} group options`}
          className="flex size-6 items-center justify-center rounded text-fg-muted opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover/title:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal size={16} />
        </button>
      </MenuTrigger>
      <MenuContent className="w-60">
        <GroupMenuItems board={board} group={group} visibleItemIds={vg.itemIds} onRename={() => setRenaming(true)} />
      </MenuContent>
    </Menu>
  );

  const title = (
    <span className="min-w-0" style={{ color: group.color }}>
      <EditableText
        value={group.title}
        editing={renaming}
        onEditingChange={setRenaming}
        onCommit={(next) => actions.renameGroup(board.id, group.id, next)}
        className="block text-[18px] font-medium leading-7"
        inputClassName="h-8 w-72 text-[18px] font-medium"
        ariaLabel="Group name"
        maxLength={80}
      />
    </span>
  );

  const count = vg.itemIds.length === vg.total ? pluralize(vg.total, board.itemNoun) : `${vg.itemIds.length} of ${vg.total} ${board.itemNoun}s`;

  if (group.collapsed) {
    return (
      <section ref={setNodeRef} className="group/title mb-4" aria-label={group.title}>
        <div className={cn("flex h-14", dropTarget && "outline-2 -outline-offset-2 outline-primary")}>
          <div className="sticky-cell sticky left-0 z-10 flex h-full shrink-0 bg-surface">
            <div className="flex shrink-0 items-center justify-end pr-0.5" style={{ width: GUTTER }}>
              {menu}
            </div>
            <div className="shrink-0 rounded-l-md" style={{ width: STRIP, background: group.color }} />
            <div
              className="flex min-w-0 shrink-0 items-center gap-1 border-y border-r border-line-soft pl-1.5 pr-2"
              style={{ width: `calc(${CHECK}px + var(--name-w))` }}
            >
              <button
                type="button"
                aria-label={`Expand ${group.title}`}
                aria-expanded={false}
                onClick={() => actions.setGroupCollapsed(board.id, group.id, false)}
                className="flex size-7 shrink-0 items-center justify-center rounded hover:bg-hover"
                style={{ color: group.color }}
              >
                <ChevronRight size={20} />
              </button>
              <span className="flex min-w-0 flex-col">
                {title}
                <span className="pl-1 text-xs text-fg-muted">{count}</span>
              </span>
            </div>
          </div>
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex h-full shrink-0 flex-col items-center justify-center gap-1 border-y border-r border-line-soft"
              style={{ width: columnWidth(column.id) }}
            >
              <span className="max-w-[90%] truncate text-[11px] text-fg-muted">{column.title}</span>
              <SummaryCell column={column} items={items} groupColor={group.color} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={setNodeRef} className="mb-10" aria-label={group.title}>
      <div className="group/title sticky top-0 z-20 flex h-10 items-end bg-surface pb-1">
        <div className="sticky left-0 flex min-w-0 items-center bg-surface">
          <div className="flex shrink-0 items-center justify-end pr-0.5" style={{ width: GUTTER }}>
            {menu}
          </div>
          <button
            type="button"
            aria-label={`Collapse ${group.title}`}
            aria-expanded
            onClick={() => actions.setGroupCollapsed(board.id, group.id, true)}
            className="flex size-7 shrink-0 items-center justify-center rounded hover:bg-hover"
            style={{ color: group.color }}
          >
            <ChevronDown size={20} />
          </button>
          {title}
          <span className="ml-2 shrink-0 text-sm text-fg-muted">{count}</span>
        </div>
      </div>
      <HeaderRow
        board={board}
        view={view}
        group={group}
        columns={columns}
        visibleItemIds={vg.itemIds}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      />
      <div className={cn(dropTarget && vg.itemIds.length === 0 && "outline-2 -outline-offset-2 outline-primary")}>
        <SortableContext items={vg.itemIds} strategy={verticalListSortingStrategy}>
          {vg.itemIds.map((id) => (
            <ItemRow
              key={id}
              board={board}
              itemId={id}
              groupId={group.id}
              groupColor={group.color}
              columns={columns}
              selected={selectedIds.includes(id)}
              updateCounts={updateCounts}
              dragDisabled={dragDisabled}
              onOpen={onOpen}
              onResize={onResize}
              onResizeEnd={onResizeEnd}
            />
          ))}
        </SortableContext>
        <AddItemRow board={board} group={group} />
      </div>
      <SummaryRow
        group={group}
        columns={columns}
        items={items}
        leading={<div className="sticky-cell sticky left-0 z-10 h-full shrink-0 bg-surface" style={{ width: `calc(${GUTTER + STRIP + CHECK}px + var(--name-w))` }} />}
      />
    </section>
  );
});

function AddItemRow({ board, group }: { board: Board; group: Group }) {
  const [text, setText] = useState("");
  const submit = () => {
    const name = text.trim();
    if (!name) return;
    actions.addItem(board.id, group.id, { name });
    setText("");
  };

  return (
    <div className="flex h-9">
      <div className="sticky-cell sticky left-0 z-10 flex h-full shrink-0 bg-surface">
        <div style={{ width: GUTTER }} />
        <div className="shrink-0 rounded-bl-md opacity-50" style={{ width: STRIP, background: group.color }} />
        <div className="flex shrink-0 items-center justify-center border-b border-r border-line-soft" style={{ width: CHECK }}>
          <span className="size-4 rounded-[4px] border border-line-soft" aria-hidden />
        </div>
        <div className="flex shrink-0 items-center border-b border-line-soft px-1.5" style={{ width: "var(--name-w)" }}>
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
            placeholder={`+ Add ${board.itemNoun}`}
            aria-label={`Add ${board.itemNoun} to ${group.title}`}
            className="h-7 w-full rounded-[4px] border border-transparent bg-transparent px-2 text-[14px] outline-none hover:border-line-strong focus:border-primary"
          />
        </div>
      </div>
      <div className="flex-1 border-b border-line-soft" />
    </div>
  );
}
