"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, SearchX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import * as actions from "@/lib/actions";
import { isFiltering, visibleGroups } from "@/lib/filters";
import { useItemPanel, useToday, useUpdateCounts, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, BoardView } from "@/lib/types";
import { setSearch, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { GroupBlock } from "./GroupBlock";
import { RowDragPreview } from "./ItemRow";
import { ADD_COLUMN, CHECK, columnWidthVar, DEFAULT_NAME_WIDTH, GUTTER, NAME_WIDTH_VAR, STRIP } from "./layout";

const NO_SELECTION: string[] = [];

/** Prefer the row under the pointer, then the group under it, then the nearest row. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const rows = hits.filter((hit) => args.droppableContainers.find((c) => c.id === hit.id)?.data.current?.type === "item");
  if (rows.length) return rows;
  if (hits.length) return hits;
  return closestCenter(args);
};

export function TableView({ board, view }: { board: Board; view: BoardView }) {
  const items = useStore((s) => s.items);
  const users = useUserIndex();
  const today = useToday();
  const search = useUI((s) => s.search[board.id] ?? "");
  const selection = useUI((s) => s.selection);
  const selectedIds = selection.boardId === board.id ? selection.ids : NO_SELECTION;
  const updateCounts = useUpdateCounts(board.id);
  const panel = useItemPanel();
  const openItem = panel.open;

  const groups = useMemo(
    () => visibleGroups(board, items, { filter: view.filter, sort: view.sort, search, users, today }),
    [board, items, view.filter, view.sort, search, users, today],
  );
  const columns = useMemo(() => board.columns.filter((c) => !view.hiddenColumnIds.includes(c.id)), [board.columns, view.hiddenColumnIds]);
  const filtering = isFiltering(view.filter, search);
  const sorting = view.sort.length > 0;
  const shownGroups = filtering ? groups.filter((g) => g.itemIds.length > 0) : groups;

  // Live widths while a resize handle is dragged; committed to the board on release.
  const [liveWidths, setLiveWidths] = useState<Record<string, number>>({});
  const nameWidth = liveWidths.__name ?? board.nameWidth ?? DEFAULT_NAME_WIDTH;
  const widthStyle = useMemo(() => {
    const style: Record<string, string> = { [NAME_WIDTH_VAR]: `${nameWidth}px` };
    for (const column of [...columns, ...(board.subitemColumns ?? [])]) {
      style[columnWidthVar(column.id)] = `${liveWidths[column.id] ?? column.width}px`;
    }
    return style;
  }, [columns, board.subitemColumns, liveWidths, nameWidth]);
  const widthOf = (list: Array<{ id: string; width: number }>) => list.reduce((sum, c) => sum + (liveWidths[c.id] ?? c.width), 0);
  const totalWidth =
    GUTTER + STRIP + CHECK + nameWidth + Math.max(widthOf(columns), widthOf(board.subitemColumns ?? [])) + ADD_COLUMN;

  const boardId = board.id;
  const onResize = useCallback((key: string, width: number) => setLiveWidths((w) => ({ ...w, [key]: width })), []);
  const onResizeEnd = useCallback(
    (key: string, width: number) => {
      if (key === "__name") actions.setNameWidth(boardId, width);
      else actions.setColumnWidth(boardId, key, width);
      setLiveWidths((w) => {
        const next = { ...w };
        delete next[key];
        return next;
      });
    },
    [boardId],
  );

  const [scrolled, setScrolled] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const dragItem = dragId ? items[dragId] : undefined;
  const dragGroup = dragItem ? board.groups.find((g) => g.id === dragItem.groupId) : undefined;

  const onDragStart = ({ active }: DragStartEvent) => setDragId(String(active.id));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const moving = items[activeId];
    if (!moving) return;
    const target = over.data.current as { type?: string; groupId?: string } | undefined;
    if (target?.type === "item" && target.groupId) {
      const overId = String(over.id);
      if (target.groupId === moving.groupId) {
        const ids = groups.find((g) => g.group.id === target.groupId)?.itemIds ?? [];
        const movingDown = ids.indexOf(activeId) < ids.indexOf(overId);
        actions.moveItem(activeId, target.groupId, movingDown ? { after: overId } : { before: overId });
      } else {
        actions.moveItem(activeId, target.groupId, { before: overId });
      }
    } else if (target?.type === "group" && target.groupId && target.groupId !== moving.groupId) {
      actions.moveItem(activeId, target.groupId, "bottom");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragId(null)}
    >
      <div
        className={cn("h-full overflow-auto", scrolled && "[&_.sticky-cell]:shadow-[6px_0_8px_-6px_rgba(0,0,0,0.25)]")}
        onScroll={(e) => {
          const next = e.currentTarget.scrollLeft > 0;
          if (next !== scrolled) setScrolled(next);
        }}
        role="table"
        aria-label={`${board.name} table`}
      >
        <div className="relative pb-32 pr-8 pt-1" style={{ ...widthStyle, width: totalWidth + 32 } as React.CSSProperties}>
          {shownGroups.map((vg) => (
            <GroupBlock
              key={vg.group.id}
              board={board}
              view={view}
              vg={vg}
              columns={columns}
              dragDisabled={sorting}
              selectedIds={selectedIds}
              updateCounts={updateCounts}
              onOpen={openItem}
              onResize={onResize}
              onResizeEnd={onResizeEnd}
            />
          ))}
          {filtering && shownGroups.length === 0 ? (
            <div className="sticky left-0 flex w-[min(100%,calc(100vw-360px))] flex-col items-center gap-3 py-16 text-center">
              <SearchX size={40} className="text-fg-faint" />
              <div className="font-display text-lg font-medium">No results found</div>
              <p className="text-sm text-fg-muted">Try a different search term or clear the filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch(board.id, "");
                  actions.updateView(board.id, view.id, { filter: { rules: {}, personId: null } });
                }}
                className="rounded-[4px] border border-line-strong px-3 py-1.5 text-sm hover:bg-hover"
              >
                Clear search and filters
              </button>
            </div>
          ) : null}
          {!filtering ? (
            <div className="sticky left-0 inline-block" style={{ paddingLeft: GUTTER }}>
              <button
                type="button"
                onClick={() => actions.addGroup(board.id, { position: "bottom" })}
                className="flex h-9 items-center gap-2 rounded-[4px] border border-line-strong px-3 text-sm hover:bg-hover"
              >
                <Plus size={16} /> Add new group
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragItem ? <RowDragPreview name={dragItem.name} color={dragGroup?.color ?? "#579bfc"} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
