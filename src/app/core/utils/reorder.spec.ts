import { Box, columnCount, dropIndex, moveItem, nearestIndex, rowStep } from './reorder';

/** A 3-column grid of 100x100 tiles with a 10px gap, in reading order. */
const grid = (count: number, columns = 3): Box[] =>
  Array.from({ length: count }, (_, i) => ({
    left: (i % columns) * 110,
    top: Math.floor(i / columns) * 110,
    width: 100,
    height: 100,
  }));

describe('reorder helpers', () => {
  describe('moveItem', () => {
    const input = [1, 2, 3, 4];

    it('moves an item to the target index and returns a copy', () => {
      expect(moveItem(input, 0, 2)).toEqual([2, 3, 1, 4]);
      expect(moveItem(input, 3, 0)).toEqual([4, 1, 2, 3]);
      expect(input).toEqual([1, 2, 3, 4]);
    });

    it('clamps the target and ignores an unknown source', () => {
      expect(moveItem(input, 1, 99)).toEqual([1, 3, 4, 2]);
      expect(moveItem(input, 2, -5)).toEqual([3, 1, 2, 4]);
      expect(moveItem(input, 9, 0)).toEqual([1, 2, 3, 4]);
    });
  });

  it('dropIndex converts "before/after the row at over" into a final index', () => {
    expect(dropIndex(0, 2, false)).toBe(1);
    expect(dropIndex(0, 2, true)).toBe(2);
    expect(dropIndex(3, 1, false)).toBe(1);
    expect(dropIndex(3, 1, true)).toBe(2);
    expect(dropIndex(2, 2, true)).toBe(2);
  });

  describe('nearestIndex', () => {
    it('picks the tile whose centre is closest in both axes', () => {
      const boxes = grid(6);
      expect(nearestIndex({ x: 50, y: 50 }, boxes)).toBe(0);
      expect(nearestIndex({ x: 270, y: 40 }, boxes)).toBe(2);
      expect(nearestIndex({ x: 170, y: 150 }, boxes)).toBe(4);
      // Far outside the grid still lands on the closest tile.
      expect(nearestIndex({ x: 900, y: 900 }, boxes)).toBe(5);
      expect(nearestIndex({ x: -500, y: 120 }, boxes)).toBe(3);
    });

    it('returns -1 without tiles', () => {
      expect(nearestIndex({ x: 0, y: 0 }, [])).toBe(-1);
    });
  });

  describe('columnCount', () => {
    it('counts the tiles on the first row', () => {
      expect(columnCount(grid(7))).toBe(3);
      expect(columnCount(grid(2))).toBe(2);
      expect(columnCount(grid(4, 1))).toBe(1);
      expect(columnCount([])).toBe(1);
    });

    it('tolerates sub-pixel differences in top', () => {
      const boxes = grid(4, 2).map((box, i) => ({ ...box, top: box.top + (i === 1 ? 0.5 : 0) }));
      expect(columnCount(boxes)).toBe(2);
    });
  });

  describe('rowStep', () => {
    // 3 columns, 5 items: [0 1 2] [3 4]
    it('moves a full row up or down', () => {
      expect(rowStep(4, -1, 3, 5)).toBe(1);
      expect(rowStep(0, 1, 3, 5)).toBe(3);
    });

    it('stays put without a row in that direction', () => {
      expect(rowStep(1, -1, 3, 5)).toBe(1);
      expect(rowStep(3, 1, 3, 5)).toBe(3);
    });

    it('lands on the last item when the row below is shorter', () => {
      expect(rowStep(2, 1, 3, 5)).toBe(4);
    });
  });
});
