"use client";

import { LayoutList } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { CalendarView } from "@/components/views/CalendarView";
import { ChartView } from "@/components/views/ChartView";
import { GanttView } from "@/components/views/GanttView";
import { KanbanView } from "@/components/views/KanbanView";
import { TableView } from "@/components/table/TableView";
import * as actions from "@/lib/actions";
import { useBoard } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Board, BoardView } from "@/lib/types";
import { clearSelection, useUI } from "@/lib/ui";
import { BatchActionsBar } from "./BatchActionsBar";
import { BoardHeader } from "./BoardHeader";
import { BoardToolbar } from "./BoardToolbar";
import { ViewTabs } from "./ViewTabs";

export function viewHref(board: Board, view: BoardView): string {
  return view.id === board.views[0]?.id ? `/boards/${board.id}` : `/boards/${board.id}/views/${view.id}`;
}

export function BoardScreen() {
  const params = useParams<{ boardId: string; viewId?: string }>();
  const board = useBoard(params.boardId);
  const boardId = board?.id;
  const boardName = board?.name;
  const workspaceId = board?.workspaceId;

  useEffect(() => {
    if (!boardId) return;
    actions.visitBoard(boardId);
    if (workspaceId && useStore.getState().activeWorkspaceId !== workspaceId) actions.setActiveWorkspace(workspaceId);
    if (useUI.getState().selection.boardId !== boardId) clearSelection();
  }, [boardId, workspaceId]);

  useEffect(() => {
    if (boardName) document.title = `${boardName} · monday`;
  }, [boardName]);

  if (!board) return <BoardNotFound />;

  const view = board.views.find((v) => v.id === params.viewId) ?? board.views[0];

  return (
    <div className="flex h-full flex-col">
      <BoardHeader board={board} />
      <ViewTabs board={board} activeViewId={view.id} />
      <BoardToolbar board={board} view={view} />
      <div className="relative min-h-0 flex-1">
        {view.type === "table" ? <TableView board={board} view={view} /> : null}
        {view.type === "kanban" ? <KanbanView board={board} view={view} /> : null}
        {view.type === "calendar" ? <CalendarView board={board} view={view} /> : null}
        {view.type === "timeline" ? <GanttView board={board} view={view} /> : null}
        {view.type === "chart" ? <ChartView board={board} view={view} /> : null}
      </div>
      <BatchActionsBar board={board} />
    </div>
  );
}

function BoardNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-sunken text-fg-muted">
        <LayoutList size={28} />
      </span>
      <h1 className="font-display text-xl font-medium">This board doesn&apos;t exist</h1>
      <p className="max-w-sm text-sm text-fg-muted">It may have been deleted, or the link is from another browser — boards are stored locally.</p>
      <Link href="/" className="mt-2 rounded-[4px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
        Back to Home
      </Link>
    </div>
  );
}
