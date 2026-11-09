import { BODY, createJelly, featureTransform, jellyPath, jellySettled, poke, shove, stepJelly } from './mascot.jelly';

const none = { x: 0, y: 0 };

function run(seconds: number, jelly = createJelly(), force = none) {
  for (let t = 0; t < seconds; t += 1 / 60) stepJelly(jelly, 1 / 60, force);
  return jelly;
}

describe('mascot jelly', () => {
  it('rests as the square the template draws, with an identity feature transform', () => {
    const jelly = createJelly();

    expect(jellySettled(jelly)).toBe(true);
    expect(jellyPath(jelly)).toMatch(/^M21 40C/);
    expect(featureTransform(jelly, 73.5)).toBe('matrix(1.0000 0.0000 0.0000 1.0000 0.00 0.00)');
  });

  it('wobbles after a landing and settles again', () => {
    const jelly = createJelly();
    shove(jelly, { x: 0, y: 120 });

    stepJelly(jelly, 0.05, none);
    expect(jellySettled(jelly)).toBe(false);
    const top = jelly.points[2];
    expect(top.pos.y).toBeGreaterThan(top.rest.y); // squashed down

    run(6, jelly);
    expect(jellySettled(jelly)).toBe(true);
  });

  it('overshoots like jelly: the top swings past its rest spot before it settles', () => {
    const jelly = createJelly();
    shove(jelly, { x: 150, y: 0 });
    const top = jelly.points[2];
    let maxRight = 0;
    let maxLeft = 0;
    for (let i = 0; i < 90; i++) {
      stepJelly(jelly, 1 / 60, none);
      maxRight = Math.max(maxRight, top.pos.x - top.rest.x);
      maxLeft = Math.min(maxLeft, top.pos.x - top.rest.x);
    }
    expect(maxRight).toBeGreaterThan(2);
    expect(maxLeft).toBeLessThan(-0.5);
  });

  it('keeps the bottom row on the ground while grounded, and frees it in the air', () => {
    const grounded = run(0.3, createJelly(), { x: 4000, y: 0 });
    const bottom = grounded.points.filter((p) => p.ground);
    expect(bottom.every((p) => p.pos.x === p.rest.x && p.pos.y === p.rest.y)).toBe(true);

    const flying = createJelly();
    flying.grounded = false;
    run(0.3, flying, { x: 4000, y: 0 });
    expect(flying.points.filter((p) => p.ground).some((p) => p.pos.x !== p.rest.x)).toBe(true);
  });

  it('bulges its sides when squashed', () => {
    const jelly = run(0.4, createJelly(), { x: 0, y: 6000 });
    const right = jelly.points[6]; // right side, lower half
    expect(right.pos.x).toBeGreaterThan(right.rest.x);
  });

  it('dents where it is poked', () => {
    const jelly = createJelly();
    poke(jelly, { x: BODY.x + BODY.size / 2, y: BODY.y }, 150);
    stepJelly(jelly, 0.03, none);

    expect(jelly.points[2].pos.y).toBeGreaterThan(jelly.points[2].rest.y);
  });

  it('never stretches a point far from its rest spot', () => {
    const jelly = run(1, createJelly(), { x: 1e6, y: -1e6 });
    for (const p of jelly.points) {
      expect(Math.hypot(p.pos.x - p.rest.x, p.pos.y - p.rest.y)).toBeLessThanOrEqual(14.001);
    }
  });
});
