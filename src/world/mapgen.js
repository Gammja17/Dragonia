import { mulberry32 } from '../core/utils.js';
import { TILE_SRC, TILE_SCALE, TILE, GRASS, GRASS_DECOR, DIRT, WATER, NEST_RING } from '../data/tiles.js';
import { BIOMES } from './biomes.js';
import { getTileImage } from './terrain.js';

// 한 장짜리 지도를 만든다. 예전엔 8000×8000 한 덩어리였지만,
// 이제 메이플처럼 화면 한두 개 크기의 지도 여러 장을 포탈로 잇는다 (data/maps.js).
//
// 지형은 "큰 칸"(2×2 타일 = 96px) 단위로 만든다. 흙·물 영역의 폭이 늘 2타일 이상이라
// 변 4 + 바깥 모서리 4 + 안쪽 모서리 4 + 가운데, 13종 타일만으로 빈틈없이 이어진다.

export const COARSE_TILES = 2;                       // 큰 칸 한 변의 타일 수
export const COARSE_PX = TILE * COARSE_TILES;        // 큰 칸 한 변의 월드 px (96)

const GRASS_ID = 0, DIRT_ID = 1, WATER_ID = 2;
const GROUND_NAMES = ['GRASS', 'DIRT', 'WATER'];

/** 큰 칸 좌표 → 그 칸 중심의 월드 좌표 */
export const coarseCenter = (c) => (c + 0.5) * COARSE_PX;
/** 월드 좌표 → 큰 칸 좌표 */
export const toCoarse = (world) => Math.floor(world / COARSE_PX);

function pickTile(kinds, tw, th, set, tx, ty) {
    const same = (dx, dy) => {
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= tw || y >= th) return true;
        return kinds[y * tw + x] === kinds[ty * tw + tx];
    };
    let key = (same(0, -1) ? '' : 'N') + (same(0, 1) ? '' : 'S') + (same(-1, 0) ? '' : 'W') + (same(1, 0) ? '' : 'E');
    if (!key) key = !same(1, 1) ? 'iSE' : !same(-1, 1) ? 'iSW' : !same(1, -1) ? 'iNE' : !same(-1, -1) ? 'iNW' : 'C';
    const list = set[key] || set.C;
    // 원본 시트의 2칸 반복 무늬가 이어지도록 위치 홀짝으로 고른다
    const px = tx % 2 ? 0 : 1, py = ty % 2 ? 0 : 1;
    if (list.length === 4) return list[py * 2 + px];
    if (list.length === 2) return list[key === 'N' || key === 'S' ? px : py];
    return list[0];
}

/**
 * 지도 한 장을 만든다.
 *   spec.cw, spec.ch   큰 칸 수 (한 칸 96px)
 *   spec.biome         색상판과 등장 몬스터를 고른다 (world/biomes.js)
 *   spec.plaza         [cx, cy, cw, ch] 흙으로 깔 네모 (마을 광장)
 *   spec.clearings     [[cx, cy, r], ...] 흙 공터 (결투장·수련장, r 은 큰 칸 수)
 *   spec.ponds         [[cx, cy, r], ...] 물웅덩이
 *   spec.roads         [[[cx,cy],[cx,cy], ...], ...] 이어 걷는 흙길
 *   spec.nests         [[cx, cy], ...] 둥지 돌무더기 자리
 */
