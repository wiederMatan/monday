import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { THEME_STORAGE_KEY } from "./constants";
import * as model from "./model";
import { createSeedState, SCHEMA_VERSION } from "./seed";
import type { DataState, ThemeName } from "./types";

export const STORAGE_KEY = "monday-clone";

const DATA_KEYS = [
  "schemaVersion",
  "currentUserId",
  "users",
  "workspaces",
  "activeWorkspaceId",
  "boards",
  "boardOrder",
  "items",
  "updates",
  "activity",
  "notifications",
  "recentBoardIds",
  "preferences",
] as const satisfies ReadonlyArray<keyof DataState>;

function pickData(state: DataState): DataState {
  const data = {} as Record<string, unknown>;
  for (const key of DATA_KEYS) data[key] = state[key];
  return data as unknown as DataState;
}

function isDataState(value: unknown): value is DataState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DataState>;
  return (
    typeof v.currentUserId === "string" &&
    Array.isArray(v.users) &&
    Array.isArray(v.workspaces) &&
    v.workspaces.length > 0 &&
    !!v.boards &&
    typeof v.boards === "object" &&
    Array.isArray(v.boardOrder) &&
    !!v.items &&
    typeof v.items === "object" &&
    !!v.updates &&
    Array.isArray(v.activity) &&
    Array.isArray(v.notifications) &&
    !!v.preferences
  );
}

/**
 * localStorage persistence with batched writes: serializing the whole workspace on
 * every keystroke-level change is wasteful, so writes are coalesced and flushed when
 * the page is hidden.
 */
function createBatchedStorage(): PersistStorage<DataState> {
  let pending: { name: string; value: StorageValue<DataState> } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending || typeof window === "undefined") return;
    const { name, value } = pending;
    pending = null;
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.error("Could not save workspace data", error);
      window.dispatchEvent(new CustomEvent("monday:storage-error"));
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StorageValue<DataState>;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 200);
    },
    removeItem: (name) => {
      pending = null;
      if (typeof window !== "undefined") localStorage.removeItem(name);
    },
  };
}

export const useStore = create<DataState>()(
  persist(
    immer(() => createSeedState()),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createBatchedStorage(),
      partialize: pickData,
      migrate: (persisted) => persisted as DataState,
      merge: (persisted, current) => (isDataState(persisted) ? { ...current, ...persisted } : current),
    },
  ),
);

// ---------------------------------------------------------------- undo

type Snapshot = Pick<
  DataState,
  "boards" | "boardOrder" | "items" | "updates" | "activity" | "notifications" | "workspaces" | "users" | "activeWorkspaceId"
>;

const MAX_UNDO = 60;
let undoCounter = 0;
const undoStack: Array<{ id: number; snapshot: Snapshot }> = [];

function snapshotOf(s: DataState): Snapshot {
  // State is immutable (immer), so keeping references is a cheap, exact snapshot.
  return {
    boards: s.boards,
    boardOrder: s.boardOrder,
    items: s.items,
    updates: s.updates,
    activity: s.activity,
    notifications: s.notifications,
    workspaces: s.workspaces,
    users: s.users,
    activeWorkspaceId: s.activeWorkspaceId,
  };
}

export type UndoToken = number;

/** Applies a model mutation as a single store update and returns its result. */
export function run<T>(
  recipe: (s: DataState, ctx: model.MutationContext) => T,
  options: { undoable?: boolean } = {},
): T {
  if (options.undoable !== false) {
    undoStack.push({ id: ++undoCounter, snapshot: snapshotOf(useStore.getState()) });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }
  let result!: T;
  useStore.setState((draft) => {
    result = recipe(draft, model.createContext(draft));
  });
  return result;
}

/** A token for "undo back to before the next action" (used by toast Undo buttons). */
export function nextUndoToken(): UndoToken {
  return undoCounter + 1;
}

export function undo(): boolean {
  const entry = undoStack.pop();
  if (!entry) return false;
  useStore.setState(entry.snapshot);
  return true;
}

export function undoTo(token: UndoToken): boolean {
  const index = undoStack.findIndex((e) => e.id === token);
  if (index < 0) return false;
  const { snapshot } = undoStack[index];
  undoStack.splice(index);
  useStore.setState(snapshot);
  return true;
}

// ---------------------------------------------------------------- data management

export function resetData(): void {
  undoStack.length = 0;
  useStore.setState(createSeedState(), true);
}

export function exportData(): string {
  return JSON.stringify({ version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: pickData(useStore.getState()) }, null, 2);
}

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as { data?: unknown } | null;
    const data = parsed && typeof parsed === "object" && "data" in parsed ? parsed.data : parsed;
    if (!isDataState(data)) return false;
    undoStack.length = 0;
    useStore.setState({ ...data, schemaVersion: SCHEMA_VERSION }, true);
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore: theme still applies for this session.
  }
}

export function setTheme(theme: ThemeName): void {
  run((s) => model.setTheme(s, theme), { undoable: false });
  applyTheme(theme);
}
