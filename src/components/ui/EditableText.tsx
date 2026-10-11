"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Click-to-edit text. Enter or blur commits, Escape cancels. Can be controlled through
 * `editing` / `onEditingChange` when a parent (e.g. a menu's "Rename") starts editing.
 */
export function EditableText({
  value,
  onCommit,
  className,
  inputClassName,
  placeholder,
  editing: editingProp,
  onEditingChange,
  disabled = false,
  ariaLabel,
  maxLength = 255,
  allowEmpty = false,
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  maxLength?: number;
  allowEmpty?: boolean;
}) {
  const [editingState, setEditingState] = useState(false);
  const editing = editingProp ?? editingState;

  const setEditing = (next: boolean) => {
    if (editingProp === undefined) setEditingState(next);
    onEditingChange?.(next);
  };

  if (editing) {
    return (
      <EditInput
        initial={value}
        maxLength={maxLength}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        className={cn("min-w-0 rounded-[4px] border border-primary bg-surface px-1 outline-none", inputClassName ?? className)}
        onDone={(next) => {
          setEditing(false);
          if (next === null) return;
          const trimmed = next.trim();
          if ((trimmed || allowEmpty) && trimmed !== value) onCommit(trimmed);
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={(event) => {
        if (disabled) return;
        event.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === "F2")) {
          event.preventDefault();
          setEditing(true);
        }
      }}
      className={cn(
        "min-w-0 truncate rounded-[4px] border border-transparent px-1",
        !disabled && "cursor-text hover:border-line-strong",
        className,
      )}
    >
      {value || <span className="text-fg-faint">{placeholder}</span>}
    </span>
  );
}

/** The input half of EditableText; it owns the draft so it starts fresh on every edit. */
function EditInput({
  initial,
  onDone,
  className,
  maxLength,
  ariaLabel,
  placeholder,
}: {
  initial: string;
  /** Called with the final text, or `null` when cancelled. */
  onDone: (value: string | null) => void;
  className?: string;
  maxLength: number;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (value: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(value);
  };

  return (
    <input
      ref={ref}
      value={draft}
      maxLength={maxLength}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(draft)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          finish(draft);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(null);
        }
      }}
      className={className}
    />
  );
}
