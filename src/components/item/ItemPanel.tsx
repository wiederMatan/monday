"use client";

import { ChevronRight, Clock, FolderOpen, ListTree, Maximize2, MoreHorizontal, Plus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ActivityList } from "@/components/board/ActivityList";
import { Cell } from "@/components/cells/Cell";
import { COLUMN_ICONS } from "@/components/cells/meta";
import { PeopleCell } from "@/components/cells/PeopleCell";
import { DateCell } from "@/components/cells/DateCells";
import { LabelChip, StatusCell } from "@/components/cells/StatusCell";
import { ItemMenuItems } from "@/components/table/menus";
import { AvatarStack } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { EditableText } from "@/components/ui/EditableText";
import { Menu, MenuContent, MenuTrigger } from "@/components/ui/Menu";
import * as actions from "@/lib/actions";
import { asStringArray, columnsFor, isItemDone } from "@/lib/columns";
import { formatDateTime } from "@/lib/dates";
import { useBoard, useItem, useItemPanel, useUserIndex } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, Item, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UpdatesTab } from "./Updates";

type Tab = "updates" | "info" | "subitems" | "activity";

export function ItemPanel() {
  const { itemId, close } = useItemPanel();
  const item = useItem(itemId);
  const board = useBoard(item?.boardId);
  const open = !!item && !!board && !item.archivedAt;

  // A stale link (deleted or archived item) should not leave `?item=` behind.
  useEffect(() => {
    if (itemId && !open) close();
  }, [itemId, open, close]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/15 animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            // Focus the panel itself rather than its first button (which would pop a tooltip).
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[min(760px,100vw)] flex-col bg-raised text-fg shadow-panel outline-none animate-slide-in-right"
        >
          {item && board ? <ItemCard key={item.id} item={item} board={board} /> : <Dialog.Title className="sr-only">Item</Dialog.Title>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ItemCard({ item, board }: { item: Item; board: Board }) {
  const [tab, setTab] = useState<Tab>("updates");
  const panel = useItemPanel();
  const users = useUserIndex();
  const group = board.groups.find((g) => g.id === item.groupId);
  const parent = useStore((s) => (item.parentId ? s.items[item.parentId] : undefined));
  const columns = columnsFor(board, item);
  const status = columns.find((c) => c.type === "status");
  const people = columns.find((c) => c.type === "people");
  const owners = people ? asStringArray(item.values[people.id]).map((id) => users[id]).filter((u): u is User => !!u) : [];
  const updatesCount = useStore((s) => Object.values(s.updates).filter((u) => u.itemId === item.id).length);
  const activity = useStore(useShallow((s) => s.activity.filter((a) => a.itemId === item.id)));
  const subitemCount = item.subitemIds?.length ?? 0;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "updates", label: updatesCount ? `Updates / ${updatesCount}` : "Updates" },
    { id: "info", label: "Info" },
    ...(item.parentId ? [] : [{ id: "subitems" as const, label: subitemCount ? `Subitems / ${subitemCount}` : "Subitems" }]),
    { id: "activity", label: "Activity log" },
  ];

  return (
    <>
      <header className="border-b border-line-soft px-6 pt-4">
        <div className="flex items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xs text-fg-muted">
            <Link href={`/boards/${board.id}`} className="truncate hover:text-fg hover:underline" onClick={() => panel.close()}>
              {board.name}
            </Link>
            <ChevronRight size={12} className="shrink-0" />
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: group?.color }} />
              <span className="truncate">{group?.title}</span>
            </span>
            {parent ? (
              <>
                <ChevronRight size={12} className="shrink-0" />
                <button type="button" onClick={() => panel.open(parent.id)} className="truncate hover:text-fg hover:underline">
                  {parent.name}
                </button>
              </>
            ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            <Menu>
              <MenuTrigger asChild>
                <IconButton label="Item options">
                  <MoreHorizontal size={18} />
                </IconButton>
              </MenuTrigger>
              <MenuContent align="end">
                <ItemMenuItems board={board} item={item} onOpen={() => setTab("info")} />
              </MenuContent>
            </Menu>
            <Dialog.Close asChild>
              <IconButton label="Close" tooltip={false}>
                <X size={20} />
              </IconButton>
            </Dialog.Close>
          </div>
        </div>
        <Dialog.Title asChild>
          <h2 className="mt-1">
            <EditableText
              value={item.name}
              onCommit={(name) => actions.renameItem(item.id, name)}
              className="block font-display text-2xl font-medium leading-9"
              inputClassName="h-10 w-full font-display text-2xl font-medium"
              ariaLabel="Item name"
            />
          </h2>
        </Dialog.Title>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {status ? (
            <div className="h-7 w-36 overflow-hidden rounded">
              <LabelChip column={status} value={item.values[status.id]} />
            </div>
          ) : null}
          {owners.length ? (
            <span className="flex items-center gap-2 text-sm text-fg-muted">
              <AvatarStack users={owners} size={24} />
              <span className="truncate">{owners.map((u) => u.name).join(", ")}</span>
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex gap-5" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px border-b-2 pb-2.5 text-sm",
                tab === t.id ? "border-primary font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto bg-sunken px-6 py-5">
        {tab === "updates" ? <UpdatesTab item={item} /> : null}
        {tab === "info" ? <InfoTab item={item} board={board} /> : null}
        {tab === "subitems" ? <SubitemsTab item={item} board={board} /> : null}
        {tab === "activity" ? (
          <div className="rounded-lg bg-surface px-4">
            <ActivityList entries={activity} showItem={false} emptyText="No changes recorded yet" />
          </div>
        ) : null}
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)] items-center gap-3 border-b border-line-soft py-1.5 last:border-b-0">
      <span className="flex min-w-0 items-center gap-2 text-sm text-fg-muted">
        <Icon size={15} className="shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function InfoTab({ item, board }: { item: Item; board: Board }) {
  const users = useUserIndex();
  const group = board.groups.find((g) => g.id === item.groupId);
  const groupColor = group?.color ?? "#579bfc";
  const created = users[item.createdBy];

  const parent = useStore((s) => (item.parentId ? s.items[item.parentId] : undefined));
  const panel = useItemPanel();

  return (
    <div className="rounded-lg bg-surface px-4 py-2">
      {parent ? (
        <InfoRow icon={ListTree} label="Subitem of">
          <button type="button" onClick={() => panel.open(parent.id)} className="text-sm text-primary hover:underline">
            {parent.name}
          </button>
        </InfoRow>
      ) : (
      <InfoRow icon={FolderOpen} label="Group">
        <select
          value={item.groupId}
          onChange={(e) => {
            const target = board.groups.find((g) => g.id === e.target.value);
            if (target) actions.moveItemsToGroup([item.id], target.id, target.title);
          }}
          className="h-9 w-full rounded border border-line-soft bg-transparent px-2 text-sm outline-none hover:border-line-strong focus:border-primary"
          aria-label="Group"
        >
          {board.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </InfoRow>
      )}
      {columnsFor(board, item)
        .filter((column) => column.type !== "last_updated")
        .map((column) => (
        <InfoRow key={column.id} icon={COLUMN_ICONS[column.type]} label={column.title}>
          <div className="h-9 overflow-hidden rounded border border-line-soft hover:border-line-strong">
            {column.type === "people" ? (
              <PeopleCell
                value={item.values[column.id]}
                onChange={(ids) => actions.setCellValue(item.id, column.id, ids)}
                label={column.title}
                align="start"
              />
            ) : (
              <Cell board={board} column={column} item={item} groupColor={groupColor} />
            )}
          </div>
        </InfoRow>
      ))}
      <InfoRow icon={UserRound} label="Created by">
        <span className="text-sm">
          {created?.name ?? "Someone"} · {formatDateTime(item.createdAt)}
        </span>
      </InfoRow>
      <InfoRow icon={Clock} label="Last updated">
        <span className="text-sm">
          {users[item.updatedBy]?.name ?? "Someone"} · {formatDateTime(item.updatedAt)}
        </span>
      </InfoRow>
    </div>
  );
}

/** The item's subitems as a compact list, with the first status/people/date subitem columns. */
function SubitemsTab({ item, board }: { item: Item; board: Board }) {
  const panel = useItemPanel();
  const children = useStore(
    useShallow((s) => (item.subitemIds ?? []).map((id) => s.items[id]).filter((i): i is Item => !!i && !i.archivedAt)),
  );
  const columns = board.subitemColumns ?? [];
  const status = columns.find((c) => c.type === "status");
  const people = columns.find((c) => c.type === "people");
  const date = columns.find((c) => c.type === "date");
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    actions.addSubitem(item.id, { name: text });
    setText("");
  };

  return (
    <div className="rounded-lg bg-surface">
      {children.length === 0 ? (
        <p className="px-4 pt-6 text-center text-sm text-fg-muted">Break this item into smaller steps. Subitems have their own owner, status and date.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {children.map((child) => (
            <li key={child.id} className="group/sub grid grid-cols-[minmax(0,1fr)_130px_70px_110px] items-center gap-2 px-3 py-1.5">
              <span className="flex min-w-0 items-center gap-1">
                <EditableText
                  value={child.name}
                  onCommit={(name) => actions.renameItem(child.id, name)}
                  className="block min-w-0 text-sm"
                  inputClassName="h-7 w-full text-sm"
                  ariaLabel="Subitem name"
                />
                <button
                  type="button"
                  aria-label={`Open ${child.name}`}
                  onClick={() => panel.open(child.id)}
                  className="flex size-6 shrink-0 items-center justify-center rounded text-fg-muted opacity-0 hover:bg-hover hover:text-fg group-hover/sub:opacity-100"
                >
                  <Maximize2 size={13} />
                </button>
              </span>
              <span className="h-7 overflow-hidden rounded">
                {status ? <StatusCell board={board} column={status} value={child.values[status.id]} onChange={(v) => actions.setCellValue(child.id, status.id, v)} /> : null}
              </span>
              <span className="h-8">
                {people ? (
                  <PeopleCell value={child.values[people.id]} onChange={(v) => actions.setCellValue(child.id, people.id, v)} label={people.title} />
                ) : null}
              </span>
              <span className="h-8">
                {date ? (
                  <DateCell
                    value={child.values[date.id]}
                    onChange={(v) => actions.setCellValue(child.id, date.id, v)}
                    done={isItemDone(board, child)}
                    label={date.title}
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 p-3">
        <Plus size={16} className="text-fg-muted" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Add subitem"
          aria-label={`Add subitem to ${item.name}`}
          className="h-8 min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 text-sm outline-none hover:border-line-strong focus:border-primary"
        />
      </div>
      {children.length ? (
        <p className="px-4 pb-3 text-xs text-fg-muted">
          {children.filter((c) => isItemDone(board, c)).length} of {children.length} done
          {people ? ` · ${new Set(children.flatMap((c) => asStringArray(c.values[people.id]))).size} people involved` : ""}
        </p>
      ) : null}
    </div>
  );
}
