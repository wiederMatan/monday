"use client";

import { CalendarCheck, ChevronDown, ChevronRight, PartyPopper, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DateCell } from "@/components/cells/DateCells";
import { StatusCell } from "@/components/cells/StatusCell";
import { Switch } from "@/components/ui/Checkbox";
import * as actions from "@/lib/actions";
import { asDate, asStringArray, columnsFor, isItemDone } from "@/lib/columns";
import { DATE_BUCKET_LABELS, dateBucket, type DateBucket } from "@/lib/dates";
import { useItemPanel, useToday } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, Column, Group, Item } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER: DateBucket[] = ["overdue", "today", "this_week", "next_week", "later", "none"];

interface Row {
  item: Item;
  parent?: Item;
  board: Board;
  group?: Group;
  status?: Column;
  date?: Column;
  bucket: DateBucket;
  done: boolean;
}

export function MyWorkScreen() {
  const me = useStore((s) => s.currentUserId);
  const items = useStore((s) => s.items);
  const boards = useStore((s) => s.boards);
  const today = useToday();
  const panel = useItemPanel();
  const [query, setQuery] = useState("");
  const [hideDone, setHideDone] = useState(true);
  const [collapsed, setCollapsed] = useState<DateBucket[]>([]);

  useEffect(() => {
    document.title = "My work · monday";
  }, []);

  const rows = useMemo(() => {
    const result: Row[] = [];
    for (const item of Object.values(items)) {
      const board = boards[item.boardId];
      if (!board || item.archivedAt) continue;
      const parent = item.parentId ? items[item.parentId] : undefined;
      if (item.parentId && (!parent || parent.archivedAt)) continue;
      const columns = columnsFor(board, item);
      const mine = columns.some((c) => c.type === "people" && asStringArray(item.values[c.id]).includes(me));
      if (!mine) continue;
      const date = columns.find((c) => c.type === "date");
      result.push({
        item,
        parent,
        board,
        group: board.groups.find((g) => g.id === item.groupId),
        status: columns.find((c) => c.type === "status"),
        date,
        bucket: dateBucket(date ? asDate(item.values[date.id]) : null, today),
        done: isItemDone(board, item),
      });
    }
    return result;
  }, [items, boards, me, today]);

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) => (!hideDone || !r.done) && (!q || r.item.name.toLowerCase().includes(q) || r.board.name.toLowerCase().includes(q)),
  );
  const doneHidden = rows.filter((r) => r.done).length;

  return (
    <div className="h-full overflow-auto">
      <div className="px-8 py-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-medium">
          <CalendarCheck size={24} className="text-fg-muted" /> My work
        </h1>
        <p className="mt-1 text-sm text-fg-muted">Everything assigned to you across all boards, by due date.</p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="flex h-8 w-64 items-center gap-2 rounded-[4px] border border-line-strong px-2 focus-within:border-primary">
            <Search size={15} className="text-fg-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items or boards"
              aria-label="Search my work"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-fg-muted hover:text-fg">
                <X size={14} />
              </button>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={hideDone} onChange={setHideDone} label="Hide done items" size="sm" />
            Hide done items{hideDone && doneHidden ? <span className="text-fg-muted">({doneHidden})</span> : null}
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <PartyPopper size={40} className="text-primary" />
            <div className="font-display text-xl font-medium">{q ? "Nothing matches your search" : "You're all caught up!"}</div>
            <p className="text-sm text-fg-muted">{q ? "Try another word." : "Items assigned to you on any board will show up here."}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {ORDER.map((bucket) => {
              const list = visible.filter((r) => r.bucket === bucket);
              if (!list.length) return null;
              const isCollapsed = collapsed.includes(bucket);
              return (
                <section key={bucket} aria-label={DATE_BUCKET_LABELS[bucket]}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => setCollapsed((c) => (isCollapsed ? c.filter((b) => b !== bucket) : [...c, bucket]))}
                    className={cn(
                      "mb-2 flex items-center gap-1.5 font-display text-lg font-medium",
                      bucket === "overdue" ? "text-critical" : "text-fg",
                    )}
                  >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    {DATE_BUCKET_LABELS[bucket]}
                    <span className="text-sm font-normal text-fg-muted">/ {list.length}</span>
                  </button>
                  {isCollapsed ? null : (
                    <div className="overflow-x-auto rounded-lg border border-line-soft">
                      <table className="w-full min-w-[820px] border-collapse text-sm">
                        <thead>
                          <tr className="bg-sunken text-left text-xs text-fg-muted">
                            <th className="w-[38%] px-4 py-2 font-medium">Item</th>
                            <th className="px-3 py-2 font-medium">Board</th>
                            <th className="px-3 py-2 font-medium">Group</th>
                            <th className="w-40 px-3 py-2 text-center font-medium">Status</th>
                            <th className="w-36 px-3 py-2 text-center font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map(({ item, parent, board, group, status, date, done }) => (
                            <tr key={item.id} className="h-10 border-t border-line-soft hover:bg-row-hover">
                              <td className="px-4">
                                <button type="button" onClick={() => panel.open(item.id)} className={cn("text-left hover:text-primary hover:underline", done && "text-fg-muted")} dir="auto">
                                  {item.name}
                                </button>
                                {parent ? <span className="ml-2 text-xs text-fg-muted">subitem of {parent.name}</span> : null}
                              </td>
                              <td className="px-3">
                                <Link href={`/boards/${board.id}`} className="text-fg-muted hover:text-primary hover:underline">
                                  {board.name}
                                </Link>
                              </td>
                              <td className="px-3">
                                <span className="flex items-center gap-1.5 text-fg-muted">
                                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: group?.color }} />
                                  <span className="truncate">{group?.title}</span>
                                </span>
                              </td>
                              <td className="h-10 p-0">
                                {status ? (
                                  <StatusCell
                                    board={board}
                                    column={status}
                                    value={item.values[status.id]}
                                    onChange={(value) => actions.setCellValue(item.id, status.id, value)}
                                  />
                                ) : null}
                              </td>
                              <td className="h-10 p-0">
                                {date ? (
                                  <DateCell
                                    value={item.values[date.id]}
                                    done={done}
                                    label={date.title}
                                    onChange={(value) => actions.setCellValue(item.id, date.id, value)}
                                  />
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
