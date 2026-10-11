import { create } from "zustand";
import type { ID } from "./types";
import { uid } from "./utils";

export interface Toast {
  id: string;
  message: string;
  kind: "success" | "info" | "error";
  action?: { label: string; onClick: () => void };
  duration: number;
}

export type DialogName = "createBoard" | "profile" | "shortcuts" | "invite" | "data" | "createWorkspace";

interface UIState {
  /** Multi-selection of items, scoped to one board. */
  selection: { boardId: ID | null; ids: ID[] };
  /** Search text per board. */
  search: Record<ID, string>;
  toasts: Toast[];
  commandOpen: boolean;
  dialog: { name: DialogName; workspaceId?: ID; boardId?: ID } | null;
  /** An item whose name should open in edit mode as soon as it renders (e.g. after "New item"). */
  editItemId: ID | null;
  /** Items whose subitems are expanded in the table. */
  expanded: Record<ID, boolean>;
}

export const useUI = create<UIState>()(() => ({
  selection: { boardId: null, ids: [] },
  search: {},
  toasts: [],
  commandOpen: false,
  dialog: null,
  editItemId: null,
  expanded: {},
}));

export function setSelection(boardId: ID | null, ids: ID[]): void {
  useUI.setState({ selection: { boardId, ids: Array.from(new Set(ids)) } });
}

export function toggleSelected(boardId: ID, id: ID): void {
  const { selection } = useUI.getState();
  const current = selection.boardId === boardId ? selection.ids : [];
  setSelection(boardId, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
}

export function clearSelection(): void {
  setSelection(null, []);
}

export function setSearch(boardId: ID, text: string): void {
  useUI.setState((s) => ({ search: { ...s.search, [boardId]: text } }));
}

export function toast(message: string, options: Partial<Omit<Toast, "id" | "message">> = {}): string {
  const id = uid("toast");
  const next: Toast = { id, message, kind: options.kind ?? "success", action: options.action, duration: options.duration ?? 5000 };
  useUI.setState((s) => ({ toasts: [...s.toasts.slice(-3), next] }));
  return id;
}

export function dismissToast(id: string): void {
  useUI.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

export function openDialog(name: DialogName, extra: { workspaceId?: ID; boardId?: ID } = {}): void {
  useUI.setState({ dialog: { name, ...extra } });
}

export function closeDialog(): void {
  useUI.setState({ dialog: null });
}

export function setCommandOpen(open: boolean): void {
  useUI.setState({ commandOpen: open });
}

export function setEditItemId(id: ID | null): void {
  useUI.setState({ editItemId: id });
}

export function setExpanded(itemId: ID, expanded: boolean): void {
  useUI.setState((s) => ({ expanded: { ...s.expanded, [itemId]: expanded } }));
}
