"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { addMonths, format, isSameMonth, startOfMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { readableTextColor } from "@/lib/colors";
import { asDate, asTimeline, getLabel } from "@/lib/columns";
import { addDaysISO, diffDaysISO, monthMatrix, toISODate, weekdayLabels } from "@/lib/dates";
import { useItemPanel, useToday } from "@/lib/hooks";
import type { Board, BoardView, Column, Item } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyViewState, useViewItems, VIEW_SELECT } from "./common";

const MAX_CHIPS = 3;

export function CalendarView({ board, view }: { board: Board; view: BoardView }) {
  const dateColumns = board.columns.filter((c) => c.type === "date" || c.type === "timeline");
  const column = dateColumns.find((c) => c.id === view.settings.dateColumnId) ?? dateColumns[0];
  if (!column) {
    return (
      <EmptyViewState
        icon={CalendarDays}
        title="The calendar needs a date"
        description="Add a date column to see items on a monthly calendar and drag them to reschedule."
        actionLabel="Add date column"
        onAction={() => actions.addColumn(board.id, "date")}
      />
    );
  }
  return <MonthCalendar board={board} view={view} column={column} dateColumns={dateColumns} />;
}

function itemDate(column: Column, item: Item): string | null {
  return column.type === "timeline" ? (asTimeline(item.values[column.id])?.start ?? null) : asDate(item.values[column.id]);
}

function MonthCalendar({ board, view, column, dateColumns }: { board: Board; view: BoardView; column: Column; dateColumns: Column[] }) {
  const today = useToday();
  const todayIso = toISODate(today);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const items = useViewItems(board, view, { sorted: false });
  const panel = useItemPanel();
  const status = board.columns.find((c) => c.type === "status");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [dragId, setDragId] = useState<string | null>(null);
  const dragging = useRef(false);

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const date = itemDate(column, item);
      if (date) map.set(date, [...(map.get(date) ?? []), item]);
    }
    return map;
  }, [items, column]);
  const undated = items.filter((i) => !itemDate(column, i)).length;

  const colorOf = (item: Item) => {
    const label = status ? getLabel(status, item.values[status.id]) : undefined;
    return label?.color ?? board.groups.find((g) => g.id === item.groupId)?.color ?? "#579bfc";
  };

  const open = (id: string) => {
    if (!dragging.current) panel.open(id);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    setTimeout(() => {
      dragging.current = false;
    }, 0);
    if (!over) return;
    const day = String(over.id).replace(/^day:/, "");
    const item = items.find((i) => i.id === active.id);
    if (!item) return;
    if (column.type === "timeline") {
      const timeline = asTimeline(item.values[column.id]);
      if (!timeline || timeline.start === day) return;
      const shift = diffDaysISO(day, timeline.start);
      actions.setCellValue(item.id, column.id, { start: day, end: addDaysISO(timeline.end, shift) });
    } else if (item.values[column.id] !== day) {
      actions.setCellValue(item.id, column.id, day);
    }
  };

  const dragItem = dragId ? items.find((i) => i.id === dragId) : undefined;

  return (
    <div className="flex h-full flex-col px-8 pb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setMonth(startOfMonth(today))} className="h-8 rounded-[4px] border border-line-strong px-3 text-sm hover:bg-hover">
          Today
        </button>
        <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))} className="flex size-8 items-center justify-center rounded hover:bg-hover">
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))} className="flex size-8 items-center justify-center rounded hover:bg-hover">
          <ChevronRight size={18} />
        </button>
        <h2 className="font-display text-xl font-medium">{format(month, "MMMM yyyy")}</h2>
        <div className="ml-auto flex items-center gap-2 text-sm text-fg-muted">
          {undated ? <span>{undated} without a date</span> : null}
          <select
            value={column.id}
            onChange={(e) => actions.updateView(board.id, view.id, { settings: { dateColumnId: e.target.value } })}
            className={VIEW_SELECT}
            aria-label="Date column"
          >
            {dateColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => {
          dragging.current = true;
          setDragId(String(active.id));
        }}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setDragId(null);
          dragging.current = false;
        }}
      >
        <div className="grid grid-cols-7 border-b border-line-soft text-xs font-medium text-fg-muted">
          {weekdayLabels().map((d) => (
            <div key={d} className="px-2 py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 border-l border-line-soft">
          {monthMatrix(month)
            .flat()
            .map((day) => {
              const iso = toISODate(day);
              return (
                <DayCell
                  key={iso}
                  iso={iso}
                  day={day}
                  outside={!isSameMonth(day, month)}
                  isToday={iso === todayIso}
                  items={byDay.get(iso) ?? []}
                  colorOf={colorOf}
                  onOpen={open}
                  onAdd={() => {
                    const value = column.type === "timeline" ? { start: iso, end: iso } : iso;
                    const id = actions.addItem(board.id, board.groups[0]?.id ?? null, {
                      name: `New ${board.itemNoun}`,
                      values: { [column.id]: value },
                    });
                    if (id) panel.open(id);
                  }}
                />
              );
            })}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragItem ? <Chip item={dragItem} color={colorOf(dragItem)} className="w-40 shadow-pop" /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Chip({ item, color, className }: { item: Item; color: string; className?: string }) {
  return (
    <span
      className={cn("block truncate rounded px-1.5 py-0.5 text-left text-xs font-medium", className)}
      style={{ background: color, color: readableTextColor(color) }}
      dir="auto"
    >
      {item.name}
    </span>
  );
}

function DraggableChip({ item, color, onOpen }: { item: Item; color: string; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onOpen(item.id)}
      className={cn("block w-full", isDragging && "opacity-30")}
      title={item.name}
    >
      <Chip item={item} color={color} />
    </button>
  );
}

function DayCell({
  iso,
  day,
  outside,
  isToday,
  items,
  colorOf,
  onOpen,
  onAdd,
}: {
  iso: string;
  day: Date;
  outside: boolean;
  isToday: boolean;
  items: Item[];
  colorOf: (item: Item) => string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` });
  const extra = items.length - MAX_CHIPS;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/day flex min-h-[96px] flex-col gap-1 overflow-hidden border-b border-r border-line-soft p-1.5",
        outside && "bg-sunken/60",
        isOver && "bg-primary-soft/60",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs",
            isToday ? "bg-primary font-semibold text-white" : outside ? "text-fg-faint" : "text-fg",
          )}
        >
          {day.getDate()}
        </span>
        <button
          type="button"
          aria-label={`Add item on ${format(day, "MMMM d")}`}
          onClick={onAdd}
          className="flex size-6 items-center justify-center rounded text-fg-muted opacity-0 hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover/day:opacity-100"
        >
          <Plus size={14} />
        </button>
      </div>
      {items.slice(0, extra > 0 ? MAX_CHIPS - 1 : MAX_CHIPS).map((item) => (
        <DraggableChip key={item.id} item={item} color={colorOf(item)} onOpen={onOpen} />
      ))}
      {extra > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="rounded px-1.5 text-left text-xs font-medium text-fg-muted hover:bg-hover">
              +{extra + 1} more
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 space-y-1">
            <div className="mb-1 text-xs font-medium text-fg-muted">{format(day, "EEEE, MMMM d")}</div>
            {items.map((item) => (
              <button key={item.id} type="button" className="block w-full" onClick={() => onOpen(item.id)}>
                <Chip item={item} color={colorOf(item)} />
              </button>
            ))}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
