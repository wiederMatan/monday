import { Suspense } from "react";
import { PageSkeleton } from "./AppSkeleton";
import { BrowserOnly } from "./BrowserOnly";

/**
 * Wraps a page's client screen in its own Suspense + browser-only boundary, so the
 * page segment has a static fallback for both page loads and client navigations.
 */
export function ClientPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BrowserOnly>{children}</BrowserOnly>
    </Suspense>
  );
}
