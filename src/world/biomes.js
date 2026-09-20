import { dist } from '../core/utils.js';

// palette: 지형 색상판 번호. 0~2 는 Gentle Forest 원본 3종, 3~6 은 0번을 다시 칠해 만든다 (render/palette.js)
// name 은 화면에 띄우는 이름(한국어), en 은 원래 붙여 둔 영문 이름
export const BIOMES = {
    VILLAGE: { name: '드래곤 빌리지', en: 'Dragon Village',  safe: true,  palette: 0 },
    LAKE:    { name: '신비의 호수',   en: 'Mystic Lake',     safe: true,  palette: 0 },
    FOREST:  { name: '깊은 숲',       en: 'Wild Forest',     safe: false, palette: 0 },
    JUNGLE:  { name: '환영의 밀림',   en: 'Illusion Jungle', safe: false, palette: 1 },
    HOLLOW:  { name: '달빛 골짜기',   en: 'Moonlit Hollow',  safe: false, palette: 2 },
    SNOW:    { name: '서리 봉우리',   en: 'Frostfang Peaks', safe: false, palette: 3 },
    VOLCANO: { name: '잿빛 화산',     en: 'Ember Wastes',    safe: false, palette: 4 },
    AUTUMN:  { name: '단풍 골',       en: 'Maple Vale',      safe: false, palette: 5 },
    DESERT:  { name: '죽은 사구',     en: 'Dead Dunes',      safe: false, palette: 6 },
};

export const VILLAGE_RECT = { x: 800, y: 800, w: 800, h: 800 };
export const LAKE = { x: 2000, y: 2000, r: 600 };

// 가장 가까운 거점의 바이옴이 그 땅의 바이옴이 된다 (보로노이). 마을은 북서쪽 숲 한가운데.
const SITES = [
    ['FOREST', 1300, 1300], ['FOREST', 2700, 1500], ['FOREST', 1500, 2800], ['FOREST', 2900, 2900],
    ['HOLLOW', 4500, 1300], ['HOLLOW', 4300, 2700],
    ['JUNGLE', 1300, 4500], ['JUNGLE', 2700, 4400],
    ['AUTUMN', 4400, 4400], ['AUTUMN', 5200, 4700],
    ['SNOW', 6600, 1300], ['SNOW', 7000, 2700], ['SNOW', 5700, 900],
    ['DESERT', 1500, 6600], ['DESERT', 3100, 6400], ['DESERT', 2300, 7500],
    ['VOLCANO', 6600, 6500], ['VOLCANO', 5200, 6600], ['VOLCANO', 7200, 5200],
];

// ---------- 지역 ----------
// 큰 강 두 줄기가 월드를 네 덩이로 가른다 (world/terrain.js 의 RIVERS).
// 강은 여울에서만 건널 수 있어서, 이 네 덩이가 실제로 "가야 하는 곳"이 된다.
export const REGIONS = {
    HOMELAND: { name: '마을 숲',     short: '마을',   color: '#7dd36a' },
    EAST:     { name: '동쪽 골짜기', short: '골짜기', color: '#9fb4ff' },
    SOUTH:    { name: '남쪽 밀림',   short: '밀림',   color: '#4fb36a' },
    FAR:      { name: '먼 남동쪽',   short: '남동',   color: '#ff8a4a' },
};
// 강의 대략적인 위치. 정확한 굽이는 terrain.js 가 그리고, 여기서는 어느 덩이인지만 가른다
export const RIVER_X = 3600, RIVER_Y = 3900;

/** 이 좌표가 어느 지역인가 */
export function getRegion(x, y) {
    const east = x > RIVER_X, south = y > RIVER_Y;
    if (!east && !south) return 'HOMELAND';
    if (east && !south) return 'EAST';
    if (!east && south) return 'SOUTH';
    return 'FAR';
}

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
