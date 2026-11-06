/** How much the owner uses a technology: 3 daily, 2 regularly, 1 occasionally. */
export type UsageLevel = 1 | 2 | 3;

export interface CloudEntry {
  name: string;
  level: UsageLevel;
}

export interface PlacedEntry extends CloudEntry {
  /** Top-left corner and diameter, as percentages of the cloud's width/height. */
  left: number;
  top: number;
  size: number;
  /** Seeded float timing so neighbours drift out of step. */
  floatDuration: number;
  floatDelay: number;
}

export interface CloudLayout {
  /** Natural size in px; the cloud scales down proportionally below this width. */
  width: number;
  height: number;
  entries: PlacedEntry[];
}

/** Logo diameter in px at natural size, per usage level. */
export const LEVEL_SIZE: Record<UsageLevel, number> = { 3: 80, 2: 48, 1: 28 };

const GAP = 5; // px between logo edges
const PADDING = 8; // px around the cloud, room for the hover scale
const STRETCH = 1.3; // horizontal stretch of the spiral, so clouds sit wider than tall
const STEP = 0.12; // radians per spiral step
const GROWTH = 1.1; // px of spiral radius gained per radian
const MAX_STEPS = 6000;

/** FNV-1a: a stable 32-bit hash, so a name always lands in the same place. */
export function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Places logos on an elliptical spiral, biggest first, each at the first point
 * that clears every logo already placed. The start angle of each spiral comes
 * from the name's hash, so the result is organic but identical on server and
 * client for the same input.
 */
export function layoutCloud(input: readonly CloudEntry[]): CloudLayout {
  const ordered = input
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.level - a.entry.level || a.index - b.index)
    .map(({ entry }) => entry);

  const placed: { entry: CloudEntry; x: number; y: number; r: number }[] = [];

  for (const entry of ordered) {
    const r = LEVEL_SIZE[entry.level] / 2;
    const start = ((hashName(entry.name) % 360) * Math.PI) / 180;
    let x = 0;
    let y = 0;
    for (let step = 0; step < MAX_STEPS; step++) {
      const t = step * STEP;
      x = GROWTH * t * Math.cos(start + t) * STRETCH;
      y = GROWTH * t * Math.sin(start + t);
      const clear = placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + GAP);
      if (clear) break;
    }
    placed.push({ entry, x, y, r });
  }

  if (placed.length === 0) return { width: 0, height: 0, entries: [] };

  const minX = Math.min(...placed.map((p) => p.x - p.r)) - PADDING;
  const maxX = Math.max(...placed.map((p) => p.x + p.r)) + PADDING;
  const minY = Math.min(...placed.map((p) => p.y - p.r)) - PADDING;
  const maxY = Math.max(...placed.map((p) => p.y + p.r)) + PADDING;
  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);

  // Back to input order so the DOM (and screen readers) follow the author's list.
  const byName = new Map(placed.map((p) => [p.entry, p]));
  const entries = input.map((entry) => {
    const p = byName.get(entry)!;
    const h = hashName(entry.name);
    return {
      ...entry,
      left: round(((p.x - p.r - minX) / width) * 100),
      top: round(((p.y - p.r - minY) / height) * 100),
      size: round(((p.r * 2) / width) * 100),
      floatDuration: round(5 + (h % 3000) / 1000),
      floatDelay: round(-((h >>> 12) % 5000) / 1000),
    };
  });

  return { width, height, entries };
}
