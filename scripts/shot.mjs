// Usage: node scripts/shot.mjs <html> <outPng> [width=1280]  -> full-page screenshot
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { chromePath } from './chrome.mjs';

const [html, out, w] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(w ?? 1280), height: 900, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: out, fullPage: true });
  console.log('DONE');
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 3000))]);
  browser.process()?.kill();
  process.exit(0);
}
