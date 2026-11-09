/**
 * Soft-body physics for the mascot's square body. The outline is a ring of
 * points, each held to its rest spot by a spring and coupled to its
 * neighbours, so a push travels around the body like a wave in jelly. The
 * bottom row sticks to the surface the mascot stands on.
 *
 * Units are the SVG user units of the mascot's 100-unit view box, in the
 * body's own frame: y points down and the ground is below the body. No DOM.
 */

export interface Vec {
  x: number;
  y: number;
}

/** The body's rest square in the view box. The template draws the same numbers. */
export const BODY = { x: 21, y: 40, size: 58 } as const;

/** Points per side: 4 segments, so 16 points around the outline. */
const SEGMENTS = 4;

/**
 * Spring constants (1/s²). sqrt(K) is the wobble's angular frequency, about
 * 3 Hz for the top; the damping lets it ring a few times, like set jelly.
 */
const K_REST = 420;
const K_NEIGHBOUR = 260;
const DAMPING = 9;
/** Top points are softer than those near the ground, so the top sways most. */
const TOP_SOFTNESS = 0.5;
/** How far the sides bulge when the body is squashed (volume kept roughly). */
const BULGE = 0.4;
/** No point strays further than this from its rest spot (units). */
const MAX_OFFSET = 14;
const MAX_STEP = 1 / 120;
/**
 * Playback speed of the wobble. The simulation runs this much faster than
 * real time, so the jelly moves quicker without changing how far it bends.
 */
export const JELLY_SPEED = 1.6;
const REST_EPSILON = 0.02;

export interface JellyPoint {
  rest: Vec;
  pos: Vec;
  vel: Vec;
  /** 0 at the top of the body, 1 at the ground. */
  height: number;
  ground: boolean;
}

export interface Jelly {
  points: JellyPoint[];
  /** False in the air: the bottom row moves too. */
  grounded: boolean;
}

export function createJelly(): Jelly {
  const { x, y, size } = BODY;
  const step = size / SEGMENTS;
  const rest: Vec[] = [];
  for (let i = 0; i < SEGMENTS; i++) rest.push({ x: x + i * step, y }); // top, left to right
  for (let i = 0; i < SEGMENTS; i++) rest.push({ x: x + size, y: y + i * step }); // right, downwards
  for (let i = 0; i < SEGMENTS; i++) rest.push({ x: x + size - i * step, y: y + size }); // bottom, right to left
  for (let i = 0; i < SEGMENTS; i++) rest.push({ x, y: y + size - i * step }); // left, upwards
  return {
    grounded: true,
    points: rest.map((r) => {
      const height = (r.y - y) / size;
      return { rest: r, pos: { ...r }, vel: { x: 0, y: 0 }, height, ground: height === 1 };
    }),
  };
}

function pinned(j: Jelly, p: JellyPoint): boolean {
  return j.grounded && p.ground;
}

/**
 * Advances the body by `dt` seconds. `force` is the pseudo-acceleration every
 * point feels in the body frame (units/s²), usually minus the body's own
 * acceleration: when the body lurches right, the jelly lags left.
 */
export function stepJelly(j: Jelly, dt: number, force: Vec): void {
  let remaining = Math.min(dt, 0.05) * JELLY_SPEED; // a long frame (tab switch) never explodes the springs
  while (remaining > 1e-6) {
    const h = Math.min(remaining, MAX_STEP);
    remaining -= h;
    substep(j, h, force);
  }
}

function substep(j: Jelly, h: number, force: Vec): void {
  const pts = j.points;
  const n = pts.length;
  const { x: bx, y: by, size } = BODY;
  const cx = bx + size / 2;

  // Squash: the top's mean height against the rest height. A shorter body
  // pushes its sides out, as jelly keeps its volume.
  let top = 0;
  for (let i = 0; i < SEGMENTS; i++) top += pts[i].pos.y;
  top /= SEGMENTS;
  let bottom = 0;
  for (let i = 2 * SEGMENTS; i < 3 * SEGMENTS; i++) bottom += pts[i].pos.y;
  bottom /= SEGMENTS;
  const ratio = Math.max(0.5, Math.min(1.6, (bottom - top) / size));
  const widen = 1 + (1 / ratio - 1) * BULGE;

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (pinned(j, p)) {
      p.pos.x = p.rest.x;
      p.pos.y = p.rest.y;
      p.vel.x = 0;
      p.vel.y = 0;
      continue;
    }
    // Rest target, widened by the squash; the bulge peaks at mid-height.
    const bulge = 1 + (widen - 1) * Math.sin(Math.PI * Math.min(1, p.height * 0.9 + 0.1));
    const tx = cx + (p.rest.x - cx) * bulge;
    const ty = p.rest.y;
    const k = K_REST * (TOP_SOFTNESS + (1 - TOP_SOFTNESS) * p.height);

    // Neighbour coupling keeps the outline's local shape: the point is pulled
    // so its offset from the mean of its neighbours matches the rest offset.
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const lx = (a.pos.x + b.pos.x) / 2 - p.pos.x - ((a.rest.x + b.rest.x) / 2 - p.rest.x);
    const ly = (a.pos.y + b.pos.y) / 2 - p.pos.y - ((a.rest.y + b.rest.y) / 2 - p.rest.y);

    const ax = k * (tx - p.pos.x) + K_NEIGHBOUR * lx + force.x - DAMPING * p.vel.x;
    const ay = k * (ty - p.pos.y) + K_NEIGHBOUR * ly + force.y - DAMPING * p.vel.y;
    p.vel.x += ax * h;
    p.vel.y += ay * h;
  }

  for (const p of pts) {
    if (pinned(j, p)) continue;
    p.pos.x += p.vel.x * h;
    p.pos.y += p.vel.y * h;
    // Never fold through the ground or stretch apart.
    if (j.grounded && p.pos.y > by + size) {
      p.pos.y = by + size;
      if (p.vel.y > 0) p.vel.y *= -0.3;
    }
    const dx = p.pos.x - p.rest.x;
    const dy = p.pos.y - p.rest.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_OFFSET) {
      p.pos.x = p.rest.x + (dx / d) * MAX_OFFSET;
      p.pos.y = p.rest.y + (dy / d) * MAX_OFFSET;
    }
  }
}

