// Frame-by-frame recording of an animated page that exposes the __ready/__show/__advance/__done hooks.
// Usage: node scripts/record.mjs <html> <outDir> [fps=25] [width=1200] [height=675] [scale=1.6]
//   Set STILLS=ms,ms,... to only save PNG stills at those times instead of recording.
// Each frame: advance the page's timeline (and every CSS animation) by 1000/fps ms, then screenshot.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import ffmpeg from 'ffmpeg-static';
import { chromePath } from './chrome.mjs';

const CHROME = chromePath();
const [html, out, fpsArg, wArg, hArg, scaleArg] = process.argv.slice(2);
const FPS = Number(fpsArg ?? 25);
const VIEW = { width: Number(wArg ?? 1200), height: Number(hArg ?? 675), deviceScaleFactor: Number(scaleArg ?? 1.6) };
const NAME = path.basename(html, '.html');
const DT = 1000 / FPS;
const framesDir = path.join(out, 'frames');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 600000, args: ['--hide-scrollbars', ...(process.getuid?.() === 0 ? ['--no-sandbox'] : [])] });
try {
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  await page.goto(pathToFileURL(path.resolve(html)).href + '#record', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true');
  await page.evaluate(() => window.__show(0, 0));
  await sleep(300);

  if (process.env.STILLS) {
    for (const ms of process.env.STILLS.split(',').map(Number)) {
      await page.evaluate((ms) => window.__show(0, ms), ms);
      await sleep(400);
      await page.screenshot({ path: path.join(out, `still-${ms}.png`) });
    }
    console.log('DONE stills');
    process.exit(0);
  }

  let n = 0;
  const started = Date.now();
  for (;;) {
    await page.evaluate((dt) => window.__advance(dt), DT);
    const file = path.join(framesDir, `f${String(n).padStart(5, '0')}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
    n++;
    if (n % 250 === 0) console.log(`frame ${n} (${(n / FPS).toFixed(0)}s of video, ${((Date.now() - started) / 1000).toFixed(0)}s elapsed)`);
    if (await page.evaluate(() => window.__done === true)) break;
  }
  // Hold the last frame for a second.
  for (let i = 0; i < FPS; i++) fs.copyFileSync(path.join(framesDir, `f${String(n - 1).padStart(5, '0')}.jpg`), path.join(framesDir, `f${String(n + i).padStart(5, '0')}.jpg`));
  console.log(`captured ${n} frames = ${(n / FPS).toFixed(1)}s`);

  const mp4 = path.join(out, `${NAME}.mp4`);
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'f%05d.jpg'),
    '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-r', '30', '-movflags', '+faststart', mp4]);
  const gif = path.join(out, `${NAME}.gif`);
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', mp4, '-filter_complex',
    'fps=12,scale=' + Math.min(960, VIEW.width * VIEW.deviceScaleFactor) + ':-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    gif]);
  for (const f of [mp4, gif]) console.log(`DONE ${f} ${(fs.statSync(f).size / 1e6).toFixed(1)} MB`);
} catch (err) {
  console.error('FAILED:', err);
  process.exitCode = 1;
} finally {
  await Promise.race([browser.close(), sleep(3000)]);
  browser.process()?.kill();
  process.exit(process.exitCode ?? 0);
}
