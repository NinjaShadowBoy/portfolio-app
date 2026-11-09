/**
 * Ninja moves: short scripted stunts the mascot performs when the chat asks
 * for one (its name was asked, or a trick). Each move drives the body through
 * `MoveBody`, which the mascot component implements on top of its physics, so
 * the jelly still reacts to every jump, landing and dash.
 */
import type { MascotEdge, Size } from './mascot.geometry';
import type { Vec } from './mascot.jelly';

export type NinjaMove = 'flip' | 'wall_run' | 'sneak_dash' | 'vanish';
export const NINJA_MOVES: readonly NinjaMove[] = ['flip', 'wall_run', 'sneak_dash', 'vanish'];

export function isNinjaMove(name: unknown): name is NinjaMove {
  return typeof name === 'string' && (NINJA_MOVES as readonly string[]).includes(name);
}

/** What a move can make the body do. Times are ms, speeds px/s, angles degrees. */
export interface MoveBody {
  /** False once the move was cancelled (a drag, the tab hidden, destroy). */
  alive(): boolean;
  sleep(ms: number): Promise<void>;
  /** Resolves when `done()` holds or after `timeoutMs`. */
  until(done: () => boolean, timeoutMs: number): Promise<void>;
  viewport(): Size;
  size(): Size;
  edge(): MascotEdge;
  t(): number;
  /** Box top-left corner. */
  position(): Vec;
  /** The free walls: by the open pane the right one is hidden under it. */
  docked(): boolean;
  /** Pins how far out of the edge it stands (0..1), or null to let the mood decide. */
  reveal(value: number | null): void;
  /** Jumps straight up from its edge, spinning this much while airborne. */
  jump(speed: number, spin: number): void;
  airborne(): boolean;
  /** Leaps off into free flight (gravity, walls), spinning at this rate until it lands. */
  leap(velocity: Vec, spinPerSecond: number): void;
  flying(): boolean;
  /** Runs along the edges to the perimeter spot `t`, legs bobbing. */
  dash(t: number, speed: number): Promise<void>;
  /** The perimeter spot on a wall at height `y` (box top). */
  wallSpot(wall: 'left' | 'right', y: number): number;
  /** Jumps to the perimeter spot `t` at once. */
  teleport(t: number): void;
  /** Overrides where the eyes look (-1..1 of their reach, body frame), or null. */
  look(direction: Vec | null): void;
  squint(on: boolean): void;
  /** Leans the body this many degrees (positive: top towards +x of the body frame). */
  lean(deg: number): void;
  /** Speed lines behind it while it runs towards +x (1) or -x (-1); 0 hides them. */
  trail(direction: -1 | 0 | 1): void;
  poof(): void;
  /** A velocity kick to the jelly, body frame (units/s): a crouch, a skid. */
  squish(v: Vec): void;
}

export async function runNinjaMove(move: NinjaMove, body: MoveBody, random: () => number = Math.random): Promise<void> {
  switch (move) {
    case 'flip':
      return flip(body);
    case 'wall_run':
      return wallRun(body);
    case 'sneak_dash':
      return sneakDash(body, random);
    case 'vanish':
      return vanish(body, random);
  }
}

/** A backflip on the spot: crouch, spring up spinning once, land squashed. */
async function flip(body: MoveBody): Promise<void> {
  body.reveal(1);
  await body.sleep(220);
  if (!body.alive()) return;
  body.squish({ x: 0, y: 160 });
  await body.sleep(140);
  if (!body.alive()) return;
  body.jump(620, -360);
  await body.until(() => !body.airborne(), 1500);
  await body.sleep(250);
}

/** Flips onto a wall, runs up it, glances around, and drops back down. */
async function wallRun(body: MoveBody): Promise<void> {
  body.reveal(1);
  await body.sleep(200);
  if (!body.alive()) return;

  let wall: 'left' | 'right';
  const edge = body.edge();
  if (edge === 'left' || edge === 'right') {
    wall = edge;
  } else {
    // The nearer wall; by the open pane only the left one is free.
    const { x } = body.position();
    wall = body.docked() || x < body.viewport().width / 2 ? 'left' : 'right';
    const distance = wall === 'left' ? x : body.viewport().width - body.size().width - x;
    body.squish({ x: 0, y: 160 });
    await body.sleep(140);
    if (!body.alive()) return;
    // Enough sideways speed to reach the wall while still rising.
    const vx = Math.min(1800, Math.max(500, distance * 2.2));
    body.leap({ x: wall === 'left' ? -vx : vx, y: -900 }, wall === 'left' ? -720 : 720);
    await body.until(() => !body.flying(), 3000);
    if (!body.alive() || body.edge() !== wall) return;
  }

  // Up the wall, as high as the header allows.
  await body.dash(body.wallSpot(wall, 0), 900);
  if (!body.alive()) return;
  body.look({ x: 0, y: 1 }); // looks down from the top
  await body.sleep(350);
  body.look(null);
  if (!body.alive()) return;

  // Lets go: falls away from the wall to the floor.
  body.leap({ x: wall === 'left' ? 260 : -260, y: -150 }, 0);
  await body.until(() => !body.flying(), 3000);
  await body.sleep(200);
}

/**
 * Squints, looks left and right like it is up to something, coils up, then
 * dashes off low and fast, leaning in with speed lines, and skids to a stop.
 */
async function sneakDash(body: MoveBody, random: () => number): Promise<void> {
  body.reveal(0.62); // crouched low
  body.squint(true);
  await body.sleep(250);
  for (const [x, ms] of [
    [-1, 420],
    [1, 420],
    [-1, 260],
    [1, 200],
  ] as const) {
    if (!body.alive()) return body.squint(false);
    body.look({ x, y: 0 });
    await body.sleep(ms);
  }
  if (!body.alive()) return body.squint(false);

  // Along its edge, +t is always +x of the body frame. By the open pane it
  // runs away from it (to the left).
  const dir: -1 | 1 = body.docked() ? -1 : random() < 0.5 ? -1 : 1;
  const target = (((body.t() + dir * 0.22) % 1) + 1) % 1;
  body.look({ x: dir, y: 0 });
  // Wind-up: leans back and coils.
  body.lean(-dir * 10);
  body.squish({ x: -dir * 80, y: 60 });
  await body.sleep(160);
  if (!body.alive()) return body.squint(false);

  body.lean(dir * 16);
  body.trail(dir);
  await body.dash(target, 2600);
  body.trail(0);
  // The skid: leans back, the jelly slides on, dust flies.
  body.lean(-dir * 12);
  body.squish({ x: dir * 220, y: 0 });
  body.poof();
  await body.sleep(240);
  body.lean(0);
  await body.sleep(220);
  body.look(null);
  body.squint(false);
  body.reveal(null);
}

/** A puff of smoke, and it pops up somewhere else. */
async function vanish(body: MoveBody, random: () => number): Promise<void> {
  body.reveal(1);
  await body.sleep(150);
  if (!body.alive()) return;
  body.poof();
  body.reveal(0);
  await body.sleep(420);
  if (!body.alive()) return;

  let target: number;
  if (body.docked()) {
    // Somewhere on the floor left of the pane.
    target = body.t() * (0.25 + random() * 0.5);
  } else {
    target = (((body.t() + 0.25 + random() * 0.5) % 1) + 1) % 1;
  }
  body.teleport(target);
  await body.sleep(250);
  if (!body.alive()) return;
  body.poof();
  body.reveal(1);
  body.jump(380, 0);
  await body.until(() => !body.airborne(), 1500);
  await body.sleep(300);
}
