import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="font-display text-2xl font-medium">Page not found</h1>
      <p className="text-sm text-fg-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-2 rounded-[4px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
        Back to Home
      </Link>
    </div>
  );
}
