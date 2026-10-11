"use client";

import {
  Bug,
  Download,
  FolderKanban,
  Handshake,
  LayoutList,
  Megaphone,
  PartyPopper,
  RotateCcw,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Checkbox";
import { ColorGrid } from "@/components/ui/ColorGrid";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import * as actions from "@/lib/actions";
import { AVATAR_COLORS } from "@/lib/colors";
import { useCurrentUser } from "@/lib/hooks";
import { isValidEmail } from "@/lib/model";
import { exportData, importData, resetData, STORAGE_KEY, useStore } from "@/lib/store";
import { BOARD_TEMPLATES, getTemplate, type TemplateIcon } from "@/lib/templates";
import { closeDialog, toast, useUI } from "@/lib/ui";
import { cn, downloadFile, isMac, pluralize } from "@/lib/utils";

export const TEMPLATE_ICONS: Record<TemplateIcon, LucideIcon> = {
  blank: LayoutList,
  project: FolderKanban,
  bug: Bug,
  crm: Handshake,
  content: Megaphone,
  team: Users,
  event: PartyPopper,
};

export function Dialogs() {
  const dialog = useUI((s) => s.dialog);
  const onOpenChange = (open: boolean) => {
    if (!open) closeDialog();
  };
  return (
    <>
      <Modal open={dialog?.name === "createBoard"} onOpenChange={onOpenChange} title="Create board" width={760}>
        <CreateBoardForm initialWorkspaceId={dialog?.workspaceId} />
      </Modal>
      <Modal open={dialog?.name === "profile"} onOpenChange={onOpenChange} title="My profile" width={480}>
        <ProfileForm />
      </Modal>
      <Modal open={dialog?.name === "shortcuts"} onOpenChange={onOpenChange} title="Keyboard shortcuts" width={480}>
        <ShortcutsList />
      </Modal>
      <Modal
        open={dialog?.name === "invite"}
        onOpenChange={onOpenChange}
        title="Invite to your team"
        description="Invited members can be assigned to items right away."
        width={520}
      >
        <InviteForm boardId={dialog?.boardId} />
      </Modal>
      <Modal open={dialog?.name === "data"} onOpenChange={onOpenChange} title="Backup & restore" width={520}>
        <DataPanel />
      </Modal>
      <Modal open={dialog?.name === "createWorkspace"} onOpenChange={onOpenChange} title="Add workspace" width={440}>
        <CreateWorkspaceForm />
      </Modal>
    </>
  );
}

function FormFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const INPUT =
  "h-10 w-full rounded-[4px] border border-line-strong bg-surface px-3 text-sm outline-none transition-colors hover:border-fg-muted focus:border-primary";

function CreateBoardForm({ initialWorkspaceId }: { initialWorkspaceId?: string }) {
  const router = useRouter();
  const workspaces = useStore((s) => s.workspaces);
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId);
  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId ?? activeWorkspaceId);

  const create = () => {
    const template = getTemplate(templateId);
    const userIds = [currentUserId, ...users.map((u) => u.id).filter((id) => id !== currentUserId)];
    const spec = template.build(userIds);
    const boardName = name.trim() || spec.name;
    const id = actions.createBoard({ ...spec, name: boardName }, workspaceId);
    actions.setActiveWorkspace(workspaceId);
    closeDialog();
    router.push(`/boards/${id}`);
    toast(`Board “${boardName}” created`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="Board name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getTemplate(templateId).build([currentUserId]).name}
            className={INPUT}
            maxLength={80}
          />
        </Field>
        <Field label="Workspace">
          <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className={INPUT}>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mb-2 mt-5 text-sm font-medium">Choose a template</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3" role="radiogroup" aria-label="Templates">
        {BOARD_TEMPLATES.map((t) => {
          const Icon = TEMPLATE_ICONS[t.icon];
          const selected = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTemplateId(t.id)}
              onDoubleClick={() => {
                setTemplateId(t.id);
                create();
              }}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                selected ? "border-primary bg-primary-soft/50 ring-1 ring-primary" : "border-line hover:border-line-strong hover:bg-hover",
              )}
            >
              <span className="flex size-9 items-center justify-center rounded-lg text-white" style={{ background: t.color }}>
                <Icon size={18} />
              </span>
              <span className="font-medium">{t.name}</span>
              <span className="text-xs leading-snug text-fg-muted">{t.description}</span>
            </button>
          );
        })}
      </div>
      <FormFooter>
        <Button variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="submit">Create board</Button>
      </FormFooter>
    </form>
  );
}

