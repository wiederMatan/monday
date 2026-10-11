"use client";

import {
  CalendarDays,
  ChartColumn,
  ChartGantt,
  Copy,
  Kanban,
  MoreHorizontal,
  Pencil,
  Plus,
  Table2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditableText } from "@/components/ui/EditableText";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import * as actions from "@/lib/actions";
import { VIEW_NAMES } from "@/lib/builder";
import { useStore } from "@/lib/store";
import type { Board, BoardView, ViewType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { viewHref } from "./BoardScreen";

export const VIEW_ICONS: Record<ViewType, LucideIcon> = {
  table: Table2,
  kanban: Kanban,
  calendar: CalendarDays,
  timeline: ChartGantt,
  chart: ChartColumn,
};

const VIEW_DESCRIPTIONS: Record<ViewType, string> = {
  table: "Spreadsheet-style table",
  kanban: "Cards in status lanes",
  calendar: "Items on a monthly calendar",
  timeline: "Gantt chart of timelines",
  chart: "Charts and totals",
};

export function ViewTabs({ board, activeViewId }: { board: Board; activeViewId: string }) {
  const router = useRouter();

  return (
    <div className="mt-3 flex items-center gap-0.5 overflow-x-auto border-b border-line-soft px-8" role="tablist" aria-label="Board views">
      {board.views.map((view) => (
        <ViewTab key={view.id} board={board} view={view} active={view.id === activeViewId} />
      ))}
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label="Add view"
            className="mb-1 ml-1 flex size-7 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-hover hover:text-fg"
          >
            <Plus size={16} />
          </button>
        </MenuTrigger>
        <MenuContent className="w-64">
          <MenuLabel>Add a board view</MenuLabel>
          {(Object.keys(VIEW_NAMES) as ViewType[]).map((type) => {
            const Icon = VIEW_ICONS[type];
            return (
              <MenuItem
                key={type}
                onSelect={() => {
                  const id = actions.addView(board.id, type);
                  const view = id ? useStore.getState().boards[board.id]?.views.find((v) => v.id === id) : undefined;
                  if (view) router.push(viewHref(useStore.getState().boards[board.id], view));
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} className="opacity-80" />
                  <span>
                    <span className="block">{VIEW_NAMES[type] === "Main table" ? "Table" : VIEW_NAMES[type]}</span>
                    <span className="block text-xs text-fg-muted">{VIEW_DESCRIPTIONS[type]}</span>
                  </span>
                </span>
              </MenuItem>
            );
          })}
        </MenuContent>
      </Menu>
    </div>
  );
}

function ViewTab({ board, view, active }: { board: Board; view: BoardView; active: boolean }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const Icon = VIEW_ICONS[view.type];
  const canDelete = board.views.length > 1;

  return (
    <div
      className={cn(
        "group/tab relative flex h-9 shrink-0 items-center gap-1 rounded-t px-2 text-sm",
        active ? "text-fg after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary" : "text-fg-muted hover:bg-hover",
      )}
    >
      {renaming ? (
        <span className="flex items-center gap-1.5">
          <Icon size={15} />
          <EditableText
            value={view.name}
            editing
            onEditingChange={setRenaming}
            onCommit={(name) => actions.renameView(board.id, view.id, name)}
            inputClassName="h-7 w-36 text-sm"
            ariaLabel="View name"
          />
        </span>
      ) : (
        <Link
          href={viewHref(board, view)}
          role="tab"
          aria-selected={active}
          className="flex items-center gap-1.5"
          onDoubleClick={() => setRenaming(true)}
        >
          <Icon size={15} />
          <span className="whitespace-nowrap">{view.name}</span>
        </Link>
      )}
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={`${view.name} view options`}
            className={cn(
              "flex size-6 items-center justify-center rounded text-fg-muted hover:bg-active",
              active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100 data-[state=open]:opacity-100",
            )}
          >
            <MoreHorizontal size={14} />
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={Pencil} onSelect={() => setRenaming(true)}>
            Rename view
          </MenuItem>
          <MenuItem
            icon={Copy}
            onSelect={() => {
              const id = actions.duplicateView(board.id, view.id);
              const latest = useStore.getState().boards[board.id];
              const copy = latest?.views.find((v) => v.id === id);
              if (latest && copy) router.push(viewHref(latest, copy));
            }}
          >
            Duplicate view
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={Trash2}
            danger
            disabled={!canDelete}
            onSelect={() => {
              const wasActive = active;
              actions.deleteView(board.id, view.id);
              if (wasActive) router.push(`/boards/${board.id}`);
            }}
          >
            Delete view
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
