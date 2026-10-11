"use client";

import { Check, Link2, Pencil, Plus, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Tip } from "@/components/ui/Tooltip";
import { asLink, asNumber, formatNumberValue } from "@/lib/columns";
import { formatDateTime, timeAgo } from "@/lib/dates";
import { useNow, useUserIndex } from "@/lib/hooks";
import type { CellValue, Column, Item, LinkValue } from "@/lib/types";
import { cn, normalizeUrl, safeHref } from "@/lib/utils";

/** Inline input used by text and number cells. Commits on Enter/blur, cancels on Escape. */
function InlineInput({
  initial,
  onDone,
  inputMode,
  align = "left",
  label,
}: {
  initial: string;
  onDone: (value: string | null) => void;
  inputMode?: "decimal" | "text";
  align?: "left" | "center";
  label: string;
}) {
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (value: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(value);
  };

  return (
    <input
      ref={ref}
      value={draft}
      inputMode={inputMode}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(draft)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(draft);
        if (e.key === "Escape") finish(null);
      }}
      className={cn(
        "h-full w-full border border-primary bg-surface px-2 text-[13px] outline-none",
        align === "center" && "text-center",
      )}
    />
  );
}

export function NumbersCell({
  column,
  value,
  onChange,
}: {
  column: Column;
  value: CellValue;
  onChange: (value: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const number = asNumber(value);

  if (editing) {
    return (
      <InlineInput
        initial={number === null ? "" : String(number)}
        inputMode="decimal"
        align="center"
        label={column.title}
        onDone={(text) => {
          setEditing(false);
          if (text === null) return;
          const trimmed = text.trim().replace(/,/g, "");
          if (!trimmed) return onChange(null);
          const parsed = Number(trimmed);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`${column.title}: ${number === null ? "empty" : number}`}
      className="group/num flex h-full w-full items-center justify-center px-2 text-[13px] tabular-nums"
    >
      {number !== null ? (
        <span className="truncate">{formatNumberValue(column, number)}</span>
      ) : (
        <Plus size={14} className="hidden text-fg-faint group-hover/num:block" />
      )}
    </button>
  );
}

export function TextCell({
  value,
  onChange,
  label,
}: {
  value: CellValue;
  onChange: (value: string) => void;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const text = typeof value === "string" ? value : "";

  if (editing) {
    return (
      <InlineInput
        initial={text}
        label={label}
        onDone={(next) => {
          setEditing(false);
          if (next !== null && next.trim() !== text) onChange(next.trim());
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`${label}: ${text || "empty"}`}
      title={text.length > 24 ? text : undefined}
      className="group/text flex h-full w-full items-center justify-center px-2 text-[13px]"
    >
      {text ? <span className="truncate">{text}</span> : <Plus size={14} className="hidden text-fg-faint group-hover/text:block" />}
    </button>
  );
}

export function CheckboxCell({
  value,
  onChange,
  label,
}: {
  value: CellValue;
  onChange: (value: boolean) => void;
  label: string;
}) {
  const checked = value === true;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-full w-full items-center justify-center"
    >
      <span
        className={cn(
          "flex size-[18px] items-center justify-center rounded-[4px] border transition-colors",
          checked ? "border-transparent text-[#00c875]" : "border-line-strong hover:border-fg-muted",
        )}
      >
        {checked ? <Check size={20} strokeWidth={3.5} /> : null}
      </span>
    </button>
  );
}

export function RatingCell({
  column,
  value,
  onChange,
  size = 17,
}: {
  column: Column;
  value: CellValue;
  onChange: (value: number) => void;
  size?: number;
}) {
  const max = column.settings.maxRating ?? 5;
  const current = typeof value === "number" ? value : 0;
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? current;

  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label={column.title}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={current === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n === current ? 0 : n)}
          className="p-px"
        >
          <Star
            size={size}
            className={cn(n <= shown ? "fill-[#fdab3d] text-[#fdab3d]" : "text-line-strong", hover !== null && n <= shown && "opacity-80")}
          />
        </button>
      ))}
    </div>
  );
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export function LinkCell({
  value,
  onChange,
  label,
}: {
  value: CellValue;
  onChange: (value: LinkValue | null) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const link = asLink(value);
  const href = link ? safeHref(link.url) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`${label}: ${link ? link.text || link.url : "empty"}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") setOpen(true);
          }}
          className={cn(
            "group/link flex h-full w-full cursor-pointer items-center justify-center gap-1 px-2 text-[13px] outline-none",
            open && "ring-2 ring-inset ring-primary",
          )}
        >
          {link ? (
            <>
              <Link2 size={13} className="shrink-0 text-fg-muted" />
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="truncate text-primary hover:underline"
                >
                  {link.text || prettyUrl(link.url)}
                </a>
              ) : (
                <span className="truncate">{link.text || link.url}</span>
              )}
              <Pencil size={12} className="hidden shrink-0 text-fg-faint group-hover/link:block" />
            </>
          ) : (
            <Plus size={14} className="hidden text-fg-faint group-hover/link:block" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[280px] p-3" onClick={(e) => e.stopPropagation()}>
        <LinkForm
          link={link}
          onSave={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function LinkForm({ link, onSave }: { link: LinkValue | null; onSave: (link: LinkValue | null) => void }) {
  const [url, setUrl] = useState(link?.url ?? "");
  const [text, setText] = useState(link?.text ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeUrl(url);
        onSave(normalized ? { url: normalized, text: text.trim() } : null);
      }}
      className="space-y-2"
    >
      <label className="block text-xs font-medium text-fg-muted">
        Web address
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="www.example.com"
          className="mt-1 h-8 w-full rounded border border-line-strong bg-transparent px-2 text-sm text-fg outline-none focus:border-primary"
        />
      </label>
      <label className="block text-xs font-medium text-fg-muted">
        Text to display
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Optional"
          className="mt-1 h-8 w-full rounded border border-line-strong bg-transparent px-2 text-sm text-fg outline-none focus:border-primary"
        />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        {link ? (
          <Button variant="ghost" size="xs" onClick={() => onSave(null)}>
            Remove
          </Button>
        ) : null}
        <Button type="submit" size="xs" disabled={!url.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}

export function LastUpdatedCell({ item }: { item: Item }) {
  const users = useUserIndex();
  const now = useNow();
  const user = users[item.updatedBy];
  return (
    <Tip content={`${user?.name ?? "Someone"} · ${formatDateTime(item.updatedAt)}`}>
      <div className="flex h-full w-full items-center justify-center gap-1.5 px-2 text-[13px] text-fg-muted">
        <Avatar user={user} size={22} />
        <span className="truncate">{timeAgo(item.updatedAt, now)}</span>
      </div>
    </Tip>
  );
}
