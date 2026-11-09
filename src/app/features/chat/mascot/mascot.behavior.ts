/**
 * The mascot's mood, as a pure function. It is shy: most of the time it hides
 * in an edge with only its head showing, now and then peeks or comes out, and
 * sometimes creeps along the edge. When the pointer comes close it is glad to
 * help and comes out, and when the pointer rests somewhere it creeps along the
 * edges to the spot nearest to it. No DOM, no timers: the component calls
 * `decide` a few times a second and acts on the result.
 */

/** How far out of its edge the mascot stands: head only, eyes too, or all of it. */
export type Pose = 'lurk' | 'peek' | 'out';

/** How much of the body shows for each pose, 0 (under the edge) to 1 (all of it). */
export const REVEAL: Record<Pose, number> = { lurk: 0.24, peek: 0.62, out: 1 };

/** Pointer distance (px from the mascot's centre) at which it comes out... */
export const NEAR_PX = 190;
/** ...and how long it stays out after the pointer leaves. */
export const LINGER_MS = 1600;
/** A pointer resting this long draws the mascot over. */
export const PARK_MS = 1800;
/** Gap between idle mood changes. */
const IDLE_MIN_MS = 1400;
const IDLE_SPAN_MS = 3200;
/** Furthest an idle creep goes, as a fraction of the perimeter. */
export const CREEP_SPAN = 0.08;

export interface Brain {
  pose: Pose;
  /** Perimeter parameter it is creeping towards, or null when it stays put. */
  target: number | null;
  /** Until when it stays out because the pointer was near. */
  nearUntil: number;
  /** Next idle mood change. */
  nextIdleAt: number;
  /** The pointer rest it already answered, so it goes over only once. */
  answeredRestAt: number;
}

export interface Senses {
  now: number;
  /** Pointer distance from the mascot's centre, or null without a pointer. */
  distance: number | null;
  /** When the pointer last moved, or null without a pointer. */
  pointerMovedAt: number | null;
  /** Perimeter parameter of the edge spot nearest the pointer. */
  pointerT: number | null;
  /** Where it stands now. */
  t: number;
  /** Any reason it must stand fully out and still: focus, an open pane, a drag, a throw, reduced motion, touch. */
  holdOut: boolean;
}

export function initialBrain(now: number): Brain {
  return { pose: 'lurk', target: null, nearUntil: 0, nextIdleAt: now + IDLE_MIN_MS, answeredRestAt: -1 };
}

/** Shortest signed step from `from` to `to` on the closed perimeter (t wraps at 1). */
export function circularDelta(from: number, to: number): number {
  let d = (to - from) % 1;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

export function decide(brain: Brain, senses: Senses, random: () => number = Math.random): Brain {
  const { now } = senses;
  if (senses.holdOut) {
    return { ...brain, pose: 'out', target: null, nextIdleAt: now + IDLE_MIN_MS };
  }

  // Glad to help: the pointer is close, so it comes out and stays a moment.
  if (senses.distance !== null && senses.distance <= NEAR_PX) {
    return { ...brain, pose: 'out', target: null, nearUntil: now + LINGER_MS, nextIdleAt: now + LINGER_MS };
  }
  if (now < brain.nearUntil) return brain;

  // The pointer rests somewhere: creep over, once per rest.
  const moved = senses.pointerMovedAt;
  if (
    moved !== null &&
    senses.pointerT !== null &&
    now - moved >= PARK_MS &&
    brain.answeredRestAt !== moved
  ) {
    const far = Math.abs(circularDelta(senses.t, senses.pointerT)) > 0.01;
    return {
      ...brain,
      answeredRestAt: moved,
      pose: far ? 'lurk' : 'peek',
      target: far ? senses.pointerT : null,
      nextIdleAt: now + IDLE_MIN_MS + random() * IDLE_SPAN_MS,
    };
  }

  // Still creeping: nothing new until it arrives (see `arrived`).
  if (brain.target !== null) return brain;
  if (now < brain.nextIdleAt) return brain;

  const next = now + IDLE_MIN_MS + random() * IDLE_SPAN_MS;
  const roll = random();
  switch (brain.pose) {
    case 'lurk':
      if (roll < 0.4) return { ...brain, pose: 'peek', nextIdleAt: next };
      if (roll < 0.65) {
        const drift = (random() * 2 - 1) * CREEP_SPAN;
        return { ...brain, target: (((senses.t + drift) % 1) + 1) % 1, nextIdleAt: next };
      }
      if (roll < 0.75) return { ...brain, pose: 'out', nextIdleAt: next };
      return { ...brain, nextIdleAt: next };
    case 'peek':
      if (roll < 0.5) return { ...brain, pose: 'lurk', nextIdleAt: next };
      if (roll < 0.75) return { ...brain, pose: 'out', nextIdleAt: next };
      return { ...brain, nextIdleAt: next };
    case 'out':
      if (roll < 0.7) return { ...brain, pose: 'lurk', nextIdleAt: next };
      return { ...brain, pose: 'peek', nextIdleAt: next };
  }
}

/** The creep reached its target: it peeks out to look around. */
export function arrived(brain: Brain, now: number, random: () => number = Math.random): Brain {
  return { ...brain, target: null, pose: 'peek', nextIdleAt: now + IDLE_MIN_MS + random() * IDLE_SPAN_MS };
}

/** The eyes follow the pointer only while it moves, and this long after. */
export const LOOK_AT_POINTER_MS = 1200;

/** Where the eyes rest, as a fraction of the pupil's reach (-1..1 each way), and until when. */
export interface Gaze {
  x: number;
  y: number;
  until: number;
}

/**
 * The next idle glance: mostly straight ahead at the visitor, sometimes a look
 * to the side, up or down, held for a moment like someone chilling.
 */
export function nextGaze(now: number, random: () => number = Math.random): Gaze {
  const roll = random();
  if (roll < 0.45) return { x: 0, y: 0.15, until: now + 1800 + random() * 2600 }; // at the visitor
  const hold = now + 700 + random() * 1500;
  if (roll < 0.7) return { x: random() < 0.5 ? -1 : 1, y: random() * 0.5 - 0.25, until: hold }; // to a side
  if (roll < 0.85) return { x: random() * 1.4 - 0.7, y: -0.9, until: hold }; // up, wondering
  return { x: random() * 1.2 - 0.6, y: 0.8, until: hold }; // down, shy
}
