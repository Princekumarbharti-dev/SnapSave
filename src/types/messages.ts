export type CaptureMode = 'visible' | 'full' | 'area';
export type ImageFormat = 'png' | 'jpeg';

export interface Settings {
  format: ImageFormat;
  jpgQuality: number;
  autoDownload: boolean;
  includeWebsite: boolean;
}

export interface PageMetrics {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
  url: string;
}

export interface CaptureResult {
  dataUrl: string;
  url: string;
  width: number;
  height: number;
}

export type Request =
  | { type: 'CAPTURE'; mode: CaptureMode }
  | { type: 'START_AREA' }
  | { type: 'AREA_SELECTED'; rect: { x: number; y: number; width: number; height: number }; dpr: number }
  | { type: 'GET_LAST_CAPTURE' }
  | { type: 'DOWNLOAD'; dataUrl: string; filename: string }
  | { type: 'COPY'; dataUrl: string };