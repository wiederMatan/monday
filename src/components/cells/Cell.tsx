"use client";

import * as actions from "@/lib/actions";
import { isItemDone } from "@/lib/columns";
import type { Board, CellValue, Column, Item } from "@/lib/types";
import { DateCell, TimelineCell } from "./DateCells";
import { PeopleCell } from "./PeopleCell";
import { CheckboxCell, LastUpdatedCell, LinkCell, NumbersCell, RatingCell, TextCell } from "./SimpleCells";
import { StatusCell } from "./StatusCell";
import { TagsCell } from "./TagsCell";

/** Renders the editor/viewer for one item × column. */
export function Cell({ board, column, item, groupColor }: { board: Board; column: Column; item: Item; groupColor: string }) {
  const value = item.values[column.id];
  const set = (next: CellValue) => actions.setCellValue(item.id, column.id, next);

  switch (column.type) {
    case "status":
      return <StatusCell board={board} column={column} value={value} onChange={set} />;
    case "people":
      return <PeopleCell value={value} onChange={set} label={column.title} />;
    case "date":
      return <DateCell value={value} onChange={set} done={isItemDone(board, item)} label={column.title} />;
    case "timeline":
      return <TimelineCell value={value} onChange={set} color={groupColor} label={column.title} />;
    case "numbers":
      return <NumbersCell column={column} value={value} onChange={set} />;
    case "text":
      return <TextCell value={value} onChange={set} label={column.title} />;
    case "tags":
      return <TagsCell board={board} column={column} value={value} onChange={set} />;
    case "checkbox":
      return <CheckboxCell value={value} onChange={set} label={column.title} />;
    case "rating":
      return <RatingCell column={column} value={value} onChange={set} />;
    case "link":
      return <LinkCell value={value} onChange={set} label={column.title} />;
    case "last_updated":
      return <LastUpdatedCell item={item} />;
  }
}
