import { describe, expect, it } from 'vitest';
import { captureFilename, sanitizeFilename, urlToSlug } from '../src/utils/filename';

describe('filenames', () => {
  it('removes filesystem-invalid characters', () => expect(sanitizeFilename('a/b:c?d*e"f<g>h|')).toBe('a-b-c-d-e-f-g-h'));
  it('parses a URL into a readable slug', () => expect(urlToSlug('https://www.example.com/articles/chrome-extension?q=1')).toBe('example-com-articles-chrome-extension'));
  it('creates deterministic dated filenames', () => expect(captureFilename('https://example.com/a', 'png', true, new Date('2026-08-22T00:00:00Z'))).toBe('snapsave-example-com-a-2026-08-22.png'));
  it('limits long names', () => expect(sanitizeFilename('x'.repeat(200)).length).toBe(120));
});