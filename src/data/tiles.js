// Gentle Forest (Seliel the Shaper) 타일 좌표. 16px 격자 기준 [tx, ty]. 출처는 CREDITS.md 참고.
export const TILE_SRC = 16;   // 원본 타일 크기
export const TILE_SCALE = 3;  // 화면 배율
export const TILE = TILE_SRC * TILE_SCALE; // 월드에서의 타일 크기(48px)

export const TILE_IMAGES = {
    // 숲 시트는 색상판 3종(같은 배치). 뒤의 숫자가 BIOMES[].palette + 1
    ground: 'assets/tiles/forest.png',   ground2: 'assets/tiles/forest2.png',   ground3: 'assets/tiles/forest3.png',
    trees: 'assets/tiles/forest_trees.png', trees2: 'assets/tiles/forest_trees2.png', trees3: 'assets/tiles/forest_trees3.png',
    props: 'assets/tiles/forest_props.png', props2: 'assets/tiles/forest_props2.png', props3: 'assets/tiles/forest_props3.png',
    village: 'assets/tiles/village.png',   // Zelda-like tilesets (CC0)
    dungeon: 'assets/tiles/dungeon.png',   // Kenney Tiny Dungeon (CC0): 적, 사냥꾼, 화살
    cave: 'assets/tiles/cave.png',         // Zelda-like tilesets (CC0): 굴 속 바위 바닥과 검은 구멍
    waterfall: 'assets/tiles/waterfall.png',  // Gentle Forest 의 폭포 애니메이션 (안 쓰고 있던 것)
    sparkle: 'assets/tiles/sparkle.png',      // 물 위에 흐르는 물비늘
};

/**
 * 폭포 애니메이션 시트. 6프레임 × 10행이고, 작가의 사용 설명대로 세 부분으로 나눠 쓴다.
 *   TOP    맨 윗칸 (물이 넘어가는 자리)
 *   FALL   떨어지는 물. 두 행을 번갈아 이어 붙여야 이음매가 안 보인다
 *   SPLASH 바닥에 부딪혀 튀는 물보라. 마지막 낙수 칸을 덮는다
 *   CAP    물보라의 좌우 끝막이 (오른쪽은 뒤집어 쓴다)
 */
export const WATERFALL_SHEET = { frames: 6, fps: 10, TOP: 1, FALL: [2, 3], CAP: [4, 5], SPLASH: [6, 7] };

/**
 * 물비늘. 3프레임 × 3행 — 0 온칸, 1 대각 반칸, 2 작은 조각.
 * 작가 조언대로 물을 덮지 않고 가장자리에 흩뿌린다. 가로로만 흘러야 해서 돌리지 않는다.
 */
export const SPARKLE_SHEET = { frames: 3, fps: 4, FULL: 0, DIAG: 1, SMALL: 2 };

// 둥지: 풀밭 위 돌무더기 고리 (2x2 타일). 지형에 직접 구워 넣는다
export const NEST_RING = [[4, 3], [5, 3], [4, 4], [5, 4]];

export const GRASS = [[1, 5], [2, 5], [1, 6], [2, 6]];
// 풀밭에 가끔 섞이는 장식 타일 (꽃, 잔돌)
export const GRASS_DECOR = [[8, 6], [9, 6], [10, 6], [10, 5], [9, 5]];

/**
 * 오토타일 세트. 영역(흙/물)에 속한 칸이 "어느 쪽이 영역 밖인가"에 따라 타일을 고른다.
 * 키: 밖인 방향. N/E/S/W = 변, NW 등 두 글자 = 바깥 모서리, i+대각 = 안쪽 모서리(대각만 밖)
 */
export const DIRT = {
    C: [[1, 1], [2, 1], [1, 2], [2, 2]],
    N: [[1, 0], [2, 0]], S: [[1, 3], [2, 3]], W: [[0, 1], [0, 2]], E: [[3, 1], [3, 2]],
    NW: [[0, 0]], NE: [[3, 0]], SW: [[0, 3]], SE: [[3, 3]],
    iSE: [[4, 0]], iSW: [[5, 0]], iNE: [[4, 1]], iNW: [[5, 1]],
};

/**
 * 절벽. 흙·물과 똑같은 4x4 오토타일 배치인데, 안쪽(C)은 그냥 풀이다 — 고원 위는 풀밭이니까.
 * 고원 아래로는 CLIFF_FACE 의 바위 면이 이어지고 맨 아랫줄이 둥글게 마감된다.
 * 원본 팩의 usage guides/cliffsamples.png 를 보고 맞췄다.
 *
 * 안쪽 모서리(i*) 타일은 일부러 없다. 절벽은 직사각형 고원으로만 세우기 때문에
 * 오목한 모서리가 생기지 않는다 (world/mapgen.js 의 절벽 생성 참고).
 */
