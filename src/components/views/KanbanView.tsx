"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarDays, Kanban, MessageCircle, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { LabelChip } from "@/components/cells/StatusCell";
import { TagChip } from "@/components/cells/TagsCell";
import { AvatarStack } from "@/components/ui/Avatar";
import * as actions from "@/lib/actions";
import { EMPTY_LABEL_COLOR, readableTextColor } from "@/lib/colors";
import { asDate, asStringArray, cellText, getLabel, getTag, isEmptyValue, isItemDone } from "@/lib/columns";
import { formatDate, isPast } from "@/lib/dates";
import { useItemPanel, useToday, useUpdateCounts, useUserIndex } from "@/lib/hooks";
import type { Board, BoardView, Column, Item, TagOption, User } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { EmptyViewState, useViewItems, VIEW_SELECT } from "./common";

const EMPTY_LANE = "__empty";

export function KanbanView({ board, view }: { board: Board; view: BoardView }) {
  const statusColumns = board.columns.filter((c) => c.type === "status");
  const column = statusColumns.find((c) => c.id === view.settings.statusColumnId) ?? statusColumns[0];

  if (!column) {
    return (
      <EmptyViewState
        icon={Kanban}
        title="Kanban needs a status column"
        description="Cards are grouped into lanes by a status column. Add one to this board to get started."
        actionLabel="Add status column"
        onAction={() => actions.addColumn(board.id, "status")}
      />
    );
  }
  return <KanbanBoard board={board} view={view} column={column} statusColumns={statusColumns} />;
}

