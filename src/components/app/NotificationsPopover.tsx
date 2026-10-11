"use client";

import { AtSign, Bell, BellOff, Check, MessageSquare, Reply, UserPlus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { formatDateTime, timeAgo } from "@/lib/dates";
import { itemUrl, useNow, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  mention: AtSign,
  assigned: UserPlus,
  automation: Zap,
  reply: Reply,
  update: MessageSquare,
};

export function NotificationsButton() {
  const notifications = useStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label={unread ? `Notifications (${unread} unread)` : "Notifications"} active={open} className="relative">
          <Bell size={19} />
          {unread > 0 ? (
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e2445c] px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] p-0">
        <NotificationsPanel notifications={notifications} onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function NotificationsPanel({
  notifications,
  onNavigate,
}: {
  notifications: AppNotification[];
  onNavigate: () => void;
}) {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const users = useUserIndex();
  const boards = useStore((s) => s.boards);
  const router = useRouter();
  const now = useNow();
  const list = tab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="font-display text-lg font-medium">Notifications</h2>
        <button
          type="button"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-fg-muted hover:bg-hover disabled:opacity-40"
          onClick={() => actions.markAllNotificationsRead()}
          disabled={!notifications.some((n) => !n.read)}
        >
          <Check size={14} /> Mark all as read
        </button>
      </div>
      <div className="flex gap-1 border-b border-line-soft px-3" role="tablist">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-2 pb-2 pt-1 text-sm capitalize",
              tab === t ? "border-primary font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="min-h-0 flex-1 overflow-auto p-1.5">
        {list.length === 0 ? (
          <li className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-fg-muted">
            <BellOff size={28} className="text-fg-faint" />
            {tab === "unread" ? "You're all caught up!" : "No notifications yet"}
          </li>
        ) : (
          list.map((n) => {
            const actor = users[n.actorId];
            const Icon = KIND_ICON[n.kind];
            const board = n.boardId ? boards[n.boardId] : undefined;
            return (
              <li key={n.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    actions.setNotificationRead(n.id, true);
                    if (board && n.itemId) router.push(itemUrl(board.id, n.itemId));
                    else if (board) router.push(`/boards/${board.id}`);
                    onNavigate();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.currentTarget as HTMLElement).click();
                  }}
                  className={cn(
                    "group flex gap-3 rounded-lg px-2.5 py-2.5 text-sm hover:bg-hover",
                    !n.read && "bg-primary-soft/40",
                  )}
                >
                  <span className="relative mt-0.5">
                    <Avatar user={actor} size={34} />
                    <span className="absolute -bottom-1 -right-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-white ring-2 ring-raised">
                      <Icon size={10} strokeWidth={2.5} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">
                      {n.kind === "automation" ? (
                        <span className="font-semibold">Automation </span>
                      ) : (
                        <span className="font-semibold">{actor?.name ?? "Someone"} </span>
                      )}
                      {n.text}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
                      <span title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt, now)}</span>
                      {board ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">{board.name}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={n.read ? "Mark as unread" : "Mark as read"}
                    title={n.read ? "Mark as unread" : "Mark as read"}
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.setNotificationRead(n.id, !n.read);
                    }}
                    className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-active"
                  >
                    <span className={cn("size-2 rounded-full", n.read ? "border border-line-strong" : "bg-primary")} />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
