// Finds an installed Chrome for puppeteer-core. Set CHROME_PATH to override.
import fs from 'node:fs';

const candidates = {
  win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
};

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const found = (candidates[process.platform] ?? []).find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome not found. Set CHROME_PATH to your chrome executable.');
  return found;
}
