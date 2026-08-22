let originalScroll = { x: 0, y: 0 };
let captureStyle: HTMLStyleElement | null = null;

// Keep this injected script self-contained. chrome.scripting.executeScript()
// executes files as classic scripts, so it cannot load Rollup's shared imports.
function pageDimensions(): { width: number; height: number } {
  const root = document.documentElement;
  const body = document.body;
  return {
    width: Math.max(root.scrollWidth, root.offsetWidth, root.clientWidth, body?.scrollWidth ?? 0, body?.offsetWidth ?? 0),
    height: Math.max(root.scrollHeight, root.offsetHeight, root.clientHeight, body?.scrollHeight ?? 0, body?.offsetHeight ?? 0)
  };
}

function metrics() {
  const size = pageDimensions();
  return { ...size, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, scrollX: window.scrollX, scrollY: window.scrollY, devicePixelRatio: window.devicePixelRatio, url: location.href };
}

function startSelection(): void {
  if (document.getElementById('snapsave-selection-root')) return;
  const root = document.createElement('div'); root.id = 'snapsave-selection-root';
  Object.assign(root.style, { position: 'fixed', inset: '0', zIndex: '2147483647', cursor: 'crosshair', background: 'rgba(7,12,24,.48)', touchAction: 'none' });
  const box = document.createElement('div');
  Object.assign(box.style, { position: 'absolute', border: '2px solid #7c5cff', background: 'rgba(124,92,255,.10)', boxShadow: '0 0 0 9999px rgba(7,12,24,.48)', display: 'none' });
  const label = document.createElement('div');
  Object.assign(label.style, { position: 'absolute', padding: '5px 8px', borderRadius: '7px', background: '#101527', color: '#fff', font: '600 12px system-ui', whiteSpace: 'nowrap', display: 'none' });
  root.append(box, label); document.documentElement.append(root);
  let startX = 0, startY = 0, dragging = false;
  const cleanup = () => root.remove();
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { cleanup(); document.removeEventListener('keydown', key, true); } };
  document.addEventListener('keydown', key, true);
  root.addEventListener('pointerdown', event => { dragging = true; startX = event.clientX; startY = event.clientY; root.style.background = 'transparent'; box.style.display = 'block'; label.style.display = 'block'; root.setPointerCapture(event.pointerId); });
  root.addEventListener('pointermove', event => {
    if (!dragging) return;
    const x = Math.min(startX, event.clientX), y = Math.min(startY, event.clientY);
    const width = Math.abs(event.clientX - startX), height = Math.abs(event.clientY - startY);
    Object.assign(box.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    Object.assign(label.style, { left: `${Math.min(innerWidth - 90, x)}px`, top: `${Math.max(6, y - 30)}px` });
    label.textContent = `${Math.round(width)} Ã— ${Math.round(height)}`;
  });
  root.addEventListener('pointerup', event => {
    if (!dragging) return; dragging = false;
    const rect = { x: Math.min(startX, event.clientX), y: Math.min(startY, event.clientY), width: Math.abs(event.clientX - startX), height: Math.abs(event.clientY - startY) };
    cleanup(); document.removeEventListener('keydown', key, true);
    if (rect.width >= 4 && rect.height >= 4) setTimeout(() => chrome.runtime.sendMessage({ type: 'AREA_SELECTED', rect, dpr: devicePixelRatio }), 80);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === 'PING') { respond(true); return; }
  if (message.type === 'START_SELECTION') { startSelection(); respond(true); return; }
  if (message.type === 'PREPARE_FULL') {
    originalScroll = { x: scrollX, y: scrollY };
    captureStyle = document.createElement('style');
    captureStyle.textContent = '* { scroll-behavior: auto !important; } [data-snapsave-hidden] { visibility: hidden !important; }';
    document.documentElement.append(captureStyle);
    document.querySelectorAll<HTMLElement>('*').forEach(el => { const p = getComputedStyle(el).position; if ((p === 'fixed' || p === 'sticky') && el.getBoundingClientRect().top < innerHeight) el.dataset.snapsaveFixed = 'true'; });
    respond(metrics()); return;
  }
  if (message.type === 'SCROLL_TO') { document.querySelectorAll<HTMLElement>('[data-snapsave-fixed]').forEach(el => { if (message.y > 0) el.dataset.snapsaveHidden = 'true'; else delete el.dataset.snapsaveHidden; }); scrollTo(message.x, message.y); requestAnimationFrame(() => requestAnimationFrame(() => respond(true))); return true; }
  if (message.type === 'FINISH_FULL') {
    document.querySelectorAll('[data-snapsave-hidden]').forEach(el => el.removeAttribute('data-snapsave-hidden'));
    document.querySelectorAll('[data-snapsave-fixed]').forEach(el => el.removeAttribute('data-snapsave-fixed'));
    captureStyle?.remove(); captureStyle = null; scrollTo(originalScroll.x, originalScroll.y); respond(true);
  }
});