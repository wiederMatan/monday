"use client";

import { Archive, ArrowRightLeft, Copy, Download, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/Modal";
import * as actions from "@/lib/actions";
import { useStore } from "@/lib/store";
import type { Board } from "@/lib/types";
import { clearSelection, toast, useUI } from "@/lib/ui";
import { capitalize, cn, plural, pluralize } from "@/lib/utils";
import { exportBoardCSV } from "./BoardHeader";

function BatchButton({ icon: Icon, label, className, ...props }: React.ComponentProps<"button"> & { icon: typeof Copy; label: string }) {
  return (
    <button
      type="button"
      className={cn("flex h-full w-[72px] flex-col items-center justify-center gap-1 text-xs text-fg-muted transition-colors hover:bg-hover hover:text-fg", className)}
      {...props}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

export function BatchActionsBar({ board }: { board: Board }) {
  const selection = useUI((s) => s.selection);
  const items = useStore((s) => s.items);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selection.boardId !== board.id) return null;
  const ids = selection.ids.filter((id) => items[id] && !items[id].archivedAt && items[id].boardId === board.id);
  if (ids.length === 0) return null;

  const noun = board.itemNoun;
  const colors = ids.slice(0, 14).map((id) => board.groups.find((g) => g.id === items[id].groupId)?.color ?? "#c4c4c4");

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="absolute bottom-6 left-1/2 z-30 flex h-[68px] -translate-x-1/2 items-stretch overflow-hidden rounded-lg bg-raised shadow-pop animate-slide-up"
    >
      <div className="flex w-16 items-center justify-center bg-primary font-display text-[26px] font-light text-white">{ids.length}</div>
      <div className="flex min-w-[170px] flex-col justify-center px-4">
        <span className="font-display text-lg leading-tight">
          {capitalize(ids.length === 1 ? noun : plural(noun))} selected
        </span>
        <span className="mt-1 flex gap-1">
          {colors.map((color, i) => (
            <span key={i} className="size-2 rounded-full" style={{ background: color }} />
          ))}
        </span>
      </div>
      <div className="flex items-stretch border-l border-line-soft">
        <BatchButton
          icon={Copy}
          label="Duplicate"
          onClick={() => {
            actions.duplicateItems(ids);
            toast(`Duplicated ${pluralize(ids.length, noun)}`);
          }}
        />
        <BatchButton
          icon={Download}
          label="Export"
          onClick={() => {
            exportBoardCSV(board, ids);
            toast(`Exported ${pluralize(ids.length, noun)} to CSV`);
          }}
        />
        <BatchButton
          icon={Archive}
          label="Archive"
          onClick={() => {
            actions.archiveItems(ids, noun);
            clearSelection();
          }}
        />
        <BatchButton icon={Trash2} label="Delete" onClick={() => setConfirmDelete(true)} />
        <Menu>
          <MenuTrigger asChild>
            <BatchButton icon={ArrowRightLeft} label="Move to" />
          </MenuTrigger>
          <MenuContent side="top" align="center">
            <MenuLabel>Move to group</MenuLabel>
            {board.groups.map((group) => (
              <MenuItem
                key={group.id}
                onSelect={() => {
                  actions.moveItemsToGroup(ids, group.id, group.title);
                  clearSelection();
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: group.color }} />
                  {group.title}
                </span>
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      </div>
      <button
        type="button"
        aria-label="Clear selection"
        onClick={clearSelection}
        className="flex w-14 items-center justify-center border-l border-line-soft text-fg-muted hover:bg-hover hover:text-fg"
      >
        <X size={20} />
      </button>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${pluralize(ids.length, noun)}?`}
        description="Their updates will be deleted too. You can undo right after."
        onConfirm={() => {
          actions.deleteItems(ids, noun);
          clearSelection();
        }}
      />
    </div>
  );
}
