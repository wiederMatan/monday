"use client";

import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Archive,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Download,
  EyeOff,
  Link as LinkIcon,
  ListChecks,
  ListTree,
  Maximize2,
  Palette,
  Pencil,
  Plus,
  Settings2,
  Sigma,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { COLUMN_COLORS, COLUMN_ICONS } from "@/components/cells/meta";
import { ColorGrid } from "@/components/ui/ColorGrid";
import {
  MenuCheckItem,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from "@/components/ui/Menu";
import { exportBoardCSV } from "@/components/board/BoardHeader";
import * as actions from "@/lib/actions";
import { GROUP_COLORS } from "@/lib/colors";
import { COLUMN_TYPES } from "@/lib/columns";
import { itemUrl } from "@/lib/hooks";
import type { Board, BoardView, Column, ColumnType, Group, Item, NumberSummary } from "@/lib/types";
import { setEditItemId, setSelection, toast } from "@/lib/ui";
import { plural } from "@/lib/utils";

export function ItemMenuItems({
  board,
  item,
  onOpen,
  onAddSubitem,
}: {
  board: Board;
  item: Item;
  onOpen: () => void;
  onAddSubitem?: () => void;
}) {
  const noun = board.itemNoun;
  return (
    <>
      <MenuItem icon={Maximize2} onSelect={onOpen}>
        Open {noun}
      </MenuItem>
      <MenuItem
        icon={LinkIcon}
        onSelect={() => {
          void navigator.clipboard?.writeText(window.location.origin + itemUrl(board.id, item.id));
          toast("Link copied to clipboard");
        }}
      >
        Copy {noun} link
      </MenuItem>
      <MenuSeparator />
      {!item.parentId ? (
        <MenuItem
          icon={Plus}
          onSelect={() => {
            const id = actions.addItem(board.id, item.groupId, { name: `New ${noun}`, position: { after: item.id } });
            if (id) setEditItemId(id);
          }}
        >
          Create new {noun} below
        </MenuItem>
      ) : null}
      {onAddSubitem && !item.parentId ? (
        <MenuItem icon={ListTree} onSelect={onAddSubitem}>
          Add subitem
        </MenuItem>
      ) : null}
      <MenuItem icon={Copy} onSelect={() => actions.duplicateItem(item.id)}>
        Duplicate this {item.parentId ? "subitem" : noun}
      </MenuItem>
      {item.parentId ? null : (
      <MenuSub>
        <MenuSubTrigger icon={ArrowRightLeft}>Move to group</MenuSubTrigger>
        <MenuSubContent>
          {board.groups
            .filter((g) => g.id !== item.groupId)
            .map((group) => (
              <MenuItem key={group.id} onSelect={() => actions.moveItemsToGroup([item.id], group.id, group.title)}>
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: group.color }} />
                  {group.title}
                </span>
              </MenuItem>
            ))}
        </MenuSubContent>
      </MenuSub>
      )}
      <MenuSeparator />
      <MenuItem icon={Archive} onSelect={() => actions.archiveItems([item.id], noun)}>
        Archive
      </MenuItem>
      <MenuItem icon={Trash2} danger onSelect={() => actions.deleteItems([item.id], noun)}>
        Delete
      </MenuItem>
    </>
  );
}

export function GroupMenuItems({
  board,
  group,
  visibleItemIds,
  onRename,
}: {
  board: Board;
  group: Group;
  visibleItemIds: string[];
  onRename: () => void;
}) {
  const index = board.groups.findIndex((g) => g.id === group.id);
  const allCollapsed = board.groups.every((g) => g.collapsed);
  return (
    <>
      <MenuItem icon={group.collapsed ? ChevronsUpDown : ChevronsDownUp} onSelect={() => actions.setGroupCollapsed(board.id, group.id, !group.collapsed)}>
        {group.collapsed ? "Expand this group" : "Collapse this group"}
      </MenuItem>
      <MenuItem icon={allCollapsed ? ChevronsUpDown : ChevronsDownUp} onSelect={() => actions.setAllGroupsCollapsed(board.id, !allCollapsed)}>
        {allCollapsed ? "Expand all groups" : "Collapse all groups"}
      </MenuItem>
      <MenuItem icon={ListChecks} disabled={!visibleItemIds.length} onSelect={() => setSelection(board.id, visibleItemIds)}>
        Select all {plural(board.itemNoun)}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Plus} onSelect={() => actions.addGroup(board.id, { position: { after: group.id } })}>
        Add group
      </MenuItem>
      <MenuItem icon={Copy} onSelect={() => actions.duplicateGroup(board.id, group.id)}>
        Duplicate this group
      </MenuItem>
      <MenuItem icon={Pencil} onSelect={onRename}>
        Rename group
      </MenuItem>
      <MenuSub>
        <MenuSubTrigger icon={Palette}>Change group color</MenuSubTrigger>
        <MenuSubContent className="p-3">
          <ColorGrid colors={GROUP_COLORS} value={group.color} columns={5} size={24} onSelect={(color) => actions.setGroupColor(board.id, group.id, color)} />
        </MenuSubContent>
      </MenuSub>
      <MenuItem icon={ArrowUpToLine} disabled={index <= 0} onSelect={() => actions.moveGroup(board.id, group.id, index - 1)}>
        Move up
      </MenuItem>
      <MenuItem icon={ArrowDownToLine} disabled={index >= board.groups.length - 1} onSelect={() => actions.moveGroup(board.id, group.id, index + 1)}>
        Move down
      </MenuItem>
      <MenuItem
        icon={Download}
        onSelect={() => {
          exportBoardCSV(board, group.itemIds);
          toast(`Exported “${group.title}” to CSV`);
        }}
      >
        Export to CSV
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger disabled={board.groups.length <= 1} onSelect={() => actions.deleteGroup(board.id, group.id, group.title)}>
        Delete group
      </MenuItem>
    </>
  );
}

