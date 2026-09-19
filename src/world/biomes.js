import { dist } from '../core/utils.js';

// palette: Gentle Forest 색상판 번호 (0 = 초록 숲, 1 = 밀림, 2 = 달빛 숲)
export const BIOMES = {
    VILLAGE: { name: 'Dragon Village',  safe: true,  palette: 0 },
    LAKE:    { name: 'Mystic Lake',     safe: true,  palette: 0 },
    FOREST:  { name: 'Wild Forest',     safe: false, palette: 0 },
    JUNGLE:  { name: 'Illusion Jungle', safe: false, palette: 1 },
    HOLLOW:  { name: 'Moonlit Hollow',  safe: false, palette: 2 },
};

export const VILLAGE_RECT = { x: 800, y: 800, w: 800, h: 800 };
export const LAKE = { x: 2000, y: 2000, r: 600 };
const FRONTIER = 3300; // 이 너머 동쪽은 달빛 골짜기, 남쪽은 환영의 밀림

export function getBiome(x, y) {
    const v = VILLAGE_RECT;
    if (x > v.x && x < v.x + v.w && y > v.y && y < v.y + v.h) return 'VILLAGE';
    if (dist({ x, y }, LAKE) < LAKE.r) return 'LAKE';
    const ex = x - FRONTIER, ey = y - FRONTIER;
    if (ex > 0 && ex >= ey) return 'HOLLOW';
    if (ey > 0) return 'JUNGLE';
    return 'FOREST';
}
