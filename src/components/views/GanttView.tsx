"use client";

import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChartGantt, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Tip } from "@/components/ui/Tooltip";
import * as actions from "@/lib/actions";
import { asDate, asStringArray, asTimeline } from "@/lib/columns";
import { addDaysISO, formatTimeline, fromISODate, timelineDays, toISODate, WEEK_STARTS_ON } from "@/lib/dates";
import { useItemPanel, useToday, useUserIndex } from "@/lib/hooks";
import type { Board, BoardView, Column, Group, Item, Timeline } from "@/lib/types";
import { capitalize, cn } from "@/lib/utils";
import { EmptyViewState, useViewItems, VIEW_SELECT } from "./common";

type Zoom = "day" | "week" | "month";
const DAY_WIDTH: Record<Zoom, number> = { day: 34, week: 14, month: 4 };
const ROW = 38;
const LEFT = 300;
const HEADER = 54;

export function GanttView({ board, view }: { board: Board; view: BoardView }) {
  const columns = board.columns.filter((c) => c.type === "timeline" || c.type === "date");
  const column =
    columns.find((c) => c.id === view.settings.timelineColumnId) ?? columns.find((c) => c.type === "timeline") ?? columns[0];
  if (!column) {
    return (
      <EmptyViewState
        icon={ChartGantt}
        title="Plan your work on a timeline"
        description="Add a timeline column to see every item as a bar you can drag, stretch and reschedule."
        actionLabel="Add timeline column"
        onAction={() => actions.addColumn(board.id, "timeline")}
      />
    );
  }
  return <Gantt board={board} view={view} column={column} columns={columns} />;
}

function rangeOf(column: Column, item: Item): Timeline | null {
  if (column.type === "timeline") return asTimeline(item.values[column.id]);
  const date = asDate(item.values[column.id]);
  return date ? { start: date, end: date } : null;
}

interface DragState {
  itemId: string;
  mode: "move" | "start" | "end";
  originX: number;
  original: Timeline;
  preview: Timeline;
}

