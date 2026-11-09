"use client";

import { useEffect } from "react";

/**
 * Opens a conversation at its newest message, as a chat does. Scrolls only
 * the transcript's own box: where the transcript is not a scrolling box
 * (the workspace inbox, which grows with the page) this does nothing, so it
 * never drags the whole page down.
 */
export function ScrollToEnd({ thread }: { thread: string }) {
  useEffect(() => {
    const box = document.getElementById("thread-end")?.parentElement;
    if (box && box.scrollHeight > box.clientHeight) box.scrollTop = box.scrollHeight;
  }, [thread]);
  return null;
}
