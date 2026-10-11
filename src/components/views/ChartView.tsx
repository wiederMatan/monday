"use client";

import { CircleAlert, CircleCheck, ClipboardList, Clock, Table2, ChartColumn } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Tip } from "@/components/ui/Tooltip";
import * as actions from "@/lib/actions";
import { EMPTY_LABEL_COLOR, readableTextColor } from "@/lib/colors";
import {
  asDate,
  asNumber,
  asStringArray,
  EMPTY_TOKEN,
  formatNumberValue,
  getLabel,
  isItemDone,
  statusDistribution,
  type DistributionSegment,
} from "@/lib/columns";
import { dateBucket } from "@/lib/dates";
import { useToday, useUserIndex } from "@/lib/hooks";
import type { Board, BoardView, Column, Item } from "@/lib/types";
import { capitalize, cn, formatNumber, plural } from "@/lib/utils";
import { useViewItems, VIEW_SELECT } from "./common";

/*
 * Chart colors: status segments wear the board's own label colors, so a label looks
 * the same here as in the table. Those colors are user-picked and not CVD-safe as a
 * set, so identity never rides on color alone: every chart has a legend with names,
 * counts and shares, direct labels where they fit, tooltips, and a table view.
 * Single-series bars use the validated --series-1 token.
 */

