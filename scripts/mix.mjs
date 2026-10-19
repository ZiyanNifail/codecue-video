// Builds a story's soundtrack from its voice lines and sound effects, then muxes it onto a video.
// Usage: node scripts/mix.mjs <story.js> <audioDir> <video.mp4> <out.mp4> [voices|all=all]
// Each clip starts at its "at" (ms). Agent voices get a light radio filter so they read as machines.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

const RADIO = 'highpass=f=180,lowpass=f=6500,aecho=0.8:0.5:14:0.22';

const [storyFile, audioDir, video, out, which = 'all'] = process.argv.slice(2);
const src = fs.readFileSync(storyFile, 'utf8');
const story = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));

const clips = story.lines.map((l) => ({ id: l.id, at: l.at, gain: l.gain ?? 1, fx: RADIO }));
if (which === 'all') clips.push(...story.sfx.map((s) => ({ id: s.id, at: s.at, gain: s.gain ?? 1, fx: '' })));
const present = clips.filter((c) => fs.existsSync(path.join(audioDir, `${c.id}.mp3`)));
for (const c of clips) if (!present.includes(c)) console.warn(`missing ${c.id}.mp3, skipped`);

const inputs = present.flatMap((c) => ['-i', path.join(audioDir, `${c.id}.mp3`)]);
const chains = present.map((c, i) => `[${i + 1}:a]${c.fx ? c.fx + ',' : ''}adelay=${c.at}:all=1,volume=${c.gain}[a${i}]`);
const mix = `${present.map((_, i) => `[a${i}]`).join('')}amix=inputs=${present.length}:normalize=0,loudnorm=I=-16:TP=-1.5,apad[mix]`;
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', video, ...inputs, '-filter_complex', [...chains, mix].join(';'),
  '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
console.log(`DONE ${out} (${present.length} clips)`);