/**
 * Adds velocity (units/s) to the body, weighted by height so the top moves
 * most: a landing is `{ x: 0, y: +v }`, a hop's take-off `{ x: 0, y: -v }`.
 */
export function shove(j: Jelly, v: Vec): void {
  for (const p of j.points) {
    if (pinned(j, p)) continue;
    const w = 1 - p.height * 0.75;
    p.vel.x += v.x * w;
    p.vel.y += v.y * w;
  }
}

/** A finger poke at `at`: the nearby outline dents inwards, then springs back. */
export function poke(j: Jelly, at: Vec, strength: number): void {
  const { x, y, size } = BODY;
  const c = { x: x + size / 2, y: y + size / 2 };
  for (const p of j.points) {
    if (pinned(j, p)) continue;
    const d = Math.hypot(p.pos.x - at.x, p.pos.y - at.y);
    const w = Math.exp(-(d * d) / (2 * 22 * 22));
    const nx = c.x - p.pos.x;
    const ny = c.y - p.pos.y;
    const len = Math.hypot(nx, ny) || 1;
    p.vel.x += (nx / len) * strength * w;
    p.vel.y += (ny / len) * strength * w;
  }
}

/** True once every point is back at rest; the caller can stop its loop. */
export function jellySettled(j: Jelly): boolean {
  for (const p of j.points) {
    if (
      Math.abs(p.pos.x - p.rest.x) > REST_EPSILON ||
      Math.abs(p.pos.y - p.rest.y) > REST_EPSILON ||
      Math.abs(p.vel.x) > REST_EPSILON * 10 ||
      Math.abs(p.vel.y) > REST_EPSILON * 10
    ) {
      return false;
    }
  }
  return true;
}

/** Puts every point back at rest, at once. */
export function resetJelly(j: Jelly): void {
  for (const p of j.points) {
    p.pos.x = p.rest.x;
    p.pos.y = p.rest.y;
    p.vel.x = 0;
    p.vel.y = 0;
  }
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * The outline as an SVG path. Each side is a smooth curve through its points,
 * and the sides meet at sharp corners, so the square bulges but never rounds.
 */
export function jellyPath(j: Jelly): string {
  const pts = j.points;
  const n = pts.length;
  let d = `M${f(pts[0].pos.x)} ${f(pts[0].pos.y)}`;
  for (let side = 0; side < 4; side++) {
    const s: Vec[] = [];
    for (let i = 0; i <= SEGMENTS; i++) s.push(pts[(side * SEGMENTS + i) % n].pos);
    for (let i = 0; i < SEGMENTS; i++) {
      const p0 = s[Math.max(0, i - 1)];
      const p1 = s[i];
      const p2 = s[i + 1];
      const p3 = s[Math.min(SEGMENTS, i + 2)];
      // Catmull-Rom to cubic Bézier.
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
    }
  }
  return d + 'Z';
}

/**
 * An affine transform that carries a feature drawn at rest height `restY`
 * (the eyes, the headband) along with the deformed body: it follows the
 * outline's spread and lean, and the movement of the body at that height.
 */
export function featureTransform(j: Jelly, restY: number): string {
  const pts = j.points;
  const { x, y, size } = BODY;
  const mean = (from: number, to: number): Vec => {
    let sx = 0;
    let sy = 0;
    for (let i = from; i <= to; i++) {
      const p = pts[i % pts.length].pos;
      sx += p.x;
      sy += p.y;
    }
    const count = to - from + 1;
    return { x: sx / count, y: sy / count };
  };
  const top = mean(0, SEGMENTS); // top side, corners included
  const right = mean(SEGMENTS, 2 * SEGMENTS);
  const bottom = mean(2 * SEGMENTS, 3 * SEGMENTS);
  const left = mean(3 * SEGMENTS, 4 * SEGMENTS);

  const h = Math.max(0, Math.min(1, (restY - y) / size));
  // The body's axes at that height: width from the sides, height top to bottom.
  const a = (right.x - left.x) / size;
  const b = (right.y - left.y) / size;
  const c = (bottom.x - top.x) / size;
  const d = (bottom.y - top.y) / size;
  // Where the feature's centre is now: between the top and bottom middles.
  const cx = top.x + (bottom.x - top.x) * h;
  const cy = top.y + (bottom.y - top.y) * h;
  const rx = x + size / 2;
  const e = cx - (a * rx + c * restY);
  const ff = cy - (b * rx + d * restY);
  return `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${e.toFixed(2)} ${ff.toFixed(2)})`;
}
