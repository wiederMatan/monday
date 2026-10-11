import { Check, Minus } from "lucide-react";
import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        on ? "border-primary bg-primary text-white" : "border-line-strong bg-surface hover:border-fg-muted",
        className,
      )}
    >
      {indeterminate ? <Minus size={12} strokeWidth={3} /> : checked ? <Check size={12} strokeWidth={3} /> : null}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors data-[state=checked]:bg-positive data-[state=unchecked]:bg-line-strong",
        size === "sm" ? "h-4 w-7" : "h-5 w-9",
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          "block rounded-full bg-white shadow transition-transform data-[state=unchecked]:translate-x-0.5",
          size === "sm" ? "size-3 data-[state=checked]:translate-x-3.5" : "size-4 data-[state=checked]:translate-x-[18px]",
        )}
      />
    </RadixSwitch.Root>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-sunken px-1 font-sans text-[11px] font-medium text-fg-muted">
      {children}
    </kbd>
  );
}
