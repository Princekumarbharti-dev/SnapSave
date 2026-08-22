const INVALID = /[<>:"/\\|?*\u0000-\u001F]/g;

export function urlToSlug(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').replace(/\./g, '-');
    const path = decodeURIComponent(url.pathname)
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return [host, path].filter(Boolean).join('-');
  } catch {
    return 'capture';
  }
}

export function sanitizeFilename(value: string, maxLength = 120): string {
  const cleaned = value.replace(INVALID, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[. -]+|[. -]+$/g, '');
  return (cleaned || 'capture').slice(0, maxLength).replace(/[. -]+$/g, '');
}

export function captureFilename(url: string, extension: string, includeWebsite = true, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  const site = includeWebsite ? `-${urlToSlug(url)}` : '';
  return `${sanitizeFilename(`snapsave${site}-${day}`)}.${extension}`;
}