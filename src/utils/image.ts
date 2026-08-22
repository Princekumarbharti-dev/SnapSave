import type { ImageFormat } from '../types/messages';

export async function convertImage(dataUrl: string, format: ImageFormat, quality: number): Promise<string> {
  if (format === 'png' && dataUrl.startsWith('data:image/png')) return dataUrl;
  const image = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  if (format === 'jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); }
  context.drawImage(image, 0, 0); image.close();
  return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', quality);
}

export function mimeForFormat(format: ImageFormat): string { return format === 'jpeg' ? 'image/jpeg' : 'image/png'; }