export function buildMap(spec) {
    const cw = spec.cw, ch = spec.ch;
    const tw = cw * COARSE_TILES, th = ch * COARSE_TILES;
    const kinds = new Uint8Array(tw * th);
    const rng = mulberry32(spec.seed || 1);

    const fill = (cx, cy, id) => {
        if (cx < 0 || cy < 0 || cx >= cw || cy >= ch) return;
        for (let dy = 0; dy < COARSE_TILES; dy++) for (let dx = 0; dx < COARSE_TILES; dx++) {
            kinds[(cy * COARSE_TILES + dy) * tw + cx * COARSE_TILES + dx] = id;
        }
    };
    const kindAt = (cx, cy) => kinds[cy * COARSE_TILES * tw + cx * COARSE_TILES];

    const nests = spec.nests || [];
    const isNestCell = (cx, cy) => nests.some(([nx, ny]) => nx === cx && ny === cy);

    // 1) 물웅덩이
    for (const [px, py, r] of spec.ponds || []) {
        for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
            if (isNestCell(cx, cy)) continue;
            if (Math.hypot(cx - px, cy - py) <= r) fill(cx, cy, WATER_ID);
        }
    }
    // 2) 흙 공터 (결투장·수련장)
    for (const [px, py, r] of spec.clearings || []) {
        for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
            if (Math.hypot(cx - px, cy - py) <= r) fill(cx, cy, DIRT_ID);
        }
    }
    // 3) 마을 광장 (가장자리는 가끔 빼서 네모 반듯하지 않게)
    if (spec.plaza) {
        const [px, py, pw, ph] = spec.plaza;
        for (let cy = py; cy < py + ph; cy++) for (let cx = px; cx < px + pw; cx++) {
            if (isNestCell(cx, cy)) continue;
            const edge = cx === px || cy === py || cx === px + pw - 1 || cy === py + ph - 1;
            const corner = (cx === px || cx === px + pw - 1) && (cy === py || cy === py + ph - 1);
            if (corner || (edge && rng() < 0.35)) continue;
            fill(cx, cy, DIRT_ID);
        }
    }
    // 4) 흙길: 점을 가로세로로 번갈아 이어 간다. 물은 건너뛴다
    for (const road of spec.roads || []) {
        for (let i = 1; i < road.length; i++) {
            let [x, y] = road[i - 1];
            const [tx2, ty2] = road[i];
            let horizontal = true;
            let guard = 0;
            while ((x !== tx2 || y !== ty2) && guard++ < 400) {
                if (kindAt(x, y) !== WATER_ID && !isNestCell(x, y)) fill(x, y, DIRT_ID);
                if (horizontal && x !== tx2) x += Math.sign(tx2 - x);
                else if (y !== ty2) y += Math.sign(ty2 - y);
                else x += Math.sign(tx2 - x);
                horizontal = !horizontal;
            }
            fill(tx2, ty2, kindAt(tx2, ty2) === WATER_ID ? WATER_ID : DIRT_ID);
        }
    }

    return {
        id: spec.id,
        spec,
        cw, ch, tw, th,
        w: tw * TILE, h: th * TILE,
        kinds,
        canvas: bake(kinds, tw, th, spec, rng),
        groundAt(x, y) {
            const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
            if (tx < 0 || ty < 0 || tx >= tw || ty >= th) return 'GRASS';
            return GROUND_NAMES[kinds[ty * tw + tx]];
        },
        draw(ctx, cam) {
            const c = this.canvas;
            if (!c) return;
            const sx = Math.max(0, Math.floor(cam.x / TILE_SCALE));
            const sy = Math.max(0, Math.floor(cam.y / TILE_SCALE));
            const sw = Math.min(c.width - sx, Math.ceil(cam.w / TILE_SCALE) + 1);
            const sh = Math.min(c.height - sy, Math.ceil(cam.h / TILE_SCALE) + 1);
            if (sw <= 0 || sh <= 0) return;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(c, sx, sy, sw, sh, sx * TILE_SCALE, sy * TILE_SCALE, sw * TILE_SCALE, sh * TILE_SCALE);
            ctx.imageSmoothingEnabled = true;
        },
        /** 미니맵 바탕: 지도 전체를 size 안에 비율 그대로 담는다 */
        minimap(size) {
            const out = document.createElement('canvas');
            out.width = out.height = size;
            const g = out.getContext('2d');
            g.fillStyle = '#0b0d16';
            g.fillRect(0, 0, size, size);
            if (!this.canvas) return out;
            const k = Math.min(size / this.canvas.width, size / this.canvas.height);
            const dw = this.canvas.width * k, dh = this.canvas.height * k;
            g.imageSmoothingEnabled = false;
            g.drawImage(this.canvas, (size - dw) / 2, (size - dh) / 2, dw, dh);
            return out;
        },
        /** 미니맵 안에서 월드 좌표가 놓일 자리 */
        minimapPlace(size) {
            const c = this.canvas;
            if (!c) return { k: size / this.w, ox: 0, oy: 0 };
            const k = Math.min(size / c.width, size / c.height) / TILE_SCALE;
            return { k, ox: (size - c.width * k * TILE_SCALE) / 2, oy: (size - c.height * k * TILE_SCALE) / 2 };
        },
    };
}

function bake(kinds, tw, th, spec, rng) {
    const base = getTileImage('ground');
    if (!base) return null;
    const palette = (BIOMES[spec.biome] || BIOMES.FOREST).palette;
    const sheet = getTileImage('ground' + (palette ? palette + 1 : '')) || base;

    const c = document.createElement('canvas');
    c.width = tw * TILE_SRC;
    c.height = th * TILE_SRC;
    const g = c.getContext('2d');
    for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
        const id = kinds[ty * tw + tx];
        let t;
        if (id === DIRT_ID) t = pickTile(kinds, tw, th, DIRT, tx, ty);
        else if (id === WATER_ID) t = pickTile(kinds, tw, th, WATER, tx, ty);
        else if (rng() < 0.09) t = GRASS_DECOR[Math.floor(rng() * GRASS_DECOR.length)];   // 풀밭이 너무 반반해서 꽃·잔돌을 조금 더 섞는다
        else t = GRASS[(ty % 2) * 2 + (tx % 2)];
        g.drawImage(sheet, t[0] * TILE_SRC, t[1] * TILE_SRC, TILE_SRC, TILE_SRC, tx * TILE_SRC, ty * TILE_SRC, TILE_SRC, TILE_SRC);
    }
    // 둥지 돌무더기 (2×2 타일)
    for (const [cx, cy] of spec.nests || []) {
        const nx = cx * COARSE_TILES, ny = cy * COARSE_TILES;
        NEST_RING.forEach(([sx, sy], i) => {
            g.drawImage(base, sx * TILE_SRC, sy * TILE_SRC, TILE_SRC, TILE_SRC,
                (nx + i % 2) * TILE_SRC, (ny + (i >> 1)) * TILE_SRC, TILE_SRC, TILE_SRC);
        });
    }
    return c;
}