function ProfileForm() {
  const user = useCurrentUser();
  const [name, setName] = useState(user.name);
  const [title, setTitle] = useState(user.title);
  const [email, setEmail] = useState(user.email);
  const [color, setColor] = useState(user.color);
  const valid = name.trim().length > 0 && isValidEmail(email);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        actions.updateProfile({ name, title, email, color });
        closeDialog();
        toast("Profile updated");
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-4">
        <Avatar user={{ name: name || "?", color }} size={64} />
        <div>
          <div className="mb-2 text-sm font-medium">Avatar color</div>
          <ColorGrid colors={AVATAR_COLORS} value={color} onSelect={setColor} columns={6} />
        </div>
      </div>
      <Field label="Full name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} maxLength={60} required />
      </Field>
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} maxLength={60} placeholder="e.g. Product Manager" />
      </Field>
      <Field label="Email">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} required />
      </Field>
      <FormFooter>
        <Button variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Save
        </Button>
      </FormFooter>
    </form>
  );
}

function ShortcutsList() {
  const mod = isMac() ? "⌘" : "Ctrl";
  const rows: Array<[React.ReactNode, string]> = [
    [
      <>
        <Kbd>{mod}</Kbd> <Kbd>K</Kbd>
      </>,
      "Search boards, items and actions",
    ],
    [
      <>
        <Kbd>{mod}</Kbd> <Kbd>Z</Kbd>
      </>,
      "Undo the last change",
    ],
    [<Kbd key="enter">Enter</Kbd>, "Save an edit or add another item"],
    [<Kbd key="esc">Esc</Kbd>, "Cancel editing, close panels, clear selection"],
    [<Kbd key="q">?</Kbd>, "Show this list"],
  ];
  return (
    <dl className="divide-y divide-line-soft">
      {rows.map(([keys, text], i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-3 text-sm">
          <dt className="text-fg-muted">{text}</dt>
          <dd className="flex shrink-0 items-center gap-1">{keys}</dd>
        </div>
      ))}
    </dl>
  );
}

function InviteForm({ boardId }: { boardId?: string }) {
  const [text, setText] = useState("");
  const users = useStore((s) => s.users);
  const board = useStore((s) => (boardId ? s.boards[boardId] : undefined));
  const emails = text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const valid = emails.filter(isValidEmail);
  const invalid = emails.filter((e) => !isValidEmail(e));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid.length) return;
        const ids = actions.inviteUsers(valid, board?.id);
        closeDialog();
        toast(`Invited ${pluralize(ids.length, "member")}${board ? ` to “${board.name}”` : ""}`);
      }}
    >
      <Field label="Emails">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="name@company.com, another@company.com"
          className={cn(INPUT, "h-auto resize-none py-2")}
        />
      </Field>
      {invalid.length ? <p className="mt-2 text-xs text-negative">Not a valid email: {invalid.join(", ")}</p> : null}
      <div className="mt-5">
        <div className="mb-2 text-sm font-medium">Team members ({users.length})</div>
        <ul className="max-h-48 space-y-1 overflow-auto">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-md px-1 py-1 text-sm">
              <Avatar user={u} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{u.name}</span>
                <span className="block truncate text-xs text-fg-muted">{u.title || u.email}</span>
              </span>
              {board?.memberIds.includes(u.id) ? <span className="text-xs text-fg-muted">Board member</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <FormFooter>
        <Button variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid.length}>
          Invite{valid.length ? ` ${valid.length}` : ""}
        </Button>
      </FormFooter>
    </form>
  );
}

function DataPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const size = typeof window === "undefined" ? 0 : (localStorage.getItem(STORAGE_KEY)?.length ?? 0);

  return (
    <div className="space-y-5 text-sm">
      <p className="text-fg-muted">
        Your workspace is saved in this browser ({(size / 1024).toFixed(0)} KB). Export a backup to move it to another
        browser or keep a copy.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            downloadFile(`monday-backup-${new Date().toISOString().slice(0, 10)}.json`, exportData(), "application/json");
            toast("Backup downloaded");
          }}
        >
          <Download size={16} /> Export backup
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Import backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (importData(await file.text())) {
              closeDialog();
              toast("Backup restored");
            } else {
              toast("That file isn't a valid backup", { kind: "error" });
            }
          }}
        />
      </div>
      <div className="rounded-lg border border-line-soft bg-sunken p-4">
        <div className="font-medium">Reset demo data</div>
        <p className="mt-1 text-fg-muted">Replace everything with the original sample workspace.</p>
        <Button variant="secondary" className="mt-3" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={16} /> Reset workspace
        </Button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset all data?"
        description="All boards, items and updates will be replaced with the sample workspace. Export a backup first if you want to keep them."
        confirmLabel="Reset"
        onConfirm={() => {
          resetData();
          closeDialog();
          router.push("/");
          toast("Workspace reset to the sample data");
        }}
      />
    </div>
  );
}

function CreateWorkspaceForm() {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        actions.addWorkspace(name);
        closeDialog();
        toast(`Workspace “${name.trim()}” created`);
      }}
    >
      <Field label="Workspace name">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design team" className={INPUT} maxLength={60} />
      </Field>
      <FormFooter>
        <Button variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          Add workspace
        </Button>
      </FormFooter>
    </form>
  );
}
