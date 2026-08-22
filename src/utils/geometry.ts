import type { PageMetrics } from '../types/messages';

export interface Tile { x: number; y: number; width: number; height: number }

export function pageDimensions(doc: Pick<Document, 'documentElement' | 'body'>): { width: number; height: number } {
  const root = doc.documentElement;
  const body = doc.body;
  return {
    width: Math.max(root.scrollWidth, root.offsetWidth, root.clientWidth, body?.scrollWidth ?? 0, body?.offsetWidth ?? 0),
    height: Math.max(root.scrollHeight, root.offsetHeight, root.clientHeight, body?.scrollHeight ?? 0, body?.offsetHeight ?? 0)
  };
}

export function calculateTiles(metrics: Pick<PageMetrics, 'width' | 'height' | 'viewportWidth' | 'viewportHeight'>): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < metrics.height; y += metrics.viewportHeight) {
    const top = Math.min(y, Math.max(0, metrics.height - metrics.viewportHeight));
    const visibleHeight = Math.min(metrics.viewportHeight, metrics.height - top);
    if (!tiles.some(tile => tile.y === top)) tiles.push({ x: 0, y: top, width: Math.min(metrics.width, metrics.viewportWidth), height: visibleHeight });
  }
  return tiles;
}

export function safeCanvasSize(width: number, height: number, maxDimension = 32767, maxArea = 268_435_456) {
  const scale = Math.min(1, maxDimension / width, maxDimension / height, Math.sqrt(maxArea / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale };
}