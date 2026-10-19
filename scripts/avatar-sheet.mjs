// Usage: node scripts/avatar-sheet.mjs <out.html>
// Writes a contact sheet of Notionists avatars so we can pick four for the meeting.
import fs from 'node:fs';
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';

const out = process.argv[2];
const seeds = ['Sarah', 'Aminah', 'Daniel', 'Ziyan', 'Mei', 'Hana', 'Farid', 'Priya', 'Arif', 'Lina', 'Omar', 'Wei', 'Nadia', 'Kai', 'Siti', 'Raj'];
const cells = seeds.map((seed) => {
  const svg = createAvatar(notionists, { seed, backgroundColor: ['f5c26b'], radius: 12 }).toString();
  return `<figure style="margin:0;text-align:center;font:14px sans-serif"><div style="width:140px">${svg}</div>${seed}</figure>`;
});
fs.writeFileSync(out, `<body style="margin:0;background:#fff;display:grid;grid-template-columns:repeat(8,140px);gap:12px;padding:12px">${cells.join('')}</body>`);
console.log('DONE');
