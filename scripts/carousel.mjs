// Renders a carousel page (stacked 1080x1350 .slide elements) to one PNG per slide plus a PDF for LinkedIn document posts.
// Usage: node scripts/carousel.mjs <carousel.html> [outDir=<html dir>/<name>]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { chromePath } from './chrome.mjs';

const [html, outArg] = process.argv.slice(2);
const name = path.basename(html, '.html');
const out = outArg ?? path.join(path.dirname(html), name);
fs.mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: process.getuid?.() === 0 ? ['--no-sandbox'] : [] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => im.decode().catch(() => { throw new Error(`image failed: ${im.src}`); })));
  });
  const slides = await page.$$('.slide');
  for (const [i, slide] of slides.entries()) {
    const file = path.join(out, `slide-${i + 1}.png`);
    await slide.screenshot({ path: file });
    console.log(`DONE ${file}`);
  }
  // One slide per PDF page, at the slide's own size.
  await page.addStyleTag({ content: '@page { size: 1080px 1350px; margin: 0 } .slide { break-after: page }' });
  const pdf = path.join(out, `${name}.pdf`);
  await page.pdf({ path: pdf, width: '1080px', height: '1350px', printBackground: true });
  console.log(`DONE ${pdf} (${slides.length} pages)`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 3000))]);
  browser.process()?.kill();
}
