import Link from "next/link";
import { Logo } from "./Logo";

/** Static stand-ins rendered into the prerendered shell while the client islands load. */

export function TopBarSkeleton() {
  return (
    <header className="flex h-12 shrink-0 items-center pl-4 pr-3">
      <Link href="/" className="rounded-md px-1 py-1" aria-label="monday home">
        <Logo />
      </Link>
      <div className="ml-auto flex items-center gap-2" aria-hidden>
        <div className="hidden h-8 w-64 rounded-md border border-line bg-surface md:block" />
        <div className="size-8 rounded-full bg-sunken" />
      </div>
    </header>
  );
}

export function SidebarSkeleton() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-3 rounded-tr-xl bg-surface p-3 shadow-card md:flex" aria-busy="true" aria-label="Loading navigation">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="h-5 animate-pulse rounded bg-sunken" style={{ width: `${55 + ((i * 37) % 40)}%` }} />
      ))}
    </aside>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-8" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-72 animate-pulse rounded bg-sunken" />
      <div className="mt-6 h-4 w-96 max-w-full animate-pulse rounded bg-sunken" />
      <div className="mt-10 space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-sunken" />
        ))}
      </div>
    </div>
  );
}
