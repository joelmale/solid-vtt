// src/hooks/usePointerEvents.ts

import { onMount, onCleanup } from "solid-js";

type Handler = (e: PointerEvent) => void;

/**
 * Hook to attach pointer event handlers to any element.
 * This hook allows you to easily attach pointer event handlers to any HTML element.
 * You can specify handlers for pointer down, move, and up events, and it will automatically
 * clean up the event listeners when the component is unmounted.
 */
export function usePointerEvents(
  getEl: () => HTMLElement,
  handlers: {
    down?: Handler;
    move?: Handler;
    up?: Handler;
  }
) {
  onMount(() => {
    const el = getEl();
    if (handlers.down) el.addEventListener("pointerdown", handlers.down);
    if (handlers.move) el.addEventListener("pointermove", handlers.move);
    if (handlers.up) el.addEventListener("pointerup", handlers.up);
    onCleanup(() => {
      if (handlers.down) el.removeEventListener("pointerdown", handlers.down);
      if (handlers.move) el.removeEventListener("pointermove", handlers.move);
      if (handlers.up) el.removeEventListener("pointerup", handlers.up);
    });
  });
}
