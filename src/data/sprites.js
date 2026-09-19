// 드래곤 스프라이트 시트 정의. 출처/라이선스는 CREDITS.md 참고.
const D = 'assets/sprites/dragons/';

export const DRAGON_SHEETS = {
    // ZaPaper "Red Dragon" (CC-BY 3.0): 방향별 파일, 4행(이동/대기/피격/공격) × 4열, 205x161
    WESTERN: {
        type: 'perDir',
        images: { right: D + 'western_right.png', down: D + 'western_down.png', left: D + 'western_left.png', up: D + 'western_up.png' },
        fw: 205, fh: 161,
        anims: {
            move:   { row: 0, count: 4, fps: 8 },
            idle:   { row: 1, count: 4, fps: 5 },
            hit:    { row: 2, count: 4, fps: 12, loop: false },
            attack: { row: 3, count: 4, fps: 10, loop: false },
        },
        scale: 0.72, anchor: { x: 0.45, y: 0.8 }, flying: true,
        zones: [
            { hue: 0, range: 30, refL: 0.35, target: 'body' },
            { hue: 48, range: 22, refL: 0.5, target: 'wing' },
        ],
    },
    // Flying Dragon Rework (CC-BY 3.0): 4행(N/E/S/W) × 3열, 144x128
    WYVERN: {
        type: 'rows',
        images: { sheet: D + 'wyvern.png' },
        fw: 144, fh: 128,
        rows: { up: 0, right: 1, down: 2, left: 3 },
        anims: {
            idle:   { cols: [1, 0, 1, 2], fps: 5 },
            move:   { cols: [0, 1, 2, 1], fps: 9 },
            attack: { cols: [0, 2, 0], fps: 10, loop: false },
            hit:    { cols: [2, 1], fps: 10, loop: false },
        },
        scale: 0.85, anchor: { x: 0.5, y: 0.85 }, flying: true,
        zones: [
            { hue: 0, range: 30, refL: 0.35, target: 'body' },
            { hue: 48, range: 22, refL: 0.5, target: 'wing' },
        ],
    },
    // Flying Dragon Rework 쌍두 (CC-BY 3.0)
    HYDRA: {
        type: 'rows',
        images: { sheet: D + 'hydra.png' },
        fw: 144, fh: 128,
        rows: { up: 0, right: 1, down: 2, left: 3 },
        anims: {
            idle:   { cols: [1, 0, 1, 2], fps: 5 },
            move:   { cols: [0, 1, 2, 1], fps: 9 },
            attack: { cols: [0, 2, 0], fps: 10, loop: false },
            hit:    { cols: [2, 1], fps: 10, loop: false },
        },
        scale: 0.9, anchor: { x: 0.5, y: 0.85 }, flying: true,
        zones: [
            { hue: 215, range: 35, refL: 0.35, target: 'body' },
            { hue: 48, range: 22, refL: 0.5, target: 'wing' },
        ],
    },
    // Stendhal Dragons, Kimmo Rundelin (CC-BY-SA 3.0): 4행(N/E/S/W) × 3열, 96x128, 걷는 타입
    BEHEMOTH: {
        type: 'rows',
        images: { sheet: D + 'behemoth.png' },
        fw: 96, fh: 128,
        rows: { up: 0, right: 1, down: 2, left: 3 },
        anims: {
            idle:   { cols: [1], fps: 1 },
            move:   { cols: [0, 1, 2, 1], fps: 7 },
            attack: { cols: [0, 2, 1], fps: 9, loop: false },
            hit:    { cols: [2, 1], fps: 10, loop: false },
        },
        scale: 0.95, anchor: { x: 0.5, y: 0.95 }, flying: false,
        zones: [
            { hue: 120, range: 40, refL: 0.35, target: 'body' },
            { hue: 42, range: 22, refL: 0.45, target: 'wing' },
        ],
    },
    // Stendhal 뼈 드래곤 (보스/언데드용, 색 교체 없음)
    BONE: {
        type: 'rows',
        images: { sheet: D + 'bone.png' },
        fw: 96, fh: 128,
        rows: { up: 0, right: 1, down: 2, left: 3 },
        anims: {
            idle:   { cols: [1], fps: 1 },
            move:   { cols: [0, 1, 2, 1], fps: 7 },
            attack: { cols: [0, 2, 1], fps: 9, loop: false },
            hit:    { cols: [2, 1], fps: 10, loop: false },
        },
        scale: 1.1, anchor: { x: 0.5, y: 0.95 }, flying: false,
        zones: [],
    },
};

export const PLAYABLE_SPECIES = ['WESTERN', 'WYVERN', 'HYDRA', 'BEHEMOTH'];
