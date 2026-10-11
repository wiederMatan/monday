"use client";

import {
  CalendarCheck,
  CornerDownLeft,
  House,
  Keyboard,
  LayoutList,
  Moon,
  Plus,
  Search,
  Sun,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { setTheme, useStore } from "@/lib/store";
import { openDialog, setCommandOpen, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  section: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
  color?: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useUI((s) => s.commandOpen);
  return (
    <Dialog.Root open={open} onOpenChange={setCommandOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 w-[min(640px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl bg-raised text-fg shadow-pop outline-none animate-pop-in"
        >
          <Dialog.Title className="sr-only">Search everything</Dialog.Title>
          <PaletteBody />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteBody() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const boards = useStore((s) => s.boards);
  const boardOrder = useStore((s) => s.boardOrder);
  const recent = useStore((s) => s.recentBoardIds);
  const items = useStore((s) => s.items);
  const theme = useStore((s) => s.preferences.theme);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const go = (href: string) => () => {
      setCommandOpen(false);
      router.push(href);
    };
    const quickActions: Result[] = [
      { id: "a-new", section: "Actions", label: "Create new board", icon: Plus, run: () => (setCommandOpen(false), openDialog("createBoard")) },
      { id: "a-home", section: "Actions", label: "Go to Home", icon: House, run: go("/") },
      { id: "a-work", section: "Actions", label: "Go to My work", icon: CalendarCheck, run: go("/my-work") },
      {
        id: "a-theme",
        section: "Actions",
        label: theme === "light" ? "Switch to dark theme" : "Switch to light theme",
        icon: theme === "light" ? Moon : Sun,
        run: () => (setCommandOpen(false), setTheme(theme === "light" ? "dark" : "light")),
      },
      { id: "a-invite", section: "Actions", label: "Invite members", icon: UserPlus, run: () => (setCommandOpen(false), openDialog("invite")) },
      { id: "a-keys", section: "Actions", label: "Keyboard shortcuts", icon: Keyboard, run: () => (setCommandOpen(false), openDialog("shortcuts")) },
    ];

    if (!q) {
      const recentBoards = recent
        .map((id) => boards[id])
        .filter(Boolean)
        .slice(0, 5)
        .map((b) => ({ id: `b-${b.id}`, section: "Recent boards", label: b.name, icon: LayoutList, run: go(`/boards/${b.id}`) }));
      return [...recentBoards, ...quickActions];
    }

    const boardResults = boardOrder
      .map((id) => boards[id])
      .filter((b) => b && b.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((b) => ({ id: `b-${b.id}`, section: "Boards", label: b.name, icon: LayoutList, run: go(`/boards/${b.id}`) }));

    const itemResults: Result[] = [];
    for (const item of Object.values(items)) {
      if (itemResults.length >= 8) break;
      if (item.archivedAt || !item.name.toLowerCase().includes(q)) continue;
      const board = boards[item.boardId];
      if (!board) continue;
      const group = board.groups.find((g) => g.id === item.groupId);
      const parent = item.parentId ? items[item.parentId] : undefined;
      if (item.parentId && (!parent || parent.archivedAt)) continue;
      itemResults.push({
        id: `i-${item.id}`,
        section: "Items",
        label: item.name,
        detail: `${board.name}${parent ? ` › ${parent.name}` : group ? ` › ${group.title}` : ""}`,
        icon: CornerDownLeft,
        color: group?.color,
        run: go(`/boards/${board.id}?item=${item.id}`),
      });
    }

    return [...boardResults, ...itemResults, ...quickActions.filter((a) => a.label.toLowerCase().includes(q))];
  }, [query, boards, boardOrder, recent, items, theme, router]);

  const selected = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  let lastSection = "";

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line-soft px-4">
        <Search size={18} className="text-fg-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              results[selected]?.run();
            }
          }}
          placeholder="Search boards, items and actions…"
          className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none"
          aria-label="Search"
          role="combobox"
          aria-expanded
          aria-controls="palette-results"
          aria-activedescendant={results[selected] ? `palette-${results[selected].id}` : undefined}
        />
      </div>
      <ul ref={listRef} id="palette-results" role="listbox" className="max-h-[min(420px,60vh)] overflow-auto p-2">
        {results.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-fg-muted">No results for “{query}”</li>
        ) : (
          results.map((result, index) => {
            const header = result.section !== lastSection ? result.section : null;
            lastSection = result.section;
            const Icon = result.icon;
            return (
              <li key={result.id} role="presentation">
                {header ? <div className="px-3 pb-1 pt-2 text-xs font-medium text-fg-faint">{header}</div> : null}
                <div
                  id={`palette-${result.id}`}
                  role="option"
                  aria-selected={index === selected}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => result.run()}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm",
                    index === selected && "bg-primary-soft",
                  )}
                >
                  {result.color ? (
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: result.color }} />
                  ) : (
                    <Icon size={16} className="shrink-0 text-fg-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{result.label}</span>
                  {result.detail ? <span className="max-w-[45%] truncate text-xs text-fg-muted">{result.detail}</span> : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