const UNITS = ["", "$", "€", "₪", "£", "%", "h", "pts"];
const SUMMARIES: Array<[NumberSummary, string]> = [
  ["sum", "Sum"],
  ["avg", "Average"],
  ["min", "Min"],
  ["max", "Max"],
  ["count", "Count"],
  ["none", "None"],
];

export function ColumnMenuItems({
  board,
  view,
  column,
  onRename,
}: {
  board: Board;
  view: BoardView;
  column: Column;
  onRename: () => void;
}) {
  const sortBy = (direction: "asc" | "desc") => actions.updateView(board.id, view.id, { sort: [{ columnId: column.id, direction }] });
  return (
    <>
      {column.type === "numbers" ? (
        <>
          <MenuSub>
            <MenuSubTrigger icon={Settings2}>Unit</MenuSubTrigger>
            <MenuSubContent>
              {UNITS.map((unit) => (
                <MenuCheckItem
                  key={unit || "none"}
                  checked={(column.settings.unit ?? "") === unit}
                  onCheckedChange={() =>
                    actions.updateColumnSettings(board.id, column.id, {
                      unit,
                      unitPosition: ["%", "h", "pts"].includes(unit) ? "right" : "left",
                    })
                  }
                >
                  {unit || "No unit"}
                </MenuCheckItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          <MenuSub>
            <MenuSubTrigger icon={Sigma}>Summary</MenuSubTrigger>
            <MenuSubContent>
              {SUMMARIES.map(([value, label]) => (
                <MenuCheckItem
                  key={value}
                  checked={(column.settings.summary ?? "sum") === value}
                  onCheckedChange={() => actions.updateColumnSettings(board.id, column.id, { summary: value })}
                >
                  {label}
                </MenuCheckItem>
              ))}
            </MenuSubContent>
          </MenuSub>
          <MenuSeparator />
        </>
      ) : null}
      <MenuItem icon={ArrowUp} onSelect={() => sortBy("asc")}>
        Sort ascending
      </MenuItem>
      <MenuItem icon={ArrowDown} onSelect={() => sortBy("desc")}>
        Sort descending
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Pencil} onSelect={onRename}>
        Rename
      </MenuItem>
      <MenuItem icon={Copy} onSelect={() => actions.duplicateColumn(board.id, column.id)}>
        Duplicate column
      </MenuItem>
      <MenuSub>
        <MenuSubTrigger icon={Plus}>Add column to the right</MenuSubTrigger>
        <MenuSubContent>
          <ColumnTypeItems onPick={(type, preset) => actions.addColumn(board.id, type, { afterColumnId: column.id, preset })} />
        </MenuSubContent>
      </MenuSub>
      <MenuItem
        icon={EyeOff}
        onSelect={() => actions.updateView(board.id, view.id, { hiddenColumnIds: [...view.hiddenColumnIds, column.id] })}
      >
        Hide column
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={Trash2} danger onSelect={() => actions.deleteColumn(board.id, column.id, column.title)}>
        Delete column
      </MenuItem>
    </>
  );
}

/** Column types as menu items (used in "Add column to the right"). */
export function ColumnTypeItems({ onPick }: { onPick: (type: ColumnType, preset?: "priority") => void }) {
  return (
    <>
      <MenuLabel>Column types</MenuLabel>
      {COLUMN_TYPES.map((info) => {
        const Icon = COLUMN_ICONS[info.type];
        return (
          <MenuItem key={info.type} onSelect={() => onPick(info.type)}>
            <span className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded text-white" style={{ background: COLUMN_COLORS[info.type] }}>
                <Icon size={14} />
              </span>
              {info.label}
            </span>
          </MenuItem>
        );
      })}
      <MenuItem onSelect={() => onPick("status", "priority")}>
        <span className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded bg-[#401694] text-white">
            <ArrowUp size={14} />
          </span>
          Priority
        </span>
      </MenuItem>
    </>
  );
}

/** Grid version of the column picker for the "+" header button. */
export function ColumnTypeGrid({ onPick }: { onPick: (type: ColumnType, preset?: "priority") => void }) {
  const entries: Array<{ key: string; type: ColumnType; preset?: "priority"; label: string; description: string; color: string; icon: typeof ArrowUp }> = [
    ...COLUMN_TYPES.map((info) => ({ key: info.type, type: info.type, label: info.label, description: info.description, color: COLUMN_COLORS[info.type], icon: COLUMN_ICONS[info.type] })),
    { key: "priority", type: "status" as const, preset: "priority" as const, label: "Priority", description: "Critical, high, medium, low", color: "#401694", icon: ArrowUp },
  ];
  return (
    <div>
      <div className="mb-2 px-1 text-xs font-medium text-fg-faint">Add column</div>
      <div className="grid grid-cols-2 gap-1">
        {entries.map(({ key, type, preset, label, description, color, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onPick(type, preset)}
            className="flex items-center gap-2.5 rounded-md p-2 text-left hover:bg-hover"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md text-white" style={{ background: color }}>
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm">{label}</span>
              <span className="block truncate text-[11px] text-fg-muted">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
