// src/lib/canvasDrawUtils.ts

import type { Point, Shape } from "../lib/firebase";
import { distance } from "./geometry";

/**
 * All direct CanvasRenderingContext2D drawing routines
 */

/**
 * Clears the entire canvas.
 *
 * @param ctx - The CanvasRenderingContext2D to clear.
 * @example
 * clearCanvas(ctx);
 */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Draws a grid on the canvas.
 *
 * @param ctx - The canvas rendering context.
 * @param gridSize - The spacing between grid lines in pixels. Default is 50.
 * @example
 * drawGrid(ctx, 50);
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  gridSize: number = 50
) {
  const { width, height } = ctx.canvas;
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/**
 * Draws an arrowhead at the end of a line from `from` to `to`.
 *
 * @param ctx - The canvas rendering context.
 * @param from - The starting point of the arrow.
 * @param to - The ending point of the arrow.
 * @param size - The size of the arrowhead. Default is 8.
 * @example
 * drawArrowhead(ctx, {x: 0, y: 0}, {x: 10, y: 10});
 */
export function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size = 8
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const a1 = angle + Math.PI / 6,
    a2 = angle - Math.PI / 6;
  const p1 = { x: to.x - size * Math.cos(a1), y: to.y - size * Math.sin(a1) };
  const p2 = { x: to.x - size * Math.cos(a2), y: to.y - size * Math.sin(a2) };
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

/**
 * Draws a distance label between two points.
 *
 * @param ctx - The canvas rendering context.
 * @param start - The starting point.
 * @param end - The ending point.
 * @param gridSize - Grid size used to calculate feet. Default is 50.
 * @example
 * drawDistanceLabel(ctx, {x: 0, y: 0}, {x: 100, y: 0});
 */
export function drawDistanceLabel(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  gridSize: number = 50
) {
  const distPx = distance(start, end);
  const feet = (distPx / gridSize) * 5;
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "grey";
  ctx.setLineDash([]);
  ctx.fillText(
    `${feet.toFixed(1)} ft`,
    (start.x + end.x) / 2 + 20, // Midpoint + Offset to avoid overlap
    (start.y + end.y) / 2 - 20  // Midpoint - Offset to avoid overlap
  );
}

/**
 * Draws a shape on the canvas based on its type.
 *
 * @param ctx - The canvas rendering context.
 * @param shape - The shape object to draw.
 * @param style - The rendering style: "preview" or "final".
 * @param gridSize - Optional grid size for scaling. Default is 50.
 * @returns void
 * @example
 * drawShape(ctx, { type: 'line', x: 0, y: 0, x2: 100, y2: 100 }, "preview", 50);
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  style: "preview" | "final",
  gridSize: number = 50
) {
  ctx.strokeStyle = style === "preview" ? "red" : "black";
  ctx.setLineDash(style === "preview" ? [5, 5] : []);
  ctx.lineWidth = 2;
  if (style === "final") ctx.fillStyle = "rgba(255,0,0,0.4)";

  switch (shape.type) {
    case "line":
    case "measure":
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      if (style === "preview")
        drawDistanceLabel(ctx, { x: shape.x, y: shape.y }, { x: shape.x2, y: shape.y2 }, gridSize);
      break;

    case "square":
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
      ctx.stroke();
      if (style === "final") ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      if (style === "preview") {
        const wPt = { x: shape.x + shape.w, y: shape.y };
        const hPt = { x: shape.x, y: shape.y + shape.h };
        drawDistanceLabel(ctx, { x: shape.x, y: shape.y }, wPt, gridSize);
        drawDistanceLabel(ctx, { x: shape.x, y: shape.y }, hPt, gridSize);
        ctx.strokeStyle = "grey";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
        ctx.stroke();
        drawArrowhead(ctx, { x: shape.x, y: shape.y }, { x: shape.x + shape.w, y: shape.y + shape.h });
      }
      break;

    case "circle":
      ctx.beginPath();
      ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.rx, 0, 0, 2 * Math.PI);
      ctx.stroke();
      if (style === "final") ctx.fill();
      if (style === "preview") {
        const right = { x: shape.cx + shape.rx, y: shape.cy };
        ctx.strokeStyle = "grey";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(shape.cx, shape.cy);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
        drawArrowhead(ctx, { x: shape.cx, y: shape.cy }, right);
        drawDistanceLabel(ctx, { x: shape.cx, y: shape.cy }, right, gridSize);
      }
      break;

    case "cone":
      ctx.beginPath();
      ctx.moveTo(shape.tip.x, shape.tip.y);
      ctx.lineTo(shape.baseLeft.x, shape.baseLeft.y);
      ctx.lineTo(shape.baseRight.x, shape.baseRight.y);
      ctx.closePath();
      ctx.stroke();
      if (style === "final") ctx.fill();
      if (style === "preview") {
        const mid = {
          x: (shape.baseLeft.x + shape.baseRight.x) / 2,
          y: (shape.baseLeft.y + shape.baseRight.y) / 2,
        };
        ctx.strokeStyle = "grey";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(shape.tip.x, shape.tip.y);
        ctx.lineTo(mid.x, mid.y);
        ctx.stroke();
        drawArrowhead(ctx, shape.tip, mid);
        drawDistanceLabel(ctx, shape.tip, mid, gridSize);
      }
      break;

    case "polygon":
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      shape.points.slice(1).forEach((pt, i) => {
        ctx.lineTo(pt.x, pt.y);
        if (style === "preview")
          drawDistanceLabel(ctx, shape.points[i], pt, gridSize);
      });
      ctx.stroke();
      if (style === "final") ctx.fill();
      break;

    case "note":
      ctx.fillStyle = "#111";
      ctx.font = "14px sans-serif";
      ctx.fillText(shape.text, shape.x, shape.y);
      break;
  }
}

/**
 * Draws a bounding box around selected shapes and a trash icon.
 *
 * @param ctx - The canvas rendering context.
 * @param shapes - The array of shapes to consider for the bounding box.
 * @param selectedIndices - A set of indices representing selected shapes.
 * @example
 * drawBoundingBox(ctx, shapes, new Set([0, 1, 2]));
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  selectedIndices: Set<number>
): void {
  const idxs = Array.from(selectedIndices);
  if (!idxs.length) return;
  const pts = idxs.flatMap((i) => {
    const s = shapes[i];
    switch (s.type) {
      case "line":
      case "measure":
        return [
          { x: (s as any).x, y: (s as any).y },
          { x: (s as any).x2, y: (s as any).y2 },
        ];
      case "square":
        return [
          { x: (s as any).x, y: (s as any).y },
          { x: (s as any).x + (s as any).w, y: (s as any).y + (s as any).h },
        ];
      case "circle":
        return [
          { x: (s as any).cx - (s as any).rx, y: (s as any).cy - (s as any).rx },
          { x: (s as any).cx + (s as any).rx, y: (s as any).cy + (s as any).rx },
        ];
      case "cone":
        return [(s as any).tip, (s as any).baseLeft, (s as any).baseRight];
      case "polygon":
        return (s as any).points;
      case "note":
        return [{ x: (s as any).x, y: (s as any).y }];
    }
  });
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y);
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    maxX = Math.max(...xs),
    maxY = Math.max(...ys);

  ctx.strokeStyle = "lightgrey";
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);
  ctx.setLineDash([]);

  // draw trash icon
  const size = 16,
    tx = maxX + 5,
    ty = maxY + 5;
  ctx.fillStyle = "grey";
  ctx.fillRect(tx, ty, size, size);
  ctx.fillStyle = "white";
  ctx.font = "14px sans-serif";
  ctx.fillText("🗑️", tx + 2, ty + 14);
}
