"use client";

import {
  Activity,
  Archive,
  Copy,
  Download,
  Info,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
  Tag,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { EditableText } from "@/components/ui/EditableText";
import {
  Menu,
  MenuCheckItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import * as actions from "@/lib/actions";
import { indexUsers } from "@/lib/columns";
import { boardToCSV } from "@/lib/csv";
import { formatDateTime } from "@/lib/dates";
import { useUsers } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, User } from "@/lib/types";
import { openDialog, toast } from "@/lib/ui";
import { capitalize, downloadFile, slugify } from "@/lib/utils";
import { ArchiveDialog, ActivitySheet } from "./BoardPanels";

const NOUNS = ["item", "task", "project", "bug", "deal", "lead", "campaign", "post", "ticket", "request"];

export function exportBoardCSV(board: Board, itemIds?: string[]) {
  const { items, users } = useStore.getState();
  downloadFile(`${slugify(board.name)}.csv`, boardToCSV(board, items, indexUsers(users), { itemIds }), "text/csv");
}

export function BoardHeader({ board }: { board: Board }) {
  const router = useRouter();
  const users = useUsers();
  const members = board.memberIds.map((id) => users.find((u) => u.id === id)).filter((u): u is User => !!u);
  const [renaming, setRenaming] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-start justify-between gap-4 px-8 pt-5">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <h1 className="min-w-0">
            <EditableText
              value={board.name}
              editing={renaming}
              onEditingChange={setRenaming}
              onCommit={(name) => actions.renameBoard(board.id, name)}
              className="block font-display text-2xl font-medium leading-9"
              inputClassName="h-10 w-[min(520px,50vw)] font-display text-2xl font-medium"
              ariaLabel="Board name"
              maxLength={80}
            />
          </h1>
          <Popover open={descriptionOpen} onOpenChange={setDescriptionOpen}>
            <PopoverTrigger asChild>
              <IconButton label="Board info" active={descriptionOpen}>
                <Info size={18} />
              </IconButton>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-4">
              <DescriptionEditor board={board} owner={users.find((u) => u.id === board.ownerId)} />
            </PopoverContent>
          </Popover>
          <IconButton
            label={board.favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => actions.setBoardFavorite(board.id, !board.favorite)}
          >
            <Star size={18} className={board.favorite ? "fill-[#ffcb00] text-[#ffcb00]" : undefined} />
          </IconButton>
        </div>
        {board.description ? (
          <button
            type="button"
            onClick={() => setDescriptionOpen(true)}
            className="block max-w-3xl truncate text-left text-sm text-fg-muted hover:text-fg"
          >
            {board.description}
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <Button variant="ghost" onClick={() => setActivityOpen(true)} className="hidden lg:inline-flex">
          <Activity size={16} /> Activity
        </Button>
        <button
          type="button"
          onClick={() => openDialog("invite", { boardId: board.id })}
          className="flex h-8 items-center gap-2 rounded-[4px] border border-line-strong pl-1.5 pr-3 text-sm hover:bg-hover"
        >
          <AvatarStack users={members} max={3} size={22} />
          <span>Invite / {members.length}</span>
        </button>
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="Board options">
              <MoreHorizontal size={18} />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="end" className="w-60">
            <MenuItem icon={Pencil} onSelect={() => setRenaming(true)}>
              Rename board
            </MenuItem>
            <MenuItem icon={Info} onSelect={() => setDescriptionOpen(true)}>
              Edit description
            </MenuItem>
            <MenuItem icon={board.favorite ? StarOff : Star} onSelect={() => actions.setBoardFavorite(board.id, !board.favorite)}>
              {board.favorite ? "Remove from favorites" : "Add to favorites"}
            </MenuItem>
            <MenuSub>
              <MenuSubTrigger icon={Copy}>Duplicate board</MenuSubTrigger>
              <MenuSubContent>
                {[true, false].map((withItems) => (
                  <MenuItem
                    key={String(withItems)}
                    onSelect={() => {
                      const id = actions.duplicateBoard(board.id, withItems);
                      if (id) {
                        toast(`Duplicated “${board.name}”`);
                        router.push(`/boards/${id}`);
                      }
                    }}
                  >
                    {withItems ? "Structure and items" : "Structure only"}
                  </MenuItem>
                ))}
              </MenuSubContent>
            </MenuSub>
            <MenuItem icon={Download} onSelect={() => exportBoardCSV(board)}>
              Export to CSV
            </MenuItem>
            <MenuItem icon={Activity} onSelect={() => setActivityOpen(true)}>
              Activity log
            </MenuItem>
            <MenuItem icon={Archive} onSelect={() => setArchiveOpen(true)}>
              Archived items
            </MenuItem>
            <MenuSub>
              <MenuSubTrigger icon={Tag}>Item terminology</MenuSubTrigger>
              <MenuSubContent>
                {NOUNS.map((noun) => (
                  <MenuCheckItem key={noun} checked={board.itemNoun === noun} onCheckedChange={() => actions.setItemNoun(board.id, noun)}>
                    {capitalize(noun)}
                  </MenuCheckItem>
                ))}
              </MenuSubContent>
            </MenuSub>
            <MenuSeparator />
            <MenuItem icon={Trash2} danger onSelect={() => setConfirmDelete(true)}>
              Delete board
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      <ActivitySheet board={board} open={activityOpen} onOpenChange={setActivityOpen} />
      <ArchiveDialog board={board} open={archiveOpen} onOpenChange={setArchiveOpen} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${board.name}”?`}
        description="The board, its items and their updates will be deleted. You can undo right after."
        confirmLabel="Delete board"
        onConfirm={() => {
          router.push("/");
          actions.deleteBoard(board.id, board.name);
        }}
      />
    </div>
  );
}

function DescriptionEditor({ board, owner }: { board: Board; owner?: User }) {
  return (
    <div>
      <div className="mb-2 font-display text-lg font-medium">{board.name}</div>
      <textarea
        defaultValue={board.description}
        rows={4}
        placeholder="Add a description so everyone knows what this board is for"
        aria-label="Board description"
        onBlur={(e) => {
          if (e.target.value !== board.description) actions.setBoardDescription(board.id, e.target.value.trim());
        }}
        className="w-full resize-none rounded border border-line-strong bg-transparent p-2 text-sm outline-none focus:border-primary"
      />
      <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 text-xs">
        <dt className="text-fg-muted">Owner</dt>
        <dd>{owner?.name ?? "—"}</dd>
        <dt className="text-fg-muted">Created</dt>
        <dd>{formatDateTime(board.createdAt)}</dd>
        <dt className="text-fg-muted">Last change</dt>
        <dd>{formatDateTime(board.updatedAt)}</dd>
      </dl>
    </div>
  );
}
