"use client";

import {
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderInput,
  House,
  LayoutList,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { IconButton } from "@/components/ui/Button";
import { EditableText } from "@/components/ui/EditableText";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/Modal";
import * as actions from "@/lib/actions";
import { useStore } from "@/lib/store";
import type { Board, Workspace } from "@/lib/types";
import { openDialog, toast } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const collapsed = useStore((s) => s.preferences.sidebarCollapsed);

  if (collapsed) {
    return (
      <div className="relative w-5 shrink-0">
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={() => actions.setSidebarCollapsed(false)}
          className="absolute left-1 top-3 z-10 flex size-7 items-center justify-center rounded-full border border-line bg-surface text-fg-muted shadow-card hover:bg-primary hover:text-white"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside className="group/sidebar relative flex w-64 shrink-0 flex-col overflow-hidden rounded-tr-xl bg-surface shadow-card">
      <button
        type="button"
        aria-label="Collapse sidebar"
        onClick={() => actions.setSidebarCollapsed(true)}
        className="absolute right-2 top-2.5 z-10 flex size-7 items-center justify-center rounded-full border border-line bg-surface text-fg-muted opacity-0 shadow-card transition-opacity hover:bg-primary hover:text-white focus-visible:opacity-100 group-hover/sidebar:opacity-100"
      >
        <ChevronLeft size={16} />
      </button>
      <nav className="flex flex-col gap-0.5 px-2 pt-2" aria-label="Main">
        <SideLink href="/" icon={House} label="Home" />
        <SideLink href="/my-work" icon={CalendarCheck} label="My work" />
      </nav>
      <div className="mx-4 my-2 h-px bg-line-soft" />
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <FavoritesSection />
        <div className="mx-4 my-2 h-px bg-line-soft" />
        <WorkspaceSection />
      </div>
    </aside>
  );
}

function SideLink({ href, icon: Icon, label }: { href: string; icon: typeof House; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
        active ? "bg-primary-soft font-medium text-fg" : "hover:bg-hover",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={17} className="text-fg-muted" />
      {label}
    </Link>
  );
}

function FavoritesSection() {
  const [open, setOpen] = useState(true);
  const favorites = useStore(
    useShallow((s) => s.boardOrder.map((id) => s.boards[id]).filter((b): b is Board => !!b && b.favorite)),
  );
  return (
    <section className="px-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm hover:bg-hover"
        aria-expanded={open}
      >
        <Star size={17} className="text-fg-muted" />
        <span className="flex-1 text-left">Favorites</span>
        <ChevronDown size={15} className={cn("text-fg-muted transition-transform", !open && "-rotate-90")} />
      </button>
      {open ? (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {favorites.length === 0 ? (
            <p className="px-3 py-1.5 text-xs leading-relaxed text-fg-muted">
              Star boards to keep them here. Use the ★ next to a board&apos;s name.
            </p>
          ) : (
            favorites.map((board) => <BoardLink key={board.id} board={board} />)
          )}
        </div>
      ) : null}
    </section>
  );
}

function WorkspaceSection() {
  const router = useRouter();
  const workspaces = useStore((s) => s.workspaces);
  const activeId = useStore((s) => s.activeWorkspaceId);
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  const boards = useStore(
    useShallow((s) =>
      s.boardOrder.map((id) => s.boards[id]).filter((b): b is Board => !!b && b.workspaceId === active.id),
    ),
  );
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? boards.filter((b) => b.name.toLowerCase().includes(q)) : boards;
  }, [boards, query]);

  return (
    <section className="px-2">
      <div className="flex h-8 items-center justify-between px-2">
        <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">Workspaces</span>
        <div className="flex items-center">
          <IconButton
            label="Search boards"
            size="xs"
            active={searching}
            onClick={() => {
              setSearching((s) => !s);
              setQuery("");
            }}
          >
            <Search size={14} />
          </IconButton>
          <Menu>
            <MenuTrigger asChild>
              <IconButton label="Workspace options" size="xs">
                <MoreHorizontal size={15} />
              </IconButton>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem icon={Pencil} onSelect={() => setRenaming(true)}>
                Rename workspace
              </MenuItem>
              <MenuItem icon={Plus} onSelect={() => openDialog("createWorkspace")}>
                Add workspace
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={Trash2} danger disabled={workspaces.length <= 1} onSelect={() => setConfirmDelete(true)}>
                Delete workspace
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {renaming ? (
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-primary px-2 text-sm">
            <WorkspaceIcon workspace={active} />
            <EditableText
              value={active.name}
              editing
              onEditingChange={setRenaming}
              onCommit={(name) => actions.renameWorkspace(active.id, name)}
              inputClassName="min-w-0 flex-1 bg-transparent font-medium outline-none"
              ariaLabel="Workspace name"
            />
          </div>
        ) : (
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line px-2 text-sm hover:bg-hover"
              aria-label="Switch workspace"
            >
              <WorkspaceIcon workspace={active} />
              <span className="min-w-0 flex-1 truncate text-left font-medium">{active.name}</span>
              <ChevronDown size={15} className="shrink-0 text-fg-muted" />
            </button>
          </MenuTrigger>
          <MenuContent className="w-60">
            <MenuLabel>My workspaces</MenuLabel>
            {workspaces.map((w) => (
              <MenuItem key={w.id} onSelect={() => actions.setActiveWorkspace(w.id)} className={cn(w.id === active.id && "bg-primary-soft")}>
                <span className="flex items-center gap-2">
                  <WorkspaceIcon workspace={w} size={20} />
                  {w.name}
                </span>
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon={Plus} onSelect={() => openDialog("createWorkspace")}>
              Add workspace
            </MenuItem>
          </MenuContent>
        </Menu>
        )}
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              aria-label="Add new"
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-hover"
            >
              <Plus size={18} />
            </button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuLabel>Add new</MenuLabel>
            <MenuItem icon={LayoutList} onSelect={() => openDialog("createBoard", { workspaceId: active.id })}>
              Board
            </MenuItem>
            <MenuItem icon={Plus} onSelect={() => openDialog("createWorkspace")}>
              Workspace
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {searching ? (
        <div className="mt-2 flex h-8 items-center gap-1.5 rounded-md border border-primary px-2">
          <Search size={14} className="text-fg-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearching(false);
                setQuery("");
              }
            }}
            placeholder="Search boards"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search boards"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-fg-muted hover:text-fg">
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-col gap-0.5">
        {filtered.map((board) => (
          <BoardLink key={board.id} board={board} />
        ))}
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-fg-muted">{query ? "No boards match your search" : "No boards in this workspace yet"}</p>
        ) : null}
        <button
          type="button"
          onClick={() => openDialog("createBoard", { workspaceId: active.id })}
          className="flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-fg-muted hover:bg-hover hover:text-fg"
        >
          <Plus size={16} /> Add board
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${active.name}”?`}
        description={`This deletes the workspace and its ${boards.length} board${boards.length === 1 ? "" : "s"}. This can't be undone from the board.`}
        confirmLabel="Delete workspace"
        onConfirm={() => {
          actions.deleteWorkspace(active.id);
          toast(`Workspace “${active.name}” deleted`);
          router.push("/");
        }}
      />
    </section>
  );
}

