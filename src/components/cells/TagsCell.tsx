"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { readableTextColor } from "@/lib/colors";
import { asStringArray, getTag } from "@/lib/columns";
import type { Board, CellValue, Column, ID, TagOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TagChip({ tag, onRemove }: { tag: TagOption; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex h-5 max-w-full shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-medium"
      style={{ background: tag.color, color: readableTextColor(tag.color) }}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove ? (
        <button type="button" aria-label={`Remove ${tag.name}`} onClick={onRemove} className="-mr-1 rounded-full opacity-80 hover:opacity-100">
          <X size={12} />
        </button>
      ) : null}
    </span>
  );
}

export function TagsCell({
  board,
  column,
  value,
  onChange,
}: {
  board: Board;
  column: Column;
  value: CellValue;
  onChange: (ids: ID[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ids = asStringArray(value);
  const tags = ids.map((id) => getTag(column, id)).filter((t): t is TagOption => !!t);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${column.title}: ${tags.map((t) => t.name).join(", ") || "empty"}`}
          className={cn(
            "group/tags flex h-full w-full items-center justify-center gap-1 overflow-hidden px-2 outline-none",
            open && "ring-2 ring-inset ring-primary",
          )}
        >
          {tags.length ? (
            tags.map((tag) => <TagChip key={tag.id} tag={tag} />)
          ) : (
            <Plus size={14} className="hidden text-fg-faint group-hover/tags:block" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[260px]" onClick={(e) => e.stopPropagation()}>
        <TagPicker board={board} column={column} selected={ids} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function TagPicker({
  board,
  column,
  selected,
  onChange,
}: {
  board: Board;
  column: Column;
  selected: ID[];
  onChange: (ids: ID[]) => void;
}) {
  const [query, setQuery] = useState("");
  const all = column.settings.tags ?? [];
  const q = query.trim();
  const matches = all.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const exact = all.some((t) => t.name.toLowerCase() === q.toLowerCase());

  const toggle = (id: ID) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const create = () => {
    const id = actions.addTagOption(board.id, column.id, q);
    if (id && !selected.includes(id)) onChange([...selected, id]);
    setQuery("");
  };

  return (
    <div>
      {selected.length ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {selected.map((id) => {
            const tag = getTag(column, id);
            return tag ? <TagChip key={id} tag={tag} onRemove={() => toggle(id)} /> : null;
          })}
        </div>
      ) : null}
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || !q) return;
          e.preventDefault();
          if (exact) {
            const tag = all.find((t) => t.name.toLowerCase() === q.toLowerCase());
            if (tag && !selected.includes(tag.id)) onChange([...selected, tag.id]);
            setQuery("");
          } else create();
        }}
        placeholder="Search or create a tag"
        aria-label="Search or create a tag"
        className="h-8 w-full rounded border border-line-strong bg-transparent px-2 text-sm outline-none focus:border-primary"
      />
      <ul className="mt-2 max-h-52 overflow-auto">
        {matches.map((tag) => (
          <li key={tag.id} className="group/tag flex items-center rounded-md hover:bg-hover">
            <button
              type="button"
              onClick={() => toggle(tag.id)}
              className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5 text-left text-sm"
            >
              <span className="size-3 shrink-0 rounded-full" style={{ background: tag.color }} />
              <span className="min-w-0 flex-1 truncate">{tag.name}</span>
              {selected.includes(tag.id) ? <Check size={14} className="text-primary" /> : null}
            </button>
            <button
              type="button"
              aria-label={`Remove tag ${tag.name} from this column`}
              title="Remove this tag from every item"
              onClick={() => actions.deleteTagOption(board.id, column.id, tag.id)}
              className="mr-1 flex size-6 shrink-0 items-center justify-center rounded text-fg-faint opacity-0 hover:text-negative focus-visible:opacity-100 group-hover/tag:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
        {q && !exact ? (
          <li>
            <button
              type="button"
              onClick={create}
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm text-primary hover:bg-hover"
            >
              <Plus size={14} /> Create “{q}”
            </button>
          </li>
        ) : null}
        {!q && all.length === 0 ? <li className="px-1.5 py-1 text-xs text-fg-muted">Type to create your first tag</li> : null}
      </ul>
    </div>
  );
}
