import './popup.css';
import type { CaptureResult, ImageFormat } from '../types/messages';
import { captureFilename } from '../utils/filename';
import { convertImage, mimeForFormat } from '../utils/image';
import { imageToPdf } from '../utils/pdf';
import { getSettings } from '../utils/settings';

const app = document.querySelector<HTMLElement>('#app')!;
let result: CaptureResult | null = null;
let format: ImageFormat | 'pdf' = 'png';

const logo = `<span class="mark"><img src="../../icons/icon-48.png" alt=""></span>`;
const actionIcons = {
  visible: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><circle cx="12" cy="12" r="3.25"/><path d="m7 5.5 1.2-2h7.6l1.2 2"/></svg>`,
  full: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
  area: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5H5.5a2 2 0 0 0-2 2V8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16"/><rect x="8" y="8" width="8" height="8" rx="1.5"/></svg>`,
  pdf: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 2.75h7l4 4v14.5h-11Z"/><path d="M13.5 2.75v4h4M9 12h6M9 15.5h6"/></svg>`
};

function errorMessage(message: string) { const node = document.querySelector('.status'); if (node) node.textContent = message; else app.insertAdjacentHTML('beforeend', `<div class="status" role="alert"></div>`), document.querySelector('.status')!.textContent = message; }
function loading(label = 'Capturing your pageâ€¦') { app.innerHTML = `<section class="app loading"><div class="spinner"></div>${label}</section>`; }

function home() {
  result = null; app.innerHTML = `<section class="app"><header class="brand">${logo}<div><h1>SnapSave</h1><p class="tagline">Capture anything. Save anywhere.</p></div></header><div class="grid"><button class="capture" data-mode="visible"><span class="icon">${actionIcons.visible}</span><strong>Visible screenshot</strong><small>Current browser view</small></button><button class="capture" data-mode="full"><span class="icon">${actionIcons.full}</span><strong>Full page</strong><small>Entire scrolling page</small></button><button class="capture" data-mode="area"><span class="icon">${actionIcons.area}</span><strong>Select area</strong><small>Drag to capture</small></button><button class="capture" data-mode="pdf"><span class="icon">${actionIcons.pdf}</span><strong>Save as PDF</strong><small>Clean local export</small></button></div><footer class="footer"><span>Private Â· Local Â· No tracking</span><button class="link" id="settings">Settings</button></footer></section>`;
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.onclick = () => capture(button.dataset.mode!));
  document.querySelector<HTMLButtonElement>('#settings')!.onclick = () => chrome.runtime.openOptionsPage();
}

async function capture(mode: string) {
  if (mode === 'area') { const response = await chrome.runtime.sendMessage({ type: 'START_AREA' }); if (!response?.ok) errorMessage(response?.error); else window.close(); return; }
  loading(mode === 'full' || mode === 'pdf' ? 'Capturing the full pageâ€¦' : undefined);
  const response = await chrome.runtime.sendMessage({ type: 'CAPTURE', mode: mode === 'pdf' ? 'full' : mode });
  if (!response?.ok) { home(); errorMessage(response?.error ?? "SnapSave can't capture this page."); return; }
  result = response.result; format = mode === 'pdf' ? 'pdf' : (await getSettings()).format; renderPreview();
}

function renderPreview() {
  if (!result) return home();
  app.innerHTML = `<section class="app preview"><header class="preview-head"><div class="brand">${logo}<h1>SnapSave</h1></div><span style="font-size:11px;color:#798197">Ready</span></header><div class="preview-box"><img alt="Screenshot preview"></div><div class="meta">${result.width.toLocaleString()} Ã— ${result.height.toLocaleString()} px</div><div class="formats" role="group" aria-label="Export format">${['png','jpeg','pdf'].map(item => `<button class="format ${format === item ? 'active' : ''}" data-format="${item}">${item === 'jpeg' ? 'JPG' : item.toUpperCase()}</button>`).join('')}</div><div class="actions"><button class="action secondary" id="copy">Copy</button><button class="action primary" id="download">Download</button></div><button class="again" id="again">â† Capture again</button></section>`;
  document.querySelector<HTMLImageElement>('.preview-box img')!.src = result.dataUrl;
  document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach(button => button.onclick = () => { format = button.dataset.format as typeof format; renderPreview(); });
  document.querySelector<HTMLButtonElement>('#again')!.onclick = home;
  document.querySelector<HTMLButtonElement>('#copy')!.onclick = () => void copy();
  document.querySelector<HTMLButtonElement>('#download')!.onclick = () => void download();
}

async function copy() {
  if (!result) return;
  try { const png = await convertImage(result.dataUrl, 'png', 1); const blob = await (await fetch(png)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); document.querySelector('#copy')!.textContent = 'Copied!'; }
  catch { errorMessage('Clipboard access was blocked. Try Download instead.'); }
}

async function download() {
  if (!result) return; const settings = await getSettings();
  if (format === 'pdf') { const blob = await imageToPdf(result.dataUrl); const url = URL.createObjectURL(blob); await chrome.downloads.download({ url, filename: captureFilename(result.url, 'pdf', settings.includeWebsite), saveAs: true }); setTimeout(() => URL.revokeObjectURL(url), 60_000); return; }
  const dataUrl = await convertImage(result.dataUrl, format, settings.jpgQuality);
  await chrome.runtime.sendMessage({ type: 'DOWNLOAD', dataUrl, filename: captureFilename(result.url, format === 'jpeg' ? 'jpg' : 'png', settings.includeWebsite) });
}

void (async () => { if (new URLSearchParams(location.search).has('preview')) { loading('Preparing previewâ€¦'); const response = await chrome.runtime.sendMessage({ type: 'GET_LAST_CAPTURE' }); result = response?.result; format = (await getSettings()).format; renderPreview(); } else home(); })();

