"use client";

import {
  CircleHelp,
  Database,
  Keyboard,
  Monitor,
  Moon,
  Search,
  Sun,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Checkbox";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { useCurrentUser } from "@/lib/hooks";
import { setTheme, useStore } from "@/lib/store";
import type { ThemeName } from "@/lib/types";
import { openDialog, setCommandOpen } from "@/lib/ui";
import { cn, isMac } from "@/lib/utils";
import { Logo } from "./Logo";
import { NotificationsButton } from "./NotificationsPopover";

const THEMES: Array<{ value: ThemeName; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "night", label: "Night", icon: Monitor },
];

export function TopBar() {
  const user = useCurrentUser();
  const theme = useStore((s) => s.preferences.theme);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 pl-4 pr-3">
      <Link href="/" className="rounded-md px-1 py-1" aria-label="monday home">
        <Logo />
      </Link>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="ml-auto hidden h-8 w-64 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-sm text-fg-faint transition-colors hover:border-line-strong md:flex"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search everything</span>
        <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
        <Kbd>K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-0.5 md:ml-2">
        <IconButton label="Search" className="md:hidden" onClick={() => setCommandOpen(true)}>
          <Search size={19} />
        </IconButton>
        <NotificationsButton />
        <IconButton label="Invite members" onClick={() => openDialog("invite")}>
          <UserPlus size={19} />
        </IconButton>
        <IconButton label="Keyboard shortcuts" onClick={() => openDialog("shortcuts")}>
          <CircleHelp size={19} />
        </IconButton>
        <span className="mx-1.5 h-6 w-px bg-line" aria-hidden />
        <Menu>
          <MenuTrigger asChild>
            <button type="button" className="rounded-full p-0.5 hover:bg-hover" aria-label="Profile menu">
              <Avatar user={user} size={30} />
            </button>
          </MenuTrigger>
          <MenuContent align="end" className="w-64">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar user={user} size={36} />
              <div className="min-w-0">
                <div className="truncate font-medium">{user.name}</div>
                <div className="truncate text-xs text-fg-muted">{user.email}</div>
              </div>
            </div>
            <MenuSeparator />
            <MenuItem icon={UserRound} onSelect={() => openDialog("profile")}>
              My profile
            </MenuItem>
            <MenuItem icon={UserPlus} onSelect={() => openDialog("invite")}>
              Invite members
            </MenuItem>
            <MenuItem icon={Keyboard} shortcut="?" onSelect={() => openDialog("shortcuts")}>
              Keyboard shortcuts
            </MenuItem>
            <MenuItem icon={Database} onSelect={() => openDialog("data")}>
              Backup &amp; restore
            </MenuItem>
            <MenuSeparator />
            <MenuLabel>Theme</MenuLabel>
            <div className="grid grid-cols-3 gap-1 px-1 pb-1">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={theme === value}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border py-2 text-xs transition-colors",
                    theme === value ? "border-primary bg-primary-soft text-primary" : "border-line-soft hover:bg-hover",
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </MenuContent>
        </Menu>
      </div>
    </header>
  );
}
