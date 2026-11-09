import type { MascotEdge } from './mascot.geometry';
import type { Vec } from './mascot.jelly';
import { MoveBody, NINJA_MOVES, isNinjaMove, runNinjaMove } from './mascot.moves';

/** A body that records what the moves ask for and lands every leap at once. */
function fakeBody(edge: MascotEdge = 'bottom', docked = false) {
  const calls: string[] = [];
  let current: MascotEdge = edge;
  let t = 0.3;
  const body: MoveBody = {
    alive: () => true,
    sleep: async () => undefined,
    until: async () => undefined,
    viewport: () => ({ width: 1200, height: 800 }),
    size: () => ({ width: 80, height: 80 }),
    edge: () => current,
    t: () => t,
    position: () => ({ x: 300, y: 720 }),
    docked: () => docked,
    reveal: (v) => void calls.push(`reveal ${v}`),
    jump: (speed, spin) => void calls.push(`jump ${spin}`),
    airborne: () => false,
    leap: (v: Vec, spin) => {
      calls.push(`leap ${Math.sign(v.x)} ${spin}`);
      if (v.y < -500) current = v.x < 0 ? 'left' : 'right'; // the flip onto a wall
      else current = 'bottom'; // the drop
    },
    flying: () => false,
    dash: async (target, speed) => {
      calls.push(`dash ${target.toFixed(2)} ${speed}`);
      t = target;
    },
    wallSpot: () => 0.9,
    teleport: (target) => {
      calls.push(`teleport ${target.toFixed(2)}`);
      t = target;
    },
    look: (d) => void calls.push(d ? `look ${d.x} ${d.y}` : 'look free'),
    squint: (on) => void calls.push(`squint ${on}`),
    poof: () => void calls.push('poof'),
    squish: () => void calls.push('squish'),
    lean: (deg) => void calls.push(`lean ${deg}`),
    trail: (dir) => void calls.push(`trail ${dir}`),
  };
  return { body, calls };
}

describe('ninja moves', () => {
  it('knows its moves', () => {
    expect(NINJA_MOVES).toEqual(['flip', 'wall_run', 'sneak_dash', 'vanish']);
    expect(isNinjaMove('flip')).toBe(true);
    expect(isNinjaMove('moonwalk')).toBe(false);
  });

  it('flip: crouches, then jumps with one full backward turn', async () => {
    const { body, calls } = fakeBody();
    await runNinjaMove('flip', body);

    expect(calls).toEqual(['reveal 1', 'squish', 'jump -360']);
  });

  it('wall_run: flips onto the nearer wall, runs up it and drops back down', async () => {
    const { body, calls } = fakeBody();
    await runNinjaMove('wall_run', body);

    expect(calls).toContain('leap -1 -720'); // x 300 of 1200: the left wall is nearer
    expect(calls).toContain('dash 0.90 900');
    expect(calls.at(-1)).toBe('leap 1 0'); // lets go, away from the wall
  });

  it('wall_run: by the open pane it always picks the left wall', async () => {
    const { body, calls } = fakeBody('bottom', true);
    body.position = () => ({ x: 700, y: 720 });
    await runNinjaMove('wall_run', body);

    expect(calls).toContain('leap -1 -720');
  });

  it('sneak_dash: squints, looks both ways, coils, dashes off leaning in and skids', async () => {
    const { body, calls } = fakeBody();
    await runNinjaMove('sneak_dash', body, () => 0.9);

    expect(calls.slice(0, 6)).toEqual(['reveal 0.62', 'squint true', 'look -1 0', 'look 1 0', 'look -1 0', 'look 1 0']);
    const dash = calls.indexOf('dash 0.52 2600');
    expect(dash).toBeGreaterThan(0);
    // Leans back to coil, then forward with speed lines for the run...
    expect(calls.slice(dash - 4, dash)).toEqual(['lean -10', 'squish', 'lean 16', 'trail 1']);
    // ...then the lines go, it leans back into a skid with dust, and relaxes.
    expect(calls.slice(dash + 1, dash + 6)).toEqual(['trail 0', 'lean -12', 'squish', 'poof', 'lean 0']);
    expect(calls.slice(-3)).toEqual(['look free', 'squint false', 'reveal null']);
  });

  it('vanish: poofs, hides, reappears elsewhere with a hop', async () => {
    const { body, calls } = fakeBody();
    await runNinjaMove('vanish', body, () => 0);

    expect(calls).toEqual(['reveal 1', 'poof', 'reveal 0', 'teleport 0.55', 'poof', 'reveal 1', 'jump 0']);
  });

  it('stops as soon as the move is cancelled', async () => {
    const { body, calls } = fakeBody();
    body.alive = () => false;
    await runNinjaMove('flip', body);

    expect(calls).toEqual(['reveal 1']);
  });
});
