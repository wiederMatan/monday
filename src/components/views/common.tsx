"use client";

import { Plus, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { visibleGroups } from "@/lib/filters";
import { useToday, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, BoardView, Item } from "@/lib/types";
import { useUI } from "@/lib/ui";

/** Items a view should show: the board's search + the view's filters and sort, in board order. */
export function useViewItems(board: Board, view: BoardView, options: { sorted?: boolean } = {}): Item[] {
  const items = useStore((s) => s.items);
  const users = useUserIndex();
  const today = useToday();
  const search = useUI((s) => s.search[board.id] ?? "");
  const sorted = options.sorted ?? true;
  return useMemo(() => {
    const groups = visibleGroups(board, items, {
      filter: view.filter,
      sort: sorted ? view.sort : [],
      search,
      users,
      today,
    });
    return groups.flatMap((g) => g.itemIds.map((id) => items[id]));
  }, [board, items, view.filter, view.sort, sorted, search, users, today]);
}

export function EmptyViewState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon size={30} />
      </span>
      <h2 className="font-display text-xl font-medium">{title}</h2>
      <p className="max-w-md text-sm text-fg-muted">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 flex h-9 items-center gap-1.5 rounded-[4px] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Plus size={16} /> {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export const VIEW_SELECT =
  "h-8 rounded-[4px] border border-line-strong bg-surface px-2 text-sm outline-none hover:border-fg-muted focus:border-primary";
