// src/hooks/useCanvasSize.ts

import { onMount, onCleanup } from "solid-js";

type CanvasGetter = () => HTMLCanvasElement;
type ContextGetter = () => CanvasRenderingContext2D;
type Redraw = () => void;

/**
 * Hook to keep a <canvas> sized to the window with high-DPI support
 */
export function useCanvasSize(
  getCanvas: CanvasGetter,
  getCtx: ContextGetter,
  redraw: Redraw
) {
  onMount(() => {
    const resize = () => {
      const canvas = getCanvas();
      const ctx = getCtx();
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth,
        h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    onCleanup(() => window.removeEventListener("resize", resize));
  });
}
