import {
  Brain,
  LINGER_MS,
  NEAR_PX,
  PARK_MS,
  Senses,
  arrived,
  circularDelta,
  decide,
  initialBrain,
  nextGaze,
} from './mascot.behavior';

/** Rolls the given values in order, then repeats the last. */
function dice(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function senses(overrides: Partial<Senses> = {}): Senses {
  return { now: 10_000, distance: null, pointerMovedAt: null, pointerT: null, t: 0.4, holdOut: false, ...overrides };
}

describe('mascot behaviour', () => {
  let brain: Brain;

  beforeEach(() => {
    brain = { ...initialBrain(0), nextIdleAt: 0 };
  });

  it('starts shy, lurking in its edge', () => {
    expect(initialBrain(0).pose).toBe('lurk');
  });

  it('comes out when the pointer comes close, and lingers after it leaves', () => {
    const near = decide(brain, senses({ distance: NEAR_PX - 1 }));
    expect(near.pose).toBe('out');
    expect(near.target).toBeNull();

    const justLeft = decide(near, senses({ now: 10_000 + LINGER_MS - 1, distance: 900 }));
    expect(justLeft.pose).toBe('out');
  });

  it('stands out and stops creeping while something holds it out', () => {
    const creeping = { ...brain, target: 0.7 };
    const held = decide(creeping, senses({ holdOut: true }));

    expect(held.pose).toBe('out');
    expect(held.target).toBeNull();
  });

  it('creeps to the edge spot nearest a resting pointer, once per rest', () => {
    const rest = senses({ pointerMovedAt: 10_000 - PARK_MS, pointerT: 0.8, distance: 600 });
    const going = decide(brain, rest);
    expect(going.target).toBe(0.8);
    expect(going.pose).toBe('lurk'); // head down while it travels

    // It arrived and peeks; the same rest does not send it again.
    const there = arrived(going, 10_100, dice(0));
    expect(there.pose).toBe('peek');
    const again = decide(there, { ...rest, now: 10_200, t: 0.8 });
    expect(again.target).toBeNull();
  });

  it('just peeks when the resting pointer is already above it', () => {
    const next = decide(brain, senses({ pointerMovedAt: 0, pointerT: 0.4, distance: 400 }));

    expect(next.target).toBeNull();
    expect(next.pose).toBe('peek');
  });

  it('waits for the pointer to rest long enough', () => {
    const next = decide(brain, senses({ pointerMovedAt: 10_000 - PARK_MS + 1, pointerT: 0.8, distance: 600 }), dice(0.9));

    expect(next.target).toBeNull();
  });

  it('when idle, peeks, creeps, comes out or ducks at random', () => {
    // The first roll times the next change; the second picks the mood.
    expect(decide(brain, senses(), dice(0, 0.1)).pose).toBe('peek');

    const creep = decide(brain, senses(), dice(0, 0.5, 1));
    expect(creep.pose).toBe('lurk');
    expect(creep.target).toBeCloseTo(0.48, 5);

    expect(decide(brain, senses(), dice(0, 0.7)).pose).toBe('out');
    expect(decide({ ...brain, pose: 'out' }, senses(), dice(0, 0.2)).pose).toBe('lurk');
    expect(decide({ ...brain, pose: 'peek' }, senses(), dice(0, 0.1)).pose).toBe('lurk');
  });

  it('keeps its mood until the next idle change is due', () => {
    const later = { ...brain, nextIdleAt: 20_000 };

    expect(decide(later, senses(), dice(0.1))).toBe(later);
  });

  it('measures the short way round the closed perimeter', () => {
    expect(circularDelta(0.1, 0.3)).toBeCloseTo(0.2, 10);
    expect(circularDelta(0.05, 0.95)).toBeCloseTo(-0.1, 10);
    expect(circularDelta(0.95, 0.05)).toBeCloseTo(0.1, 10);
  });
});

describe('mascot idle gaze', () => {
  it('mostly looks at the visitor, holding it a while', () => {
    const gaze = nextGaze(1000, dice(0.1, 0));
    expect(gaze).toEqual({ x: 0, y: 0.15, until: 2800 });
  });

  it('sometimes glances to a side, up or down, briefly', () => {
    expect(nextGaze(0, dice(0.5, 0, 0.2, 0.5)).x).toBe(-1);
    expect(nextGaze(0, dice(0.8, 0, 0.5)).y).toBe(-0.9);
    expect(nextGaze(0, dice(0.9, 0, 0.5)).y).toBe(0.8);
    for (let i = 0; i < 50; i++) {
      const gaze = nextGaze(0);
      expect(Math.abs(gaze.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(gaze.y)).toBeLessThanOrEqual(1);
      expect(gaze.until).toBeGreaterThan(0);
    }
  });
});