function Gantt({ board, view, column, columns }: { board: Board; view: BoardView; column: Column; columns: Column[] }) {
  const items = useViewItems(board, view);
  const users = useUserIndex();
  const panel = useItemPanel();
  const todayDate = useToday();
  const today = toISODate(todayDate);
  const [zoom, setZoom] = useState<Zoom>("day");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayWidth = DAY_WIDTH[zoom];
  const people = board.columns.find((c) => c.type === "people");
  const milestone = column.type === "date";

  // Visible span: everything scheduled plus breathing room, snapped to whole months.
  const { start, days } = useMemo(() => {
    let min = addDaysISO(today, -21);
    let max = addDaysISO(today, 45);
    for (const item of items) {
      const range = rangeOf(column, item);
      if (!range) continue;
      if (range.start < min) min = addDaysISO(range.start, -7);
      if (range.end > max) max = addDaysISO(range.end, 14);
    }
    const first = startOfWeek(startOfMonth(fromISODate(min)), { weekStartsOn: WEEK_STARTS_ON });
    const last = endOfMonth(fromISODate(max));
    return { start: toISODate(first), days: differenceInCalendarDays(last, first) + 1 };
  }, [items, column, today]);

  const totalWidth = days * dayWidth;
  const x = (iso: string) => differenceInCalendarDays(fromISODate(iso), fromISODate(start)) * dayWidth;

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: Math.max(0, x(today) - 240), behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, differenceInCalendarDays(fromISODate(today), fromISODate(start)) * DAY_WIDTH[zoom] - 240);
    // Re-center when the zoom level changes (and on first render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const groups = board.groups
    .map((group) => ({ group, items: items.filter((i) => i.groupId === group.id) }))
    .filter((g) => g.items.length > 0);

  // Header segments.
  const startDate = fromISODate(start);
  const months: Array<{ key: string; left: number; width: number; label: string }> = [];
  for (let m = startOfMonth(startDate); differenceInCalendarDays(m, startDate) < days; m = addMonths(m, 1)) {
    const from = Math.max(0, differenceInCalendarDays(m, startDate));
    const to = Math.min(days, differenceInCalendarDays(endOfMonth(m), startDate) + 1);
    months.push({ key: toISODate(m), left: from * dayWidth, width: (to - from) * dayWidth, label: format(m, zoom === "month" ? "yyyy" : "MMMM yyyy") });
  }
  const units: Array<{ key: string; left: number; width: number; label: string; weekend?: boolean }> = [];
  if (zoom === "day") {
    for (let i = 0; i < days; i++) {
      const d = addDays(startDate, i);
      const dow = getDay(d);
      units.push({ key: toISODate(d), left: i * dayWidth, width: dayWidth, label: String(d.getDate()), weekend: dow === 0 || dow === 6 });
    }
  } else if (zoom === "week") {
    for (let i = 0; i < days; i += 7) {
      const d = addDays(startDate, i);
      units.push({ key: toISODate(d), left: i * dayWidth, width: 7 * dayWidth, label: format(d, "MMM d") });
    }
  } else {
    for (const m of months) units.push({ key: m.key, left: m.left, width: m.width, label: format(fromISODate(m.key), "MMM") });
  }

  const beginDrag = (event: React.PointerEvent, item: Item, mode: DragState["mode"], range: Timeline) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({ itemId: item.id, mode, originX: event.clientX, original: range, preview: range });
  };

  const moveDrag = (event: React.PointerEvent) => {
    if (!drag) return;
    const delta = Math.round((event.clientX - drag.originX) / dayWidth);
    const { original } = drag;
    let preview: Timeline;
    if (drag.mode === "move") preview = { start: addDaysISO(original.start, delta), end: addDaysISO(original.end, delta) };
    else if (drag.mode === "start") {
      const next = addDaysISO(original.start, delta);
      preview = { start: next > original.end ? original.end : next, end: original.end };
    } else {
      const next = addDaysISO(original.end, delta);
      preview = { start: original.start, end: next < original.start ? original.start : next };
    }
    if (preview.start !== drag.preview.start || preview.end !== drag.preview.end) setDrag({ ...drag, preview });
  };

  const endDrag = () => {
    if (!drag) return;
    const { itemId, original, preview } = drag;
    setDrag(null);
    if (preview.start === original.start && preview.end === original.end) {
      panel.open(itemId);
      return;
    }
    actions.setCellValue(itemId, column.id, milestone ? preview.start : preview);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-8 pb-3 text-sm">
        <div className="flex rounded-[4px] border border-line-strong p-0.5" role="radiogroup" aria-label="Zoom">
          {(["day", "week", "month"] as Zoom[]).map((z) => (
            <button
              key={z}
              type="button"
              role="radio"
              aria-checked={zoom === z}
              onClick={() => setZoom(z)}
              className={cn("h-7 rounded-[3px] px-3 capitalize", zoom === z ? "bg-primary text-white" : "hover:bg-hover")}
            >
              {z === "day" ? "Days" : z === "week" ? "Weeks" : "Months"}
            </button>
          ))}
        </div>
        <button type="button" onClick={scrollToToday} className="h-8 rounded-[4px] border border-line-strong px-3 hover:bg-hover">
          Today
        </button>
        <span className="ml-auto flex items-center gap-2 text-fg-muted">
          Bars from
          <select
            value={column.id}
            onChange={(e) => actions.updateView(board.id, view.id, { settings: { timelineColumnId: e.target.value } })}
            className={VIEW_SELECT}
            aria-label="Timeline column"
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto border-t border-line-soft">
        <div className="relative" style={{ width: LEFT + totalWidth }}>
          {/* Header */}
          <div className="sticky top-0 z-30 flex bg-surface" style={{ height: HEADER }}>
            <div className="sticky left-0 z-10 flex shrink-0 items-end border-b border-r border-line-soft bg-surface px-4 pb-2 text-sm font-medium" style={{ width: LEFT }}>
              {capitalize(board.itemNoun)}
            </div>
            <div className="relative shrink-0 border-b border-line-soft" style={{ width: totalWidth }}>
              {months.map((m) => (
                <div key={m.key} className="absolute top-0 h-[26px] border-l border-line-soft" style={{ left: m.left, width: m.width }}>
                  <span className="sticky left-[310px] inline-block truncate px-2 pt-1 text-xs font-medium">{m.label}</span>
                </div>
              ))}
              {units.map((u) => (
                <div
                  key={u.key}
                  className={cn(
                    "absolute top-[26px] flex h-[28px] items-center justify-center overflow-hidden border-l border-t border-line-soft text-[11px] text-fg-muted",
                    u.weekend && "bg-sunken",
                    zoom === "day" && u.key === today && "font-bold text-primary",
                  )}
                  style={{ left: u.left, width: u.width }}
                >
                  {u.label}
                </div>
              ))}
              <div className="absolute bottom-0 top-0 w-px bg-primary" style={{ left: x(today) + dayWidth / 2 }} />
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            <div className="pointer-events-none absolute bottom-0 top-0" style={{ left: LEFT, width: totalWidth }} aria-hidden>
              {zoom === "day"
                ? units
                    .filter((u) => u.weekend)
                    .map((u) => <div key={u.key} className="absolute bottom-0 top-0 bg-sunken" style={{ left: u.left, width: u.width }} />)
                : null}
              {units.map((u) => (
                <div key={`l-${u.key}`} className="absolute bottom-0 top-0 w-px bg-line-soft/70" style={{ left: u.left }} />
              ))}
              <div className="absolute bottom-0 top-0 w-0.5 bg-primary/70" style={{ left: x(today) + dayWidth / 2 - 1 }} />
            </div>

            {groups.length === 0 ? (
              <div className="sticky left-0 py-16 text-center text-sm text-fg-muted" style={{ width: "min(100%, 100vw - 400px)" }}>
                Nothing to show — try clearing the search or filters.
              </div>
            ) : null}

            {groups.map(({ group, items: groupItems }) => {
              const isCollapsed = collapsed.includes(group.id);
              return (
                <div key={group.id}>
                  <GroupRow
                    group={group}
                    count={groupItems.length}
                    collapsed={isCollapsed}
                    onToggle={() => setCollapsed((c) => (isCollapsed ? c.filter((id) => id !== group.id) : [...c, group.id]))}
                    totalWidth={totalWidth}
                  />
                  {isCollapsed
                    ? null
                    : groupItems.map((item) => {
                        const stored = rangeOf(column, item);
                        const range = drag?.itemId === item.id ? drag.preview : stored;
                        const owners = people ? asStringArray(item.values[people.id]) : [];
                        return (
                          <div key={item.id} className="group/row flex hover:bg-row-hover/60" style={{ height: ROW }}>
                            <div
                              className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-b border-r border-line-soft bg-surface pl-6 pr-3 group-hover/row:bg-row-hover"
                              style={{ width: LEFT, boxShadow: `inset 4px 0 0 ${group.color}` }}
                            >
                              <button type="button" onClick={() => panel.open(item.id)} className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary" dir="auto">
                                {item.name}
                              </button>
                              {owners[0] ? <Avatar user={users[owners[0]]} size={22} tooltip /> : null}
                            </div>
                            <div
                              className="relative shrink-0 border-b border-line-soft"
                              style={{ width: totalWidth }}
                              onPointerMove={moveDrag}
                              onClick={(e) => {
                                if (stored || drag) return;
                                const offset = e.clientX - e.currentTarget.getBoundingClientRect().left;
                                const day = addDaysISO(start, Math.floor(offset / dayWidth));
                                const length = zoom === "day" ? 2 : zoom === "week" ? 6 : 13;
                                actions.setCellValue(item.id, column.id, milestone ? day : { start: day, end: addDaysISO(day, length) });
                              }}
                            >
                              {range ? (
                                milestone ? (
                                  <Milestone
                                    left={x(range.start) + dayWidth / 2}
                                    color={group.color}
                                    label={item.name}
                                    onPointerDown={(e) => beginDrag(e, item, "move", range)}
                                    onPointerUp={endDrag}
                                  />
                                ) : (
                                  <Bar
                                    left={x(range.start)}
                                    width={timelineDays(range) * dayWidth}
                                    color={group.color}
                                    label={item.name}
                                    tooltip={formatTimeline(range)}
                                    dragging={drag?.itemId === item.id}
                                    onPointerDown={(e, mode) => beginDrag(e, item, mode, range)}
                                    onPointerUp={endDrag}
                                  />
                                )
                              ) : (
                                <span className="pointer-events-none absolute inset-y-0 left-3 hidden items-center text-xs text-fg-faint group-hover/row:flex">
                                  Click anywhere on this row to set dates
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupRow({
  group,
  count,
  collapsed,
  onToggle,
  totalWidth,
}: {
  group: Group;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  totalWidth: number;
}) {
  return (
    <div className="flex" style={{ height: ROW }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="sticky left-0 z-20 flex shrink-0 items-center gap-1.5 border-b border-r border-line-soft bg-surface px-2 text-left font-medium"
        style={{ width: LEFT, color: group.color }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        <span className="truncate">{group.title}</span>
        <span className="ml-1 text-xs font-normal text-fg-muted">{count}</span>
      </button>
      <div className="shrink-0 border-b border-line-soft" style={{ width: totalWidth }} />
    </div>
  );
}

function Bar({
  left,
  width,
  color,
  label,
  tooltip,
  dragging,
  onPointerDown,
  onPointerUp,
}: {
  left: number;
  width: number;
  color: string;
  label: string;
  tooltip: string;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent, mode: DragState["mode"]) => void;
  onPointerUp: () => void;
}) {
  const inside = width > 72;
  return (
    <Tip content={`${label} · ${tooltip}`}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}, ${tooltip}`}
        onPointerDown={(e) => onPointerDown(e, "move")}
        onPointerUp={onPointerUp}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "group/bar absolute top-[7px] flex h-6 cursor-grab touch-none items-center rounded-full text-xs font-medium text-white shadow-card select-none",
          dragging && "cursor-grabbing opacity-90 ring-2 ring-primary",
        )}
        style={{ left, width: Math.max(width, 10), background: color }}
      >
        <span
          className="absolute -left-0.5 h-full w-2.5 cursor-ew-resize rounded-l-full opacity-0 group-hover/bar:bg-black/20 group-hover/bar:opacity-100"
          onPointerDown={(e) => onPointerDown(e, "start")}
          aria-hidden
        />
        {inside ? <span className="truncate px-3">{label}</span> : null}
        <span
          className="absolute -right-0.5 h-full w-2.5 cursor-ew-resize rounded-r-full opacity-0 group-hover/bar:bg-black/20 group-hover/bar:opacity-100"
          onPointerDown={(e) => onPointerDown(e, "end")}
          aria-hidden
        />
        {!inside ? <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap text-fg">{label}</span> : null}
      </div>
    </Tip>
  );
}

function Milestone({
  left,
  color,
  label,
  onPointerDown,
  onPointerUp,
}: {
  left: number;
  color: string;
  label: string;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-[11px] flex cursor-grab touch-none items-center select-none"
      style={{ left: left - 8 }}
    >
      <span className="size-4 rotate-45 rounded-[3px] shadow-card" style={{ background: color }} />
      <span className="pointer-events-none ml-2 whitespace-nowrap text-xs">{label}</span>
    </div>
  );
}
