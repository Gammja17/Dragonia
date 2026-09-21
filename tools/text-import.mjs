#!/usr/bin/env node
// text/dialogue.csv 에서 고친 '대사'를 JS 파일에 되돌려 쓴다.
//
//   node tools/text-import.mjs            → 바뀐 줄만 고치고, 몇 줄 고쳤는지 알려 준다
//
// 자리 찾기: 그 파일 그 줄에 원문이 있으면 거기, 없으면(줄이 밀렸으면) 파일 전체에서 같은 원문을 찾는다.
// 같은 원문이 여러 곳이면 전부 바꾼다 (같은 말이면 같은 고침이 맞다).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES, literalsIn, unescape } from './text-export.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseCsv(text) {
    const rows = []; let row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
            else cell += c;
        } else if (c === '"') q = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
        else cell += c;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.length > 1);
}
const escapeFor = (q, text) => text.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n');

const rows = parseCsv(readFileSync(join(ROOT, 'text/dialogue.csv'), 'utf8')).slice(1);
const byFile = new Map();
for (const [file, lineNo, original, edited] of rows) {
    if (!FILES.includes(file) || original === edited) continue;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ lineNo: Number(lineNo), original, edited });
}
let changed = 0, missed = [];
for (const [file, edits] of byFile) {
    const path = join(ROOT, file);
    const lines = readFileSync(path, 'utf8').split('\n');
    for (const ed of edits) {
        const apply = (i) => {
            let hit = false;
            lines[i] = lines[i].replace(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, (m, q, raw) => {
                if (unescape(raw) !== ed.original) return m;
                hit = true; return q + escapeFor(q, ed.edited) + q;
            });
            return hit;
        };
        let hit = lines[ed.lineNo - 1] !== undefined && apply(ed.lineNo - 1);
        if (!hit) for (let i = 0; i < lines.length; i++) if (literalsIn(lines[i]).some(l => unescape(l.raw) === ed.original)) hit = apply(i) || hit;
        if (hit) changed++; else missed.push(`${file}:${ed.lineNo} ${ed.original.slice(0, 30)}`);
    }
    writeFileSync(path, lines.join('\n'));
}
console.log(`고친 줄 ${changed}개` + (missed.length ? `\n원문을 못 찾은 줄 ${missed.length}개:\n  ` + missed.join('\n  ') : ''));
process.exit(missed.length ? 1 : 0);
