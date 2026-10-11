"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, ListTree, Maximize2, MessageCircle, MessageCirclePlus, MoreHorizontal } from "lucide-react";
import { memo, useState } from "react";
import { Cell } from "@/components/cells/Cell";
import { Checkbox } from "@/components/ui/Checkbox";
import { EditableText } from "@/components/ui/EditableText";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger, Menu, MenuContent, MenuTrigger } from "@/components/ui/Menu";
import { Tip } from "@/components/ui/Tooltip";
import * as actions from "@/lib/actions";
import { useStore } from "@/lib/store";
import type { Board, Column } from "@/lib/types";
import { setEditItemId, setExpanded, toggleSelected, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { ResizeHandler } from "./HeaderRow";
import { ADD_COLUMN, CHECK, columnWidth, GUTTER, STRIP } from "./layout";
import { ItemMenuItems } from "./menus";
import { SubitemsBlock } from "./Subitems";

interface ItemRowProps {
  board: Board;
  itemId: string;
  groupId: string;
  groupColor: string;
  columns: Column[];
  selected: boolean;
  updateCounts: Record<string, number>;
  dragDisabled: boolean;
  onOpen: (itemId: string) => void;
  onResize: ResizeHandler;
  onResizeEnd: ResizeHandler;
}

export const ItemRow = memo(function ItemRow({
  board,
  itemId,
  groupId,
  groupColor,
  columns,
  selected,
  updateCounts,
  dragDisabled,
  onOpen,
  onResize,
  onResizeEnd,
}: ItemRowProps) {
  const item = useStore((s) => s.items[itemId]);
  const editRequested = useUI((s) => s.editItemId === itemId);
  const expanded = useUI((s) => !!s.expanded[itemId]);
  const [nameEditing, setNameEditing] = useState(false);
  const editing = nameEditing || editRequested;
  const updatesCount = updateCounts[itemId] ?? 0;

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver, active } = useSortable({
    id: itemId,
    data: { type: "item", groupId },
    disabled: dragDisabled || editing,
  });
  const dropFromOtherGroup = isOver && !!active && active.data.current?.groupId !== groupId;

  if (!item) return null;
  const subitemCount = item.subitemIds?.length ?? 0;

  const addSubitem = () => {
    const id = actions.addSubitem(item.id, { name: "New subitem" });
    if (!id) return;
    setExpanded(item.id, true);
    setEditItemId(id);
  };

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn("relative", isDragging && "z-20 opacity-40")}>
      {dropFromOtherGroup ? <div className="pointer-events-none absolute inset-x-0 -top-px z-30 h-0.5 bg-primary" /> : null}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            data-item-id={itemId}
            className={cn(
              "group/row relative flex h-9 bg-[var(--row-bg)] [--row-bg:var(--surface)] hover:[--row-bg:var(--row-hover)]",
              selected && "[--row-bg:var(--row-selected)] hover:[--row-bg:var(--row-selected)]",
            )}
          >
            <div className="sticky-cell sticky left-0 z-10 flex h-full shrink-0">
              <div className="flex shrink-0 items-center justify-end gap-0.5 bg-surface pr-0.5" style={{ width: GUTTER }}>
                <Menu>
                  <MenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${item.name} options`}
                      className="flex size-6 items-center justify-center rounded text-fg-muted opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover/row:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </MenuTrigger>
                  <MenuContent>
                    <ItemMenuItems board={board} item={item} onOpen={() => onOpen(item.id)} onAddSubitem={addSubitem} />
                  </MenuContent>
                </Menu>
              </div>
              <div className="shrink-0" style={{ width: STRIP, background: groupColor }} />
              <div className="flex shrink-0 items-center justify-center border-b border-r border-line-soft bg-[var(--row-bg)]" style={{ width: CHECK }}>
                <Checkbox checked={selected} onChange={() => toggleSelected(board.id, itemId)} label={`Select ${item.name}`} />
              </div>
              <div
                className="relative flex h-full shrink-0 items-center gap-1 border-b border-r border-line-soft bg-[var(--row-bg)] pl-1 pr-1.5"
                style={{ width: "var(--name-w)" }}
                onPointerDown={editing || dragDisabled ? undefined : (listeners?.onPointerDown as React.PointerEventHandler<HTMLDivElement> | undefined)}
              >
                <button
                  ref={setActivatorNodeRef}
                  type="button"
                  aria-label={`Drag ${item.name}`}
                  {...attributes}
                  {...listeners}
                  className={cn(
                    "absolute -left-0.5 flex h-6 w-3 cursor-grab items-center justify-center text-fg-faint opacity-0 group-hover/row:opacity-100",
                    (dragDisabled || editing) && "hidden",
                  )}
                >
                  <GripVertical size={12} />
                </button>
                {subitemCount ? (
                  <Tip content={expanded ? "Hide subitems" : `Show ${subitemCount} subitem${subitemCount === 1 ? "" : "s"}`}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Hide" : "Show"} subitems of ${item.name}`}
                      onClick={() => setExpanded(item.id, !expanded)}
                      className="flex h-6 shrink-0 items-center gap-0.5 rounded pl-0.5 pr-1 text-xs text-fg-muted hover:bg-active hover:text-fg"
                    >
                      <ChevronRight size={14} className={cn("transition-transform", expanded && "rotate-90")} />
                      {subitemCount}
                    </button>
                  </Tip>
                ) : (
                  <Tip content="Add subitem">
                    <button
                      type="button"
                      aria-label={`Add subitem to ${item.name}`}
                      onClick={addSubitem}
                      className="flex size-6 shrink-0 items-center justify-center rounded text-fg-faint opacity-0 hover:bg-active hover:text-fg group-hover/row:opacity-100"
                    >
                      <ListTree size={14} />
                    </button>
                  </Tip>
                )}
                <div className="min-w-0 flex-1">
                  <EditableText
                    value={item.name}
                    editing={editing}
                    onEditingChange={(next) => {
                      setNameEditing(next);
                      if (!next && editRequested) setEditItemId(null);
                    }}
                    onCommit={(name) => actions.renameItem(item.id, name)}
                    className="block max-w-full py-0.5 text-[14px]"
                    inputClassName="h-7 w-full text-[14px]"
                    ariaLabel={`${board.itemNoun} name`}
                  />
                </div>
                {!editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpen(item.id)}
                      className="hidden h-6 shrink-0 items-center gap-1 rounded px-1.5 text-xs text-fg-muted hover:bg-active hover:text-fg group-hover/row:flex"
                    >
                      <Maximize2 size={13} /> Open
                    </button>
                    <Tip content={updatesCount ? `${updatesCount} update${updatesCount === 1 ? "" : "s"}` : "Start a conversation"}>
                      <button
                        type="button"
                        aria-label={updatesCount ? `${updatesCount} updates` : "Add update"}
                        onClick={() => onOpen(item.id)}
                        className={cn(
                          "relative flex size-7 shrink-0 items-center justify-center rounded hover:bg-active",
                          updatesCount ? "text-primary" : "text-fg-faint opacity-0 group-hover/row:opacity-100",
                        )}
                      >
                        {updatesCount ? <MessageCircle size={19} /> : <MessageCirclePlus size={19} />}
                        {updatesCount ? (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white">
                            {updatesCount}
                          </span>
                        ) : null}
                      </button>
                    </Tip>
                  </>
                ) : null}
              </div>
            </div>
            {columns.map((column) => (
              <div key={column.id} className="h-full shrink-0 border-b border-r border-line-soft" style={{ width: columnWidth(column.id) }}>
                <Cell board={board} column={column} item={item} groupColor={groupColor} />
              </div>
            ))}
            <div className="shrink-0 border-b border-line-soft" style={{ width: ADD_COLUMN }} />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ItemMenuItems board={board} item={item} onOpen={() => onOpen(item.id)} onAddSubitem={addSubitem} />
        </ContextMenuContent>
      </ContextMenu>
      {expanded && !isDragging ? (
        <SubitemsBlock
          board={board}
          parent={item}
          groupColor={groupColor}
          updateCounts={updateCounts}
          onOpen={onOpen}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        />
      ) : null}
    </div>
  );
});

/** What follows the pointer while dragging a row. */
export function RowDragPreview({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex h-9 w-[320px] items-center overflow-hidden rounded-md bg-raised shadow-pop">
      <div className="h-full w-1.5 shrink-0" style={{ background: color }} />
      <span className="truncate px-3 text-[14px]">{name}</span>
    </div>
  );
}
