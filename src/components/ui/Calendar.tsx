"use client";

import { addMonths, format, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { fromISODate, monthMatrix, normalizeTimeline, toISODate, weekdayLabels } from "@/lib/dates";
import type { Timeline } from "@/lib/types";
import { cn } from "@/lib/utils";

type SingleProps = { mode: "single"; value: string | null; onSelect: (iso: string) => void };
type RangeProps = { mode: "range"; value: Timeline | null; onSelect: (range: Timeline) => void };

/** Month calendar for picking a date, or a range with a hover preview. */
export function Calendar(props: SingleProps | RangeProps) {
  const initial = props.mode === "single" ? props.value : props.value?.start;
  const [month, setMonth] = useState(() => (initial ? fromISODate(initial) : new Date()));
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const today = toISODate(new Date());

  const range: Timeline | null =
    props.mode === "range"
      ? anchor
        ? normalizeTimeline(anchor, hover ?? anchor)
        : props.value
      : null;

  const handleClick = (iso: string) => {
    if (props.mode === "single") {
      props.onSelect(iso);
      return;
    }
    if (!anchor) {
      setAnchor(iso);
      return;
    }
    props.onSelect(normalizeTimeline(anchor, iso));
    setAnchor(null);
  };

  return (
    <div className="w-[252px] select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          className="inline-flex size-7 items-center justify-center rounded hover:bg-hover"
          onClick={() => setMonth((m) => addMonths(m, -1))}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="rounded px-2 py-0.5 text-sm font-semibold hover:bg-hover"
          onClick={() => setMonth(new Date())}
          title="Go to today"
        >
          {format(month, "MMMM yyyy")}
        </button>
        <button
          type="button"
          aria-label="Next month"
          className="inline-flex size-7 items-center justify-center rounded hover:bg-hover"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-fg-faint">
        {weekdayLabels().map((d) => (
          <div key={d} className="py-1">
            {d.slice(0, 2)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHover(null)}>
        {monthMatrix(month)
          .flat()
          .map((day) => {
            const iso = toISODate(day);
            const outside = !isSameMonth(day, month);
            const selected =
              props.mode === "single" ? props.value === iso : !!range && (iso === range.start || iso === range.end);
            const inRange = !!range && iso > range.start && iso < range.end;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleClick(iso)}
                onMouseEnter={() => setHover(iso)}
                aria-label={format(day, "EEEE, MMMM d, yyyy")}
                aria-pressed={selected}
                className={cn(
                  "mx-auto flex size-8 items-center justify-center rounded-full text-[13px] transition-colors",
                  outside ? "text-fg-faint" : "text-fg",
                  !selected && !inRange && "hover:bg-hover",
                  inRange && "rounded-none bg-primary-soft",
                  selected && "bg-primary font-semibold text-white",
                  iso === today && !selected && "font-bold text-primary ring-1 ring-primary",
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
      </div>
      {props.mode === "range" ? (
        <p className="mt-2 text-center text-xs text-fg-muted">{anchor ? "Pick an end date" : "Pick a start date"}</p>
      ) : null}
    </div>
  );
}
