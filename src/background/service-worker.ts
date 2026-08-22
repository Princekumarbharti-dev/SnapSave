import type { CaptureResult, PageMetrics, Request } from '../types/messages';
import { calculateTiles, safeCanvasSize } from '../utils/geometry';
import { captureFilename } from '../utils/filename';
import { getSettings } from '../utils/settings';

let lastCapture: CaptureResult | null = null;
let lastCaptureCallAt = 0;
const CAPTURE_INTERVAL_MS = 650;

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/** Serialize captures to respect Chrome's quota and retry transient quota errors. */
async function captureTabSafely(windowId: number, attempt = 0): Promise<string> {
  const remaining = CAPTURE_INTERVAL_MS - (Date.now() - lastCaptureCallAt);
  if (remaining > 0) await wait(remaining);
  lastCaptureCallAt = Date.now();
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND|quota/i.test(message) && attempt < 4) {
      await wait(800 * (attempt + 1));
      return captureTabSafely(windowId, attempt + 1);
    }
    throw error;
  }
}

function friendlyError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/chrome:\/\/|edge:\/\/|webstore|cannot access|permission/i.test(text)) return "SnapSave can't capture this page. Chrome protects browser and store pages.";
  return `SnapSave can't capture this page. ${text}`;
}

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.windowId === undefined) throw new Error('No active webpage was found.');
  return tab;
}

async function ensureContent(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['assets/content.js'] });
  }
}

async function captureVisible(tab: chrome.tabs.Tab): Promise<CaptureResult> {
  const dataUrl = await captureTabSafely(tab.windowId!);
  const bitmap = await dataUrlBitmap(dataUrl);
  return { dataUrl, url: tab.url ?? '', width: bitmap.width, height: bitmap.height };
}

async function dataUrlBitmap(dataUrl: string): Promise<ImageBitmap> {
  return createImageBitmap(await (await fetch(dataUrl)).blob());
}

async function canvasDataUrl(canvas: OffscreenCanvas, type: 'image/png' | 'image/jpeg' = 'image/png', quality = 0.92): Promise<string> {
  const bytes = new Uint8Array(await (await canvas.convertToBlob({ type, quality })).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(binary)}`;
}

async function captureFull(tab: chrome.tabs.Tab): Promise<CaptureResult> {
  await ensureContent(tab.id!);
  const metrics = await chrome.tabs.sendMessage(tab.id!, { type: 'PREPARE_FULL' }) as PageMetrics;
  const output = safeCanvasSize(metrics.width * metrics.devicePixelRatio, metrics.height * metrics.devicePixelRatio);
  const canvas = new OffscreenCanvas(output.width, output.height);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Image canvas is unavailable.');
  context.fillStyle = '#fff'; context.fillRect(0, 0, output.width, output.height);
  const tiles = calculateTiles(metrics);
  try {
    for (const tile of tiles) {
      await chrome.tabs.sendMessage(tab.id!, { type: 'SCROLL_TO', x: tile.x, y: tile.y });
      await new Promise(resolve => setTimeout(resolve, 220));
      const shot = await captureTabSafely(tab.windowId!);
      const image = await dataUrlBitmap(shot);
      const sourceY = Math.max(0, image.height - tile.height * metrics.devicePixelRatio);
      const destY = tile.y * metrics.devicePixelRatio * output.scale;
      context.drawImage(image, 0, sourceY, image.width, tile.height * metrics.devicePixelRatio, 0, destY, output.width, tile.height * metrics.devicePixelRatio * output.scale);
      image.close();
    }
  } finally {
    await chrome.tabs.sendMessage(tab.id!, { type: 'FINISH_FULL' }).catch(() => undefined);
  }
  return { dataUrl: await canvasDataUrl(canvas), url: metrics.url, width: output.width, height: output.height };
}

async function cropVisible(tab: chrome.tabs.Tab, rect: { x: number; y: number; width: number; height: number }, dpr: number): Promise<CaptureResult> {
  const raw = await captureTabSafely(tab.windowId!);
  const image = await dataUrlBitmap(raw);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext('2d')!.drawImage(image, rect.x * dpr, rect.y * dpr, width, height, 0, 0, width, height);
  image.close();
  return { dataUrl: await canvasDataUrl(canvas), url: tab.url ?? '', width, height };
}

async function maybeAutoDownload(result: CaptureResult): Promise<void> {
  const settings = await getSettings();
  if (settings.autoDownload) {
    const ext = settings.format === 'jpeg' ? 'jpg' : 'png';
    await chrome.downloads.download({ url: result.dataUrl, filename: captureFilename(result.url, ext, settings.includeWebsite), saveAs: false });
  }
}

chrome.runtime.onMessage.addListener((message: Request, sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'GET_LAST_CAPTURE') return sendResponse({ ok: true, result: lastCapture });
      if (message.type === 'DOWNLOAD') return sendResponse({ ok: true, id: await chrome.downloads.download({ url: message.dataUrl, filename: message.filename, saveAs: true }) });
      if (message.type === 'AREA_SELECTED') {
        const tab = sender.tab?.id ? sender.tab : await activeTab();
        lastCapture = await cropVisible(tab, message.rect, message.dpr);
        await maybeAutoDownload(lastCapture);
        await chrome.windows.create({ url: chrome.runtime.getURL('src/popup/index.html?preview=1'), type: 'popup', width: 430, height: 650 });
        return sendResponse({ ok: true });
      }
      if (message.type === 'START_AREA') {
        const tab = await activeTab(); await ensureContent(tab.id!);
        await chrome.tabs.sendMessage(tab.id!, { type: 'START_SELECTION' });
        return sendResponse({ ok: true });
      }
      if (message.type === 'CAPTURE') {
        const tab = await activeTab();
        lastCapture = message.mode === 'full' ? await captureFull(tab) : await captureVisible(tab);
        await maybeAutoDownload(lastCapture);
        return sendResponse({ ok: true, result: lastCapture });
      }
    } catch (error) { sendResponse({ ok: false, error: friendlyError(error) }); }
  })();
  return true;
});

chrome.commands.onCommand.addListener(command => {
  void (async () => {
    if (command === 'select-area') {
      const tab = await activeTab(); await ensureContent(tab.id!); await chrome.tabs.sendMessage(tab.id!, { type: 'START_SELECTION' });
    } else if (command === 'capture-visible') {
      lastCapture = await captureVisible(await activeTab()); await maybeAutoDownload(lastCapture);
    }
  })().catch(() => undefined);
});