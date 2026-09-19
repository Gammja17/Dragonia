import { WORLD_SIZE, NEST_POS, HOMES, TRAINING } from '../core/config.js';
import { mulberry32 } from '../core/utils.js';
import { loadImages } from '../render/assets.js';
import { TILE_SRC, TILE_SCALE, TILE, TILE_IMAGES, GRASS, GRASS_DECOR, DIRT, WATER, NEST_RING } from '../data/tiles.js';
import { VILLAGE_RECT, LAKE, BIOMES, getBiome } from './biomes.js';
import { BOSSES } from '../data/enemies.js';
import { recolor, RECOLOR_NAMES } from '../render/palette.js';

// 지형은 "큰 칸"(2x2 타일 = 96px) 단위로 만든다. 그러면 흙/물 영역의 폭이 항상 2타일 이상이라
// 변 4 + 바깥 모서리 4 + 안쪽 모서리 4 + 가운데, 13종 타일만으로 빈틈없이 이어진다.
const MARGIN = 2;                               // 월드 바깥으로 더 그리는 큰 칸 수 (카메라 여유분)
const COARSE = Math.ceil(WORLD_SIZE / (TILE * 2)) + MARGIN * 2; // 한 변 큰 칸 수
const SIZE = COARSE * 2;                        // 한 변 타일 수
const ORIGIN = -MARGIN * TILE * 2;              // 타일 (0,0)의 월드 좌표
const WORLD_SEED = 20260920;

const GRASS_ID = 0, DIRT_ID = 1, WATER_ID = 2;
const GROUND_NAMES = ['GRASS', 'DIRT', 'WATER'];

const kinds = new Uint8Array(SIZE * SIZE);
let images = null;
let mapCanvas = null;

/** 큰 칸 (cx,cy) 중심의 월드 좌표 */
const coarseCenter = (c) => ORIGIN + (c + 0.5) * TILE * 2;
const toCoarse = (world) => Math.floor((world - ORIGIN) / (TILE * 2));

function fillCoarse(cx, cy, id) {
    if (cx < 0 || cy < 0 || cx >= COARSE || cy >= COARSE) return;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        kinds[(cy * 2 + dy) * SIZE + cx * 2 + dx] = id;
    }
}
const coarseKind = (cx, cy) => kinds[cy * 2 * SIZE + cx * 2];

/** (x0,y0) → (x1,y1) 까지 가로/세로 번갈아 걷는 흙길. 물 위는 건너뛴다 */
function carvePath(x0, y0, x1, y1) {
    let x = x0, y = y0, horizontal = true;
    while (x !== x1 || y !== y1) {
        const isNest = [NEST_POS, ...HOMES].some(n => x === toCoarse(n.x) && y === toCoarse(n.y));
        if (coarseKind(x, y) !== WATER_ID && !isNest) fillCoarse(x, y, DIRT_ID);
        if (horizontal && x !== x1) x += Math.sign(x1 - x);
        else if (y !== y1) y += Math.sign(y1 - y);
        else x += Math.sign(x1 - x);
        horizontal = !horizontal;
    }
}

