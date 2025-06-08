// src/lib/geometry.ts

import type { Shape, Point } from "./firebase";

/**
 * Pure geometry & hit-test utilities
 */

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function isPointNearLine(
  p: Point,
  a: Point,
  b: Point,
  tol = 5
): boolean {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return distance(p, a) < tol;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2
    )
  );
  const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return distance(p, proj) < tol;
}

export function isPointInTriangle(
  p: Point,
  a: Point,
  b: Point,
  c: Point
): boolean {
  const area = (u: Point, v: Point, w: Point) =>
    Math.abs((u.x * (v.y - w.y) + v.x * (w.y - u.y) + w.x * (u.y - v.y)) / 2);
  const A = area(a, b, c);
  return (
    Math.abs(
      A - (area(p, a, b) + area(p, b, c) + area(p, c, a))
    ) < 0.1
  );
}

export function isPointInPolygon(p: Point, pts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x,
      yi = pts[i].y;
    const xj = pts[j].x,
      yj = pts[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInShape(shape: Shape, p: Point): boolean {
  switch (shape.type) {
    case "line":
    case "measure":
      return isPointNearLine(p, { x: shape.x, y: shape.y }, { x: shape.x2, y: shape.y2 });
    case "square": {
      const x1 = Math.min(shape.x, shape.x + shape.w),
        x2 = Math.max(shape.x, shape.x + shape.w),
        y1 = Math.min(shape.y, shape.y + shape.h),
        y2 = Math.max(shape.y, shape.y + shape.h);
      return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
    }
    case "circle":
      return distance(p, { x: shape.cx, y: shape.cy }) <= shape.rx;
    case "cone":
      return isPointInTriangle(p, shape.tip, shape.baseLeft, shape.baseRight);
    case "polygon":
      return isPointInPolygon(p, shape.points);
    case "note":
      return distance(p, { x: shape.x, y: shape.y }) < 10;
  }
}
