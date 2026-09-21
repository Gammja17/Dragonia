import { groundAt } from './terrain.js';

// 지형·소품 충돌. 예전엔 나무가 시야만 가릴 뿐 그냥 통과할 수 있어서
// 지도가 사실상 평지였다. 이제 물과 굵은 소품이 길을 막는다.
//
//  - 물   : 헤엄칠 수 없다. 강을 건너려면 여울(흙길)을 찾아야 한다
//  - 소품 : 나무 둥치·바위·집·분수·상자더미가 막는다. 덤불·고사리·표지판·
//           모닥불·보물상자는 통과한다 (주우러 다가가야 하니까)
//
// 날아다니는 적(def.flying)과 보스는 아무것도 신경 쓰지 않는다.

// 소품 종류별 밑동 크기 (월드 px, 중심에서 좌우/위아래 반지름, 셋째 값은 상자 중심을 위아래로 옮기는 값)
const FOOTPRINT = {
    TREE: [17, 11],
    ROCK: [22, 13],
    STUMP: [17, 10],
    // 집은 그림(240x240)이 밑동보다 훨씬 커서, 밑동만 막으면 집 뒤로 돌아 들어간 용이 그림에 통째로 가려진다
    // (이름표만 떠 있고 몸이 안 보이던 것). 그림이 가리는 자리까지 막는다
    // 위쪽은 110px 까지만: 그보다 위에 서면 머리가 지붕 위로 나와서 보이고, 더 막으면 집 뒤로 난 길까지 막힌다
    HOUSE: [100, 71, -39],
    FOUNTAIN: [42, 24],
    CRATE: [15, 10],
    BARREL: [15, 10],
    WATERFALL: [76, 26],
    // 마을 시트에서 캐낸 것들. 몸으로 막아서 지도에 길과 막다른 곳이 생긴다.
    // 작은 잡동사니(자갈·해골·삭정이)는 일부러 넣지 않는다 — 밟고 지나가야 걸리적거리지 않는다
    WELL: [26, 16],
    STALL: [50, 24],
    GATE: [40, 22],
    TEMPLE: [30, 16],
    RUIN: [26, 15],
    BANNER: [12, 9],
    STONE_WALL: [30, 18],
    CAVE_ARCH: [48, 22],
    GARDEN: [46, 30],
    VINE_PILLAR: [14, 9],
    STUMP_TABLE: [30, 16],
    BARRELS: [22, 12],
    CRATE_BIG: [16, 11],
};

const CELL = 160;                   // 공간 해시 칸 크기
let grid = new Map();               // "cx,cy" → [{ x, y, rx, ry }, ...]

const key = (cx, cy) => cx + ',' + cy;

/** 월드를 만든 뒤 한 번 호출. 막히는 소품들을 격자에 담아 둔다 */
export function buildPropGrid(props) {
    grid = new Map();
    for (const p of props) addProp(p);
}

/** 나중에 생긴 소품 하나를 격자에 더한다 */
export function addProp(p) {
    const f = FOOTPRINT[p.type];
    if (!f) return;
    const box = { x: p.x, y: p.y + (f[2] || 0), rx: f[0], ry: f[1] };
    const cx0 = Math.floor((box.x - f[0]) / CELL), cx1 = Math.floor((box.x + f[0]) / CELL);
    const cy0 = Math.floor((box.y - f[1]) / CELL), cy1 = Math.floor((box.y + f[1]) / CELL);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const k = key(cx, cy);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(box);
    }
}

/** (x,y) 에 반지름 r 로 섰을 때 소품에 닿는가 */
function hitsProp(x, y, r) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const list = grid.get(key(cx + i, cy + j));
        if (!list) continue;
        for (const b of list) {
            if (Math.abs(x - b.x) < b.rx + r * 0.75 && Math.abs(y - b.y) < b.ry + r * 0.5) return true;
        }
    }
    return false;
}

/** 지날 수 없는 바닥: 물(바깥 세상) · 벽(던전) · 절벽(바위 고원) */
const BLOCKING = { WATER: 1, WALL: 1, CLIFF: 1 };

/** 막힌 바닥인가. 발밑 한 점만 보면 타일 모서리에서 끼기 쉬워 좌우도 같이 본다 */
function hitsGround(x, y, r) {
    return !!(BLOCKING[groundAt(x, y)]
        || BLOCKING[groundAt(x - r * 0.7, y)]
        || BLOCKING[groundAt(x + r * 0.7, y)]);
}

/** 그 자리에 설 수 없으면 true */
export function solidAt(x, y, r = 18) {
    return hitsGround(x, y, r) || hitsProp(x, y, r);
}

/**
 * 충돌을 보며 옮긴다. 가로·세로를 따로 밀어 보기 때문에 벽을 따라 미끄러진다.
 * 이미 막힌 자리에 끼어 있으면 그냥 보내 준다 (영영 갇히지 않게).
 */
export function slideMove(e, nx, ny, r = 18) {
    if (solidAt(e.x, e.y, r)) { e.x = nx; e.y = ny; return; }
    if (!solidAt(nx, e.y, r)) e.x = nx;
    if (!solidAt(e.x, ny, r)) e.y = ny;
}

/** 이 개체가 충돌을 무시하는가 (날것·보스) */
export function ghosts(e) {
    return !!(e.def && (e.def.flying || e.isBoss)) || e.noClip === true;
}
