"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";
import { IconButton } from "./Button";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 520,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            // Pick the initial focus explicitly; React's autoFocus can lose a race with a
            // closing menu's focus trap when the dialog is opened from a menu item.
            const root = event.currentTarget as HTMLElement;
            const target =
              root.querySelector<HTMLElement>("[data-autofocus]") ??
              root.querySelector<HTMLElement>("input:not([type='hidden']):not([type='file']), textarea, select");
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-raised text-fg shadow-pop outline-none animate-pop-in",
            className,
          )}
          style={{ maxWidth: width }}
        >
          <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl font-medium">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-fg-muted">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close" tooltip={false} className="-mr-2">
                <X size={18} />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-6 pb-5 pt-2">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line-soft px-6 py-4">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A small confirm dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  danger = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width={440}
      footer={
        <>
          <button type="button" className="h-8 rounded-[4px] px-3 text-sm font-medium hover:bg-hover" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type="button"
            data-autofocus
            className={cn(
              "h-8 rounded-[4px] px-3 text-sm font-medium text-white",
              danger ? "bg-[#d83a52] hover:bg-[#b8344a]" : "bg-primary hover:bg-primary-hover",
            )}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
    </Modal>
  );
}
