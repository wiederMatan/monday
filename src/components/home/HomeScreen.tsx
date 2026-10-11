"use client";

import { ArrowRight, CalendarCheck, Inbox, LayoutList, Plus, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { TEMPLATE_ICONS } from "@/components/app/Dialogs";
import { WorkspaceIcon } from "@/components/app/Sidebar";
import { RichText } from "@/components/item/RichText";
import { Avatar } from "@/components/ui/Avatar";
import { Tip } from "@/components/ui/Tooltip";
import { asDate, asStringArray, columnsFor, isItemDone } from "@/lib/columns";
import { dateBucket, formatDateTime, greeting, timeAgo } from "@/lib/dates";
import { useCurrentUser, useItemPanel, useNow, useToday, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { BOARD_TEMPLATES } from "@/lib/templates";
import type { Board } from "@/lib/types";
import { openDialog } from "@/lib/ui";
import { pluralize } from "@/lib/utils";

export function HomeScreen() {
  const user = useCurrentUser();
  const now = useNow(60_000);

  useEffect(() => {
    document.title = "Home · monday";
  }, []);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[1200px] px-8 py-7">
        <h1 className="font-display text-[26px] font-medium">
          {greeting(new Date(now))}, {user.name.split(" ")[0]}!
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">Quickly access your recent boards, inbox and workspaces</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <RecentBoards />
            <UpdateFeed />
            <Workspaces />
          </div>
          <aside className="space-y-6">
            <MyWorkSummary />
            <Templates />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, action, children }: { title: string; icon: typeof Inbox; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line-soft bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-medium">
          <Icon size={18} className="text-fg-muted" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A tiny abstract preview of a board: its groups as colored rows. */
function BoardThumbnail({ board }: { board: Board }) {
  return (
    <div className="flex h-24 flex-col justify-center gap-1.5 rounded-t-lg bg-sunken px-4">
      {board.groups.slice(0, 3).map((group) => (
        <div key={group.id} className="flex items-center gap-1.5">
          <span className="h-3 w-1 rounded-full" style={{ background: group.color }} />
          <span className="h-2 rounded-full bg-line" style={{ width: `${30 + ((group.title.length * 7) % 40)}%` }} />
          <span className="ml-auto h-3 w-8 rounded-sm" style={{ background: group.color, opacity: 0.85 }} />
        </div>
      ))}
    </div>
  );
}

function RecentBoards() {
  const boards = useStore(
    useShallow((s) => {
      const recent = s.recentBoardIds.map((id) => s.boards[id]).filter((b): b is Board => !!b);
      const rest = s.boardOrder.map((id) => s.boards[id]).filter((b): b is Board => !!b && !recent.includes(b));
      return [...recent, ...rest].slice(0, 6);
    }),
  );
  const workspaces = useStore((s) => s.workspaces);

  return (
    <Section title="Recently visited" icon={LayoutList}>
      {boards.length === 0 ? (
        <p className="text-sm text-fg-muted">No boards yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => {
            const workspace = workspaces.find((w) => w.id === board.workspaceId);
            const count = board.groups.reduce((n, g) => n + g.itemIds.length, 0);
            return (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="group rounded-lg border border-line-soft transition-shadow hover:shadow-pop"
              >
                <BoardThumbnail board={board} />
                <div className="flex items-start gap-2 p-3">
                  <LayoutList size={16} className="mt-0.5 shrink-0 text-fg-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium group-hover:text-primary">{board.name}</div>
                    <div className="truncate text-xs text-fg-muted">
                      {workspace?.name} · {pluralize(count, board.itemNoun)}
                    </div>
                  </div>
                  {board.favorite ? <Star size={15} className="shrink-0 fill-[#ffcb00] text-[#ffcb00]" aria-label="Favorite" /> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function UpdateFeed() {
  const updates = useStore((s) => s.updates);
  const items = useStore((s) => s.items);
  const boards = useStore((s) => s.boards);
  const users = useUserIndex();
  const now = useNow();
  const panel = useItemPanel();
  const feed = useMemo(
    () =>
      Object.values(updates)
        .filter((u) => items[u.itemId] && !items[u.itemId].archivedAt && boards[u.boardId])
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6),
    [updates, items, boards],
  );

  return (
    <Section title="Update feed" icon={Inbox}>
      {feed.length === 0 ? (
        <p className="text-sm text-fg-muted">When teammates post updates on items, they show up here.</p>
      ) : (
        <ul className="space-y-3">
          {feed.map((update) => {
            const author = users[update.authorId];
            const item = items[update.itemId];
            const board = boards[update.boardId];
            return (
              <li key={update.id} className="flex gap-3 rounded-lg border border-line-soft p-3">
                <Avatar user={author} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                    <span className="font-medium">{author?.name ?? "Someone"}</span>
                    <span className="text-fg-muted">on</span>
                    <button type="button" onClick={() => panel.open(item.id)} className="max-w-full truncate font-medium text-primary hover:underline">
                      {item.name}
                    </button>
                    <span className="text-xs text-fg-muted">
                      · {board.name} ·{" "}
                      <Tip content={formatDateTime(update.createdAt)}>
                        <span>{timeAgo(update.createdAt, now)}</span>
                      </Tip>
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-3 text-sm">
                    <RichText text={update.body} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function Workspaces() {
  const workspaces = useStore((s) => s.workspaces);
  const boards = useStore((s) => s.boards);
  return (
    <Section
      title="My workspaces"
      icon={LayoutList}
      action={
        <button type="button" onClick={() => openDialog("createWorkspace")} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <Plus size={15} /> Add workspace
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {workspaces.map((w) => {
          const count = Object.values(boards).filter((b) => b.workspaceId === w.id).length;
          return (
            <div key={w.id} className="flex items-center gap-3 rounded-lg border border-line-soft p-3">
              <WorkspaceIcon workspace={w} size={40} />
              <div className="min-w-0">
                <div className="truncate font-medium">{w.name}</div>
                <div className="text-xs text-fg-muted">{pluralize(count, "board")}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function MyWorkSummary() {
  const me = useStore((s) => s.currentUserId);
  const items = useStore((s) => s.items);
  const boards = useStore((s) => s.boards);
  const today = useToday();

  const counts = useMemo(() => {
    const result = { overdue: 0, today: 0, week: 0, total: 0 };
    for (const item of Object.values(items)) {
      const board = boards[item.boardId];
      if (!board || item.archivedAt || isItemDone(board, item)) continue;
      if (item.parentId && (!items[item.parentId] || items[item.parentId].archivedAt)) continue;
      const columns = columnsFor(board, item);
      const mine = columns.some((c) => c.type === "people" && asStringArray(item.values[c.id]).includes(me));
      if (!mine) continue;
      result.total += 1;
      const dateColumn = columns.find((c) => c.type === "date");
      const bucket = dateBucket(dateColumn ? asDate(item.values[dateColumn.id]) : null, today);
      if (bucket === "overdue") result.overdue += 1;
      else if (bucket === "today") result.today += 1;
      else if (bucket === "this_week") result.week += 1;
    }
    return result;
  }, [items, boards, me, today]);

  return (
    <Section title="My work" icon={CalendarCheck}>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Overdue", counts.overdue],
          ["Today", counts.today],
          ["This week", counts.week],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-sunken px-2 py-3">
            <dd className="text-2xl font-semibold">{value}</dd>
            <dt className="text-xs text-fg-muted">{label}</dt>
          </div>
        ))}
      </dl>
      <Link href="/my-work" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline">
        {counts.total ? `See all ${counts.total} open items` : "Go to My work"} <ArrowRight size={15} />
      </Link>
    </Section>
  );
}

function Templates() {
  return (
    <Section title="Start from a template" icon={Plus}>
      <ul className="space-y-1">
        {BOARD_TEMPLATES.slice(1, 6).map((t) => {
          const Icon = TEMPLATE_ICONS[t.icon];
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => openDialog("createBoard")}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-hover"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: t.color }}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="block truncate text-xs text-fg-muted">{t.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
