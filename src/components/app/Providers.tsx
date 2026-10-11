"use client";

import { TooltipProvider } from "@/components/ui/Tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