function pct(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)}%` : "0%";
}

export function ChartView({ board, view }: { board: Board; view: BoardView }) {
  const items = useViewItems(board, view, { sorted: false });
  const today = useToday();
  const statusColumns = board.columns.filter((c) => c.type === "status");
  const status = statusColumns.find((c) => c.id === view.settings.statusColumnId) ?? statusColumns[0];
  const numberColumns = board.columns.filter((c) => c.type === "numbers");
  const numbers = numberColumns.find((c) => c.id === view.settings.numbersColumnId) ?? numberColumns[0];
  const peopleColumn = board.columns.find((c) => c.type === "people");
  const dateColumn = board.columns.find((c) => c.type === "date");

  const done = items.filter((i) => isItemDone(board, i)).length;
  const overdue = dateColumn
    ? items.filter((i) => !isItemDone(board, i) && dateBucket(asDate(i.values[dateColumn.id]), today) === "overdue").length
    : 0;
  const dueSoon = dateColumn
    ? items.filter((i) => {
        if (isItemDone(board, i)) return false;
        const bucket = dateBucket(asDate(i.values[dateColumn.id]), today);
        return bucket === "today" || bucket === "this_week";
      }).length
    : 0;
  const nouns = plural(board.itemNoun);

  return (
    <div className="h-full overflow-auto px-8 pb-10">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={ClipboardList} label={capitalize(nouns)} value={formatNumber(items.length)} />
        <StatTile icon={CircleCheck} label="Done" value={formatNumber(done)} detail={`${pct(done, items.length)} complete`}>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-series-1-track" role="meter" aria-valuenow={done} aria-valuemin={0} aria-valuemax={items.length} aria-label="Completion">
            <div className="h-full rounded-full bg-series-1" style={{ width: pct(done, items.length) }} />
          </div>
        </StatTile>
        <StatTile
          icon={CircleAlert}
          iconClassName={overdue ? "text-critical" : undefined}
          label="Overdue"
          value={dateColumn ? formatNumber(overdue) : "—"}
          detail={dateColumn ? (overdue ? `Past their ${dateColumn.title.toLowerCase()}` : "Nothing late") : "No date column"}
        />
        <StatTile
          icon={Clock}
          label="Due this week"
          value={dateColumn ? formatNumber(dueSoon) : "—"}
          detail={dateColumn ? "Not done yet" : "No date column"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {status ? (
          <ChartCard
            title="Status overview"
            subtitle={`${status.title} across ${items.length} ${nouns}`}
            controls={
              statusColumns.length > 1 ? (
                <select
                  value={status.id}
                  onChange={(e) => actions.updateView(board.id, view.id, { settings: { statusColumnId: e.target.value } })}
                  className={VIEW_SELECT}
                  aria-label="Status column"
                >
                  {statusColumns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              ) : null
            }
            table={<DistributionTable segments={statusDistribution(status, items)} total={items.length} />}
          >
            <StatusOverview column={status} items={items} />
          </ChartCard>
        ) : null}

        {status && peopleColumn ? (
          <ChartCard
            title="Workload by person"
            subtitle={`${capitalize(nouns)} per person in ${peopleColumn.title}, by ${status.title.toLowerCase()}`}
            table={<WorkloadTable status={status} people={peopleColumn} items={items} />}
          >
            <Workload status={status} people={peopleColumn} items={items} />
          </ChartCard>
        ) : null}

        {numbers ? (
          <ChartCard
            title={`${numbers.title} by group`}
            subtitle={`Sum of ${numbers.title} per group`}
            controls={
              numberColumns.length > 1 ? (
                <select
                  value={numbers.id}
                  onChange={(e) => actions.updateView(board.id, view.id, { settings: { numbersColumnId: e.target.value } })}
                  className={VIEW_SELECT}
                  aria-label="Numbers column"
                >
                  {numberColumns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              ) : null
            }
            table={<GroupTable rows={groupRows(board, items, numbers)} format={(v) => formatNumberValue(numbers, v)} label={numbers.title} />}
          >
            <GroupBars rows={groupRows(board, items, numbers)} format={(v) => formatNumberValue(numbers, v)} />
          </ChartCard>
        ) : null}

        <ChartCard
          title={`${capitalize(nouns)} by group`}
          subtitle={`How many ${nouns} each group holds`}
          table={<GroupTable rows={groupRows(board, items, null)} format={formatNumber} label={capitalize(nouns)} />}
        >
          <GroupBars rows={groupRows(board, items, null)} format={formatNumber} />
        </ChartCard>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  iconClassName,
  label,
  value,
  detail,
  children,
}: {
  icon: typeof Clock;
  iconClassName?: string;
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line-soft bg-surface p-4">
      <div className="flex items-center gap-2 text-sm text-fg-muted">
        <Icon size={16} className={iconClassName} />
        {label}
      </div>
      <div className="mt-1 text-[32px] font-semibold leading-tight">{value}</div>
      {detail ? <div className="text-xs text-fg-muted">{detail}</div> : null}
      {children}
    </section>
  );
}

function ChartCard({
  title,
  subtitle,
  controls,
  table,
  children,
}: {
  title: string;
  subtitle: string;
  controls?: React.ReactNode;
  table: React.ReactNode;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="rounded-xl border border-line-soft bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <figcaption className="min-w-0">
          <div className="font-display text-base font-medium">{title}</div>
          <div className="text-xs text-fg-muted">{subtitle}</div>
        </figcaption>
        <div className="flex shrink-0 items-center gap-2">
          {controls}
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-pressed={showTable}
            className="flex h-8 items-center gap-1.5 rounded-[4px] border border-line-strong px-2 text-xs hover:bg-hover"
          >
            {showTable ? <ChartColumn size={14} /> : <Table2 size={14} />}
            {showTable ? "Chart" : "Table"}
          </button>
        </div>
      </div>
      {showTable ? table : children}
    </figure>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block size-3 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />;
}

/** One horizontal bar split by label, 2px surface gaps between segments. */
function StackedBar({ segments, total, height = 20, labels = false }: { segments: DistributionSegment[]; total: number; height?: number; labels?: boolean }) {
  return (
    <div className="flex w-full gap-[2px]" style={{ height }}>
      {segments.map((segment, i) => {
        const share = segment.count / total;
        // Only label a segment when the text comfortably fits.
        const fits = labels && share >= 0.12;
        return (
          <Tip
            key={segment.key}
            content={
              <span>
                <strong className="text-sm">
                  {segment.count} · {pct(segment.count, total)}
                </strong>
                <span className="block opacity-80">{segment.name}</span>
              </span>
            }
          >
            <span
              tabIndex={0}
              aria-label={`${segment.name}: ${segment.count} of ${total}`}
              className={cn(
                "flex min-w-[3px] items-center justify-center text-[11px] font-medium outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary",
                i === segments.length - 1 && "rounded-r",
              )}
              style={{ flexGrow: segment.count, flexBasis: 0, background: segment.color, color: readableTextColor(segment.color) }}
            >
              {fits ? segment.count : null}
            </span>
          </Tip>
        );
      })}
    </div>
  );
}

function StatusOverview({ column, items }: { column: Column; items: Item[] }) {
  const segments = statusDistribution(column, items);
  if (!items.length) return <EmptyChart />;
  return (
    <div>
      <StackedBar segments={segments} total={items.length} height={24} labels />
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-sm">
            <Swatch color={segment.color} />
            <span className="min-w-0 flex-1 truncate">{segment.name}</span>
            <span className="tabular-nums text-fg-muted">{segment.count}</span>
            <span className="w-10 text-right tabular-nums text-fg-muted">{pct(segment.count, items.length)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DistributionTable({ segments, total }: { segments: DistributionSegment[]; total: number }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line-soft text-left text-xs text-fg-muted">
          <th className="py-1.5 font-medium">Label</th>
          <th className="py-1.5 text-right font-medium">Count</th>
          <th className="py-1.5 text-right font-medium">Share</th>
        </tr>
      </thead>
      <tbody>
        {segments.map((s) => (
          <tr key={s.key} className="border-b border-line-soft last:border-0">
            <td className="py-1.5">
              <span className="flex items-center gap-2">
                <Swatch color={s.color} /> {s.name}
              </span>
            </td>
            <td className="py-1.5 text-right tabular-nums">{s.count}</td>
            <td className="py-1.5 text-right tabular-nums">{pct(s.count, total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface WorkloadRow {
  key: string;
  name: string;
  userId: string | null;
  items: Item[];
}

function workloadRows(people: Column, items: Item[]): WorkloadRow[] {
  const byPerson = new Map<string, Item[]>();
  const unassigned: Item[] = [];
  for (const item of items) {
    const ids = asStringArray(item.values[people.id]);
    if (!ids.length) unassigned.push(item);
    for (const id of ids) byPerson.set(id, [...(byPerson.get(id) ?? []), item]);
  }
  const rows: WorkloadRow[] = Array.from(byPerson, ([userId, list]) => ({ key: userId, name: userId, userId, items: list }));
  rows.sort((a, b) => b.items.length - a.items.length);
  if (unassigned.length) rows.push({ key: EMPTY_TOKEN, name: "Unassigned", userId: null, items: unassigned });
  return rows;
}

function Workload({ status, people, items }: { status: Column; people: Column; items: Item[] }) {
  const users = useUserIndex();
  const rows = useMemo(() => workloadRows(people, items), [people, items]);
  const max = Math.max(1, ...rows.map((r) => r.items.length));
  const legend = (status.settings.labels ?? []).filter((l) => items.some((i) => i.values[status.id] === l.id));
  const hasEmpty = items.some((i) => !getLabel(status, i.values[status.id]));
  if (!items.length) return <EmptyChart />;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
        {legend.map((l) => (
          <li key={l.id} className="flex items-center gap-1.5">
            <Swatch color={l.color} /> {l.name}
          </li>
        ))}
        {hasEmpty ? (
          <li className="flex items-center gap-1.5">
            <Swatch color={EMPTY_LABEL_COLOR} /> Not set
          </li>
        ) : null}
      </ul>
      <ul className="space-y-2">
        {rows.map((row) => {
          const user = row.userId ? users[row.userId] : undefined;
          return (
            <li key={row.key} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <Avatar user={user} size={22} />
                <span className="truncate">{user?.name ?? row.name}</span>
              </span>
              <span className="flex items-center gap-2">
                <span style={{ width: `calc((100% - 32px) * ${row.items.length / max})` }} className="min-w-[6px]">
                  <StackedBar segments={statusDistribution(status, row.items)} total={row.items.length} height={18} />
                </span>
                <span className="text-xs font-medium tabular-nums text-fg-muted">{row.items.length}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WorkloadTable({ status, people, items }: { status: Column; people: Column; items: Item[] }) {
  const users = useUserIndex();
  const rows = workloadRows(people, items);
  const labels = status.settings.labels ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line-soft text-left text-xs text-fg-muted">
            <th className="py-1.5 pr-3 font-medium">Person</th>
            {labels.map((l) => (
              <th key={l.id} className="whitespace-nowrap px-2 py-1.5 text-right font-medium">
                {l.name}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right font-medium">Not set</th>
            <th className="py-1.5 pl-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line-soft last:border-0">
              <td className="whitespace-nowrap py-1.5 pr-3">{row.userId ? (users[row.userId]?.name ?? "Unknown") : row.name}</td>
              {labels.map((l) => (
                <td key={l.id} className="px-2 py-1.5 text-right tabular-nums">
                  {row.items.filter((i) => i.values[status.id] === l.id).length}
                </td>
              ))}
              <td className="px-2 py-1.5 text-right tabular-nums">{row.items.filter((i) => !getLabel(status, i.values[status.id])).length}</td>
              <td className="py-1.5 pl-2 text-right font-medium tabular-nums">{row.items.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface GroupRowData {
  key: string;
  title: string;
  color: string;
  value: number;
}

function groupRows(board: Board, items: Item[], numbers: Column | null): GroupRowData[] {
  return board.groups.map((group) => {
    const inGroup = items.filter((i) => i.groupId === group.id);
    const value = numbers ? inGroup.reduce((sum, i) => sum + (asNumber(i.values[numbers.id]) ?? 0), 0) : inGroup.length;
    return { key: group.id, title: group.title, color: group.color, value };
  });
}

/** Single-series horizontal bars; the group's color rides on a dot beside its name. */
function GroupBars({ rows, format }: { rows: GroupRowData[]; format: (value: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (max <= 0) return <EmptyChart />;
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden />
            <span className="truncate">{row.title}</span>
          </span>
          <span className="flex items-center gap-2">
            <Tip content={<strong className="text-sm">{format(row.value)}</strong>}>
              <span
                tabIndex={0}
                aria-label={`${row.title}: ${format(row.value)}`}
                className="block h-5 rounded-r bg-series-1 outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary"
                style={{ width: `calc((100% - 80px) * ${row.value / max})`, minWidth: row.value > 0 ? 3 : 0 }}
              />
            </Tip>
            <span className="whitespace-nowrap text-xs font-medium text-fg-muted">{format(row.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function GroupTable({ rows, format, label }: { rows: GroupRowData[]; format: (value: number) => string; label: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line-soft text-left text-xs text-fg-muted">
          <th className="py-1.5 font-medium">Group</th>
          <th className="py-1.5 text-right font-medium">{label}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line-soft last:border-0">
            <td className="py-1.5">{row.title}</td>
            <td className="py-1.5 text-right tabular-nums">{format(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyChart() {
  return <p className="py-8 text-center text-sm text-fg-muted">No data to chart yet.</p>;
}
