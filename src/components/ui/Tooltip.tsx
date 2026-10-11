"use client";

import { Tooltip } from "radix-ui";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </Tooltip.Provider>
  );
}

export function Tip({
  content,
  children,
  side = "top",
  align = "center",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  if (content === null || content === undefined || content === "") return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className="z-[80] max-w-xs rounded-md bg-[#323338] px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-pop animate-fade-in dark:bg-[#474b6d]"
        >
          {content}
          <Tooltip.Arrow className="fill-[#323338] dark:fill-[#474b6d]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
