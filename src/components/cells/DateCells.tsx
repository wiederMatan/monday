"use client";

import { addDays, nextMonday } from "date-fns";
import { CalendarDays, CircleAlert, CircleCheck, Plus } from "lucide-react";
import { useState } from "react";
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Tip } from "@/components/ui/Tooltip";
import { asDate, asTimeline } from "@/lib/columns";
import { diffDaysISO, formatDate, formatTimeline, isPast, timelineDays, toISODate } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import type { CellValue, Timeline } from "@/lib/types";
import { clamp, cn } from "@/lib/utils";

const QUICK = "h-7 rounded-full border border-line px-2.5 text-xs hover:border-primary hover:text-primary";

export function DateCell({
  value,
  onChange,
  done = false,
  label = "Date",
  className,
}: {
  value: CellValue;
  onChange: (iso: string | null) => void;
  /** Done items show a check instead of an overdue warning. */
  done?: boolean;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = useToday();
  const date = asDate(value);
  const overdue = !!date && !done && isPast(date, today);
  const pick = (iso: string | null) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${date ? formatDate(date) : "empty"}`}
          className={cn(
            "group/date flex h-full w-full items-center justify-center gap-1.5 px-2 text-[13px] outline-none",
            open && "ring-2 ring-inset ring-primary",
            className,
          )}
        >
          {date ? (
            <>
              {done ? (
                <CircleCheck size={15} className="shrink-0 text-positive" aria-label="Done" />
              ) : overdue ? (
                <Tip content="Past due">
                  <CircleAlert size={15} className="shrink-0 text-negative" aria-label="Past due" />
                </Tip>
              ) : null}
              <span className="truncate">{formatDate(date)}</span>
            </>
          ) : (
            <span className="hidden items-center gap-0.5 text-fg-faint group-hover/date:flex">
              <Plus size={13} />
              <CalendarDays size={15} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="p-3" onClick={(e) => e.stopPropagation()}>
        <Calendar mode="single" value={date} onSelect={pick} />
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
          <button type="button" className={QUICK} onClick={() => pick(toISODate(today))}>
            Today
          </button>
          <button type="button" className={QUICK} onClick={() => pick(toISODate(addDays(today, 1)))}>
            Tomorrow
          </button>
          <button type="button" className={QUICK} onClick={() => pick(toISODate(nextMonday(today)))}>
            Next week
          </button>
          {date ? (
            <button type="button" className={cn(QUICK, "ml-auto hover:border-negative hover:text-negative")} onClick={() => pick(null)}>
              Clear
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function timelineProgress(timeline: Timeline, todayIso: string): number {
  const total = timelineDays(timeline);
  const elapsed = diffDaysISO(todayIso, timeline.start) + 1;
  return clamp(elapsed / total, 0, 1);
}

export function TimelineBar({
  timeline,
  color,
  className,
}: {
  timeline: Timeline | null;
  color: string;
  className?: string;
}) {
  const today = toISODate(useToday());
  if (!timeline) {
    return <span className={cn("flex h-6 w-[88%] items-center justify-center rounded-full bg-empty text-xs text-white", className)}>-</span>;
  }
  const progress = timelineProgress(timeline, today);
  const days = timelineDays(timeline);
  return (
    <span
      className={cn(
        "group/bar relative flex h-6 w-[88%] items-center justify-center overflow-hidden rounded-full bg-timeline-rest text-xs font-medium text-white",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0" style={{ width: `${progress * 100}%`, background: color }} />
      <span className="relative truncate px-2 group-hover/bar:hidden">{formatTimeline(timeline)}</span>
      <span className="relative hidden px-2 group-hover/bar:inline">{days === 1 ? "1 day" : `${days} days`}</span>
    </span>
  );
}

export function TimelineCell({
  value,
  onChange,
  color,
  label = "Timeline",
}: {
  value: CellValue;
  onChange: (timeline: Timeline | null) => void;
  color: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const timeline = asTimeline(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${timeline ? formatTimeline(timeline) : "empty"}`}
          className={cn("flex h-full w-full items-center justify-center outline-none", open && "ring-2 ring-inset ring-primary")}
        >
          <TimelineBar timeline={timeline} color={color} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="p-3" onClick={(e) => e.stopPropagation()}>
        <Calendar
          mode="range"
          value={timeline}
          onSelect={(range) => {
            onChange(range);
            setOpen(false);
          }}
        />
        {timeline ? (
          <div className="mt-3 flex justify-end border-t border-line-soft pt-3">
            <button
              type="button"
              className={cn(QUICK, "hover:border-negative hover:text-negative")}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
