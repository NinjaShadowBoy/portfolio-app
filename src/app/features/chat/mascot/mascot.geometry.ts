/**
 * Pure geometry helpers for the chat mascot: where the pupil sits as it looks
 * at the pointer, where the mascot can stand while walking the screen edges,
 * and how to keep clear of the toast stack. No DOM access; the mascot
 * component maps the returned positions to CSS pixels.
 */

export interface Point {
  x: number;
  y: number;
}

/** An area a pupil may travel through, in CSS pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type MascotEdge = 'bottom' | 'left' | 'right';

export interface EdgePosition extends Point {
  edge: MascotEdge;
}

/** Inset in px between the mascot and the viewport edge it stands on. */
export const EDGE_INSET = 0;
/** The header owns the top of the viewport; the mascot never walks there. */
export const HEADER_RESERVE = 96;
/** The reserved toast corner (bottom-right) size, px. */
export const TOAST_ZONE_WIDTH = 452;
export const TOAST_ZONE_HEIGHT = 344;
/** Pointer distance (px) from the mascot at which it ducks instead of watching. */
export const DUCK_PROXIMITY = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The offset of a pupil inside `box` (the area it may move through) toward
 * `pointer`. A distant pointer pushes the pupil to the box border; the offset
 * is at most `maxOffset` long, so the pupil always stays inside the eye.
 */
export function pupilOffset(box: Box, pointer: Point, maxOffset: number): Point {
  if (box.width <= 0 || box.height <= 0 || maxOffset <= 0) return { x: 0, y: 0 };
  const dx = pointer.x - (box.x + box.width / 2);
  const dy = pointer.y - (box.y + box.height / 2);
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, y: 0 };

  // The pupil moves along the pointer direction and grows with the distance
  // until it saturates at `maxOffset`, itself bounded by the eye box, so the
  // offset stays inside the eye whatever the pointer does.
  const max = Math.min(maxOffset, Math.min(box.width, box.height) / 2);
  const magnitude = Math.min(distance, max);
  return { x: (dx / distance) * magnitude, y: (dy / distance) * magnitude };
}

/** The advance along the perimeter (px) that the parameter `t` in [0, 1) maps to. */
export function walkableLength(viewport: Size, size: Size): number {
  const walkBottom = Math.max(0, viewport.width - EDGE_INSET * 2 - size.width);
  const walkSide = Math.max(0, viewport.height - EDGE_INSET * 2 - size.height - HEADER_RESERVE);
  return walkBottom + walkSide * 2;
}

/**
 * Maps a perimeter parameter `t` (0..1) to a position on an edge. The walk
 * covers the bottom edge (left to right), then the right edge (upward), then
 * the left edge (back down) — the top edge is never returned, the header
 * lives there, and the position is clamped below `HEADER_RESERVE`.
 */
export function edgePosition(t: number, viewport: Size, size: Size): EdgePosition {
  const left = EDGE_INSET;
  const right = Math.max(left, viewport.width - EDGE_INSET - size.width);
  const bottom = Math.max(0, viewport.height - EDGE_INSET - size.height);
  const walkBottom = Math.max(0, right - left);
  const walkSide = Math.max(0, bottom - HEADER_RESERVE);
  const total = walkBottom + walkSide * 2;

  const u = clamp(t, 0, 1) * total;
  if (u < walkBottom) return { x: left + u, y: bottom, edge: 'bottom' };

  const v = u - walkBottom;
  if (v < walkSide) return { x: right, y: Math.max(HEADER_RESERVE, bottom - v), edge: 'right' };

  const w = v - walkSide;
  return { x: left, y: Math.min(bottom, bottom - walkSide + w), edge: 'left' };
}

/** A named landmark of the walk; extend it when a caller needs another corner. */
export type EdgeAnchor = 'bottomRight';

