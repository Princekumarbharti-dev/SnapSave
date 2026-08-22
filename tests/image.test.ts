import { describe, expect, it } from 'vitest';
import { mimeForFormat } from '../src/utils/image';
describe('image formats', () => { it('maps supported formats to MIME types', () => { expect(mimeForFormat('png')).toBe('image/png'); expect(mimeForFormat('jpeg')).toBe('image/jpeg'); }); });