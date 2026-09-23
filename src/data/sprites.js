// 드래곤 스프라이트 시트 정의. head: 방향별 머리 위치(프레임 크기에 대한 비율) — 장신구를 얹는 자리. 출처/라이선스는 CREDITS.md 참고.
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
        head: { down: [0.48, 0.30], left: [0.28, 0.36], right: [0.72, 0.36], up: [0.5, 0.12] },
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
        head: { down: [0.5, 0.36], left: [0.22, 0.42], right: [0.78, 0.42], up: [0.5, 0.2] },
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
        head: { down: [0.5, 0.36], left: [0.22, 0.42], right: [0.78, 0.42], up: [0.5, 0.2] },
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
        head: { down: [0.5, 0.06], left: [0.33, 0.06], right: [0.62, 0.06], up: [0.5, 0.06] },
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
        head: { down: [0.5, 0.06], left: [0.33, 0.06], right: [0.62, 0.06], up: [0.5, 0.06] },
        scale: 1.1, anchor: { x: 0.5, y: 0.95 }, flying: false,
        zones: [],
    },
};

// ---- 새 외형 ----
// LOOK: 앉은 자세의 한 장짜리 용 26종 (80x64 칸, 13열 × 2행, 모두 왼쪽을 본다). config.look 이 칸 번호.
//       시트는 tools/cut_looks.py 가 원본에서 오려 만든다. 원본은 격자에 맞게 그려져 있지 않아서
//       격자대로 자르면 큰 용(75px)의 목이 잘리고 그 조각이 옆 칸에 섞여 들어간다.
//       애니메이션이 없어서 움직임은 코드로 준다(통통 튀기, 숨쉬기) — render/spritesheet.js 의 procedural
DRAGON_SHEETS.LOOK = {
    type: 'static',
    images: { sheet: D + 'looks.png' },
    fw: 80, fh: 64, cols: 13,
    // 칸 안에서 그림이 실제로 차지하는 자리 (tools/cut_looks.py 가 뽑아 준다).
    // 용마다 체구가 달라 남는 여백도 제각각이라, 이름표와 장신구는 칸이 아니라 이 자리에 맞춘다.
    // 예전엔 칸 꼭대기가 기준이어서 체구가 작은 용은 이름표가 허공에 떠 있었다.
    boxes: [
        { x: 12, y: 17, w: 56, h: 47 }, { x: 15, y: 13, w: 49, h: 51 }, { x: 10, y: 21, w: 59, h: 43 },
        { x: 9, y: 20, w: 62, h: 44 }, { x: 8, y: 16, w: 63, h: 48 }, { x: 11, y: 17, w: 57, h: 47 },
        { x: 8, y: 15, w: 64, h: 49 }, { x: 10, y: 11, w: 60, h: 53 }, { x: 19, y: 6, w: 41, h: 58 },
        { x: 10, y: 23, w: 59, h: 41 }, { x: 8, y: 16, w: 63, h: 48 }, { x: 9, y: 24, w: 62, h: 40 },
        { x: 11, y: 7, w: 57, h: 57 }, { x: 12, y: 6, w: 56, h: 58 }, { x: 18, y: 17, w: 43, h: 47 },
        { x: 9, y: 18, w: 62, h: 46 }, { x: 15, y: 7, w: 50, h: 57 }, { x: 19, y: 13, w: 42, h: 51 },
        { x: 19, y: 13, w: 42, h: 51 }, { x: 2, y: 7, w: 75, h: 57 }, { x: 7, y: 14, w: 66, h: 50 },
        { x: 11, y: 14, w: 57, h: 50 }, { x: 12, y: 14, w: 56, h: 50 }, { x: 10, y: 14, w: 59, h: 50 },
        { x: 10, y: 13, w: 59, h: 51 }, { x: 10, y: 14, w: 59, h: 50 },
    ],
    anims: { idle: { fps: 1 }, move: { fps: 1 }, attack: { fps: 4, loop: false, count: 2 }, hit: { fps: 6, loop: false, count: 2 } },
    scale: 2.5, anchor: { x: 0.5, y: 0.97 }, flying: false, zones: [],
    head: { left: [0.2, 0.3], right: [0.8, 0.3], up: [0.2, 0.3], down: [0.2, 0.3] },
};
// CAST: 마을 인물 18명의 전용 그림 (192x160 칸, 6열 × 3행, 모두 왼쪽을 본다). config.look 이 칸 번호 = CAST_NAMES 의 차례.
//       바르코(GPT-image)로 뽑아 고른 그림을 tools/build_cast.py 가 도트로 줄여 시트로 만든다. 색은 그림에 박혀 있어 색조 교체 없음.
//       한 장짜리라 움직임은 LOOK 과 같은 procedural.
export const CAST_NAMES = ['elder', 'tiamat', 'poco', 'gron', 'nara', 'kairon', 'ember', 'mira', 'vesna',
    'ignar', 'moss', 'fern', 'garam', 'dol', 'riun', 'seiran', 'haru', 'yuan'];
