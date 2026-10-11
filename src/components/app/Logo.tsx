export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 48 30" aria-hidden="true">
      <rect x="1" y="5" width="9" height="24" rx="4.5" fill="#ff3d57" transform="rotate(32 5.5 17)" />
      <rect x="17" y="5" width="9" height="24" rx="4.5" fill="#ffcb00" transform="rotate(32 21.5 17)" />
      <circle cx="40" cy="22.5" r="5" fill="#00ca72" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-[19px] leading-none tracking-tight">
        <span className="font-bold">monday</span>
        <span className="ml-1.5 font-light text-fg-muted">work management</span>
      </span>
    </span>
  );
}
