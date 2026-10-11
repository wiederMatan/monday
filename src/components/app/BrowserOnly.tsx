"use client";

import { use } from "react";
import { browser } from "react-dom";

/**
 * Workspace data lives in localStorage, so anything that reads it renders in the
 * browser only. During prerendering this suspends to the nearest <Suspense>, whose
 * fallback becomes the static HTML — no hydration mismatch, no effect-driven flash.
 */
export function BrowserOnly({ children }: { children: React.ReactNode }) {
  use(browser("Workspace data is stored in this browser's localStorage."));
  return <>{children}</>;
}
