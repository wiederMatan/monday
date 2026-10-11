"use client";

import { Popover as P } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;
export const PopoverClose = P.Close;

export function PopoverContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={10}
        className={cn("z-50 rounded-lg bg-raised p-2 text-fg shadow-pop outline-none animate-pop-in", className)}
        {...props}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
