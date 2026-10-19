// Inlines avatars (DiceBear Notionists, CC0), brand marks (Simple Icons, CC0) and Lucide icons (ISC)
// into the Codecue page template, replacing the /*ASSETS*/ placeholder.
// Usage: node scripts/build.mjs <template.html> <out.html>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import * as si from 'simple-icons';

const require = createRequire(import.meta.url);
const [template, out] = process.argv.slice(2);

const avatars = {
  sarah: ['Wei', 'ffb39e'],
  aminah: ['Arif', 'a8d8c8'],
  daniel: ['Daniel', 'b9c7f0'],
  you: ['Kai', 'f5c26b'],
};
const av = Object.fromEntries(Object.entries(avatars).map(([k, [seed, bg]]) =>
  [k, createAvatar(notionists, { seed, backgroundColor: [bg] }).toString()]));

const brands = { github: si.siGithub, zoom: si.siZoom, meet: si.siGooglemeet, acrobat: si.siAdobeacrobatreader };
const br = Object.fromEntries(Object.entries(brands).map(([k, v]) => [k, { path: v.path, hex: v.hex }]));

const lucideDir = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons');
const names = ['folder-git-2', 'code', 'file-text', 'target', 'video', 'mic', 'mic-off', 'monitor-up', 'phone-off', 'lock',
  'sparkles', 'git-pull-request', 'check', 'audio-lines', 'message-circle-question', 'lightbulb', 'users', 'laptop', 'clock',
  'file-code', 'message-square-code', 'circle-check'];
const ic = Object.fromEntries(names.map((n) => {
  const svg = fs.readFileSync(path.join(lucideDir, `${n}.svg`), 'utf8');
  return [n, svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim()];
}));

const assets = `const ASSETS = ${JSON.stringify({ av, br, ic })};`;
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, fs.readFileSync(template, 'utf8').replace('/*ASSETS*/', assets));
console.log(`DONE ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
