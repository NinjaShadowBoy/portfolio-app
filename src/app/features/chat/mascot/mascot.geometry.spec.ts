import {
  Box,
  EdgePosition,
  HEADER_RESERVE,
  TOAST_ZONE_HEIGHT,
  TOAST_ZONE_WIDTH,
  avoidToastCorner,
  edgeParam,
  edgePosition,
  hopTarget,
  nearestEdgeParam,
  pupilOffset,
} from './mascot.geometry';

const viewport = { width: 1200, height: 800 };
const mascot = { width: 56, height: 56 };

describe('pupilOffset', () => {
  const box: Box = { x: 0, y: 0, width: 20, height: 20 };

  it('centers the offset on a pointer at the eye centre', () => {
    expect(pupilOffset(box, { x: 10, y: 10 }, 4)).toEqual({ x: 0, y: 0 });
  });

  it('points toward a far pointer along its direction', () => {
    const offset = pupilOffset(box, { x: 1000, y: 1000 }, 4);
    expect(offset.x).toBeCloseTo(2.83, 2);
    expect(offset.y).toBeCloseTo(2.83, 2);
  });

  it('scales with pointer distance a little inside the box', () => {
    const offset = pupilOffset(box, { x: 13, y: 10 }, 6);
    expect(offset.x).toBeCloseTo(3, 6);
    expect(offset.y).toBe(0);
  });

  it('never exceeds maxOffset', () => {
    for (const pointer of [
      { x: 500, y: 3 },
      { x: -900, y: -2 },
      { x: 11, y: 400 },
      { x: 9, y: 30 },
    ]) {
      const offset = pupilOffset(box, pointer, 4);
      expect(Math.hypot(offset.x, offset.y)).toBeLessThanOrEqual(4 + 1e-9);
    }
  });

  it('keeps the offset inside the eye box', () => {
    for (const pointer of [
      { x: 100, y: 14 },
      { x: 10, y: -100 },
      { x: 0, y: 0 },
      { x: 20, y: 20 },
    ]) {
      const offset = pupilOffset(box, pointer, 12);
      expect(offset.x).toBeLessThanOrEqual(box.width / 2 + 1e-9);
      expect(offset.x).toBeGreaterThanOrEqual(-box.width / 2 - 1e-9);
      expect(offset.y).toBeLessThanOrEqual(box.height / 2 + 1e-9);
      expect(offset.y).toBeGreaterThanOrEqual(-box.height / 2 - 1e-9);
    }
  });

  it('survives a zero-sized box', () => {
    expect(pupilOffset({ x: 5, y: 5, width: 0, height: 0 }, { x: 10, y: 20 }, 4)).toEqual({ x: 0, y: 0 });
  });
});

describe('edgePosition', () => {
  it('walks the bottom edge between the two corners', () => {
    const start = edgePosition(0, viewport, mascot);
    const quarter = edgePosition(0.25, viewport, mascot);

    expect(start.edge).toBe('bottom');
    expect(quarter.edge).toBe('bottom');
    expect(start.x).toBe(0);
    expect(quarter.x).toBeGreaterThan(0);
    expect(quarter.x).toBeLessThan(viewport.width - mascot.width);
    expect(quarter.y).toBe(800 - mascot.height);
  });

  it('climbs the right and left edges and never reaches the top', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      const position = edgePosition(t, viewport, mascot);
      expect(position.y).toBeGreaterThanOrEqual(HEADER_RESERVE);
      expect(position.y + mascot.height).toBeLessThanOrEqual(viewport.height);
    }
    // Samples from the middle of each edge's span of the walk.
    const edges = new Set([0, 0.55, 0.8, 1].map((t) => edgePosition(t, viewport, mascot).edge));
    expect(edges.has('bottom')).toBe(true);
    expect(edges.has('right')).toBe(true);
    expect(edges.has('left')).toBe(true);
  });

  it('never returns a top-edge position on a short viewport either', () => {
    const small = { width: 320, height: 480 };
    for (let t = 0; t <= 1; t += 0.05) {
      const position = edgePosition(t, small, mascot);
      expect(position.y).toBeGreaterThanOrEqual(HEADER_RESERVE);
    }
  });

  it('maps t=1 back to the bottom-left corner where t=0 starts', () => {
    const first = edgePosition(0, viewport, mascot);
    const last = edgePosition(1, viewport, mascot);

    expect(last.x).toBe(first.x);
    expect(last.y).toBe(first.y);
  });

  it('stands the bottom-right anchor on the bottom-right corner', () => {
    const position = edgePosition(edgeParam('bottomRight', viewport, mascot), viewport, mascot);
    expect(position.x).toBe(viewport.width - mascot.width);
    expect(position.y).toBe(viewport.height - mascot.height);
    expect(position.edge).toBe('right');
  });
});

