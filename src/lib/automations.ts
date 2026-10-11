import { getLabel } from "./columns";
import type { Automation, AutomationAction, AutomationTrigger, Board, ID, User } from "./types";

export type AutomationEvent =
  | { type: "status_changed"; columnId: ID; from: ID | null; to: ID | null }
  | { type: "item_created" }
  | { type: "people_added"; columnId: ID; added: ID[] };

export function triggerMatches(trigger: AutomationTrigger, event: AutomationEvent): boolean {
  switch (trigger.type) {
    case "status_changes":
      return (
        event.type === "status_changed" &&
        event.columnId === trigger.columnId &&
        event.from !== event.to &&
        (trigger.labelId === null || trigger.labelId === event.to)
      );
    case "item_created":
      return event.type === "item_created";
    case "person_assigned":
      return event.type === "people_added" && event.columnId === trigger.columnId && event.added.length > 0;
  }
}

export function matchingAutomations(board: Board, event: AutomationEvent): Automation[] {
  return board.automations.filter((a) => a.enabled && automationIsValid(board, a) && triggerMatches(a.trigger, event));
}

/** A recipe can go stale when a column, label or group it points at is deleted. */
export function automationIsValid(board: Board, automation: Automation): boolean {
  const column = (id: ID) => board.columns.find((c) => c.id === id);
  const { trigger, action } = automation;
  if (trigger.type === "status_changes") {
    const col = column(trigger.columnId);
    if (!col || col.type !== "status") return false;
    if (trigger.labelId !== null && !getLabel(col, trigger.labelId)) return false;
  }
  if (trigger.type === "person_assigned") {
    const col = column(trigger.columnId);
    if (!col || col.type !== "people") return false;
  }
  switch (action.type) {
    case "move_to_group":
      return board.groups.some((g) => g.id === action.groupId);
    case "set_status": {
      const col = column(action.columnId);
      return !!col && col.type === "status" && !!getLabel(col, action.labelId);
    }
    case "assign_person": {
      const col = column(action.columnId);
      return !!col && col.type === "people";
    }
    case "set_date_today": {
      const col = column(action.columnId);
      return !!col && col.type === "date";
    }
    case "notify":
    case "archive_item":
      return true;
  }
}

/** A sentence fragment; `token` parts are the configurable, underlined bits of a recipe. */
export interface Segment {
  text: string;
  token?: boolean;
  color?: string;
}

export function describeTrigger(board: Board, trigger: AutomationTrigger): Segment[] {
  switch (trigger.type) {
    case "status_changes": {
      const col = board.columns.find((c) => c.id === trigger.columnId);
      const label = col && trigger.labelId ? getLabel(col, trigger.labelId) : undefined;
      return [
        { text: "When " },
        { text: col?.title ?? "status", token: true },
        { text: " changes to " },
        label ? { text: label.name, token: true, color: label.color } : { text: "anything", token: true },
      ];
    }
    case "item_created":
      return [{ text: "When an item is created" }];
    case "person_assigned": {
      const col = board.columns.find((c) => c.id === trigger.columnId);
      return [{ text: "When a person is assigned in " }, { text: col?.title ?? "people", token: true }];
    }
  }
}

export function describeAction(board: Board, action: AutomationAction, users: User[]): Segment[] {
  const userName = (id: ID) => users.find((u) => u.id === id)?.name ?? "someone";
  switch (action.type) {
    case "move_to_group": {
      const group = board.groups.find((g) => g.id === action.groupId);
      return [{ text: "move item to " }, { text: group?.title ?? "group", token: true, color: group?.color }];
    }
    case "set_status": {
      const col = board.columns.find((c) => c.id === action.columnId);
      const label = col ? getLabel(col, action.labelId) : undefined;
      return [
        { text: "set " },
        { text: col?.title ?? "status", token: true },
        { text: " to " },
        { text: label?.name ?? "label", token: true, color: label?.color },
      ];
    }
    case "assign_person": {
      const col = board.columns.find((c) => c.id === action.columnId);
      return [{ text: "assign " }, { text: userName(action.userId), token: true }, { text: " in " }, { text: col?.title ?? "people", token: true }];
    }
    case "set_date_today": {
      const col = board.columns.find((c) => c.id === action.columnId);
      return [{ text: "set " }, { text: col?.title ?? "date", token: true }, { text: " to today" }];
    }
    case "notify":
      return [{ text: "notify " }, { text: userName(action.userId), token: true }];
    case "archive_item":
      return [{ text: "archive the item" }];
  }
}

export function describeAutomation(board: Board, automation: Automation, users: User[]): Segment[] {
  return [...describeTrigger(board, automation.trigger), { text: ", " }, ...describeAction(board, automation.action, users)];
}

export function segmentsToText(segments: Segment[]): string {
  return segments.map((s) => s.text).join("");
}
