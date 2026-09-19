// Gentle Forest (Seliel the Shaper) 타일 좌표. 16px 격자 기준 [tx, ty]. 출처는 CREDITS.md 참고.
export const TILE_SRC = 16;   // 원본 타일 크기
export const TILE_SCALE = 3;  // 화면 배율
export const TILE = TILE_SRC * TILE_SCALE; // 월드에서의 타일 크기(48px)

export const TILE_IMAGES = {
    ground: 'assets/tiles/forest.png',
    trees: 'assets/tiles/forest_trees.png',
    props: 'assets/tiles/forest_props.png',
};

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

export const WATER = {
    C: [[1, 9], [2, 9], [1, 10], [2, 10]],
    N: [[1, 8], [2, 8]], S: [[1, 11], [2, 11]], W: [[0, 9], [0, 10]], E: [[3, 9], [3, 10]],
    NW: [[0, 8]], NE: [[3, 8]], SW: [[0, 11]], SE: [[3, 11]],
    iSE: [[4, 6]], iSW: [[5, 6]], iNE: [[4, 7]], iNW: [[5, 7]],
};

// y 정렬로 그려지는 소품. sheet: TILE_IMAGES 키, 픽셀 단위 원본 영역, anchor: 밑동 위치(0~1)
export const PROP_SPRITES = {
    TREE:  [
        { sheet: 'trees', sx: 0,  sy: 0, sw: 80, sh: 96, ax: 0.5, ay: 0.94 },
        { sheet: 'trees', sx: 80, sy: 0, sw: 80, sh: 96, ax: 0.5, ay: 0.94 },
    ],
    STUMP: [{ sheet: 'props', sx: 0,  sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.85 }],
    ROCK:  [{ sheet: 'props', sx: 32, sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.85 }],
    BUSH:  [{ sheet: 'props', sx: 64, sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.85 }],
    FERN:  [{ sheet: 'props', sx: 96, sy: 0, sw: 32, sh: 32, ax: 0.5, ay: 0.9 }],
};
