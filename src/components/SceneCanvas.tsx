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

export default function SceneCanvas(props: SceneCanvasProps) {
  // ── State ─────────────────────────────────────────────────────
  const [shapes, setShapes] = createSignal<Shape[]>([]);
  const [startPoint, setStartPoint] = createSignal<Point | null>(null);
  const [previewShape, setPreviewShape] = createSignal<Shape | null>(null);
  const [polygonPoints, setPolygonPoints] = createSignal<Point[]>([]);
  const [selectedIndices, setSelectedIndices] = createSignal<Set<number>>(
    new Set()
  );

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;

  // ── Core Draw ──────────────────────────────────────────────────
  function drawScene(ctx: CanvasRenderingContext2D) {
    drawGrid(ctx, props.gridSize);
    shapes().forEach((s) => drawShape(ctx, s, "final", props.gridSize));
    if (previewShape()) {
      drawShape(ctx, previewShape()!, "preview", props.gridSize);
    }
    drawBoundingBox(ctx, shapes(), selectedIndices());
  }

  // re-draw when shapes or previewShape change
  createEffect(() => {
    shapes();
    previewShape();
    if (ctx) drawScene(ctx);
  });

  // ── Lifecycle: Firestore & Keyboard ──────────────────────────
  onMount(() => {
    // subscribe to your scene's shapes
    const unsubscribe = subscribeToShapesInScene(props.sceneId, setShapes);

    // delete via Backspace/Delete
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIndices().size > 0
      ) {
        const count = selectedIndices().size;
        if (window.confirm(`Delete ${count} selected shape(s)?`)) {
          const toDelete = Array.from(selectedIndices()).map(
            (i) => shapes()[i]
          );
          deleteShapesFromScene(props.sceneId, toDelete);
          setSelectedIndices(new Set<number>());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      unsubscribe();
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  // ── Hook: Auto‐resize canvas & HiDPI ─────────────────────────
  useCanvasSize(
    () => canvas,
    () => ctx,
    () => drawScene(ctx)
  );

  // ── Pointer Handlers ─────────────────────────────────────────
  function getPointerPosition(e: PointerEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: PointerEvent) {
    const pt = getPointerPosition(e);

    // SELECT tool toggles selection
    if (props.selectedTool === "select") {
      const idx = shapes().findIndex((s) => isPointInShape(s, pt));
      const sel = new Set(selectedIndices());
      if (idx >= 0) {
        sel.has(idx) ? sel.delete(idx) : sel.add(idx);
      } else {
        sel.clear();
      }
      setSelectedIndices(sel);
      return;
    }

    // POLYGON: add vertex
    if (props.selectedTool === "polygon") {
      setPolygonPoints((prev) => [...prev, pt]);
      setPreviewShape({ type: "polygon", points: [...polygonPoints(), pt] });
      return;
    }

    // other tools: mark start
    setStartPoint(pt);
  }

  function handlePointerMove(e: PointerEvent) {
    const current = getPointerPosition(e);
    const start = startPoint();
    if (!start && props.selectedTool !== "polygon") return;

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
        shape = {
          type: "circle",
          cx: start!.x,
          cy: start!.y,
          rx: Math.hypot(dx, dy),
          ry: Math.hypot(dx, dy),
        };
        break;
      case "cone":
        const dx2 = current.x - start!.x,
          dy2 = current.y - start!.y;
        const len = Math.hypot(dx2, dy2),
          ang = Math.atan2(dy2, dx2),
          spread = Math.PI / 6;
        // IMPORTANT: use `start`, not `start()`
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

    // SELECT: maybe clicked the trash icon… (reuse your computeBounds logic)
    if (props.selectedTool === "select") {
      // …omitted for brevity…
      return;
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
      await saveShapeToScene(props.sceneId, previewShape()!);
    }

    setStartPoint(null);
    if (props.selectedTool !== "polygon") setPreviewShape(null);
  }

  // ── Hook: attach pointer events ─────────────────────────────
  usePointerEvents(() => canvas, {
    down: handlePointerDown,
    move: handlePointerMove,
    up: handlePointerUp,
  });

  // ── Render ───────────────────────────────────────────────────
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
