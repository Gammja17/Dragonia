import { mulberry32 } from '../core/utils.js';
import { TILE, TILE_SRC } from '../data/tiles.js';
import { getTileImage } from './terrain.js';

// 무너진 용의 둥지 — 들어갈 때마다 새로 그려지는 지하 미궁.
// 바깥 세상은 늘 같은 자리에 같은 것이 있어서 이야기를 심을 수 있고,
// 이곳은 매번 달라져서 탐험 그 자체가 목적이 된다.
//
// 지도는 방과 복도로만 이뤄진다. 0 = 벽(못 지나감), 1 = 바닥.
//
// 타일은 assets/tiles/cave.png (Zelda-like tilesets, CC0). 예전엔 Kenney 던전 시트의
// 회색 벽돌이라 "나무뿌리 구멍"인데도 성채 지하감옥처럼 보였다.
//
// 이 시트에서는 갈색 바위가 바닥이고 벽은 그 바닥에 뚫린 검은 구멍이다.
// 그래서 벽을 한 장짜리 그림이 아니라 오토타일로 두른다 — 바깥 세상의 흙·물과 같은 방식.

export const DUNGEON_TILES = Math.ceil(3072 / TILE);      // 한 변 타일 수 (64)
export const DUNGEON_SIZE = DUNGEON_TILES * TILE;          // 월드 좌표에서의 한 변

// 바위 바닥. 밋밋한 두 장을 주로 쓰고 밝은 줄이 난 두 장은 가끔만 섞는다
// (줄무늬를 고르게 섞으면 같은 무늬가 눈에 띄게 반복된다)
const FLOOR_TILES = [[0, 0], [7, 3], [0, 0], [7, 3], [0, 1], [0, 2]];

// 바닥에 뚫린 검은 구멍. 키는 "어느 쪽이 바닥인가"다
const VOID = {
    C: [12, 5],
    N: [12, 4], S: [12, 6], W: [11, 5], E: [13, 5],
    NW: [11, 4], NE: [13, 4], SW: [11, 6], SE: [13, 6],
    iSE: [14, 4], iSW: [15, 4], iNE: [14, 5], iNW: [15, 5],
};

// 바닥에 뒹구는 돌덩이 (반투명이라 바닥 위에 얹는다)
const RUBBLE = [[5, 3], [6, 3], [5, 4], [6, 4], [5, 5], [6, 5], [5, 6]];

const WALL = 0, FLOOR = 1;

/** 방 두 개가 겹치는가 (한 칸 띄워서 본다) */
function overlaps(a, b) {
    return a.x - 1 < b.x + b.w + 1 && a.x + a.w + 1 > b.x - 1
        && a.y - 1 < b.y + b.h + 1 && a.y + a.h + 1 > b.y - 1;
}

/**
 * 한 층을 만든다.
 *  seed  같은 씨앗이면 같은 층 (되돌아왔을 때 모양이 유지된다)
 *  depth 깊이. 깊을수록 방이 많고 넓다
 */
export function generateFloor(seed, depth) {
    const rng = mulberry32(seed);
    const N = DUNGEON_TILES;
    const cells = new Uint8Array(N * N);   // 전부 벽으로 시작
    const rooms = [];
    const wanted = Math.min(14, 7 + depth);

    for (let tries = 0; tries < 300 && rooms.length < wanted; tries++) {
        const w = 6 + Math.floor(rng() * (5 + Math.min(4, depth)));
        const h = 6 + Math.floor(rng() * (5 + Math.min(4, depth)));
        const x = 2 + Math.floor(rng() * (N - w - 4));
        const y = 2 + Math.floor(rng() * (N - h - 4));
        const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
        if (rooms.some(r => overlaps(room, r))) continue;
        rooms.push(room);
    }

    const carve = (tx, ty) => { if (tx > 0 && ty > 0 && tx < N - 1 && ty < N - 1) cells[ty * N + tx] = FLOOR; };
    for (const r of rooms) for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) carve(r.x + i, r.y + j);

    // 복도: 방을 차례로 ㄱ자로 잇고, 몇 개는 더 이어 고리를 만든다 (막다른 길만 있으면 답답하다)
    const link = (a, b) => {
        let x = a.cx, y = a.cy;
        const horizontalFirst = rng() < 0.5;
        const stepX = () => { while (x !== b.cx) { x += Math.sign(b.cx - x); carve(x, y); carve(x, y + 1); } };
        const stepY = () => { while (y !== b.cy) { y += Math.sign(b.cy - y); carve(x, y); carve(x + 1, y); } };
        if (horizontalFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    };
    const order = [...rooms].sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
    for (let i = 1; i < order.length; i++) link(order[i - 1], order[i]);
    for (let i = 0; i < 2 + depth / 2 && order.length > 3; i++) {
        link(order[Math.floor(rng() * order.length)], order[Math.floor(rng() * order.length)]);
    }

    // 들어온 자리는 첫 방, 더 깊이 가는 계단은 가장 먼 방
    const entry = order[0];
    let exit = order[order.length - 1], far = 0;
    for (const r of order) {
        const d = Math.hypot(r.cx - entry.cx, r.cy - entry.cy);
        if (d > far) { far = d; exit = r; }
    }

    return { N, cells, rooms, entry, exit, seed, depth };
}

