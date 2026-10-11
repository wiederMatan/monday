import { Check } from "lucide-react";
import { LABEL_COLORS, readableTextColor } from "@/lib/colors";
import { cn } from "@/lib/utils";

export function ColorGrid({
  value,
  onSelect,
  colors = LABEL_COLORS,
  columns = 8,
  size = 22,
}: {
  value?: string;
  onSelect: (color: string) => void;
  colors?: string[];
  columns?: number;
  size?: number;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, ${size}px)` }} role="listbox" aria-label="Colors">
      {colors.map((color) => {
        const selected = value?.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={color}
            onClick={() => onSelect(color)}
            className={cn(
              "inline-flex items-center justify-center rounded-[4px] transition-transform hover:scale-110",
              selected && "ring-2 ring-primary ring-offset-1 ring-offset-raised",
            )}
            style={{ width: size, height: size, background: color, color: readableTextColor(color) }}
          >
            {selected ? <Check size={14} strokeWidth={3} /> : null}
          </button>
        );
      })}
    </div>
  );
}
