"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { indexUsers } from "./columns";
import { toISODate } from "./dates";
import { useStore } from "./store";
import type { ID, Item } from "./types";

export function useBoard(boardId: ID | null | undefined) {
  return useStore((s) => (boardId ? s.boards[boardId] : undefined));
}

export function useItem(itemId: ID | null | undefined) {
  return useStore((s) => (itemId ? s.items[itemId] : undefined));
}

export function useUsers() {
  return useStore((s) => s.users);
}

export function useUserIndex() {
  const users = useUsers();
  return useMemo(() => indexUsers(users), [users]);
}

export function useCurrentUser() {
  return useStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]);
}

/** Non-archived top-level items of a board, re-rendering only when one of them changes. */
export function useBoardItems(boardId: ID | null | undefined): Item[] {
  return useStore(
    useShallow((s) =>
      boardId ? Object.values(s.items).filter((i) => i.boardId === boardId && !i.archivedAt && !i.parentId) : [],
    ),
  );
}

/** Updates count per item, for the speech-bubble badges. */
export function useUpdateCounts(boardId: ID): Record<ID, number> {
  const updates = useStore((s) => s.updates);
  return useMemo(() => {
    const counts: Record<ID, number> = {};
    for (const update of Object.values(updates)) {
      if (update.boardId === boardId) counts[update.itemId] = (counts[update.itemId] ?? 0) + 1 + update.replies.length;
    }
    return counts;
  }, [updates, boardId]);
}

/** Current time, refreshed on an interval (for "5m ago" labels). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Today's date, stable for the whole day. */
export function useToday(): Date {
  const now = useNow(60_000);
  const key = toISODate(new Date(now));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when the day changes
  return useMemo(() => new Date(now), [key]);
}

/**
 * The item card is addressed by the `?item=` search param so it survives reloads and
 * can be linked to. Uses the History API so opening it doesn't re-render the route.
 */
export function useItemPanel() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const itemId = searchParams.get("item");

  const open = useCallback(
    (id: ID) => {
      const params = new URLSearchParams(window.location.search);
      params.set("item", id);
      window.history.pushState(null, "", `${pathname}?${params.toString()}`);
    },
    [pathname],
  );

  const close = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("item");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname]);

  return { itemId, open, close };
}

export function itemUrl(boardId: ID, itemId: ID): string {
  return `/boards/${boardId}?item=${itemId}`;
}
