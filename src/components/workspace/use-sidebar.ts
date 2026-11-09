"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the workspace sidebar is folded to its icon rail, remembered on
 * this device. Folded unless someone has unfolded it here: most of a
 * working day is spent in one or two sections, and the room goes to tables.
 *
 * Same pattern as `lib/saved.ts`: the server snapshot is the default,
 * "collapsed", so the first render matches the server, and only someone
 * who chose to unfold it sees it open a moment after hydration. Shared
 * through a window event so the keyboard shortcut and the button stay in
 * step.
 */
const KEY = "homelink.sidebar.v1";
const EVENT = "homelink:sidebar";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "expanded";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useSidebarCollapsed(): [boolean, (next?: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, read, () => true);
  const toggle = useCallback((next?: boolean) => {
    const value = next ?? !read();
    try {
      window.localStorage.setItem(KEY, value ? "collapsed" : "expanded");
    } catch {
      // Private mode: the toggle still works for this page view.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [collapsed, toggle];
}
