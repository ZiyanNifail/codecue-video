// Renders static 4:5 post designs (1080x1350) to PNG, next to each HTML file.
// Usage: node scripts/stills.mjs posts/01-mcp-vs-api/*.html
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { chromePath } from './chrome.mjs';

const files = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  for (const file of files) {
    await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'networkidle0', timeout: 60000 });
    // Wait for web fonts and every <img> (avatars) before the shot.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((im) => im.decode().catch(() => { throw new Error(`image failed: ${im.src}`); })));
    });
    await new Promise((r) => setTimeout(r, 300));
    const out = file.replace(/\.html$/, '.png');
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    console.log(`DONE ${out}`);
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 3000))]);
  browser.process()?.kill();
}
