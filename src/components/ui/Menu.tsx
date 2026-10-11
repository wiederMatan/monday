"use client";

import { Check, ChevronRight, type LucideIcon } from "lucide-react";
import { ContextMenu as CM, DropdownMenu as DM } from "radix-ui";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

/**
 * Menu items render inside either a dropdown or a context menu, so the same item list
 * can back both the "⋯" button and right-click.
 */
const MenuKind = createContext<"dropdown" | "context">("dropdown");

const CONTENT =
  "z-50 min-w-[210px] max-h-[var(--radix-dropdown-menu-content-available-height,80vh)] overflow-auto rounded-lg bg-raised p-1.5 text-fg shadow-pop outline-none animate-pop-in";
const ITEM =
  "relative flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-md px-2 text-sm outline-none data-[highlighted]:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-40";

/**
 * Radix returns focus to the trigger (deferred) when a menu closes. If a menu item
 * moved focus somewhere on purpose — an inline rename input, a dialog, a popover —
 * keep it there instead of yanking it back.
 */
function keepIntentionalFocus(event: Event) {
  const active = document.activeElement;
  if (active && active !== document.body && !active.closest("[role='menu']")) event.preventDefault();
}

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({
  className,
  align = "start",
  sideOffset = 4,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DM.Content>) {
  return (
    <MenuKind.Provider value="dropdown">
      <DM.Portal>
        <DM.Content
          align={align}
          sideOffset={sideOffset}
          collisionPadding={10}
          className={cn(CONTENT, className)}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            keepIntentionalFocus(event);
          }}
          {...props}
        />
      </DM.Portal>
    </MenuKind.Provider>
  );
}

export const ContextMenu = CM.Root;
export const ContextMenuTrigger = CM.Trigger;

export function ContextMenuContent({ className, onCloseAutoFocus, ...props }: React.ComponentProps<typeof CM.Content>) {
  return (
    <MenuKind.Provider value="context">
      <CM.Portal>
        <CM.Content
          collisionPadding={10}
          className={cn(CONTENT, className)}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            keepIntentionalFocus(event);
          }}
          {...props}
        />
      </CM.Portal>
    </MenuKind.Provider>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  shortcut,
  danger,
  disabled,
  onSelect,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  shortcut?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
  className?: string;
}) {
  const kind = useContext(MenuKind);
  const Item = kind === "dropdown" ? DM.Item : CM.Item;
  return (
    <Item onSelect={onSelect} disabled={disabled} className={cn(ITEM, danger && "text-negative", className)}>
      {Icon ? <Icon size={16} className="shrink-0 opacity-80" /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <span className="text-xs text-fg-faint">{shortcut}</span> : null}
    </Item>
  );
}

export function MenuCheckItem({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  const kind = useContext(MenuKind);
  const Item = kind === "dropdown" ? DM.CheckboxItem : CM.CheckboxItem;
  const Indicator = kind === "dropdown" ? DM.ItemIndicator : CM.ItemIndicator;
  return (
    <Item
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={(e) => e.preventDefault()}
      className={cn(ITEM, "pl-8")}
    >
      <span className="absolute left-2 inline-flex size-4 items-center justify-center">
        <Indicator>
          <Check size={14} />
        </Indicator>
      </span>
      {children}
    </Item>
  );
}

export function MenuSeparator() {
  const kind = useContext(MenuKind);
  const Separator = kind === "dropdown" ? DM.Separator : CM.Separator;
  return <Separator className="-mx-1.5 my-1.5 h-px bg-line-soft" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  const kind = useContext(MenuKind);
  const Label = kind === "dropdown" ? DM.Label : CM.Label;
  return <Label className="px-2 pb-1 pt-1.5 text-xs font-medium text-fg-faint">{children}</Label>;
}

export function MenuSub({ children }: { children: React.ReactNode }) {
  const kind = useContext(MenuKind);
  const Sub = kind === "dropdown" ? DM.Sub : CM.Sub;
  return <Sub>{children}</Sub>;
}

export function MenuSubTrigger({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  const kind = useContext(MenuKind);
  const Trigger = kind === "dropdown" ? DM.SubTrigger : CM.SubTrigger;
  return (
    <Trigger className={cn(ITEM, "data-[state=open]:bg-hover")}>
      {Icon ? <Icon size={16} className="shrink-0 opacity-80" /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight size={14} className="text-fg-faint" />
    </Trigger>
  );
}

export function MenuSubContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const kind = useContext(MenuKind);
  if (kind === "dropdown") {
    return (
      <DM.Portal>
        <DM.SubContent sideOffset={6} collisionPadding={10} className={cn(CONTENT, className)}>
          {children}
        </DM.SubContent>
      </DM.Portal>
    );
  }
  return (
    <CM.Portal>
      <CM.SubContent sideOffset={6} collisionPadding={10} className={cn(CONTENT, className)}>
        {children}
      </CM.SubContent>
    </CM.Portal>
  );
}