export const CLIFF = {
    C: GRASS,
    N: [[1, 4], [2, 4]], S: [[1, 7], [2, 7]], W: [[0, 5], [0, 6]], E: [[3, 5], [3, 6]],
    NW: [[0, 4]], NE: [[3, 4]], SW: [[0, 7]], SE: [[3, 7]],
};

// 고원 아래로 늘어지는 바위 면. body 를 높이만큼 반복하고 맨 아랫줄에 foot 을 놓는다.
// (1,13)~(2,14) 는 면이 아니라 절벽에 뚫린 동굴 입구라서 여기 넣지 않는다
export const CLIFF_FACE = { body: [[1, 12], [2, 12]], foot: [[1, 15], [2, 15]] };

export const WATER = {
    C: [[1, 9], [2, 9], [1, 10], [2, 10]],
    N: [[1, 8], [2, 8]], S: [[1, 11], [2, 11]], W: [[0, 9], [0, 10]], E: [[3, 9], [3, 10]],
    NW: [[0, 8]], NE: [[3, 8]], SW: [[0, 11]], SE: [[3, 11]],
    iSE: [[4, 6]], iSW: [[5, 6]], iNE: [[4, 7]], iNW: [[5, 7]],
};

// y 정렬로 그려지는 소품. sheet: TILE_IMAGES 키, 픽셀 단위 원본 영역, anchor: 밑동 위치(0~1)
// frames 가 있으면 [sx, sy] 목록을 fps 속도로 돌려 가며 그린다
export const PROP_SPRITES = {
    TREE:  [
        { sheet: 'trees', sx: 0,  sy: 0, sw: 80, sh: 96, ax: 0.5, ay: 0.94 },
        { sheet: 'trees', sx: 80, sy: 0, sw: 80, sh: 96, ax: 0.5, ay: 0.94 },
    ],
    STUMP: [{ sheet: 'props', sx: 0,  sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.85 }],
    ROCK:  [{ sheet: 'props', sx: 32, sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.85 }],
    BUSH:  [{ sheet: 'props', sx: 64, sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.85 }],
    FERN:  [{ sheet: 'props', sx: 96, sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.9 }],
    BERRY: [{ sheet: 'props', sx: 64, sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.85 }], // 덤불 + 코드로 찍은 열매
    HOUSE: [{ sheet: 'village', sx: 96, sy: 0, sw: 80, sh: 80, ax: 0.5, ay: 0.92 }],
    FOUNTAIN: [{ sheet: 'village', sx: 352, sy: 144, sw: 48, sh: 48, ax: 0.5, ay: 0.7, frames: [[352, 144], [400, 144], [448, 144]], fps: 7 }],
    CRATE:  [{ sheet: 'village', sx: 480, sy: 2, sw: 16, sh: 24, ax: 0.5, ay: 0.9 }],
    BARREL: [{ sheet: 'village', sx: 528, sy: 4, sw: 16, sh: 24, ax: 0.5, ay: 0.9 }],
    SIGN:   [{ sheet: 'village', sx: 544, sy: 32, sw: 16, sh: 16, ax: 0.5, ay: 0.95 }],
    BOARD:  [{ sheet: 'village', sx: 544, sy: 32, sw: 16, sh: 16, ax: 0.5, ay: 0.95 }],   // 잡일 게시판
    CHEST:  [{ sheet: 'dungeon', sx: 80, sy: 112, sw: 16, sh: 16, ax: 0.5, ay: 0.9 }],
    CHEST_OPEN: [{ sheet: 'dungeon', sx: 112, sy: 112, sw: 16, sh: 16, ax: 0.5, ay: 0.9 }],

    // ---- 마을 시트에서 캐낸 것들 ----
    // village.png 는 40×36 = 1,440칸짜리인데 집·분수·상자 몇 개만 꺼내 쓰고 있었다.
    // 지도 19장이 죄다 "풀밭 + 흙길 + 연못"으로 보이던 건 깔 것이 다섯 가지뿐이어서였다.
    // 여기 있는 것들을 바이옴별로 나눠 뿌린다 (world/biomes.js 의 decor · landmarks).
    //
    // 큰 것(랜드마크): 지도마다 한두 개만 서서 "여기가 어디인지" 기억에 남게 한다
    WELL:      [{ sheet: 'village', sx: 497, sy: 54,  sw: 31, sh: 58, ax: 0.5, ay: 0.92 }],
    STALL:     [{ sheet: 'village', sx: 288, sy: 359, sw: 80, sh: 85, ax: 0.5, ay: 0.92 }],
    GATE:      [{ sheet: 'village', sx: 409, sy: 361, sw: 62, sh: 94, ax: 0.5, ay: 0.95 }],
    TEMPLE:    [{ sheet: 'village', sx: 98,  sy: 361, sw: 28, sh: 23, ax: 0.5, ay: 0.9 }],
    RUIN:      [{ sheet: 'village', sx: 592, sy: 41,  sw: 32, sh: 39, ax: 0.5, ay: 0.9 }],
    BANNER:    [{ sheet: 'village', sx: 54,  sy: 464, sw: 26, sh: 55, ax: 0.5, ay: 0.95 }],
    STONE_WALL:[{ sheet: 'village', sx: 91,  sy: 103, sw: 26, sh: 33, ax: 0.5, ay: 0.9 }],
    CAVE_ARCH: [{ sheet: 'village', sx: 168, sy: 504, sw: 48, sh: 40, ax: 0.5, ay: 0.95 }],
    GARDEN:    [{ sheet: 'village', sx: 0,   sy: 448, sw: 58, sh: 128, ax: 0.5, ay: 0.95 }],
    VINE_PILLAR:[{ sheet: 'village', sx: 1,  sy: 225, sw: 15, sh: 31, ax: 0.5, ay: 0.92 }],
    STUMP_TABLE:[{ sheet: 'village', sx: 565, sy: 168, sw: 35, sh: 72, ax: 0.5, ay: 0.95 }],

    // 중간 것: 사람이 살던 흔적
    BENCH:     [{ sheet: 'village', sx: 451, sy: 105, sw: 44, sh: 21, ax: 0.5, ay: 0.85 }],
    FENCE:     [{ sheet: 'village', sx: 355, sy: 112, sw: 43, sh: 21, ax: 0.5, ay: 0.85 }],
    BARRELS:   [{ sheet: 'village', sx: 528, sy: 0,   sw: 32, sh: 28, ax: 0.5, ay: 0.9 }],
    CRATE_BIG: [{ sheet: 'village', sx: 564, sy: 129, sw: 26, sh: 31, ax: 0.5, ay: 0.9 }],
    LADDER:    [{ sheet: 'village', sx: 420, sy: 22,  sw: 7,  sh: 38, ax: 0.5, ay: 0.95 }],
    CROPS:     [{ sheet: 'village', sx: 417, sy: 320, sw: 15, sh: 23, ax: 0.5, ay: 0.9 },
                { sheet: 'village', sx: 433, sy: 320, sw: 15, sh: 23, ax: 0.5, ay: 0.9 },
                { sheet: 'village', sx: 449, sy: 320, sw: 15, sh: 23, ax: 0.5, ay: 0.9 }],
    GRAVE:     [{ sheet: 'village', sx: 567, sy: 83,  sw: 20, sh: 24, ax: 0.5, ay: 0.9 },
                { sheet: 'village', sx: 599, sy: 83,  sw: 19, sh: 23, ax: 0.5, ay: 0.9 },
                { sheet: 'village', sx: 567, sy: 112, sw: 20, sh: 16, ax: 0.5, ay: 0.9 }],
    POT:       [{ sheet: 'village', sx: 564, sy: 1,   sw: 9,  sh: 13, ax: 0.5, ay: 0.9 }],

    // 바닥에 깔리는 잡동사니: 밟고 지나가도 되는 것들. 풀밭이 허전하지 않게
    ROCK_MOSS: [{ sheet: 'village', sx: 69,  sy: 26,  sw: 25, sh: 21, ax: 0.5, ay: 0.8 },
                { sheet: 'village', sx: 112, sy: 81,  sw: 16, sh: 14, ax: 0.5, ay: 0.8 },
                { sheet: 'village', sx: 129, sy: 83,  sw: 15, sh: 13, ax: 0.5, ay: 0.8 }],
    PEBBLES:   [{ sheet: 'village', sx: 208, sy: 353, sw: 16, sh: 15, ax: 0.5, ay: 0.7 },
                { sheet: 'village', sx: 162, sy: 86,  sw: 13, sh: 8,  ax: 0.5, ay: 0.7 }],
    GRAVEL:    [{ sheet: 'village', sx: 193, sy: 371, sw: 31, sh: 28, ax: 0.5, ay: 0.7 }],
    SKULL:     [{ sheet: 'village', sx: 450, sy: 34,  sw: 13, sh: 13, ax: 0.5, ay: 0.7 }],
    DEAD_BRANCH:[{ sheet: 'village', sx: 433, sy: 34, sw: 15, sh: 14, ax: 0.5, ay: 0.7 }],
    STEPSTONE: [{ sheet: 'village', sx: 177, sy: 161, sw: 47, sh: 14, ax: 0.5, ay: 0.7 }],
};