function KanbanBoard({ board, view, column, statusColumns }: { board: Board; view: BoardView; column: Column; statusColumns: Column[] }) {
  const items = useViewItems(board, view);
  const panel = useItemPanel();
  const updateCounts = useUpdateCounts(board.id);
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
  // A drop can be followed by a click on the card; don't treat that as "open".
  const dragging = useRef(false);
  const endDrag = () => {
    setDragId(null);
    setTimeout(() => {
      dragging.current = false;
    }, 0);
  };
  const openItem = (id: string) => {
    if (!dragging.current) panel.open(id);
  };

  const lanes = useMemo(() => {
    const labels = column.settings.labels ?? [];
    const byLane = new Map<string, Item[]>();
    for (const item of items) {
      const key = getLabel(column, item.values[column.id])?.id ?? EMPTY_LANE;
      byLane.set(key, [...(byLane.get(key) ?? []), item]);
    }
    return [
      ...labels.map((l) => ({ id: l.id, name: l.name, color: l.color, items: byLane.get(l.id) ?? [] })),
      { id: EMPTY_LANE, name: "Not set", color: EMPTY_LABEL_COLOR, items: byLane.get(EMPTY_LANE) ?? [] },
    ];
  }, [items, column]);

  const dragItem = dragId ? items.find((i) => i.id === dragId) : undefined;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    endDrag();
    if (!over) return;
    const lane = String(over.id).replace(/^lane:/, "");
    const next = lane === EMPTY_LANE ? null : lane;
    const item = items.find((i) => i.id === active.id);
    if (item && (item.values[column.id] ?? null) !== next) actions.setCellValue(item.id, column.id, next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-8 pb-3 text-sm text-fg-muted">
        Lanes by
        <select
          value={column.id}
          onChange={(e) => actions.updateView(board.id, view.id, { settings: { statusColumnId: e.target.value } })}
          className={VIEW_SELECT}
          aria-label="Kanban column"
        >
          {statusColumns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <span className="ml-2">{pluralize(items.length, board.itemNoun)}</span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => {
          dragging.current = true;
          setDragId(String(active.id));
        }}
        onDragEnd={onDragEnd}
        onDragCancel={endDrag}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-8 pb-6">
          {lanes.map((lane) => (
            <Lane
              key={lane.id}
              board={board}
              view={view}
              column={column}
              lane={lane}
              updateCounts={updateCounts}
              onOpen={openItem}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragItem ? (
            <div className="w-[264px] rotate-2">
              <KanbanCard board={board} kanbanColumn={column} item={dragItem} updates={updateCounts[dragItem.id] ?? 0} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Lane({
  board,
  view,
  column,
  lane,
  updateCounts,
  onOpen,
}: {
  board: Board;
  view: BoardView;
  column: Column;
  lane: { id: string; name: string; color: string; items: Item[] };
  updateCounts: Record<string, number>;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane:${lane.id}` });
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const add = () => {
    const name = text.trim();
    if (!name) return;
    actions.addItem(board.id, board.groups[0]?.id ?? null, {
      name,
      values: lane.id === EMPTY_LANE ? {} : { [column.id]: lane.id },
    });
    setText("");
  };

  return (
    <section
      ref={setNodeRef}
      aria-label={lane.name}
      className={cn(
        "flex w-[272px] shrink-0 flex-col overflow-hidden rounded-lg bg-sunken transition-shadow",
        isOver && "ring-2 ring-primary",
      )}
    >
      <header
        className="flex h-10 shrink-0 items-center justify-between px-3 text-sm font-medium"
        style={{ background: lane.color, color: readableTextColor(lane.color) }}
      >
        <span className="truncate">{lane.name}</span>
        <span className="rounded-full bg-black/15 px-2 text-xs">{lane.items.length}</span>
      </header>
      <div className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {lane.items.map((item) => (
          <DraggableCard key={item.id} id={item.id} onOpen={() => onOpen(item.id)}>
            <KanbanCard board={board} kanbanColumn={column} item={item} updates={updateCounts[item.id] ?? 0} hidden={view.hiddenColumnIds} />
          </DraggableCard>
        ))}
        {adding ? (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") {
                setText("");
                setAdding(false);
              }
            }}
            onBlur={() => {
              add();
              setAdding(false);
            }}
            placeholder={`${board.itemNoun[0].toUpperCase()}${board.itemNoun.slice(1)} name`}
            aria-label={`New ${board.itemNoun} in ${lane.name}`}
            className="h-9 rounded-md border border-primary bg-surface px-2.5 text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-fg-muted hover:bg-hover hover:text-fg"
          >
            <Plus size={15} /> Add {board.itemNoun}
          </button>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ id, onOpen, children }: { id: string; onOpen: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && !e.defaultPrevented) onOpen();
      }}
      className={cn("cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary", isDragging && "opacity-30")}
    >
      {children}
    </div>
  );
}

function CardField({ column, item, board }: { column: Column; item: Item; board: Board }) {
  const users = useUserIndex();
  const today = useToday();
  const value = item.values[column.id];
  switch (column.type) {
    case "status":
      return (
        <div className="w-28 overflow-hidden rounded">
          <LabelChip column={column} value={value} compact />
        </div>
      );
    case "people": {
      const people = asStringArray(value).map((id) => users[id]).filter((u): u is User => !!u);
      return <AvatarStack users={people} size={22} />;
    }
    case "date": {
      const date = asDate(value);
      if (!date) return null;
      const overdue = !isItemDone(board, item) && isPast(date, today);
      return (
        <span className={cn("flex items-center gap-1 text-xs", overdue ? "font-medium text-negative" : "text-fg-muted")}>
          <CalendarDays size={13} /> {formatDate(date)}
        </span>
      );
    }
    case "tags":
      return (
        <span className="flex flex-wrap gap-1">
          {asStringArray(value)
            .map((id) => getTag(column, id))
            .filter((t): t is TagOption => !!t)
            .map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
        </span>
      );
    default:
      return <span className="truncate text-xs text-fg-muted">{cellText(column, value, { users, item })}</span>;
  }
}

export function KanbanCard({
  board,
  kanbanColumn,
  item,
  updates,
  hidden = [],
}: {
  board: Board;
  kanbanColumn: Column;
  item: Item;
  updates: number;
  hidden?: string[];
}) {
  const group = board.groups.find((g) => g.id === item.groupId);
  const fields = board.columns
    .filter((c) => c.id !== kanbanColumn.id && c.type !== "last_updated" && !hidden.includes(c.id))
    .filter((c) => !isEmptyValue(c, item.values[c.id]))
    .slice(0, 5);

  return (
    <article className="rounded-md border-l-4 bg-surface p-3 shadow-card transition-shadow hover:shadow-pop" style={{ borderLeftColor: group?.color }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug" dir="auto">
          {item.name}
        </h3>
        {updates ? (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-primary">
            <MessageCircle size={14} /> {updates}
          </span>
        ) : null}
      </div>
      {fields.length ? (
        <dl className="mt-2.5 space-y-1.5">
          {fields.map((column) => (
            <div key={column.id} className="flex min-h-6 items-center justify-between gap-2">
              <dt className="truncate text-xs text-fg-faint">{column.title}</dt>
              <dd className="flex min-w-0 justify-end">
                <CardField column={column} item={item} board={board} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
