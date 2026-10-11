"use client";

import { AtSign } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useUsers } from "@/lib/hooks";
import type { User } from "@/lib/types";
import { cn, isMac } from "@/lib/utils";

/**
 * Text box for updates and replies with @mention autocomplete.
 * Cmd/Ctrl+Enter submits.
 */
export function Composer({
  onSubmit,
  onCancel,
  placeholder = "Write an update…",
  initial = "",
  submitLabel = "Update",
  autoFocus = false,
  collapsible = false,
  rows = 4,
}: {
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  initial?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  /** Show a one-line prompt until clicked. */
  collapsible?: boolean;
  rows?: number;
}) {
  const users = useUsers();
  const [text, setText] = useState(initial);
  const [expanded, setExpanded] = useState(!collapsible || autoFocus);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  const matches = mention
    ? users.filter((u) => u.name.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 6)
    : [];

  const detectMention = (value: string, caret: number) => {
    const match = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
    setMention(match ? { query: match[2], start: caret - match[2].length - 1 } : null);
    setActive(0);
  };

  const insertMention = (user: User) => {
    const el = ref.current;
    if (!el || !mention) return;
    const caret = el.selectionStart;
    const next = `${text.slice(0, mention.start)}@${user.name} ${text.slice(caret)}`;
    const position = mention.start + user.name.length + 2;
    setText(next);
    setMention(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(position, position);
    });
  };

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText("");
    setMention(null);
    if (collapsible) setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex h-11 w-full items-center rounded-lg border border-line-strong bg-surface px-4 text-left text-sm text-fg-faint hover:border-primary"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="rounded-lg border border-primary bg-surface">
        <textarea
          ref={ref}
          autoFocus={autoFocus || collapsible}
          value={text}
          rows={rows}
          dir="auto"
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            detectMention(e.target.value, e.target.selectionStart);
          }}
          onClick={(e) => detectMention(text, e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (mention && matches.length) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => (i + 1) % matches.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (i - 1 + matches.length) % matches.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(matches[active]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setMention(null);
                return;
              }
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape" && onCancel) {
              e.stopPropagation();
              onCancel();
            }
          }}
          className="block w-full resize-y rounded-t-lg bg-transparent px-3 py-2.5 text-[14px] leading-relaxed outline-none"
        />
        <div className="flex items-center justify-between gap-2 border-t border-line-soft px-2 py-1.5">
          <button
            type="button"
            onClick={() => {
              const el = ref.current;
              if (!el) return;
              const caret = el.selectionStart;
              const spacer = caret > 0 && !/\s/.test(text[caret - 1]) ? " " : "";
              const next = `${text.slice(0, caret)}${spacer}@${text.slice(caret)}`;
              setText(next);
              const position = caret + spacer.length + 1;
              setMention({ query: "", start: position - 1 });
              requestAnimationFrame(() => {
                el.focus();
                el.setSelectionRange(position, position);
              });
            }}
            className="flex h-7 items-center gap-1 rounded px-2 text-xs text-fg-muted hover:bg-hover hover:text-fg"
          >
            <AtSign size={14} /> Mention
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-fg-faint sm:inline">{isMac() ? "⌘" : "Ctrl"}+Enter to send</span>
            {onCancel || collapsible ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  if (onCancel) onCancel();
                  else {
                    setText("");
                    setExpanded(false);
                  }
                }}
              >
                Cancel
              </Button>
            ) : null}
            <Button size="xs" onClick={submit} disabled={!text.trim()}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
      {mention && matches.length ? (
        <ul className="absolute left-2 top-full z-10 mt-1 w-64 rounded-lg bg-raised p-1 shadow-pop" role="listbox" aria-label="Mention someone">
          {matches.map((user, i) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm", i === active && "bg-hover")}
              >
                <Avatar user={user} size={24} />
                <span className="min-w-0 flex-1 truncate">{user.name}</span>
                <span className="truncate text-xs text-fg-muted">{user.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
