import { dist } from '../core/utils.js';

// palette: 지형 색상판 번호. 0~2 는 Gentle Forest 원본 3종, 3~6 은 0번을 다시 칠해 만든다 (render/palette.js)
export const BIOMES = {
    VILLAGE: { name: 'Dragon Village',  safe: true,  palette: 0 },
    LAKE:    { name: 'Mystic Lake',     safe: true,  palette: 0 },
    FOREST:  { name: 'Wild Forest',     safe: false, palette: 0 },
    JUNGLE:  { name: 'Illusion Jungle', safe: false, palette: 1 },
    HOLLOW:  { name: 'Moonlit Hollow',  safe: false, palette: 2 },
    SNOW:    { name: 'Frostfang Peaks', safe: false, palette: 3 },
    VOLCANO: { name: 'Ember Wastes',    safe: false, palette: 4 },
    AUTUMN:  { name: 'Maple Vale',      safe: false, palette: 5 },
    DESERT:  { name: 'Dead Dunes',      safe: false, palette: 6 },
};

export const VILLAGE_RECT = { x: 800, y: 800, w: 800, h: 800 };
export const LAKE = { x: 2000, y: 2000, r: 600 };

// 가장 가까운 거점의 바이옴이 그 땅의 바이옴이 된다 (보로노이). 마을은 북서쪽 숲 한가운데.
const SITES = [
    ['FOREST', 1300, 1300], ['FOREST', 2700, 1500], ['FOREST', 1500, 2800], ['FOREST', 2900, 2900],
    ['HOLLOW', 4500, 1300], ['HOLLOW', 4300, 2700],
    ['JUNGLE', 1300, 4500], ['JUNGLE', 2700, 4400],
    ['AUTUMN', 4400, 4400], ['AUTUMN', 5600, 3400],
    ['SNOW', 6600, 1300], ['SNOW', 7000, 2700], ['SNOW', 5700, 900],
    ['DESERT', 1500, 6600], ['DESERT', 3100, 6400], ['DESERT', 2300, 7500],
    ['VOLCANO', 6600, 6500], ['VOLCANO', 5200, 6600], ['VOLCANO', 7200, 5200],
];

export function getBiome(x, y) {
    const v = VILLAGE_RECT;
    if (x > v.x && x < v.x + v.w && y > v.y && y < v.y + v.h) return 'VILLAGE';
    if (dist({ x, y }, LAKE) < LAKE.r) return 'LAKE';
    let best = 'FOREST', bestD = Infinity;
    for (const [id, sx, sy] of SITES) {
        const d = (x - sx) * (x - sx) + (y - sy) * (y - sy);
        if (d < bestD) { bestD = d; best = id; }
    }
    return best;
}