function generate() {
    const rng = mulberry32(WORLD_SEED);
    const v = VILLAGE_RECT;

    // 호수 + 숲 속 작은 연못들
    const arenas = [...Object.values(BOSSES), TRAINING];   // 넓은 흙 공터: 보스 결투장 + 수련장
    const nests = [NEST_POS, ...HOMES];                     // 둥지마다 작은 마당
    const ponds = [{ x: LAKE.x, y: LAKE.y, r: LAKE.r - 90 }];
    while (ponds.length < 26) {
        const p = { x: 200 + rng() * (WORLD_SIZE - 400), y: 200 + rng() * (WORLD_SIZE - 400), r: 120 + rng() * 70 };
        const nearVillage = Math.hypot(p.x - (v.x + v.w / 2), p.y - (v.y + v.h / 2)) < 850;
        const nearPond = ponds.some(o => Math.hypot(p.x - o.x, p.y - o.y) < o.r + p.r + 250);
        const nearArena = [...arenas, ...nests].some(a => Math.hypot(p.x - a.x, p.y - a.y) < 600);
        if (!nearVillage && !nearPond && !nearArena) ponds.push(p);
    }

    for (let cy = 0; cy < COARSE; cy++) for (let cx = 0; cx < COARSE; cx++) {
        const x = coarseCenter(cx), y = coarseCenter(cy);
        if (ponds.some(p => Math.hypot(x - p.x, y - p.y) < p.r)) { fillCoarse(cx, cy, WATER_ID); continue; }
        if (nests.some(n => cx === toCoarse(n.x) && cy === toCoarse(n.y))) continue;                          // 둥지 칸은 풀밭으로
        if (arenas.some(a => Math.hypot(x - a.x, y - a.y) < 340)) { fillCoarse(cx, cy, DIRT_ID); continue; } // 보스 결투장·수련장
        if (nests.some(n => Math.hypot(x - n.x, y - n.y) < 210)) { fillCoarse(cx, cy, DIRT_ID); continue; }    // 둥지 마당

        // 마을 광장: 가장자리 칸은 가끔 빼서 네모 반듯하지 않게
        const inX = x > v.x && x < v.x + v.w, inY = y > v.y && y < v.y + v.h;
        if (inX && inY) {
            const edgeX = x - v.x < 96 || v.x + v.w - x < 96;
            const edgeY = y - v.y < 96 || v.y + v.h - y < 96;
            if (edgeX && edgeY) continue;                    // 네 귀퉁이는 항상 뺀다
            if ((edgeX || edgeY) && rng() < 0.3) continue;
            fillCoarse(cx, cy, DIRT_ID);
        }
    }

    // 마을 → 호수, 마을 → 북서쪽 숲길
    carvePath(toCoarse(v.x + v.w - 100), toCoarse(v.y + v.h - 100), toCoarse(LAKE.x), toCoarse(LAKE.y));
    carvePath(toCoarse(v.x + 100), toCoarse(v.y + 100), toCoarse(250), toCoarse(350));
    // 마을 → 각 보스 결투장
    for (const a of [...arenas, ...nests]) carvePath(toCoarse(v.x + v.w / 2), toCoarse(v.y + v.h / 2), toCoarse(a.x), toCoarse(a.y));
}

/** 격자점마다 고정된 난수를 부드럽게 이은 값 (-0.5 ~ 0.5) */
function smoothNoise(x, y, salt) {
    const at = (ix, iy) => { const n = Math.sin(ix * 127.1 + iy * 311.7 + salt * 74.7) * 43758.5453; return n - Math.floor(n) - 0.5; };
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx, bot = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return top + (bot - top) * sy;
}

function pickTile(set, tx, ty) {
    const same = (dx, dy) => {
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return true;
        return kinds[y * SIZE + x] === kinds[ty * SIZE + tx];
    };
    let key = (same(0, -1) ? '' : 'N') + (same(0, 1) ? '' : 'S') + (same(-1, 0) ? '' : 'W') + (same(1, 0) ? '' : 'E');
    if (!key) {
        key = !same(1, 1) ? 'iSE' : !same(-1, 1) ? 'iSW' : !same(1, -1) ? 'iNE' : !same(-1, -1) ? 'iNW' : 'C';
    }
    const list = set[key] || set.C;
    // 원본 시트의 2칸 반복 무늬가 이어지도록 위치 홀짝으로 고른다
    const px = tx % 2 ? 0 : 1, py = ty % 2 ? 0 : 1;
    if (list.length === 4) return list[py * 2 + px];
    if (list.length === 2) return list[key === 'N' || key === 'S' ? px : py];
    return list[0];
}