describe('hopTarget', () => {
  it('keeps the target on the same edge segment as the current position', () => {
    // t=0.1 is on the bottom edge; a far target on another edge must be pulled
    // back to the segment end, the shared bottom-right corner of the climb.
    const target = hopTarget(0.1, 0.9, viewport, mascot);
    expect(target).toBeCloseTo(edgeParam('bottomRight', viewport, mascot), 6);
    expect(target).toBeLessThan(0.9);

    // t=0.6 is on the right edge; a bottom target stays on the right edge.
    const right = hopTarget(0.6, 0.05, viewport, mascot);
    expect(edgePosition(right, viewport, mascot).edge).toBe('right');
    expect(right).toBeGreaterThan(0.05);
  });

  it('returns the target untouched inside the segment', () => {
    expect(hopTarget(0.1, 0.15, viewport, mascot)).toBeCloseTo(0.15, 6);
  });

  it('clamps to the segment on degenerate, tiny viewports', () => {
    const small = { width: 300, height: 300 };
    expect(Number.isFinite(hopTarget(0.5, 0.6, small, mascot))).toBe(true);
  });
});

describe('avoidToastCorner', () => {
  it('returns the position untouched when there are no toasts', () => {
    const position: EdgePosition = { x: viewport.width - mascot.width, y: viewport.height - mascot.height, edge: 'bottom' };
    expect(avoidToastCorner(position, viewport, mascot, false)).toEqual(position);
  });

  it('moves a bottom-right position left of the toast zone while toasts are up', () => {
    const position: EdgePosition = { x: viewport.width - mascot.width, y: viewport.height - mascot.height, edge: 'bottom' };
    const moved = avoidToastCorner(position, viewport, mascot, true);

    expect(moved.x + mascot.width).toBeLessThanOrEqual(viewport.width - TOAST_ZONE_WIDTH);
    expect(moved.y).toBe(position.y);
  });

  it('leaves a distant position alone', () => {
    const position: EdgePosition = { x: 0, y: viewport.height - mascot.height, edge: 'bottom' };
    expect(avoidToastCorner(position, viewport, mascot, true)).toEqual(position);
  });

  it('moves the position above the zone when the viewport is too narrow', () => {
    const narrow = { width: 400, height: 800 };
    const position: EdgePosition = { x: 300, y: narrow.height - mascot.height, edge: 'bottom' };
    const moved = avoidToastCorner(position, narrow, mascot, true);

    expect(moved.y + mascot.height).toBeLessThanOrEqual(narrow.height - TOAST_ZONE_HEIGHT);
  });
});

describe('nearestEdgeParam', () => {
  it('inverts edgePosition along every edge', () => {
    for (const t of [0, 0.2, 0.45, 0.6, 0.8, 0.95]) {
      const spot = edgePosition(t, viewport, mascot);
      expect(nearestEdgeParam(spot, viewport, mascot)).toBeCloseTo(t, 5);
    }
  });

  it('snaps a drop in the middle of the screen to the closest edge', () => {
    const nearLeft = edgePosition(nearestEdgeParam({ x: 40, y: 400 }, viewport, mascot), viewport, mascot);
    expect(nearLeft.edge).toBe('left');
    expect(nearLeft.y).toBe(400);

    const nearBottom = edgePosition(nearestEdgeParam({ x: 600, y: 700 }, viewport, mascot), viewport, mascot);
    expect(nearBottom).toEqual({ x: 600, y: viewport.height - mascot.height, edge: 'bottom' });
  });

  it('never returns a spot under the header', () => {
    const spot = edgePosition(nearestEdgeParam({ x: 1180, y: 0 }, viewport, mascot), viewport, mascot);
    expect(spot.edge).toBe('right');
    expect(spot.y).toBeCloseTo(HEADER_RESERVE, 1);
  });
});
