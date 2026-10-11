"use client";

import { Copy, MessagesSquare, MoreHorizontal, Pencil, Pin, PinOff, Reply as ReplyIcon, ThumbsUp, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { Tip } from "@/components/ui/Tooltip";
import * as actions from "@/lib/actions";
import { formatDateTime, timeAgo } from "@/lib/dates";
import { useCurrentUser, useNow, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Item, Reply, Update } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Composer } from "./Composer";
import { RichText } from "./RichText";

export function UpdatesTab({ item }: { item: Item }) {
  const updates = useStore(useShallow((s) => Object.values(s.updates).filter((u) => u.itemId === item.id)));
  const sorted = useMemo(
    () => updates.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt),
    [updates],
  );

  return (
    <div>
      <Composer
        collapsible
        placeholder="Write an update and mention others with @"
        onSubmit={(body) => {
          actions.postUpdate(item.id, body);
        }}
      />
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <MessagesSquare size={26} />
          </span>
          <div className="font-display text-lg font-medium">No updates yet for this item</div>
          <p className="max-w-sm text-sm text-fg-muted">
            Share progress, mention a teammate with @ or paste a link — updates keep everyone in the loop.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {sorted.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>
      )}
    </div>
  );
}

function LikeSummary({ likes }: { likes: string[] }) {
  const users = useUserIndex();
  if (!likes.length) return null;
  const names = likes.map((id) => users[id]?.name).filter(Boolean);
  return (
    <Tip content={names.join(", ")}>
      <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-white">
          <ThumbsUp size={9} />
        </span>
        {likes.length}
      </span>
    </Tip>
  );
}

function UpdateCard({ update }: { update: Update }) {
  const users = useUserIndex();
  const me = useCurrentUser();
  const now = useNow();
  const author = users[update.authorId];
  const mine = update.authorId === me.id;
  const liked = update.likes.includes(me.id);
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);

  return (
    <article className={cn("rounded-lg border bg-surface", update.pinned ? "border-primary/60" : "border-line-soft")}>
      <header className="flex items-center gap-3 px-4 pt-3">
        <Avatar user={author} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{author?.name ?? "Former member"}</div>
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Tip content={formatDateTime(update.createdAt)}>
              <span>{timeAgo(update.createdAt, now)}</span>
            </Tip>
            {update.editedAt ? <span>· Edited</span> : null}
          </div>
        </div>
        {update.pinned ? (
          <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
            <Pin size={12} /> Pinned
          </span>
        ) : null}
        <Menu>
          <MenuTrigger asChild>
            <button type="button" aria-label="Update options" className="flex size-7 items-center justify-center rounded text-fg-muted hover:bg-hover">
              <MoreHorizontal size={16} />
            </button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem icon={update.pinned ? PinOff : Pin} onSelect={() => actions.toggleUpdatePinned(update.id)}>
              {update.pinned ? "Unpin from top" : "Pin to top"}
            </MenuItem>
            <MenuItem
              icon={Copy}
              onSelect={() => {
                void navigator.clipboard?.writeText(update.body);
                toast("Copied to clipboard");
              }}
            >
              Copy text
            </MenuItem>
            {mine ? (
              <>
                <MenuItem icon={Pencil} onSelect={() => setEditing(true)}>
                  Edit update
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon={Trash2} danger onSelect={() => actions.deleteUpdate(update.id)}>
                  Delete update
                </MenuItem>
              </>
            ) : null}
          </MenuContent>
        </Menu>
      </header>
      <div className="px-4 py-3 text-[14px] leading-relaxed">
        {editing ? (
          <Composer
            initial={update.body}
            autoFocus
            submitLabel="Save"
            onSubmit={(body) => {
              actions.editUpdate(update.id, body);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <RichText text={update.body} />
        )}
      </div>
      {update.likes.length ? (
        <div className="px-4 pb-2">
          <LikeSummary likes={update.likes} />
        </div>
      ) : null}
      <footer className="grid grid-cols-2 border-t border-line-soft text-sm">
        <button
          type="button"
          aria-pressed={liked}
          onClick={() => actions.toggleUpdateLike(update.id)}
          className={cn("flex h-10 items-center justify-center gap-2 hover:bg-hover", liked ? "font-medium text-primary" : "text-fg-muted")}
        >
          <ThumbsUp size={16} className={liked ? "fill-primary/20" : undefined} /> {liked ? "Liked" : "Like"}
        </button>
        <button
          type="button"
          onClick={() => setReplying(true)}
          className="flex h-10 items-center justify-center gap-2 border-l border-line-soft text-fg-muted hover:bg-hover"
        >
          <ReplyIcon size={16} /> Reply
        </button>
      </footer>
      {update.replies.length || replying ? (
        <div className="space-y-3 rounded-b-lg border-t border-line-soft bg-sunken px-4 py-3">
          {update.replies.map((reply) => (
            <ReplyRow key={reply.id} updateId={update.id} reply={reply} />
          ))}
          {replying ? (
            <Composer
              autoFocus
              rows={2}
              placeholder="Write a reply…"
              submitLabel="Reply"
              onSubmit={(body) => {
                actions.addReply(update.id, body);
              }}
              onCancel={() => setReplying(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className="flex h-9 w-full items-center rounded-full border border-line-strong bg-surface px-4 text-left text-sm text-fg-faint hover:border-primary"
            >
              Write a reply…
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ReplyRow({ updateId, reply }: { updateId: string; reply: Reply }) {
  const users = useUserIndex();
  const me = useCurrentUser();
  const now = useNow();
  const author = users[reply.authorId];
  const liked = reply.likes.includes(me.id);
  return (
    <div className="flex gap-2.5">
      <Avatar user={author} size={28} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm bg-surface px-3 py-2 text-[14px]">
          <div className="text-[13px] font-medium">{author?.name ?? "Former member"}</div>
          <RichText text={reply.body} />
        </div>
        <div className="mt-1 flex items-center gap-3 px-2 text-xs text-fg-muted">
          <Tip content={formatDateTime(reply.createdAt)}>
            <span>{timeAgo(reply.createdAt, now)}</span>
          </Tip>
          <button
            type="button"
            aria-pressed={liked}
            onClick={() => actions.toggleReplyLike(updateId, reply.id)}
            className={cn("font-medium hover:underline", liked && "text-primary")}
          >
            Like{reply.likes.length ? ` · ${reply.likes.length}` : ""}
          </button>
          {reply.authorId === me.id ? (
            <button type="button" onClick={() => actions.deleteReply(updateId, reply.id)} className="font-medium hover:text-negative hover:underline">
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
