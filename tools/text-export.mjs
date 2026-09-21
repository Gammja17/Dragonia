#!/usr/bin/env node
// 게임 글(대사·제목·안내)을 CSV 한 장으로 뽑는다. 엑셀·구글 시트에서 고친 뒤 text-import.mjs 로 되돌린다.
//
//   node tools/text-export.mjs            → text/dialogue.csv
//
// 열: 파일, 줄, 원문, 대사. '대사' 열만 고친다. 원문·파일·줄은 되돌릴 때 자리를 찾는 열쇠라 건드리지 않는다.
// 한글이 든 문자열 리터럴만 뽑는다. `${c.name}` 같은 자리표시자는 그대로 두면 된다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FILES = [
    'src/data/npcTalk.js', 'src/data/dialogues.js', 'src/data/story.js', 'src/data/chronicle.js',
    'src/data/ceremony.js', 'src/data/quests.js', 'src/systems/tour.js', 'src/data/routines.js',
    'src/data/enemies.js', 'src/data/skills.js', 'src/data/furniture.js', 'src/data/maps.js', 'src/data/npcs.js',
];
const HANGUL = /[가-힣]/;

/** 한 줄에서 문자열 리터럴을 찾는다 (따옴표 종류와 안쪽 원문). 주석 줄은 건너뛴다 */
export function literalsIn(line) {
    const out = [];
    if (/^\s*\/\//.test(line)) return out;
    const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
    let m;
    while ((m = re.exec(line))) if (HANGUL.test(m[2])) out.push({ q: m[1], raw: m[2], at: m.index });
    return out;
}
export const unescape = (raw) => raw.replace(/\\n/g, '\n').replace(/\\(["'`\\])/g, '$1');
export const csvCell = (s) => `"${String(s).replace(/"/g, '""')}"`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const rows = [['파일', '줄', '원문', '대사']];
    for (const f of FILES) {
        const lines = readFileSync(join(ROOT, f), 'utf8').split('\n');
        lines.forEach((line, i) => {
            for (const lit of literalsIn(line)) {
                const text = unescape(lit.raw);
                rows.push([f, String(i + 1), text, text]);
            }
        });
    }
    mkdirSync(join(ROOT, 'text'), { recursive: true });
    const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
    writeFileSync(join(ROOT, 'text/dialogue.csv'), csv);
    console.log(`text/dialogue.csv: ${rows.length - 1}줄`);
}
