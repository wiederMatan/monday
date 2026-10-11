"use client";

import { Sparkles, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/Checkbox";
import { Modal } from "@/components/ui/Modal";
import * as actions from "@/lib/actions";
import { automationIsValid, describeAutomation, type Segment } from "@/lib/automations";
import { timeAgo } from "@/lib/dates";
import { useCurrentUser, useNow, useUsers } from "@/lib/hooks";
import type { AutomationAction, AutomationTrigger, Board, Column } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn, pluralize } from "@/lib/utils";

type TriggerType = AutomationTrigger["type"];
type ActionType = AutomationAction["type"];

const ANY = "__any";

export function Sentence({ segments }: { segments: Segment[] }) {
  return (
    <span>
      {segments.map((segment, i) =>
        segment.token ? (
          <span key={i} className="font-semibold underline decoration-line-strong decoration-2 underline-offset-4">
            {segment.color ? <span className="mr-1 inline-block size-2.5 rounded-full align-middle" style={{ background: segment.color }} /> : null}
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </span>
  );
}

export function AutomationsDialog({ board, open, onOpenChange }: { board: Board; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Zap size={20} className="text-[#fdab3d]" /> Automations
        </span>
      }
      description={`Let “${board.name}” do the busywork. Automations run whenever the trigger happens on this board.`}
      width={820}
    >
      {open ? <AutomationsBody board={board} /> : null}
    </Modal>
  );
}

function AutomationsBody({ board }: { board: Board }) {
  const users = useUsers();
  const now = useNow();
  return (
    <div className="space-y-6">
      <AutomationBuilder board={board} />
      <Recipes board={board} />
      <section>
        <h3 className="mb-2 text-sm font-medium">
          Board automations <span className="text-fg-muted">({board.automations.length})</span>
        </h3>
        {board.automations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-fg-muted">
            No automations yet. Build one above or start from a suggestion.
          </p>
        ) : (
          <ul className="space-y-2">
            {board.automations.map((automation) => {
              const valid = automationIsValid(board, automation);
              return (
                <li
                  key={automation.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border border-line-soft bg-sunken px-4 py-3 text-sm",
                    (!automation.enabled || !valid) && "opacity-60",
                  )}
                >
                  <Zap size={16} className="shrink-0 text-[#fdab3d]" />
                  <div className="min-w-0 flex-1">
                    <Sentence segments={describeAutomation(board, automation, users)} />
                    <div className="mt-1 text-xs text-fg-muted">
                      {valid
                        ? `Ran ${pluralize(automation.runs, "time")}${automation.lastRunAt ? ` · last ${timeAgo(automation.lastRunAt, now)}` : ""}`
                        : "Paused — a column, label or group it uses was removed"}
                    </div>
                  </div>
                  <Switch
                    checked={automation.enabled}
                    onChange={(enabled) => actions.setAutomationEnabled(board.id, automation.id, enabled)}
                    label={automation.enabled ? "Turn off automation" : "Turn on automation"}
                  />
                  <button
                    type="button"
                    aria-label="Delete automation"
                    onClick={() => actions.deleteAutomation(board.id, automation.id)}
                    className="flex size-8 items-center justify-center rounded text-fg-muted hover:bg-hover hover:text-negative"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const TOKEN_SELECT =
  "mx-1 inline-block h-8 max-w-[190px] rounded-[4px] border border-line-strong bg-surface px-2 align-middle text-sm font-medium outline-none hover:border-fg-muted focus:border-primary";

function AutomationBuilder({ board }: { board: Board }) {
  const users = useUsers();
  const statusColumns = board.columns.filter((c) => c.type === "status");
  const peopleColumns = board.columns.filter((c) => c.type === "people");
  const dateColumns = board.columns.filter((c) => c.type === "date");

  const [triggerType, setTriggerType] = useState<TriggerType>(statusColumns.length ? "status_changes" : "item_created");
  const [triggerColumnId, setTriggerColumnId] = useState(statusColumns[0]?.id ?? "");
  const [triggerLabelId, setTriggerLabelId] = useState<string>(ANY);
  const [peopleTriggerColumnId, setPeopleTriggerColumnId] = useState(peopleColumns[0]?.id ?? "");
  const [actionType, setActionType] = useState<ActionType>("move_to_group");
  const [groupId, setGroupId] = useState(board.groups[0]?.id ?? "");
  const [actionStatusColumnId, setActionStatusColumnId] = useState(statusColumns[0]?.id ?? "");
  const [actionLabelId, setActionLabelId] = useState(statusColumns[0]?.settings.labels?.[0]?.id ?? "");
  const [actionPeopleColumnId, setActionPeopleColumnId] = useState(peopleColumns[0]?.id ?? "");
  const [actionDateColumnId, setActionDateColumnId] = useState(dateColumns[0]?.id ?? "");
  const [userId, setUserId] = useState(users[0]?.id ?? "");

  const labelsOf = (columnId: string): Column["settings"]["labels"] =>
    board.columns.find((c) => c.id === columnId)?.settings.labels ?? [];

  const trigger: AutomationTrigger | null =
    triggerType === "status_changes"
      ? triggerColumnId
        ? { type: "status_changes", columnId: triggerColumnId, labelId: triggerLabelId === ANY ? null : triggerLabelId }
        : null
      : triggerType === "person_assigned"
        ? peopleTriggerColumnId
          ? { type: "person_assigned", columnId: peopleTriggerColumnId }
          : null
        : { type: "item_created" };

  const action: AutomationAction | null = (() => {
    switch (actionType) {
      case "move_to_group":
        return groupId ? { type: "move_to_group", groupId } : null;
      case "set_status":
        return actionStatusColumnId && actionLabelId ? { type: "set_status", columnId: actionStatusColumnId, labelId: actionLabelId } : null;
      case "assign_person":
        return actionPeopleColumnId && userId ? { type: "assign_person", columnId: actionPeopleColumnId, userId } : null;
      case "set_date_today":
        return actionDateColumnId ? { type: "set_date_today", columnId: actionDateColumnId } : null;
      case "notify":
        return userId ? { type: "notify", userId } : null;
      case "archive_item":
        return { type: "archive_item" };
    }
  })();

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Sparkles size={16} className="text-primary" /> Create a custom automation
      </h3>
      <div className="text-[15px] leading-[2.6]">
        When
        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as TriggerType)} className={TOKEN_SELECT} aria-label="Trigger">
          {statusColumns.length ? <option value="status_changes">a status changes</option> : null}
          <option value="item_created">an item is created</option>
          {peopleColumns.length ? <option value="person_assigned">a person is assigned</option> : null}
        </select>
        {triggerType === "status_changes" ? (
          <>
            in
            <select
              value={triggerColumnId}
              onChange={(e) => {
                setTriggerColumnId(e.target.value);
                setTriggerLabelId(ANY);
              }}
              className={TOKEN_SELECT}
              aria-label="Status column"
            >
              {statusColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            to
            <select value={triggerLabelId} onChange={(e) => setTriggerLabelId(e.target.value)} className={TOKEN_SELECT} aria-label="Status label">
              <option value={ANY}>anything</option>
              {labelsOf(triggerColumnId)?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </>
        ) : null}
        {triggerType === "person_assigned" ? (
          <>
            in
            <select value={peopleTriggerColumnId} onChange={(e) => setPeopleTriggerColumnId(e.target.value)} className={TOKEN_SELECT} aria-label="People column">
              {peopleColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </>
        ) : null}
        , then
        <select value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)} className={TOKEN_SELECT} aria-label="Action">
          <option value="move_to_group">move item to group</option>
          {statusColumns.length ? <option value="set_status">change a status</option> : null}
          {peopleColumns.length ? <option value="assign_person">assign a person</option> : null}
          {dateColumns.length ? <option value="set_date_today">set a date to today</option> : null}
          <option value="notify">notify someone</option>
          <option value="archive_item">archive the item</option>
        </select>
        {actionType === "move_to_group" ? (
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={TOKEN_SELECT} aria-label="Group">
            {board.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        ) : null}
        {actionType === "set_status" ? (
          <>
            <select
              value={actionStatusColumnId}
              onChange={(e) => {
                setActionStatusColumnId(e.target.value);
                setActionLabelId(labelsOf(e.target.value)?.[0]?.id ?? "");
              }}
              className={TOKEN_SELECT}
              aria-label="Status column to change"
            >
              {statusColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            to
            <select value={actionLabelId} onChange={(e) => setActionLabelId(e.target.value)} className={TOKEN_SELECT} aria-label="New status">
              {labelsOf(actionStatusColumnId)?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </>
        ) : null}
        {actionType === "assign_person" || actionType === "notify" ? (
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={TOKEN_SELECT} aria-label="Person">
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : null}
        {actionType === "assign_person" ? (
          <>
            in
            <select value={actionPeopleColumnId} onChange={(e) => setActionPeopleColumnId(e.target.value)} className={TOKEN_SELECT} aria-label="People column to assign in">
              {peopleColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </>
        ) : null}
        {actionType === "set_date_today" ? (
          <select value={actionDateColumnId} onChange={(e) => setActionDateColumnId(e.target.value)} className={TOKEN_SELECT} aria-label="Date column">
            {dateColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={!trigger || !action}
          onClick={() => {
            if (!trigger || !action) return;
            actions.addAutomation(board.id, trigger, action);
            toast("Automation created");
          }}
          className="h-8 rounded-[4px] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Create automation
        </button>
      </div>
    </section>
  );
}

/** One-click suggestions built from the board's own columns and groups. */
function Recipes({ board }: { board: Board }) {
  const users = useUsers();
  const status = board.columns.find((c) => c.type === "status" && c.settings.doneLabelId);
  const done = status?.settings.labels?.find((l) => l.id === status.settings.doneLabelId);
  const lastGroup = board.groups[board.groups.length - 1];
  const people = board.columns.find((c) => c.type === "people");
  const date = board.columns.find((c) => c.type === "date");
  const me = useCurrentUser();

  const recipes: Array<{ trigger: AutomationTrigger; action: AutomationAction }> = [];
  if (status && done && lastGroup) {
    recipes.push({ trigger: { type: "status_changes", columnId: status.id, labelId: done.id }, action: { type: "move_to_group", groupId: lastGroup.id } });
  }
  if (status && done && me) {
    recipes.push({ trigger: { type: "status_changes", columnId: status.id, labelId: done.id }, action: { type: "notify", userId: me.id } });
  }
  if (people && me) recipes.push({ trigger: { type: "item_created" }, action: { type: "assign_person", columnId: people.id, userId: me.id } });
  if (people && date) recipes.push({ trigger: { type: "person_assigned", columnId: people.id }, action: { type: "set_date_today", columnId: date.id } });

  const fresh = recipes.filter(
    (r) => !board.automations.some((a) => JSON.stringify(a.trigger) === JSON.stringify(r.trigger) && JSON.stringify(a.action) === JSON.stringify(r.action)),
  );
  if (fresh.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Suggested for this board</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {fresh.map((recipe, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              actions.addAutomation(board.id, recipe.trigger, recipe.action);
              toast("Automation added");
            }}
            className="rounded-lg border border-line p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary-soft/30"
          >
            <Sentence
              segments={describeAutomation(
                board,
                { id: "preview", enabled: true, trigger: recipe.trigger, action: recipe.action, createdAt: 0, createdBy: "", runs: 0, lastRunAt: null },
                users,
              )}
            />
            <span className="mt-2 block text-xs font-medium text-primary">+ Add automation</span>
          </button>
        ))}
      </div>
    </section>
  );
}
