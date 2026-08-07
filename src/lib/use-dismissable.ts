"use client";

import { useEffect, type RefObject } from "react";

/**
 * Close on Escape or a click outside.
 *
 * Escape is bound on keydown at the document so it works wherever focus
 * currently is, and the outside click uses `pointerdown` rather than `click`
 * so a press that starts outside dismisses immediately instead of waiting for
 * mouseup — which is what makes a popover feel responsive rather than sticky.
 */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) onDismiss();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, open, onDismiss]);
}
