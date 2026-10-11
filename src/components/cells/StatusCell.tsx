"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ColorGrid } from "@/components/ui/ColorGrid";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { EMPTY_LABEL_COLOR, readableTextColor } from "@/lib/colors";
import { getLabel } from "@/lib/columns";
import type { Board, CellValue, Column, ID } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A colored status pill; the whole table cell in monday's table. */
export function LabelChip({
  column,
  value,
  className,
  compact = false,
}: {
  column: Column;
  value: CellValue;
  className?: string;
  compact?: boolean;
}) {
  const label = getLabel(column, value);
  const background = label?.color ?? EMPTY_LABEL_COLOR;
  return (
    <span
      className={cn(
        "flex items-center justify-center truncate px-2 text-center font-normal",
        compact ? "h-6 rounded text-xs" : "h-full w-full text-[13px]",
        !label && "bg-empty",
        className,
      )}
      style={label ? { background, color: readableTextColor(background) } : undefined}
    >
      <span className="truncate">{label?.name ?? ""}</span>
    </span>
  );
}

export function StatusCell({
  board,
  column,
  value,
  onChange,
  variant = "cell",
}: {
  board: Board;
  column: Column;
  value: CellValue;
  onChange: (labelId: ID | null) => void;
  /** `cell` fills a table cell; `pill` is a compact chip for cards and lists. */
  variant?: "cell" | "pill";
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${column.title}: ${getLabel(column, value)?.name ?? "empty"}`}
          className={cn(
            "label-cell block outline-none",
            variant === "cell" ? "h-full w-full" : "w-full rounded",
            open && "ring-2 ring-inset ring-primary",
          )}
        >
          <LabelChip column={column} value={value} compact={variant === "pill"} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[232px] p-0" onClick={(e) => e.stopPropagation()}>
        <LabelPicker
          board={board}
          column={column}
          value={typeof value === "string" ? value : null}
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function LabelPicker({
  board,
  column,
  value,
  onSelect,
}: {
  board: Board;
  column: Column;
  value: ID | null;
  onSelect: (labelId: ID | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const labels = column.settings.labels ?? [];

  if (editing) return <LabelEditor board={board} column={column} onDone={() => setEditing(false)} />;

  return (
    <div>
      <div className="flex max-h-[320px] flex-col gap-1.5 overflow-auto p-3">
        {labels.map((label) => (
          <button
            key={label.id}
            type="button"
            onClick={() => onSelect(label.id)}
            className={cn(
              "relative flex h-8 shrink-0 items-center justify-center rounded px-3 text-[13px] transition-transform hover:scale-[1.02]",
              value === label.id && "ring-2 ring-primary ring-offset-2 ring-offset-raised",
            )}
            style={{ background: label.color, color: readableTextColor(label.color) }}
          >
            <span className="truncate">{label.name}</span>
            {column.settings.doneLabelId === label.id ? (
              <Check size={14} className="absolute right-2 opacity-80" aria-hidden />
            ) : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex h-8 shrink-0 items-center justify-center rounded bg-empty text-[13px] text-white transition-transform hover:scale-[1.02]",
            value === null && "ring-2 ring-primary ring-offset-2 ring-offset-raised",
          )}
          aria-label="Clear"
        >
          &nbsp;
        </button>
      </div>
      <div className="border-t border-line-soft p-1.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-8 w-full items-center justify-center gap-2 rounded text-sm text-fg-muted hover:bg-hover hover:text-fg"
        >
          <Pencil size={14} /> Edit labels
        </button>
      </div>
    </div>
  );
}

function LabelEditor({ board, column, onDone }: { board: Board; column: Column; onDone: () => void }) {
  const labels = column.settings.labels ?? [];
  const [colorFor, setColorFor] = useState<ID | null>(null);

  return (
    <div>
      <div className="flex max-h-[340px] flex-col gap-1.5 overflow-auto p-3">
        {labels.map((label) => (
          <div key={label.id} className="flex flex-col gap-1">
            <div className="flex h-8 items-center gap-1.5 rounded border border-line-strong pl-1 pr-1 focus-within:border-primary">
              <button
                type="button"
                aria-label={`Change color of ${label.name}`}
                onClick={() => setColorFor(colorFor === label.id ? null : label.id)}
                className="size-5 shrink-0 rounded"
                style={{ background: label.color }}
              />
              <input
                defaultValue={label.name}
                aria-label="Label name"
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== label.name) actions.updateStatusLabel(board.id, column.id, label.id, { name });
                  else e.target.value = label.name;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              />
              <button
                type="button"
                aria-label={column.settings.doneLabelId === label.id ? "This label marks items as done" : "Mark as the done label"}
                title={column.settings.doneLabelId === label.id ? "Marks items as done" : "Use as the done label"}
                onClick={() =>
                  actions.updateColumnSettings(board.id, column.id, {
                    doneLabelId: column.settings.doneLabelId === label.id ? null : label.id,
                  })
                }
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded hover:bg-hover",
                  column.settings.doneLabelId === label.id ? "text-positive" : "text-fg-faint",
                )}
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${label.name}`}
                onClick={() => actions.deleteStatusLabel(board.id, column.id, label.id)}
                className="flex size-6 shrink-0 items-center justify-center rounded text-fg-faint hover:bg-hover hover:text-negative"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {colorFor === label.id ? (
              <div className="rounded border border-line-soft p-2">
                <ColorGrid
                  value={label.color}
                  columns={7}
                  size={20}
                  onSelect={(color) => {
                    actions.updateStatusLabel(board.id, column.id, label.id, { color });
                    setColorFor(null);
                  }}
                />
              </div>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => actions.addStatusLabel(board.id, column.id)}
          className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded border border-dashed border-line-strong text-sm text-fg-muted hover:border-primary hover:text-primary"
        >
          <Plus size={14} /> New label
        </button>
      </div>
      <div className="border-t border-line-soft p-1.5">
        <button
          type="button"
          onClick={onDone}
          className="flex h-8 w-full items-center justify-center rounded bg-primary text-sm font-medium text-white hover:bg-primary-hover"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
