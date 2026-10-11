/**
 * The app's write API. Each action applies one model mutation as an undoable store
 * update; destructive actions also show a toast with an Undo button.
 */
import type { BoardSpec } from "./builder";
import * as model from "./model";
import { nextUndoToken, run, undoTo } from "./store";
import type {
  AutomationAction,
  AutomationTrigger,
  BoardView,
  CellValue,
  ColumnSettings,
  ColumnType,
  ID,
  StatusLabel,
  User,
  ViewType,
} from "./types";
import { toast } from "./ui";
import { pluralize } from "./utils";

function withUndoToast(message: string, mutate: () => void): void {
  const token = nextUndoToken();
  mutate();
  toast(message, { action: { label: "Undo", onClick: () => undoTo(token) } });
}

// ---------------------------------------------------------------- boards

export const createBoard = (spec: BoardSpec, workspaceId?: ID) =>
  run((s, ctx) => model.addBoard(s, ctx, spec, workspaceId ?? s.activeWorkspaceId));
export const renameBoard = (boardId: ID, name: string) => run((s, ctx) => model.renameBoard(s, ctx, boardId, name));
export const setBoardDescription = (boardId: ID, text: string) => run((s) => model.setBoardDescription(s, boardId, text));
export const setBoardFavorite = (boardId: ID, favorite: boolean) =>
  run((s) => model.setBoardFavorite(s, boardId, favorite), { undoable: false });
export const setItemNoun = (boardId: ID, noun: string) => run((s) => model.setItemNoun(s, boardId, noun));
export const moveBoardToWorkspace = (boardId: ID, workspaceId: ID) =>
  run((s) => model.moveBoardToWorkspace(s, boardId, workspaceId));
export const duplicateBoard = (boardId: ID, withItems = true) =>
  run((s, ctx) => model.duplicateBoard(s, ctx, boardId, withItems));
export const visitBoard = (boardId: ID) => run((s) => model.visitBoard(s, boardId), { undoable: false });

export function deleteBoard(boardId: ID, name: string): void {
  withUndoToast(`“${name}” was deleted`, () => run((s) => model.deleteBoard(s, boardId)));
}

// ---------------------------------------------------------------- groups

export const addGroup = (boardId: ID, opts?: Parameters<typeof model.addGroup>[3]) =>
  run((s, ctx) => model.addGroup(s, ctx, boardId, opts));
export const renameGroup = (boardId: ID, groupId: ID, title: string) =>
  run((s, ctx) => model.renameGroup(s, ctx, boardId, groupId, title));
export const setGroupColor = (boardId: ID, groupId: ID, color: string) => run((s) => model.setGroupColor(s, boardId, groupId, color));
export const setGroupCollapsed = (boardId: ID, groupId: ID, collapsed: boolean) =>
  run((s) => model.setGroupCollapsed(s, boardId, groupId, collapsed), { undoable: false });
export const setAllGroupsCollapsed = (boardId: ID, collapsed: boolean) =>
  run((s) => model.setAllGroupsCollapsed(s, boardId, collapsed), { undoable: false });
export const moveGroup = (boardId: ID, groupId: ID, toIndex: number) => run((s) => model.moveGroup(s, boardId, groupId, toIndex));
export const duplicateGroup = (boardId: ID, groupId: ID) => run((s, ctx) => model.duplicateGroup(s, ctx, boardId, groupId));

export function deleteGroup(boardId: ID, groupId: ID, title: string): boolean {
  const token = nextUndoToken();
  const deleted = run((s, ctx) => model.deleteGroup(s, ctx, boardId, groupId));
  if (deleted) toast(`Group “${title}” deleted`, { action: { label: "Undo", onClick: () => undoTo(token) } });
  return deleted;
}

// ---------------------------------------------------------------- columns

export const addColumn = (boardId: ID, type: ColumnType, opts?: Parameters<typeof model.addColumn>[4]) =>
  run((s, ctx) => model.addColumn(s, ctx, boardId, type, opts));
