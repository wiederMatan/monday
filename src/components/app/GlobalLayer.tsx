"use client";

import { useEffect } from "react";
import { ItemPanel } from "@/components/item/ItemPanel";
import { applyTheme, STORAGE_KEY, undo, useStore } from "@/lib/store";
import { clearSelection, openDialog, setCommandOpen, toast } from "@/lib/ui";
import { isTypingTarget } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { Dialogs } from "./Dialogs";
import { Toaster } from "./Toaster";

function anyOverlayOpen(): boolean {
  return !!document.querySelector("[data-radix-popper-content-wrapper], [role='dialog'], [role='menu']");
}

/** App-wide behavior and overlays: theme, cross-tab sync, shortcuts, item card, dialogs, toasts. */
export function GlobalLayer() {
  useEffect(() => {
    applyTheme(useStore.getState().preferences.theme);
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.preferences.theme !== prev.preferences.theme) applyTheme(state.preferences.theme);
    });
    // Persist the seeded workspace right away so its ids and dates stay stable.
    if (!localStorage.getItem(STORAGE_KEY)) useStore.setState({});

    // Another tab saved changes: pick them up.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) void useStore.persist.rehydrate();
    };
    const onStorageError = () =>
      toast("Couldn't save your changes — browser storage is full. Export a backup from your profile menu.", {
        kind: "error",
        duration: 8000,
      });
    window.addEventListener("storage", onStorage);
    window.addEventListener("monday:storage-error", onStorageError);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("monday:storage-error", onStorageError);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (mod && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (undo()) toast("Undone", { kind: "info", duration: 2000 });
        return;
      }
      if (event.key === "?" && !mod) {
        openDialog("shortcuts");
        return;
      }
      if (event.key === "Escape" && !anyOverlayOpen()) clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <ItemPanel />
      <CommandPalette />
      <Dialogs />
      <Toaster />
    </>
  );
}