export function WorkspaceIcon({ workspace, size = 24 }: { workspace: Workspace; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
      style={{ width: size, height: size, background: workspace.color, fontSize: Math.round(size * 0.5) }}
      aria-hidden
    >
      {workspace.name.trim()[0]?.toUpperCase() ?? "W"}
    </span>
  );
}

function BoardLink({ board }: { board: Board }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === `/boards/${board.id}` || pathname.startsWith(`/boards/${board.id}/`);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const workspaces = useStore((s) => s.workspaces);

  return (
    <div
      className={cn(
        "group/board relative flex h-8 items-center rounded-md transition-colors",
        active ? "bg-primary-soft" : "hover:bg-hover",
      )}
    >
      {renaming ? (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
          <LayoutList size={16} className="shrink-0 text-fg-muted" />
          <EditableText
            value={board.name}
            editing
            onEditingChange={setRenaming}
            onCommit={(name) => actions.renameBoard(board.id, name)}
            className="h-7 min-w-0 flex-1 text-sm"
            ariaLabel="Board name"
          />
        </div>
      ) : (
        <Link
          href={`/boards/${board.id}`}
          className="flex h-full min-w-0 flex-1 items-center gap-2.5 px-2 text-sm"
          aria-current={active ? "page" : undefined}
        >
          <LayoutList size={16} className="shrink-0 text-fg-muted" />
          <span className={cn("truncate", active && "font-medium")}>{board.name}</span>
        </Link>
      )}
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={`${board.name} options`}
            className="mr-1 flex size-6 shrink-0 items-center justify-center rounded text-fg-muted opacity-0 hover:bg-active focus-visible:opacity-100 group-hover/board:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>
        </MenuTrigger>
        <MenuContent align="start" side="right">
          <MenuItem icon={ExternalLink} onSelect={() => window.open(`/boards/${board.id}`, "_blank", "noopener")}>
            Open in new tab
          </MenuItem>
          <MenuItem icon={Pencil} onSelect={() => setRenaming(true)}>
            Rename board
          </MenuItem>
          <MenuItem icon={board.favorite ? StarOff : Star} onSelect={() => actions.setBoardFavorite(board.id, !board.favorite)}>
            {board.favorite ? "Remove from favorites" : "Add to favorites"}
          </MenuItem>
          <MenuItem
            icon={Copy}
            onSelect={() => {
              const id = actions.duplicateBoard(board.id, true);
              if (id) {
                toast(`Duplicated “${board.name}”`);
                router.push(`/boards/${id}`);
              }
            }}
          >
            Duplicate board
          </MenuItem>
          {workspaces.length > 1 ? (
            <MenuSub>
              <MenuSubTrigger icon={FolderInput}>Move to workspace</MenuSubTrigger>
              <MenuSubContent>
                {workspaces
                  .filter((w) => w.id !== board.workspaceId)
                  .map((w) => (
                    <MenuItem
                      key={w.id}
                      onSelect={() => {
                        actions.moveBoardToWorkspace(board.id, w.id);
                        toast(`Moved “${board.name}” to ${w.name}`);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <WorkspaceIcon workspace={w} size={20} />
                        {w.name}
                      </span>
                    </MenuItem>
                  ))}
              </MenuSubContent>
            </MenuSub>
          ) : null}
          <MenuSeparator />
          <MenuItem icon={Trash2} danger onSelect={() => setConfirmDelete(true)}>
            Delete board
          </MenuItem>
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${board.name}”?`}
        description="The board, its items and their updates will be deleted. You can undo right after."
        confirmLabel="Delete board"
        onConfirm={() => {
          if (active) router.push("/");
          actions.deleteBoard(board.id, board.name);
        }}
      />
    </div>
  );
}
