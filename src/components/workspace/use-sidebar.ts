"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the workspace sidebar is folded to its icon rail, remembered on
 * this device.
 *
 * Same pattern as `lib/saved.ts`: the server snapshot is "expanded", so the
 * first render matches the server and a folded sidebar folds a moment after
 * hydration instead of mismatching. Shared through a window event so the
 * keyboard shortcut and the button stay in step.
 */
const KEY = "homelink.sidebar.v1";
const EVENT = "homelink:sidebar";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "collapsed";
  } catch {
    return false;
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
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
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
