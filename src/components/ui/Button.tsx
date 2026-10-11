import { cn } from "@/lib/utils";
import { Tip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "xs" | "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-line-strong text-fg hover:bg-hover",
  ghost: "text-fg hover:bg-hover",
  danger: "bg-[#d83a52] text-white hover:bg-[#b8344a]",
};

const SIZES: Record<Size, string> = {
  xs: "h-6 px-2 text-xs",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "sm",
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  label,
  tooltip = true,
  size = "sm",
  active = false,
  className,
  type = "button",
  children,
  ...props
}: React.ComponentProps<"button"> & {
  label: string;
  tooltip?: boolean | string;
  size?: "xs" | "sm" | "md";
  active?: boolean;
}) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[4px] text-fg-muted transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-40",
        size === "xs" ? "size-6" : size === "sm" ? "size-8" : "size-9",
        active && "bg-primary-soft text-primary hover:bg-primary-soft-hover hover:text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
  if (!tooltip) return button;
  return <Tip content={typeof tooltip === "string" ? tooltip : label}>{button}</Tip>;
}