export const renameColumn = (boardId: ID, columnId: ID, title: string) => run((s) => model.renameColumn(s, boardId, columnId, title));
export const setColumnWidth = (boardId: ID, columnId: ID, width: number) =>
  run((s) => model.setColumnWidth(s, boardId, columnId, width), { undoable: false });
export const setNameWidth = (boardId: ID, width: number) =>
  run((s) => model.setNameWidth(s, boardId, width), { undoable: false });
export const moveColumn = (boardId: ID, columnId: ID, toIndex: number) => run((s) => model.moveColumn(s, boardId, columnId, toIndex));
export const duplicateColumn = (boardId: ID, columnId: ID) => run((s, ctx) => model.duplicateColumn(s, ctx, boardId, columnId));
export const updateColumnSettings = (boardId: ID, columnId: ID, patch: Partial<ColumnSettings>) =>
  run((s) => model.updateColumnSettings(s, boardId, columnId, patch));

export function deleteColumn(boardId: ID, columnId: ID, title: string): void {
  withUndoToast(`Column “${title}” deleted`, () => run((s, ctx) => model.deleteColumn(s, ctx, boardId, columnId)));
}

export const addStatusLabel = (boardId: ID, columnId: ID, name?: string, color?: string) =>
  run((s, ctx) => model.addStatusLabel(s, ctx, boardId, columnId, name, color));
export const updateStatusLabel = (boardId: ID, columnId: ID, labelId: ID, patch: Partial<Pick<StatusLabel, "name" | "color">>) =>
  run((s) => model.updateStatusLabel(s, boardId, columnId, labelId, patch));
export const deleteStatusLabel = (boardId: ID, columnId: ID, labelId: ID) =>
  run((s) => model.deleteStatusLabel(s, boardId, columnId, labelId));
export const addTagOption = (boardId: ID, columnId: ID, name: string, color?: string) =>
  run((s, ctx) => model.addTagOption(s, ctx, boardId, columnId, name, color));
export const deleteTagOption = (boardId: ID, columnId: ID, tagId: ID) => run((s) => model.deleteTagOption(s, boardId, columnId, tagId));

// ---------------------------------------------------------------- items

export const addItem = (boardId: ID, groupId: ID | null, opts: Parameters<typeof model.addItem>[4]) =>
  run((s, ctx) => model.addItem(s, ctx, boardId, groupId, opts));
export const renameItem = (itemId: ID, name: string) => run((s, ctx) => model.renameItem(s, ctx, itemId, name));
export const setCellValue = (itemId: ID, columnId: ID, value: CellValue) =>
  run((s, ctx) => model.setCellValue(s, ctx, itemId, columnId, value));
export const moveItem = (itemId: ID, toGroupId: ID, position?: model.InsertPosition) =>
  run((s, ctx) => model.moveItem(s, ctx, itemId, toGroupId, position));
export const duplicateItem = (itemId: ID) => run((s, ctx) => model.duplicateItem(s, ctx, itemId));

export function duplicateItems(itemIds: ID[]): void {
  run((s, ctx) => {
    for (const id of itemIds) model.duplicateItem(s, ctx, id);
  });
}

export function moveItemsToGroup(itemIds: ID[], groupId: ID, groupTitle: string): void {
  withUndoToast(`Moved ${pluralize(itemIds.length, "item")} to “${groupTitle}”`, () =>
    run((s, ctx) => model.moveItemsToGroup(s, ctx, itemIds, groupId)),
  );
}

export function deleteItems(itemIds: ID[], noun = "item"): void {
  withUndoToast(`${pluralize(itemIds.length, noun)} deleted`, () => run((s, ctx) => model.deleteItems(s, ctx, itemIds)));
}

export function archiveItems(itemIds: ID[], noun = "item"): void {
  withUndoToast(`${pluralize(itemIds.length, noun)} archived`, () => run((s, ctx) => model.archiveItems(s, ctx, itemIds)));
}

