import { describe, expect, it } from 'vitest';
import { calculateTiles, pageDimensions, safeCanvasSize } from '../src/utils/geometry';

describe('capture geometry', () => {
  it('calculates non-duplicated final scroll tile', () => expect(calculateTiles({ width: 1000, height: 2500, viewportWidth: 1000, viewportHeight: 1000 }).map(t => t.y)).toEqual([0, 1000, 1500]));
  it('keeps a normal canvas at full scale', () => expect(safeCanvasSize(1200, 800)).toEqual({ width: 1200, height: 800, scale: 1 }));
  it('scales extremely large canvases safely', () => expect(safeCanvasSize(100000, 100000).scale).toBeLessThan(1));
  it('uses the largest reported document dimensions', () => {
    const node = { scrollWidth: 800, offsetWidth: 700, clientWidth: 600, scrollHeight: 2400, offsetHeight: 2300, clientHeight: 900 };
    expect(pageDimensions({ documentElement: node, body: { ...node, scrollWidth: 900, scrollHeight: 2500 } } as never)).toEqual({ width: 900, height: 2500 });
  });
});