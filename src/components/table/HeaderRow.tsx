"use client";

import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, MoreHorizontal, Plus } from "lucide-react";
import { memo, useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { EditableText } from "@/components/ui/EditableText";
import { Menu, MenuContent, MenuTrigger } from "@/components/ui/Menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "@/lib/model";
import type { Board, BoardView, Column, Group } from "@/lib/types";
import { setSelection, useUI } from "@/lib/ui";
import { capitalize, clamp, cn } from "@/lib/utils";
import { ADD_COLUMN, CHECK, columnWidth, GUTTER, STRIP } from "./layout";
import { ColumnMenuItems, ColumnTypeGrid } from "./menus";

export type ResizeHandler = (key: string, width: number) => void;

export function ResizeHandle({
  label,
  min,
  max,
  onResize,
  onResizeEnd,
}: {
  label: string;
  min: number;
  max: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const handle = event.currentTarget;
        const cell = handle.parentElement;
        if (!cell) return;
        const startX = event.clientX;
        const startWidth = cell.getBoundingClientRect().width;
        let latest = startWidth;
        handle.setPointerCapture(event.pointerId);
        document.body.style.cursor = "col-resize";
        const onMove = (e: PointerEvent) => {
          latest = clamp(startWidth + e.clientX - startX, min, max);
          onResize(latest);
        };
        const onUp = () => {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onUp);
          handle.removeEventListener("pointercancel", onUp);
          document.body.style.cursor = "";
          onResizeEnd(latest);
        };
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", onUp);
      }}
      className="absolute -right-[3px] top-0 z-20 h-full w-1.5 cursor-col-resize rounded-full transition-colors hover:bg-primary/50 active:bg-primary"
    />
  );
}

interface HeaderRowProps {
  board: Board;
  view: BoardView;
  group: Group;
  columns: Column[];
  visibleItemIds: string[];
  onResize: ResizeHandler;
  onResizeEnd: ResizeHandler;
}

export const HeaderRow = memo(function HeaderRow({ board, view, group, columns, visibleItemIds, onResize, onResizeEnd }: HeaderRowProps) {
  const selection = useUI((s) => s.selection);
  const selectedIds = selection.boardId === board.id ? selection.ids : [];
  const selectedHere = visibleItemIds.filter((id) => selectedIds.includes(id)).length;
  const allSelected = visibleItemIds.length > 0 && selectedHere === visibleItemIds.length;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const toIndex = board.columns.findIndex((c) => c.id === over.id);
    if (toIndex >= 0) actions.moveColumn(board.id, String(active.id), toIndex);
  };

  return (
    <div className="sticky top-10 z-20 flex h-9 bg-surface" role="row">
      <div className="sticky-cell sticky left-0 z-10 flex h-full shrink-0 bg-surface">
        <div style={{ width: GUTTER }} />
        <div className="shrink-0 rounded-tl-md" style={{ width: STRIP, background: group.color }} />
        <div className="flex shrink-0 items-center justify-center border-y border-r border-line-soft" style={{ width: CHECK }}>
          <Checkbox
            label={`Select all in ${group.title}`}
            checked={allSelected}
            indeterminate={selectedHere > 0 && !allSelected}
            onChange={() =>
              setSelection(
                board.id,
                allSelected ? selectedIds.filter((id) => !visibleItemIds.includes(id)) : [...selectedIds, ...visibleItemIds],
              )
            }
          />
        </div>
        <div
          role="columnheader"
          className="relative flex shrink-0 items-center justify-center border-y border-r border-line-soft text-[14px]"
          style={{ width: "var(--name-w)" }}
        >
          {capitalize(board.itemNoun)}
          <ResizeHandle
            label="Resize name column"
            min={200}
            max={700}
            onResize={(w) => onResize("__name", w)}
            onResizeEnd={(w) => onResizeEnd("__name", w)}
          />
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          {columns.map((column) => (
            <ColumnHeader key={column.id} board={board} view={view} column={column} onResize={onResize} onResizeEnd={onResizeEnd} />
          ))}
        </SortableContext>
      </DndContext>
      <AddColumnButton board={board} afterColumnId={columns[columns.length - 1]?.id ?? null} />
    </div>
  );
});

function ColumnHeader({
  board,
  view,
  column,
  onResize,
  onResizeEnd,
}: {
  board: Board;
  view: BoardView;
  column: Column;
  onResize: ResizeHandler;
  onResizeEnd: ResizeHandler;
}) {
  const [renaming, setRenaming] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id, disabled: renaming });
  const sort = view.sort.find((r) => r.columnId === column.id);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="columnheader"
      style={{ width: columnWidth(column.id), transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group/col relative flex h-full shrink-0 items-center justify-center border-y border-r border-line-soft bg-surface px-7 text-[14px]",
        isDragging ? "z-30 cursor-grabbing shadow-pop" : "cursor-grab",
      )}
    >
      {renaming ? (
        <EditableText
          value={column.title}
          editing
          onEditingChange={setRenaming}
          onCommit={(title) => actions.renameColumn(board.id, column.id, title)}
          inputClassName="h-7 w-full text-center text-[14px]"
          ariaLabel="Column title"
          maxLength={60}
        />
      ) : (
        <span className="flex min-w-0 items-center gap-1">
          <span
            className="cursor-text truncate rounded px-1 hover:outline hover:outline-1 hover:outline-line-strong"
            onClick={() => setRenaming(true)}
            title={column.title}
          >
            {column.title}
          </span>
          {sort ? (
            sort.direction === "asc" ? (
              <ArrowUp size={13} className="shrink-0 text-primary" aria-label="Sorted ascending" />
            ) : (
              <ArrowDown size={13} className="shrink-0 text-primary" aria-label="Sorted descending" />
            )
          ) : null}
        </span>
      )}
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={`${column.title} column options`}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-1 flex size-6 items-center justify-center rounded text-fg-muted opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover/col:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>
        </MenuTrigger>
        <MenuContent className="w-60">
          <ColumnMenuItems board={board} view={view} column={column} onRename={() => setRenaming(true)} />
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

function AddColumnButton({ board, afterColumnId }: { board: Board; afterColumnId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex shrink-0 items-center justify-center border-y border-line-soft" style={{ width: ADD_COLUMN }}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Add column"
            className={cn("flex size-7 items-center justify-center rounded text-fg-muted hover:bg-hover hover:text-fg", open && "bg-primary-soft text-primary")}
          >
            <Plus size={17} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[420px] p-3">
          <ColumnTypeGrid
            onPick={(type, preset) => {
              actions.addColumn(board.id, type, { afterColumnId, preset });
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
