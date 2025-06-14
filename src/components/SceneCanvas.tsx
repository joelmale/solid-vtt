// src/components/SceneCanvas.tsx

import { createSignal, createEffect, onCleanup, onMount } from "solid-js";
import {
  saveShapeToScene,
  subscribeToShapesInScene,
  deleteShapesFromScene,
  Shape,
  Point,
} from "../lib/firebase";
import { Tool } from "../lib/types";
import styles from "./SceneCanvas.module.css";
import { distance, isPointInShape } from "../lib/geometry";
import {
  drawGrid,
  drawShape,
  drawBoundingBox,
} from "../lib/canvasDrawUtils";
import { useCanvasSize } from "../hooks/useCanvasSize";
import { usePointerEvents } from "../hooks/usePointerEvents";

interface SceneCanvasProps {
  sceneId: string;
  selectedTool: Tool | null;
  resetPolygon: () => void;
  gridSize?: number;
}

/**
 * SceneCanvas renders an interactive canvas where users can draw shapes
 * using various tools, including line, square, circle, polygon, etc.
 * It supports shape preview, selection, deletion, and Firebase sync.
 */
export default function SceneCanvas(props: SceneCanvasProps) {
  // ─ State ─────────────────────────────────────────────────────────
  const [shapes, setShapes] = createSignal<Shape[]>([]);
  const [startPoint, setStartPoint] = createSignal<Point | null>(null);
  const [previewShape, setPreviewShape] = createSignal<Shape | null>(null);
  const [polygonPoints, setPolygonPoints] = createSignal<Point[]>([]);
  const [selectedIndices, setSelectedIndices] = createSignal<Set<number>>(
    new Set()
  );
  const [boxStart, setBoxStart] = createSignal<Point | null>(null);
  const [boxEnd, setBoxEnd] = createSignal<Point | null>(null);

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;

  // ─ Compute bounding box of selected shapes ──────────────────────
  function computeBounds() {
    const idxs = Array.from(selectedIndices());
    if (!idxs.length) return null;
    const pts = idxs.flatMap((i) => {
      const s = shapes()[i];
      switch (s.type) {
        case "line":
        case "measure":
          return [
            { x: s.x, y: s.y },
            { x: s.x2, y: s.y2 },
          ];
        case "square":
          return [
            { x: s.x, y: s.y },
            { x: s.x + s.w, y: s.y + s.h },
          ];
        case "circle":
          return [
            { x: s.cx - s.rx, y: s.cy - s.rx },
            { x: s.cx + s.rx, y: s.cy + s.rx },
          ];
        case "cone":
          return [s.tip, s.baseLeft, s.baseRight];
        case "polygon":
          return s.points;
        case "note":
          return [{ x: s.x, y: s.y }];
      }
    });
    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }

    /**
     * Compute the axis-aligned bounding box for a single shape.
     */
    function computeShapeBounds(s: Shape): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    } {
    switch (s.type) {
        case "line":
        case "measure":
        return {
            minX: Math.min(s.x, s.x2),
            minY: Math.min(s.y, s.y2),
            maxX: Math.max(s.x, s.x2),
            maxY: Math.max(s.y, s.y2),
        };
        case "square":
        return {
            minX: Math.min(s.x, s.x + s.w),
            minY: Math.min(s.y, s.y + s.h),
            maxX: Math.max(s.x, s.x + s.w),
            maxY: Math.max(s.y, s.y + s.h),
        };
        case "circle":
        return {
            minX: s.cx - s.rx,
            minY: s.cy - s.ry,
            maxX: s.cx + s.rx,
            maxY: s.cy + s.ry,
        };
        case "cone":
        // tip, baseLeft, baseRight
        const xs = [s.tip.x, s.baseLeft.x, s.baseRight.x];
        const ys = [s.tip.y, s.baseLeft.y, s.baseRight.y];
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
        case "polygon":
        const px = s.points.map((p) => p.x);
        const py = s.points.map((p) => p.y);
        return {
            minX: Math.min(...px),
            minY: Math.min(...py),
            maxX: Math.max(...px),
            maxY: Math.max(...py),
        };
        case "note":
        return {
            minX: s.x,
            minY: s.y,
            maxX: s.x,
            maxY: s.y,
        };
    }
    }

  // ─ Draw everything ──────────────────────────────────────────────
  function drawScene(ctx: CanvasRenderingContext2D) {
    // 1) Clear everything
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 2) If we’re in Select mode **and** have a marquee active, draw its preview
    if (
        props.selectedTool === "select" &&
        boxStart() !== null &&
        boxEnd()   !== null
    ) {
        const s = boxStart()!, e = boxEnd()!;
        // normalize coords
        const x = Math.min(s.x, e.x),
            y = Math.min(s.y, e.y),
            w = Math.abs(e.x - s.x),
            h = Math.abs(e.y - s.y);

        ctx.save();
        ctx.strokeStyle = "lightgrey";
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    // 3) Now draw the grid, final shapes, preview-shapes, bounding box, etc.
    drawGrid(ctx, props.gridSize);
    shapes().forEach((s) => drawShape(ctx, s, "final", props.gridSize)); // draw all final shapes
    if (previewShape()) drawShape(ctx, previewShape()!, "preview", props.gridSize); // draw preview shape if any
    drawBoundingBox(ctx, shapes(), selectedIndices());
    }

  createEffect(() => {
    shapes(); // subscribe
    previewShape();
    if (ctx) drawScene(ctx);
  });

  // ─ Firestore subscription + keyboard delete ─────────────────────
  onMount(() => {
    const unsubscribe = subscribeToShapesInScene(
      props.sceneId,
      setShapes
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIndices().size > 0
      ) {
        // immediate deletion, no confirm
        const toDelete = Array.from(selectedIndices()).map(
          (i) => shapes()[i]
        );
        deleteShapesFromScene(props.sceneId, toDelete);
        setSelectedIndices(new Set<number>());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      unsubscribe();
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  // ─ Fullscreen + HiDPI hook ─────────────────────────────────────
  useCanvasSize(
    () => canvas,
    () => ctx,
    () => drawScene(ctx)
  );

  // ─ Pointer handlers ────────────────────────────────────────────
  function getPointerPosition(e: PointerEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: PointerEvent) {
    const pt = getPointerPosition(e);

    if (props.selectedTool === "select") {
        // start marquee selection
      if (e.shiftKey) {
        setBoxStart(pt);
        setBoxEnd(pt);
        return;
      }
      // toggle selection
      const idx = shapes().findIndex((s) => isPointInShape(s, pt));
      const sel = new Set(selectedIndices());
      if (idx >= 0) sel.has(idx) ? sel.delete(idx) : sel.add(idx);
      else sel.clear();
      setSelectedIndices(sel);
      return;
    }

    if (props.selectedTool === "polygon") {
      setPolygonPoints((prev) => [...prev, pt]);
      setPreviewShape({
        type: "polygon",
        points: [...polygonPoints(), pt],
      });
      return;
    }

    setStartPoint(pt);
  }

  function handlePointerMove(e: PointerEvent) {
    const current = getPointerPosition(e);
    const start = startPoint();

    if (props.selectedTool === "select" && boxStart()) {
      // update marquee
      setBoxEnd(current);
      return;
    } // marquee selection
    if (!start && props.selectedTool !== "polygon") return; // no start point yet
    let shape: Shape | null = null;
    switch (props.selectedTool) {
        case "line":
        case "measure":
            shape = {
            type: "line",
            x: start!.x,
            y: start!.y,
            x2: current.x,
            y2: current.y,
            };
            break;
        case "square":
            shape = {
            type: "square",
            x: start!.x,
            y: start!.y,
            w: current.x - start!.x,
            h: current.y - start!.y,
            };
            break;
        case "circle":
            const dx = current.x - start!.x,
            dy = current.y - start!.y;
            const r = Math.hypot(dx, dy);
            shape = { type: "circle", cx: start!.x, cy: start!.y, rx: r, ry: r };
            break;
        case "cone":
            const dx2 = current.x - start!.x,
            dy2 = current.y - start!.y;
            const len = Math.hypot(dx2, dy2),
            ang = Math.atan2(dy2, dx2),
            spread = Math.PI / 6;
            shape = {
            type: "cone",
            tip: start!,
            baseLeft: {
                x: start!.x + len * Math.cos(ang - spread),
                y: start!.y + len * Math.sin(ang - spread),
            },
            baseRight: {
                x: start!.x + len * Math.cos(ang + spread),
                y: start!.y + len * Math.sin(ang + spread),
            },
            };
            break;
        case "polygon":
            shape = { type: "polygon", points: [...polygonPoints(), current] };
            break;
    }
    setPreviewShape(shape);
  }

  async function handlePointerUp(e: PointerEvent) {
    const end = getPointerPosition(e);

    // ─── SELECT MODE ───────────────────────────────────────────
    if (props.selectedTool === "select") {
      const s = boxStart();
      const f = boxEnd();

    // 1) MARQUEE DRAG
    if (s && f) {
      // normalize
      const x1 = Math.min(s.x, f.x),
            y1 = Math.min(s.y, f.y),
            x2 = Math.max(s.x, f.x),
            y2 = Math.max(s.y, f.y);

      // select any shape fully inside marquee
      const newSel = new Set<number>();
      shapes().forEach((shape, i) => {
        const { minX, minY, maxX, maxY } = computeShapeBounds(shape);
        if (minX >= x1 && maxX <= x2 && minY >= y1 && maxY <= y2) {
          newSel.add(i);
        }
      });
      setSelectedIndices(newSel);

      // clear marquee
      setBoxStart(null);
      setBoxEnd(null);
    }

    // 2) NO MARQUEE → maybe clicked trash icon?
    else {
      const bounds = computeBounds();        // bounding box of current selection
      // check trash‐icon area (16×16 at maxX+5, maxY+5)
      if (
        bounds &&
        end.x >= bounds.maxX + 5 &&
        end.x <= bounds.maxX + 5 + 16 &&
        end.y >= bounds.maxY + 5 &&
        end.y <= bounds.maxY + 5 + 16 &&
        selectedIndices().size > 0
      ) {
        const count = selectedIndices().size;
        if (window.confirm(`Delete ${count} selected shape(s)?`)) {
          const toDelete = Array.from(selectedIndices()).map((i) => shapes()[i]);
          await deleteShapesFromScene(props.sceneId, toDelete);
          setSelectedIndices(new Set<number>());
        }
      }
      // 3) NOTHING ELSE → clicked empty space, clear selection
      else {
        const clickedIdx = shapes().findIndex((s) => isPointInShape(s, end));
        if (clickedIdx === -1) {
            setSelectedIndices(new Set<number>());
        }
      }
    }

    return; // done with select‐mode
    }

    if (props.selectedTool === "note") {
      const note: Shape = {
        type: "note",
        x: end.x,
        y: end.y,
        text: "Hello world",
      };
      await saveShapeToScene(props.sceneId, note);
    } else if (props.selectedTool === "polygon") {
      if (polygonPoints().length > 2) {
        const first = polygonPoints()[0];
        if (distance(end, first) < 10) {
          await saveShapeToScene(props.sceneId, {
            type: "polygon",
            points: polygonPoints(),
          });
          setPolygonPoints([]);
          setPreviewShape(null);
          props.resetPolygon();
          return;
        }
      }
    } else if (previewShape()) {
        if (props.selectedTool === "measure") {
          setPreviewShape(null);
          setStartPoint(null);
          return; // Don't save measure shapes
        }

        // save the shape to the scene
        await saveShapeToScene(props.sceneId, previewShape()!);
    }

    setStartPoint(null);
    if (props.selectedTool !== "polygon") setPreviewShape(null);
  }

  // ─ Hook up pointer events ─────────────────────────────────────
  usePointerEvents(() => canvas, {
    down: handlePointerDown,
    move: handlePointerMove,
    up: handlePointerUp,
  });

  // ─ Render ─────────────────────────────────────────────────────
  return (
    <canvas
      ref={(el) => {
        canvas = el!;
        ctx = el!.getContext("2d")!;
      }}
      class={styles.sceneCanvas}
    />
  );
}
