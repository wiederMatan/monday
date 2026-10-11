"use client";

import { Star } from "lucide-react";
import { AvatarStack } from "@/components/ui/Avatar";
import { Tip } from "@/components/ui/Tooltip";
import { readableTextColor } from "@/lib/colors";
import {
  asStringArray,
  dateRange,
  formatNumberValue,
  numbersSummary,
  statusDistribution,
  type DistributionSegment,
} from "@/lib/columns";
import { formatTimeline } from "@/lib/dates";
import { useUsers } from "@/lib/hooks";
import type { Column, Group, Item, User } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { columnWidth } from "./layout";

const SUMMARY_LABEL: Record<string, string> = { sum: "sum", avg: "avg", min: "min", max: "max", count: "count" };

export function Battery({ segments, total, height = 24 }: { segments: DistributionSegment[]; total: number; height?: number }) {
  if (total === 0) return <span className="block w-[85%] rounded bg-sunken" style={{ height }} />;
  return (
    <span className="flex w-[85%] overflow-hidden rounded" style={{ height }}>
      {segments.map((segment) => {
        const pct = Math.round((segment.count / total) * 100);
        return (
          <Tip key={segment.key} content={`${segment.name}: ${segment.count}/${total} (${pct}%)`}>
            <span className="h-full transition-[flex-grow]" style={{ flexGrow: segment.count, background: segment.color }} />
          </Tip>
        );
      })}
    </span>
  );
}

export function SummaryCell({ column, items, groupColor }: { column: Column; items: Item[]; groupColor: string }) {
  const users = useUsers();
  switch (column.type) {
    case "status":
      return <Battery segments={statusDistribution(column, items)} total={items.length} />;
    case "numbers": {
      const value = numbersSummary(column, items);
      if (value === null) return null;
      const mode = column.settings.summary ?? "sum";
      return (
        <span className="flex flex-col items-center leading-tight">
          <span className="text-[13px] font-medium tabular-nums">
            {mode === "count" ? formatNumber(value) : formatNumberValue(column, value)}
          </span>
          <span className="text-[10px] text-fg-muted">{SUMMARY_LABEL[mode]}</span>
        </span>
      );
    }
    case "date":
    case "timeline": {
      const range = dateRange(column, items);
      if (!range) return <span className="block h-6 w-[85%] rounded-full bg-sunken" />;
      return (
        <span
          className="flex h-6 w-[85%] items-center justify-center truncate rounded-full px-2 text-xs font-medium"
          style={{ background: groupColor, color: readableTextColor(groupColor) }}
        >
          {formatTimeline(range)}
        </span>
      );
    }
    case "checkbox": {
      const checked = items.filter((i) => i.values[column.id] === true).length;
      return (
        <span className="text-[13px] tabular-nums text-fg-muted">
          {checked} / {items.length}
        </span>
      );
    }
    case "rating": {
      const rated = items.map((i) => i.values[column.id]).filter((v): v is number => typeof v === "number" && v > 0);
      if (!rated.length) return null;
      const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
      return (
        <span className="flex items-center gap-1 text-[13px] tabular-nums">
          <Star size={14} className="fill-[#fdab3d] text-[#fdab3d]" /> {avg.toFixed(1)}
        </span>
      );
    }
    case "people": {
      const ids = Array.from(new Set(items.flatMap((i) => asStringArray(i.values[column.id]))));
      const people = ids.map((id) => users.find((u) => u.id === id)).filter((u): u is User => !!u);
      return people.length ? <AvatarStack users={people} size={22} max={4} /> : null;
    }
    default:
      return null;
  }
}

export function SummaryRow({
  group,
  columns,
  items,
  leading,
}: {
  group: Group;
  columns: Column[];
  items: Item[];
  /** The sticky left part (spacer or collapsed-group title). */
  leading: React.ReactNode;
}) {
  return (
    <div className="flex h-9">
      {leading}
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex h-full shrink-0 items-center justify-center border-b border-r border-line-soft"
          style={{ width: columnWidth(column.id) }}
        >
          <SummaryCell column={column} items={items} groupColor={group.color} />
        </div>
      ))}
    </div>
  );
}