const toWorld = (t) => t * TILE + TILE / 2;
export const tileCenter = (tx, ty) => ({ x: toWorld(tx), y: toWorld(ty) });

/** 층 하나를 그림으로 구워 둔다. 화면에 보이는 부분만 잘라 쓰는 건 지상과 같다 */
export function bakeFloor(floor) {
    const { N, cells } = floor;
    const rng = mulberry32(floor.seed + 99);
    const c = document.createElement('canvas');
    c.width = c.height = N * TILE_SRC;
    const g = c.getContext('2d');
    const sheet = getTileImage('cave');
    g.fillStyle = '#0a0a10';
    g.fillRect(0, 0, c.width, c.height);
    if (!sheet) return c;
    const put = ([sx, sy], tx, ty) => g.drawImage(sheet, sx * TILE_SRC, sy * TILE_SRC, TILE_SRC, TILE_SRC, tx * TILE_SRC, ty * TILE_SRC, TILE_SRC, TILE_SRC);
    const isFloor = (tx, ty) => tx >= 0 && ty >= 0 && tx < N && ty < N && cells[ty * N + tx] === FLOOR;

    for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
        if (isFloor(tx, ty)) {
            put(FLOOR_TILES[Math.floor(rng() * FLOOR_TILES.length)], tx, ty);
            if (rng() < 0.05) put(RUBBLE[Math.floor(rng() * RUBBLE.length)], tx, ty);   // 가끔 돌덩이
            continue;
        }
        // 벽은 바닥에 뚫린 구멍이다. 바닥과 맞닿은 칸만 테두리를 두르고,
        // 깊은 속은 굳이 그리지 않는다 (어차피 바탕이 같은 검은색이다)
        let key = (isFloor(tx, ty - 1) ? 'N' : '') + (isFloor(tx, ty + 1) ? 'S' : '')
                + (isFloor(tx - 1, ty) ? 'W' : '') + (isFloor(tx + 1, ty) ? 'E' : '');
        if (!key) {
            key = isFloor(tx + 1, ty + 1) ? 'iSE' : isFloor(tx - 1, ty + 1) ? 'iSW'
                : isFloor(tx + 1, ty - 1) ? 'iNE' : isFloor(tx - 1, ty - 1) ? 'iNW' : null;
            if (!key) continue;
        }
        put(VOID[key] || VOID.C, tx, ty);
    }
    return c;
}

/** terrain.setMapOverride 에 넘길 지도 객체 */
export function makeMapAdapter(floor, canvas) {
    const { N, cells } = floor;
    let mini = null;
    return {
        size: DUNGEON_SIZE,
        // 바깥 지도들과 같은 얼굴을 하고 있어야 한다 (경계 클램프·카메라가 w/h 를 본다)
        w: DUNGEON_SIZE, h: DUNGEON_SIZE,
        groundAt(x, y) {
            const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
            if (tx < 0 || ty < 0 || tx >= N || ty >= N) return 'WALL';
            return cells[ty * N + tx] === FLOOR ? 'FLOOR' : 'WALL';
        },
        draw(ctx, cam) {
            const scale = TILE / TILE_SRC;
            const sx = Math.max(0, Math.floor(cam.x / scale));
            const sy = Math.max(0, Math.floor(cam.y / scale));
            const sw = Math.min(canvas.width - sx, Math.ceil(cam.w / scale) + 1);
            const sh = Math.min(canvas.height - sy, Math.ceil(cam.h / scale) + 1);
            if (sw <= 0 || sh <= 0) return;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(canvas, sx, sy, sw, sh, sx * scale, sy * scale, sw * scale, sh * scale);
            ctx.imageSmoothingEnabled = true;
        },
        minimap(size) {
            if (mini && mini.width === size) return mini;
            mini = document.createElement('canvas');
            mini.width = mini.height = size;
            const g = mini.getContext('2d');
            g.fillStyle = '#0a0a10';
            g.fillRect(0, 0, size, size);
            g.fillStyle = '#6b5a44';
            const k = size / N;
            for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
                if (cells[ty * N + tx] === FLOOR) g.fillRect(tx * k, ty * k, Math.ceil(k), Math.ceil(k));
            }
            return mini;
        },
    };
}

/** 방 안의 아무 바닥 칸 (가장자리는 피한다) */
export function spotInRoom(room, rng = Math.random) {
    const tx = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
    const ty = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
    return tileCenter(tx, ty);
}
