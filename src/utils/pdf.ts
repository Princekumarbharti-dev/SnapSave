function bytes(text: string): Uint8Array<ArrayBuffer> { return new TextEncoder().encode(text); }
function join(parts: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBuffer> {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const result: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(size));
  let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result;
}

export async function imageToPdf(dataUrl: string): Promise<Blob> {
  const image = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const pageWidth = 595.28, pageHeight = 841.89, margin = 24;
  const usableWidth = pageWidth - margin * 2, usableHeight = pageHeight - margin * 2;
  const sourcePageHeight = Math.max(1, Math.floor(image.width * usableHeight / usableWidth));
  const slices: { data: Uint8Array; width: number; height: number }[] = [];
  for (let y = 0; y < image.height; y += sourcePageHeight) {
    const height = Math.min(sourcePageHeight, image.height - y);
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = height;
    const context = canvas.getContext('2d')!; context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, y, image.width, height, 0, 0, image.width, height);
    slices.push({ data: new Uint8Array(await (await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', .9))).arrayBuffer()), width: image.width, height });
  }
  image.close();
  const objectCount = 2 + slices.length * 3, objects: Uint8Array[] = new Array(objectCount + 1);
  const pageIds = slices.map((_, i) => 3 + i * 3);
  objects[1] = bytes('<< /Type /Catalog /Pages 2 0 R >>');
  objects[2] = bytes(`<< /Type /Pages /Count ${slices.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);
  slices.forEach((slice, i) => {
    const pageId = 3 + i * 3, imageId = pageId + 1, contentId = pageId + 2;
    const drawHeight = Math.min(usableHeight, usableWidth * slice.height / slice.width);
    const stream = `q ${usableWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${margin} ${(pageHeight - margin - drawHeight).toFixed(2)} cm /Im${i} Do Q`;
    objects[pageId] = bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${i} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects[imageId] = join([bytes(`<< /Type /XObject /Subtype /Image /Width ${slice.width} /Height ${slice.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${slice.data.length} >>\nstream\n`), slice.data, bytes('\nendstream')]);
    objects[contentId] = bytes(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  const parts = [bytes('%PDF-1.4\n%Ã¢Ã£ÃÃ“\n')], offsets = [0]; let position = parts[0].length;
  for (let id = 1; id <= objectCount; id++) { offsets[id] = position; const object = join([bytes(`${id} 0 obj\n`), objects[id], bytes('\nendobj\n')]); parts.push(object); position += object.length; }
  const xref = position;
  const table = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  parts.push(bytes(table)); return new Blob([join(parts)], { type: 'application/pdf' });
}