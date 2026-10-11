"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { dismissToast, useUI, type Toast } from "@/lib/ui";
import { cn } from "@/lib/utils";

const STYLES: Record<Toast["kind"], { className: string; icon: typeof Info }> = {
  success: { className: "bg-[#00854d]", icon: CircleCheck },
  info: { className: "bg-[#323338] dark:bg-[#3d405f]", icon: Info },
  error: { className: "bg-[#d83a52]", icon: CircleAlert },
};

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  const [paused, setPaused] = useState(false);
  const { className, icon: Icon } = STYLES[toast.kind];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.duration]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex min-h-11 max-w-[min(560px,100%)] items-center gap-3 rounded-lg py-2 pl-4 pr-2 text-sm text-white shadow-pop animate-toast-in",
        className,
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            dismissToast(toast.id);
          }}
          className="shrink-0 rounded border border-white/70 px-2.5 py-0.5 font-medium hover:bg-white/15"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismissToast(toast.id)}
        className="flex size-7 shrink-0 items-center justify-center rounded opacity-80 hover:bg-white/15 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
