// Builds a story's soundtrack from its voice lines and sound effects, then muxes it onto a video.
// Usage: node scripts/mix.mjs <story.js> <audioDir> <video.mp4> <out.mp4> [voices|all=all]
// Start times come from timing.js (scripts/timeline.mjs). Sound effects may reuse another clip ("file")
// or loop as a background bed until a line starts ("loop", "until").
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import { readStory } from './elevenlabs.mjs';

const [storyFile, audioDir, video, out, which = 'all'] = process.argv.slice(2);
const story = readStory(storyFile);
const timing = readStory(path.join(path.dirname(storyFile), 'timing.js'));

const clips = story.lines.map((l) => ({ id: l.id, file: l.id, at: timing.lines[l.id].at, gain: l.gain ?? 1, fx: '' }));
if (which === 'all') clips.push(...story.sfx.map((s) => {
  const { at, until } = timing.sfx[s.id];
  const len = until ? (until - at) / 1000 : 0;
  return { id: s.id, file: s.file ?? s.id, at, gain: s.gain ?? 1, loop: s.loop,
    fx: s.loop ? `atrim=0:${len},afade=t=in:d=1.5,afade=t=out:st=${len - 2}:d=2,` : '' };
}));
const present = clips.filter((c) => fs.existsSync(path.join(audioDir, `${c.file}.mp3`)));
for (const c of clips) if (!present.includes(c)) console.warn(`missing ${c.file}.mp3, skipped`);

const inputs = present.flatMap((c) => [...(c.loop ? ['-stream_loop', '-1'] : []), '-i', path.join(audioDir, `${c.file}.mp3`)]);
const chains = present.map((c, i) => `[${i + 1}:a]${c.fx}adelay=${c.at}:all=1,volume=${c.gain}[a${i}]`);
const mix = `${present.map((_, i) => `[a${i}]`).join('')}amix=inputs=${present.length}:normalize=0,loudnorm=I=-16:TP=-1.5,apad[mix]`;
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', video, ...inputs, '-filter_complex', [...chains, mix].join(';'),
  '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
console.log(`DONE ${out} (${present.length} clips)`);
