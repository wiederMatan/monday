"use client";

import { Plus, Search, UserPlus, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { asStringArray } from "@/lib/columns";
import { useUsers } from "@/lib/hooks";
import type { CellValue, ID, User } from "@/lib/types";
import { openDialog } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function PeopleCell({
  value,
  onChange,
  label = "People",
  align = "center",
}: {
  value: CellValue;
  onChange: (ids: ID[]) => void;
  label?: string;
  align?: "center" | "start";
}) {
  const users = useUsers();
  const [open, setOpen] = useState(false);
  const ids = asStringArray(value);
  const assigned = ids.map((id) => users.find((u) => u.id === id)).filter((u): u is User => !!u);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${assigned.map((u) => u.name).join(", ") || "unassigned"}`}
          className={cn(
            "group/people flex h-full w-full items-center px-2 outline-none",
            align === "center" ? "justify-center" : "justify-start",
            open && "ring-2 ring-inset ring-primary",
          )}
        >
          {assigned.length ? (
            <AvatarStack users={assigned} size={26} max={3} />
          ) : (
            <span className="relative inline-flex">
              <span className="flex size-[26px] items-center justify-center rounded-full bg-empty text-white">
                <UserRound size={16} />
              </span>
              <span className="absolute -right-1 -top-1 hidden size-3.5 items-center justify-center rounded-full bg-primary text-white group-hover/people:flex">
                <Plus size={10} strokeWidth={3} />
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[300px] p-0" onClick={(e) => e.stopPropagation()}>
        <PeoplePicker
          selected={ids}
          onChange={onChange}
          onInvite={() => {
            setOpen(false);
            openDialog("invite");
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function PeoplePicker({
  selected,
  onChange,
  onInvite,
}: {
  selected: ID[];
  onChange: (ids: ID[]) => void;
  onInvite?: () => void;
}) {
  const users = useUsers();
  const [query, setQuery] = useState("");
  const chosen = selected.map((id) => users.find((u) => u.id === id)).filter((u): u is User => !!u);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) => !selected.includes(u.id) && (!q || u.name.toLowerCase().includes(q) || u.title.toLowerCase().includes(q)),
    );
  }, [users, selected, query]);

  return (
    <div className="p-3">
      {chosen.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chosen.map((u) => (
            <span key={u.id} className="flex h-7 items-center gap-1.5 rounded-full bg-primary-soft pl-0.5 pr-1.5 text-[13px]">
              <Avatar user={u} size={24} />
              <span className="max-w-[140px] truncate">{u.name}</span>
              <button
                type="button"
                aria-label={`Remove ${u.name}`}
                onClick={() => onChange(selected.filter((id) => id !== u.id))}
                className="flex size-4 items-center justify-center rounded-full text-fg-muted hover:bg-active hover:text-fg"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex h-8 items-center gap-2 rounded border border-line-strong px-2 focus-within:border-primary">
        <Search size={14} className="text-fg-faint" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions[0]) {
              e.preventDefault();
              onChange([...selected, suggestions[0].id]);
              setQuery("");
            }
          }}
          placeholder="Search names, roles"
          aria-label="Search people"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <div className="mb-1 mt-3 text-xs font-medium text-fg-faint">Suggested people</div>
      <ul className="max-h-56 overflow-auto">
        {suggestions.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => {
                onChange([...selected, u.id]);
                setQuery("");
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-hover"
            >
              <Avatar user={u} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{u.name}</span>
                {u.title ? <span className="block truncate text-xs text-fg-muted">{u.title}</span> : null}
              </span>
            </button>
          </li>
        ))}
        {suggestions.length === 0 ? <li className="px-1.5 py-2 text-xs text-fg-muted">No one else to add</li> : null}
      </ul>
      {onInvite ? (
        <button
          type="button"
          onClick={onInvite}
          className="mt-2 flex h-8 w-full items-center gap-2 rounded-md border-t border-line-soft px-1.5 pt-1 text-sm text-fg-muted hover:text-primary"
        >
          <UserPlus size={15} /> Invite a new member by email
        </button>
      ) : null}
    </div>
  );
}