function bake() {
    const rng = mulberry32(WORLD_SEED + 1);
    mapCanvas = document.createElement('canvas');
    mapCanvas.width = mapCanvas.height = SIZE * TILE_SRC;
    const g = mapCanvas.getContext('2d');
    for (let ty = 0; ty < SIZE; ty++) for (let tx = 0; tx < SIZE; tx++) {
        const id = kinds[ty * SIZE + tx];
        let t;
        if (id === DIRT_ID) t = pickTile(DIRT, tx, ty);
        else if (id === WATER_ID) t = pickTile(WATER, tx, ty);
        else if (rng() < 0.06) t = GRASS_DECOR[Math.floor(rng() * GRASS_DECOR.length)];
        else t = GRASS[(ty % 2) * 2 + (tx % 2)];
        // 바이옴 경계는 완만한 노이즈로 구불구불하게 (타일마다 따로 흔들면 색종이처럼 깨져 보인다)
        const wx = ORIGIN + (tx + 0.5) * TILE + smoothNoise(tx / 7, ty / 7, 11) * 420, wy = ORIGIN + (ty + 0.5) * TILE + smoothNoise(tx / 7, ty / 7, 47) * 420;
        const palette = BIOMES[getBiome(wx, wy)].palette;
        const sheet = images['ground' + (palette ? palette + 1 : '')];
        g.drawImage(sheet, t[0] * TILE_SRC, t[1] * TILE_SRC, TILE_SRC, TILE_SRC, tx * TILE_SRC, ty * TILE_SRC, TILE_SRC, TILE_SRC);
    }
    // 둥지 돌무더기 (2x2 타일)
    for (const n of [NEST_POS, ...HOMES]) {
        const nx = toCoarse(n.x) * 2, ny = toCoarse(n.y) * 2;
        NEST_RING.forEach(([sx, sy], i) => {
            g.drawImage(images.ground, sx * TILE_SRC, sy * TILE_SRC, TILE_SRC, TILE_SRC, (nx + i % 2) * TILE_SRC, (ny + (i >> 1)) * TILE_SRC, TILE_SRC, TILE_SRC);
        });
    }
}

/** 게임 시작 전에 한 번 호출. 타일 이미지를 받고 지형을 만들어 둔다 */
export async function preloadTerrain() {
    images = await loadImages(TILE_IMAGES);
    // 색상판 3~6: 초록 숲 시트를 다시 칠해 설원·화산·단풍·사막을 만든다 (키는 ground4, trees4 … 식)
    RECOLOR_NAMES.forEach((name, i) => {
        for (const base of ['ground', 'trees', 'props']) images[base + (4 + i)] = recolor(images[base], name, base === 'ground');
    });
    generate();
    bake();
}

export function getTileImage(key) { return images ? images[key] : null; }

/** 월드 좌표의 바닥 종류: 'GRASS' | 'DIRT' | 'WATER' */
export function groundAt(x, y) {
    const tx = Math.floor((x - ORIGIN) / TILE), ty = Math.floor((y - ORIGIN) / TILE);
    if (tx < 0 || ty < 0 || tx >= SIZE || ty >= SIZE) return 'GRASS';
    return GROUND_NAMES[kinds[ty * SIZE + tx]];
}

/** 카메라 영역만큼 지형을 그린다 (월드 좌표계에서 호출) */
export function drawTerrain(ctx, cam) {
    if (!mapCanvas) return;
    // 미리 구운 1배 지도에서 화면에 보이는 부분만 잘라 3배로 확대
    const sx = Math.max(0, Math.floor((cam.x - ORIGIN) / TILE_SCALE));
    const sy = Math.max(0, Math.floor((cam.y - ORIGIN) / TILE_SCALE));
    const sw = Math.min(mapCanvas.width - sx, Math.ceil(cam.w / TILE_SCALE) + 1);
    const sh = Math.min(mapCanvas.height - sy, Math.ceil(cam.h / TILE_SCALE) + 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCanvas, sx, sy, sw, sh, ORIGIN + sx * TILE_SCALE, ORIGIN + sy * TILE_SCALE, sw * TILE_SCALE, sh * TILE_SCALE);
    ctx.imageSmoothingEnabled = true;
}

/** 월드 전체를 size×size 로 줄인 지도 (미니맵 바탕) */
export function getMinimapBase(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const s = -ORIGIN / TILE_SCALE, span = WORLD_SIZE / TILE_SCALE;
    c.getContext('2d').drawImage(mapCanvas, s, s, span, span, 0, 0, size, size);
    return c;
}
