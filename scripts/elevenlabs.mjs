// Generates the voice lines and sound effects listed in a story file with ElevenLabs.
// Usage: node scripts/elevenlabs.mjs <story.js> <audioDir> [voices|sfx|all=all]
// Needs ELEVENLABS_API_KEY (read from .env if present). Files that already exist are skipped,
// so re-running only spends credits on new or deleted clips. Prints each clip's duration.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

if (!process.env.ELEVENLABS_API_KEY && fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error('Set ELEVENLABS_API_KEY (or put it in .env)');

export function readStory(file) {
  const src = fs.readFileSync(file, 'utf8');
  return JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
}

export function durationMs(file) {
  const out = String(spawnSync(ffmpeg, ['-i', file, '-f', 'null', '-']).stderr);
  const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? Math.round(((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000) : NaN;
}

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const [storyFile, audioDir, which = 'all'] = process.argv.slice(2);
if (storyFile) {
  const story = readStory(storyFile);
  fs.mkdirSync(audioDir, { recursive: true });
  const jobs = [];
  if (which !== 'sfx') for (const l of story.lines) jobs.push([l.id, () => post(
    `https://api.elevenlabs.io/v1/text-to-speech/${story.voices[l.voice].id}?output_format=mp3_44100_128`,
    { text: l.say, model_id: story.model ?? 'eleven_v3' })]);
  if (which !== 'voices') for (const s of story.sfx) jobs.push([s.id, () => post(
    'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',
    { text: s.prompt, duration_seconds: s.seconds, prompt_influence: 0.5 })]);
  for (const [id, make] of jobs) {
    const file = path.join(audioDir, `${id}.mp3`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, await make());
    console.log(`${id}\t${durationMs(file)} ms`);
  }
}
