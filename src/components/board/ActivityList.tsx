"use client";

import { ArrowRight, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Tip } from "@/components/ui/Tooltip";
import { readableTextColor } from "@/lib/colors";
import { formatDateTime, timeAgo } from "@/lib/dates";
import { useItemPanel, useNow, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Partial<Record<Activity["kind"], string>> = {
  item_created: "Created",
  item_deleted: "Deleted",
  item_archived: "Archived",
  item_restored: "Restored",
  item_renamed: "Name",
  item_moved: "Group",
  item_duplicated: "Duplicated",
  group_created: "Group created",
  group_deleted: "Group deleted",
  group_renamed: "Group renamed",
  column_created: "Column added",
  column_deleted: "Column deleted",
  board_created: "Board created",
  automation_ran: "Automation",
  update_posted: "Update",
};

function Value({ text, color }: { text?: string; color?: string }) {
  if (!text) return <span className="text-fg-faint">—</span>;
  if (color) {
    return (
      <span className="inline-flex h-6 max-w-[160px] items-center truncate rounded px-2 text-xs" style={{ background: color, color: readableTextColor(color) }}>
        {text}
      </span>
    );
  }
  return <span className="max-w-[180px] truncate">{text}</span>;
}

function Change({ entry }: { entry: Activity }) {
  switch (entry.kind) {
    case "value_changed":
    case "item_renamed":
    case "group_renamed":
      return (
        <span className="flex min-w-0 items-center gap-2">
          <Value text={entry.from} color={entry.fromColor} />
          <ArrowRight size={14} className="shrink-0 text-fg-faint" />
          <Value text={entry.to} color={entry.toColor} />
        </span>
      );
    case "item_moved":
      return (
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: entry.fromColor }} />
            <span className="truncate">{entry.from}</span>
          </span>
          <ArrowRight size={14} className="shrink-0 text-fg-faint" />
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: entry.toColor }} />
            <span className="truncate">{entry.to}</span>
          </span>
        </span>
      );
    case "automation_ran":
      return (
        <span className="flex min-w-0 items-center gap-1.5 text-fg-muted">
          <Zap size={14} className="shrink-0 text-[#fdab3d]" />
          <span className="truncate">{entry.text}</span>
        </span>
      );
    case "update_posted":
      return <span className="truncate italic text-fg-muted">“{entry.text}”</span>;
    default:
      return <span className="truncate text-fg-muted">{entry.text ?? ""}</span>;
  }
}

export function ActivityList({ entries, showItem = true, emptyText = "No activity yet" }: { entries: Activity[]; showItem?: boolean; emptyText?: string }) {
  const users = useUserIndex();
  const items = useStore((s) => s.items);
  const now = useNow();
  const panel = useItemPanel();

  if (entries.length === 0) return <p className="px-2 py-10 text-center text-sm text-fg-muted">{emptyText}</p>;

  return (
    <ul className="divide-y divide-line-soft">
      {entries.map((entry) => {
        const user = users[entry.userId];
        const itemExists = !!entry.itemId && !!items[entry.itemId] && !items[entry.itemId].archivedAt;
        return (
          <li
            key={entry.id}
            className={cn(
              "grid items-center gap-3 py-2.5 text-[13px]",
              showItem ? "grid-cols-[52px_28px_minmax(0,1fr)_120px_minmax(0,1.3fr)]" : "grid-cols-[52px_28px_120px_minmax(0,1fr)]",
            )}
          >
            <Tip content={formatDateTime(entry.createdAt)}>
              <span className="text-xs text-fg-muted">{timeAgo(entry.createdAt, now)}</span>
            </Tip>
            <Avatar user={user} size={26} tooltip />
            {showItem ? (
              itemExists ? (
                <button type="button" onClick={() => panel.open(entry.itemId!)} className="truncate text-left hover:text-primary hover:underline">
                  {entry.itemName}
                </button>
              ) : (
                <span className="truncate text-fg-muted">{entry.itemName ?? "Board"}</span>
              )
            ) : null}
            <span className="truncate font-medium">{entry.columnTitle ?? KIND_LABEL[entry.kind] ?? ""}</span>
            <Change entry={entry} />
          </li>
        );
      })}
    </ul>
  );
}
