import type { Settings } from '../types/messages';

export const DEFAULT_SETTINGS: Settings = {
  format: 'png',
  jpgQuality: 0.9,
  autoDownload: false,
  includeWebsite: true
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return stored as Settings;
}