"use client";

import { ArchiveRestore, Search, Trash2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import * as actions from "@/lib/actions";
import { timeAgo } from "@/lib/dates";
import { useNow, useUsers } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, Item } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { ActivityList } from "./ActivityList";

/** A right-hand sheet built on Radix Dialog. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  width = 640,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/10 animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-raised text-fg shadow-panel outline-none animate-slide-in-right"
          style={{ maxWidth: width }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-6 py-4">
            <Dialog.Title className="min-w-0 truncate font-display text-xl font-medium">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Close" tooltip={false}>
                <X size={18} />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ActivitySheet({ board, open, onOpenChange }: { board: Board; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${board.name} — Activity log`} width={760}>
      {open ? <BoardActivity board={board} /> : null}
    </Sheet>
  );
}

function BoardActivity({ board }: { board: Board }) {
  const activity = useStore((s) => s.activity);
  const users = useUsers();
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activity
      .filter((a) => a.boardId === board.id)
      .filter((a) => !personId || a.userId === personId)
      .filter(
        (a) =>
          !q ||
          [a.itemName, a.columnTitle, a.from, a.to, a.text].some((field) => field?.toLowerCase().includes(q)),
      )
      .slice(0, 300);
  }, [activity, board.id, personId, query]);
  const people = users.filter((u) => activity.some((a) => a.boardId === board.id && a.userId === u.id));

  return (
    <div className="px-6 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-8 w-60 items-center gap-2 rounded border border-line-strong px-2 focus-within:border-primary">
          <Search size={14} className="text-fg-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the log"
            aria-label="Search the activity log"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {people.map((u) => (
            <button
              key={u.id}
              type="button"
              aria-pressed={personId === u.id}
              aria-label={`Only ${u.name}`}
              onClick={() => setPersonId(personId === u.id ? null : u.id)}
              className={cn("rounded-full p-0.5", personId === u.id ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100")}
            >
              <Avatar user={u} size={26} tooltip />
            </button>
          ))}
        </div>
      </div>
      <ActivityList entries={entries} emptyText="Nothing matches these filters" />
    </div>
  );
}

export function ArchiveDialog({ board, open, onOpenChange }: { board: Board; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Archived items" description={`Items archived from “${board.name}” can be restored at any time.`} width={620}>
      {open ? <ArchivedList board={board} /> : null}
    </Modal>
  );
}

function ArchivedList({ board }: { board: Board }) {
  const allItems = useStore((s) => s.items);
  const now = useNow();
  const archived = useMemo(
    () =>
      Object.values(allItems)
        .filter((i): i is Item & { archivedAt: number } => i.boardId === board.id && !!i.archivedAt)
        // Subitems archived along with their parent come back with it.
        .filter((i) => !i.parentId || !allItems[i.parentId]?.archivedAt)
        .sort((a, b) => b.archivedAt - a.archivedAt),
    [allItems, board.id],
  );

  if (archived.length === 0) return <p className="py-8 text-center text-sm text-fg-muted">Nothing archived yet.</p>;

  return (
    <ul className="divide-y divide-line-soft">
      {archived.map((item) => {
        const group = board.groups.find((g) => g.id === item.groupId);
        return (
          <li key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: group?.color ?? "#c4c4c4" }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.name}</span>
              <span className="block text-xs text-fg-muted">
                {item.parentId ? `Subitem of ${allItems[item.parentId]?.name ?? "a deleted item"}` : (group?.title ?? "Deleted group")} · archived{" "}
                {timeAgo(item.archivedAt, now)}
              </span>
            </span>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                actions.restoreItem(item.id);
                toast(`“${item.name}” restored`);
              }}
            >
              <ArchiveRestore size={14} /> Restore
            </Button>
            <IconButton label="Delete forever" size="xs" onClick={() => actions.deleteItems([item.id], board.itemNoun)}>
              <Trash2 size={14} />
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
}
