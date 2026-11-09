/** Pure helpers behind the reorder UIs (data table rows, reorder grid tiles). */

/** Returns a copy with the item at `from` moved to index `to` (clamped to the list). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || from >= result.length) return result;
  const target = Math.min(Math.max(to, 0), result.length - 1);
  const [item] = result.splice(from, 1);
  result.splice(target, 0, item);
  return result;
}

/**
 * Final index of a dragged row dropped on the upper or lower half of the row at `over`.
 * `from` is the dragged row's index before the move.
 */
export function dropIndex(from: number, over: number, placeAfter: boolean): number {
  const insertAt = over + (placeAfter ? 1 : 0);
  return insertAt > from ? insertAt - 1 : insertAt;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The part of `DOMRect` the grid helpers read. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Index of the box whose centre is closest to `point`, or -1 when there are none. Ties go to the first. */
export function nearestIndex(point: Point, boxes: readonly Box[]): number {
  let best = -1;
  let bestDistance = Infinity;
  boxes.forEach((box, index) => {
    const dx = box.left + box.width / 2 - point.x;
    const dy = box.top + box.height / 2 - point.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * Number of columns in a grid laid out in reading order: the boxes that sit on
 * the first row (same top, within `tolerance` pixels). At least 1.
 */
export function columnCount(boxes: readonly Box[], tolerance = 2): number {
  if (boxes.length === 0) return 1;
  const firstTop = boxes[0].top;
  const index = boxes.findIndex((box) => Math.abs(box.top - firstTop) > tolerance);
  return index === -1 ? boxes.length : Math.max(index, 1);
}

/**
 * Index one row up (`-1`) or down (`1`) from `index` in a grid of `columns`
 * columns and `total` items. Moving down from the row above a shorter last row
 * lands on the last item. Returns `index` when there is no row in that direction.
 */
export function rowStep(index: number, direction: -1 | 1, columns: number, total: number): number {
  const target = index + direction * Math.max(columns, 1);
  if (direction < 0) return target < 0 ? index : target;
  if (target < total) return target;
  // A shorter last row: only step when there is a row below.
  const lastRowStart = total - 1 - ((total - 1) % Math.max(columns, 1));
  return index < lastRowStart ? total - 1 : index;
}