export const restoreItem = (itemId: ID) => run((s, ctx) => model.restoreItem(s, ctx, itemId));
export const addSubitem = (parentId: ID, opts: Parameters<typeof model.addSubitem>[3]) =>
  run((s, ctx) => model.addSubitem(s, ctx, parentId, opts));

// ---------------------------------------------------------------- updates

export const postUpdate = (itemId: ID, body: string) => run((s, ctx) => model.postUpdate(s, ctx, itemId, body));
export const editUpdate = (updateId: ID, body: string) => run((s, ctx) => model.editUpdate(s, ctx, updateId, body));
export const deleteUpdate = (updateId: ID) => withUndoToast("Update deleted", () => run((s) => model.deleteUpdate(s, updateId)));
export const toggleUpdateLike = (updateId: ID) => run((s, ctx) => model.toggleUpdateLike(s, ctx, updateId), { undoable: false });
export const toggleUpdatePinned = (updateId: ID) => run((s) => model.toggleUpdatePinned(s, updateId));
export const addReply = (updateId: ID, body: string) => run((s, ctx) => model.addReply(s, ctx, updateId, body));
export const toggleReplyLike = (updateId: ID, replyId: ID) =>
  run((s, ctx) => model.toggleReplyLike(s, ctx, updateId, replyId), { undoable: false });
export const deleteReply = (updateId: ID, replyId: ID) => run((s) => model.deleteReply(s, updateId, replyId));

// ---------------------------------------------------------------- views

export const addView = (boardId: ID, type: ViewType, name?: string) => run((s, ctx) => model.addView(s, ctx, boardId, type, name));
export const renameView = (boardId: ID, viewId: ID, name: string) => run((s) => model.renameView(s, boardId, viewId, name));
export const deleteView = (boardId: ID, viewId: ID) => run((s) => model.deleteView(s, boardId, viewId));
export const duplicateView = (boardId: ID, viewId: ID) => run((s, ctx) => model.duplicateView(s, ctx, boardId, viewId));
export const updateView = (
  boardId: ID,
  viewId: ID,
  patch: Partial<Pick<BoardView, "filter" | "sort" | "hiddenColumnIds" | "settings">>,
) => run((s) => model.updateView(s, boardId, viewId, patch), { undoable: false });

// ---------------------------------------------------------------- automations

export const addAutomation = (boardId: ID, trigger: AutomationTrigger, action: AutomationAction) =>
  run((s, ctx) => model.addAutomation(s, ctx, boardId, trigger, action));
export const setAutomationEnabled = (boardId: ID, automationId: ID, enabled: boolean) =>
  run((s) => model.setAutomationEnabled(s, boardId, automationId, enabled));
export const deleteAutomation = (boardId: ID, automationId: ID) => run((s) => model.deleteAutomation(s, boardId, automationId));

// ---------------------------------------------------------------- workspaces, people, notifications

export const addWorkspace = (name: string) => run((s, ctx) => model.addWorkspace(s, ctx, name));
export const renameWorkspace = (workspaceId: ID, name: string) => run((s) => model.renameWorkspace(s, workspaceId, name));
export const deleteWorkspace = (workspaceId: ID) => run((s) => model.deleteWorkspace(s, workspaceId));
export const setActiveWorkspace = (workspaceId: ID) =>
  run((s) => model.setActiveWorkspace(s, workspaceId), { undoable: false });
export const updateProfile = (patch: Partial<Pick<User, "name" | "title" | "email" | "color">>) =>
  run((s) => model.updateProfile(s, patch));
export const inviteUsers = (emails: string[], boardId?: ID) => run((s, ctx) => model.inviteUsers(s, ctx, emails, boardId));
export const setNotificationRead = (notificationId: ID, read: boolean) =>
  run((s) => model.setNotificationRead(s, notificationId, read), { undoable: false });
export const markAllNotificationsRead = () => run((s) => model.markAllNotificationsRead(s), { undoable: false });
export const setSidebarCollapsed = (collapsed: boolean) =>
  run((s) => model.setSidebarCollapsed(s, collapsed), { undoable: false });