DRAGON_SHEETS.CAST = {
    type: 'static',
    images: { sheet: D + 'cast.png' },
    fw: 192, fh: 160, cols: 6,
    boxes: [
        { x: 30, y: 40, w: 131, h: 120 },   // elder
        { x: 46, y: 40, w: 100, h: 120 },   // tiamat
        { x: 23, y: 40, w: 146, h: 120 },   // poco
        { x: 23, y: 40, w: 146, h: 120 },   // gron
        { x: 21, y: 55, w: 150, h: 105 },   // nara
        { x: 21, y: 89, w: 150, h: 71 },    // kairon
        { x: 26, y: 40, w: 140, h: 120 },   // ember
        { x: 21, y: 41, w: 150, h: 119 },   // mira
        { x: 33, y: 40, w: 126, h: 120 },   // vesna
        { x: 35, y: 40, w: 121, h: 120 },   // ignar
        { x: 21, y: 48, w: 150, h: 112 },   // moss
        { x: 37, y: 40, w: 118, h: 120 },   // fern
        { x: 29, y: 40, w: 134, h: 120 },   // garam
        { x: 26, y: 40, w: 139, h: 120 },   // dol
        { x: 37, y: 40, w: 117, h: 120 },   // riun
        { x: 34, y: 40, w: 123, h: 120 },   // seiran
        { x: 32, y: 40, w: 128, h: 120 },   // haru
        { x: 30, y: 40, w: 131, h: 120 },   // yuan
    ],
    anims: { idle: { fps: 1 }, move: { fps: 1 }, attack: { fps: 4, loop: false, count: 2 }, hit: { fps: 6, loop: false, count: 2 } },
    scale: 1.25, anchor: { x: 0.5, y: 0.97 }, flying: false, zones: [],
    head: { left: [0.2, 0.25], right: [0.8, 0.25], up: [0.2, 0.25], down: [0.2, 0.25] },
};
// SHADOW: Shadow Demon Dragon — 좌우 애니메이션만 있는 큰 용. 행 = idle/move/attack/hit, 왼쪽을 본다
DRAGON_SHEETS.SHADOW = {
    type: 'side',
    images: { sheet: D + 'shadow.png' },
    fw: 357, fh: 192,
    anims: { idle: { row: 0, count: 10, fps: 8 }, move: { row: 1, count: 10, fps: 10 }, attack: { row: 2, count: 10, fps: 14, loop: false }, hit: { row: 3, count: 10, fps: 16, loop: false } },
    scale: 1.0, anchor: { x: 0.52, y: 0.92 }, flying: false, zones: [],
};

// 외형 번호에 붙인 이름 (시작 화면·도감용)
export const LOOK_NAMES = ['은빛 날개', '분홍 실뱀', '분홍 비늘', '청록 금날개', '숲그늘', '노을 날개', '푸른 파도', '이끼 날개', '무지개 이무기', '하늘빛', '자수정', '붉은 새끼', '심해의 고룡',
    '밤하늘', '독니', '복숭아 날개', '옥빛 이무기', '호박 꼬마', '호박 꼬마 2', '폭풍 날개', '그림자', '흑요석', '검붉은 용암', '먹구름', '검은 황금', '잿불'];

export const PLAYABLE_SPECIES = ['WESTERN', 'WYVERN', 'HYDRA', 'BEHEMOTH'];
