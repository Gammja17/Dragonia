import { mulberry32 } from '../core/utils.js';
import { TILE, TILE_SRC } from '../data/tiles.js';
import { getTileImage } from './terrain.js';

// 굴 속 한 칸. 용마다 하나씩 배정받아 사는 보금자리다.
//
// 지하 미궁(dungeon.js)과 달리 방 하나뿐이고, 들어갈 때마다 모양이 바뀌지 않는다.
// 씨앗이 같으면 바닥 무늬까지 늘 같다. 꾸며 놓은 가구가 제자리에 있어야 하니까.
//
// 바깥 지도들과 똑같은 얼굴(groundAt/draw/minimap/w/h)을 해서, 나머지 코드가
// 굴 안인지 밖인지 신경 쓰지 않아도 되게 한다.

const FLOOR_TILES = [[0, 4], [1, 4], [2, 4], [3, 4]];
const WALL_TILE = [4, 2];
const WALL_TOP = [4, 3];
const TORCH_TILE = [5, 2];

const WALL = 0, FLOOR = 1;
const PAD = 2;               // 방 둘레의 바위 두께

/**
 * 방 하나짜리 굴을 만든다.
 *   id     지도 id
 *   tw,th  방 안쪽 타일 수
 *   seed   바닥 무늬·횃불 자리
 *   torches 벽에 거는 횃불 수
 */
export function buildRoom({ id, name, tw = 19, th = 13, seed = 1, torches = 3 }) {
    const N = { w: tw + PAD * 2, h: th + PAD * 2 };
    const cells = new Uint8Array(N.w * N.h);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) cells[(y + PAD) * N.w + (x + PAD)] = FLOOR;

    const canvas = bake(cells, N, seed, torches);
    const inside = (tx, ty) => tx >= PAD && ty >= PAD && tx < PAD + tw && ty < PAD + th;

    let mini = null;
    return {
        id, name, biome: 'DEN', room: true,
        tw: N.w, th: N.h,
        w: N.w * TILE, h: N.h * TILE,
        /** 방 안쪽의 월드 좌표 범위 (가구를 놓을 수 있는 칸) */
        floorRect: { x: PAD * TILE, y: PAD * TILE, w: tw * TILE, h: th * TILE },
        center: { x: (PAD + tw / 2) * TILE, y: (PAD + th / 2) * TILE },
        tileAt: (x, y) => ({ tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) }),
        groundAt(x, y) {
            const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
            return inside(tx, ty) ? 'FLOOR' : 'WALL';
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
            const k = size / Math.max(N.w, N.h);
            g.fillStyle = '#6b5a44';
            g.fillRect(PAD * k, PAD * k, tw * k, th * k);
            return mini;
        },
        minimapPlace(size) { return { k: size / (Math.max(N.w, N.h) * TILE), ox: 0, oy: 0 }; },
    };
}

function bake(cells, N, seed, torches) {
    const rng = mulberry32(seed + 7);
    const c = document.createElement('canvas');
    c.width = N.w * TILE_SRC; c.height = N.h * TILE_SRC;
    const g = c.getContext('2d');
    const sheet = getTileImage('dungeon');
    g.fillStyle = '#0a0a10';
    g.fillRect(0, 0, c.width, c.height);
    if (!sheet) return c;
    const put = ([sx, sy], tx, ty) => g.drawImage(sheet, sx * TILE_SRC, sy * TILE_SRC, TILE_SRC, TILE_SRC, tx * TILE_SRC, ty * TILE_SRC, TILE_SRC, TILE_SRC);

    // 아래쪽 벽면(방을 마주보는 면)에 횃불을 고르게 건다
    const facingRow = [];
    for (let ty = 0; ty < N.h; ty++) for (let tx = 0; tx < N.w; tx++) {
        if (cells[ty * N.w + tx] === FLOOR) continue;
        if (ty + 1 < N.h && cells[(ty + 1) * N.w + tx] === FLOOR) facingRow.push(tx + ty * N.w);
    }
    const lit = new Set();
    for (let i = 0; i < torches && facingRow.length; i++) {
        lit.add(facingRow[Math.floor(((i + 0.5) / torches) * facingRow.length)]);
    }

    for (let ty = 0; ty < N.h; ty++) for (let tx = 0; tx < N.w; tx++) {
        const i = ty * N.w + tx;
        if (cells[i] === FLOOR) {
            put(FLOOR_TILES[Math.floor(rng() * FLOOR_TILES.length)], tx, ty);
            continue;
        }
        let touches = false;
        for (let j = -1; j <= 1 && !touches; j++) for (let k = -1; k <= 1; k++) {
            const nx = tx + k, ny = ty + j;
            if (nx < 0 || ny < 0 || nx >= N.w || ny >= N.h) continue;
            if (cells[ny * N.w + nx] === FLOOR) { touches = true; break; }
        }
        if (!touches) continue;
        const facing = ty + 1 < N.h && cells[(ty + 1) * N.w + tx] === FLOOR;
        put(lit.has(i) ? TORCH_TILE : facing ? WALL_TOP : WALL_TILE, tx, ty);
    }
    return c;
}

export { WALL, FLOOR, PAD as ROOM_PAD };