/** The `t` value at which edgePosition stands on an anchor point. */
export function edgeParam(anchor: EdgeAnchor, viewport: Size, size: Size): number {
  switch (anchor) {
    case 'bottomRight': {
      const right = Math.max(EDGE_INSET, viewport.width - EDGE_INSET - size.width);
      const walkBottom = Math.max(0, right - EDGE_INSET);
      const bottom = Math.max(0, viewport.height - EDGE_INSET - size.height);
      const walkSide = Math.max(0, bottom - HEADER_RESERVE);
      return walkBottom / (walkBottom + walkSide * 2);
    }
  }
}

/**
 * The `t` of the walkable spot nearest to `point` (the mascot's top-left
 * corner, for example where a drag let go). The inverse of edgePosition.
 */
export function nearestEdgeParam(point: Point, viewport: Size, size: Size): number {
  const left = EDGE_INSET;
  const right = Math.max(left, viewport.width - EDGE_INSET - size.width);
  const bottom = Math.max(0, viewport.height - EDGE_INSET - size.height);
  const walkBottom = Math.max(0, right - left);
  const walkSide = Math.max(0, bottom - HEADER_RESERVE);
  const total = walkBottom + walkSide * 2;
  if (total === 0) return 0;

  const top = bottom - walkSide;
  const toBottom = Math.abs(bottom - point.y);
  const toRight = Math.abs(right - point.x);
  const toLeft = Math.abs(point.x - left);
  let u: number;
  if (toBottom <= toRight && toBottom <= toLeft) u = clamp(point.x, left, right) - left;
  // The right edge's top corner is where the left edge starts in edgePosition;
  // stop just short of it so a drop there stays on the right.
  else if (toRight <= toLeft) u = walkBottom + Math.min(bottom - clamp(point.y, top, bottom), walkSide - 0.01);
  else u = walkBottom + walkSide + (clamp(point.y, top, bottom) - top);
  return clamp(u / total, 0, 1);
}

interface Segment {
  start: number;
  end: number;
}

/**
 * The `t` range covered by the edge segment standing at `t`. A segment ends on
 * the corner it shares with the next edge; that corner is one point on both
 * edges, so a hop clamped to it never cuts across the screen.
 */
function segmentOf(t: number, viewport: Size, size: Size): Segment {
  const left = EDGE_INSET;
  const right = Math.max(left, viewport.width - EDGE_INSET - size.width);
  const bottom = Math.max(0, viewport.height - EDGE_INSET - size.height);
  const walkBottom = Math.max(0, right - left);
  const walkSide = Math.max(0, bottom - HEADER_RESERVE);
  const total = walkBottom + walkSide * 2;
  if (total === 0) return { start: 0, end: 0 };

  const u = clamp(t, 0, 1) * total;
  if (u < walkBottom) return { start: 0, end: walkBottom / total };
  if (u < walkBottom + walkSide) return { start: walkBottom / total, end: (walkBottom + walkSide) / total };
  return { start: (walkBottom + walkSide) / total, end: 1 };
}

/**
 * Pulls `target` back into the edge segment `current` already stands on, so a
 * hop travels along one edge and never cuts across the screen between edge
 * switches. Call it before animating toward `edgePosition(target, ...)`.
 */
export function hopTarget(current: number, target: number, viewport: Size, size: Size): number {
  const segment = segmentOf(current, viewport, size);
  return clamp(target, segment.start, segment.end);
}

/**
 * Moves a position out of the reserved toast corner (bottom-right) while
 * `hasToasts` is true: first out to the left of the zone, and when there
 * is no room left, up above it. Returns the position untouched otherwise.
 */
export function avoidToastCorner(
  position: EdgePosition,
  viewport: Size,
  size: Size,
  hasToasts: boolean,
): EdgePosition {
  if (!hasToasts) return position;
  const zoneX = viewport.width - TOAST_ZONE_WIDTH;
  const zoneY = viewport.height - TOAST_ZONE_HEIGHT;
  const inside =
    position.x + size.width > zoneX && position.x < viewport.width && position.y + size.height > zoneY;
  if (!inside) return position;

  const x = zoneX - size.width - EDGE_INSET;
  if (x >= EDGE_INSET) return { ...position, x };
  // Sides can be flush with the viewport corner; going up is the only way out.
  return { ...position, y: zoneY - size.height - EDGE_INSET };
}
