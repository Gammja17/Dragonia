import { dist } from '../core/utils.js';

export const BIOMES = {
    VILLAGE: { name: 'Dragon Village', color: '#795548', dot: '#d35400', safe: true },
    LAKE:    { name: 'Mystic Lake',    color: '#3498db', dot: '#2980b9', safe: true },
    FOREST:  { name: 'Wild Forest',    color: '#27ae60', dot: '#2ecc71', safe: false },
};

export const VILLAGE_RECT = { x: 800, y: 800, w: 800, h: 800 };
export const LAKE = { x: 2000, y: 2000, r: 600 };

export function getBiome(x, y) {
    const v = VILLAGE_RECT;
    if (x > v.x && x < v.x + v.w && y > v.y && y < v.y + v.h) return 'VILLAGE';
    if (dist({ x, y }, LAKE) < LAKE.r) return 'LAKE';
    return 'FOREST';
}
