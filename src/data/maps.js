// 지도 한 장씩. 좌표는 모두 "큰 칸"(96px) 단위다.
//
//   cw, ch     지도 크기 (큰 칸 수). 22×16 이면 2112×1536px — 화면 한두 개 크기
//   plaza      흙으로 깔 네모 [cx, cy, cw, ch]
//   clearings  흙 공터 [[cx, cy, r]] — 결투장·수련장
//   ponds      물웅덩이 [[cx, cy, r]]
//   roads      흙길. 점을 차례로 이어 간다
//   trees      나무 빽빽한 정도 (0~1). 가장자리는 늘 빽빽하게 막는다
//   portals    { side: 'N'|'S'|'E'|'W', to: 지도 id, name }  — 반대편 지도에도 짝이 있어야 한다
//   fixtures   그 지도에만 있는 것들
//                { t:'NPC', name }            고정 NPC (data/npcs.js 의 이름)
//                { t:'PROP', type, at }       집·분수·모닥불 …
//                { t:'NEST', at }             알을 품는 둥지 (아지트)
//                { t:'BOSS', id, at }         보스 결투장
//                { t:'CAVE', id, at }         굴 입구 (data/dungeons.js)
//                { t:'WAYSTONE', at }         이동 석비
//                { t:'DUMMY_SPOT', at }       수련용 허수아비가 설 자리
//
// 포탈은 가장자리 가운데에 저절로 놓인다. 지도끼리 짝이 맞는지는 systems/world.js 가 검사한다.

export const START_MAP = 'VILLAGE';

export const MAPS = {
    // ---------------- 마을과 그 언저리 ----------------
    VILLAGE: {
        name: '드래곤 빌리지', biome: 'VILLAGE', cw: 24, ch: 17, seed: 101, trees: 0.1,
        plaza: [6, 5, 12, 8],
        roads: [[[12, 1], [12, 15]], [[1, 8], [22, 8]]],
        portals: [
            { side: 'N', to: 'DEN', name: '나의 아지트' },
            { side: 'E', to: 'EAST_ROAD', name: '동쪽 숲길' },
            { side: 'S', to: 'SOUTH_ROAD', name: '남쪽 숲길' },
            { side: 'W', to: 'LAKE', name: '신비의 호수' },
        ],
        fixtures: [
            { t: 'NPC', name: 'Elder', at: [10, 7] },
            { t: 'NPC', name: 'Gron', at: [15, 7] },
            { t: 'NPC', name: 'Poco', at: [8, 11] },
            { t: 'NPC', name: 'Tiamat', at: [17, 10] },
            { t: 'PROP', type: 'FOUNTAIN', at: [12, 7] },
            { t: 'PROP', type: 'HOUSE', at: [7, 6] }, { t: 'PROP', type: 'HOUSE', at: [16, 6] },
            { t: 'PROP', type: 'HOUSE', at: [9, 12] }, { t: 'PROP', type: 'HOUSE', at: [16, 12] },
            { t: 'PROP', type: 'CAMPFIRE', at: [12, 10] },
            { t: 'PROP', type: 'BARREL', at: [14, 6] }, { t: 'PROP', type: 'CRATE', at: [15, 11] },
            { t: 'WAYSTONE', at: [12, 12] },
        ],
    },
    DEN: {
        name: '나의 아지트', biome: 'FOREST', cw: 15, ch: 12, seed: 102, trees: 0.35,
        clearings: [[7, 6, 3]],
        roads: [[[7, 11], [7, 6]]],
        portals: [{ side: 'S', to: 'VILLAGE', name: '드래곤 빌리지' }],
        fixtures: [
            // 둥지는 굴 안으로 들어갔다 (data/dens.js 의 DEN_MINE).
            // 굴 입구는 예전에 둥지가 있던 그 자리에 둔다 — 돌아온 용이 헤매지 않게
            { t: 'PROP', type: 'SIGN', at: [8, 5] },
            { t: 'PROP', type: 'CAMPFIRE', at: [9, 7] },
            { t: 'PROP', type: 'BARREL', at: [5, 5] },
            { t: 'WAYSTONE', at: [9, 5] },
        ],
    },
    LAKE: {
        name: '신비의 호수', biome: 'LAKE', cw: 20, ch: 15, seed: 103, trees: 0.4,
        ponds: [[8, 10, 4]],
        roads: [[[18, 7], [14, 7], [14, 11]], [[14, 7], [10, 7], [10, 1]]],
        portals: [
            { side: 'E', to: 'VILLAGE', name: '드래곤 빌리지' },
            { side: 'N', to: 'FALLS', name: '구름 폭포' },
        ],
        fixtures: [
            { t: 'PROP', type: 'CAMPFIRE', at: [14, 11] }, { t: 'PROP', type: 'SIGN', at: [16, 7] },
            { t: 'WAYSTONE', at: [12, 7] },
        ],
    },

    // ---------------- 북쪽: 구름 폭포 너머의 또 다른 마을 ----------------
    // 물줄기를 거슬러 올라가면 폭포가 있고, 그 위에 동양용들이 사는 마을이 있다.
    // 두 마을은 오래 서로를 모른 척해 왔다 (data/chronicle.js 의 만남 사건들).
    FALLS: {
        name: '구름 폭포', biome: 'FALLS', cw: 20, ch: 16, seed: 120, trees: 0.4, wanderer: false,
        // 폭포는 동쪽에 쏟아지고, 위로 오르는 길은 서쪽 벼랑을 탄다
        ponds: [[14, 5, 3]],
        clearings: [[9, 10, 3]],
        roads: [[[10, 14], [10, 2]], [[10, 8], [15, 8]]],
        portals: [
            { side: 'S', to: 'LAKE', name: '신비의 호수' },
            { side: 'N', to: 'CLOUDTOP', name: '구름마루 마을' },
        ],
        fixtures: [
            { t: 'PROP', type: 'WATERFALL', at: [13, 4] },
            { t: 'PROP', type: 'WATERFALL', at: [15, 4] },
            { t: 'PROP', type: 'WATERFALL', at: [14, 3] },
            { t: 'PROP', type: 'SIGN', at: [10, 7] },
            { t: 'PROP', type: 'CAMPFIRE', at: [9, 10] },
            { t: 'WAYSTONE', at: [8, 9] },
        ],
    },
    CLOUDTOP: {
        name: '구름마루 마을', biome: 'CLOUDTOP', cw: 22, ch: 16, seed: 121, trees: 0.18, wanderer: false,
        plaza: [6, 5, 11, 7],
        ponds: [[4, 12, 2], [18, 12, 2]],      // 남쪽 출구는 비워 둔다
        roads: [[[11, 15], [11, 2]], [[2, 8], [19, 8]]],
        portals: [{ side: 'S', to: 'FALLS', name: '구름 폭포' }],
        fixtures: [
            { t: 'PROP', type: 'FOUNTAIN', at: [11, 8] },
            { t: 'PROP', type: 'HOUSE', at: [7, 6] }, { t: 'PROP', type: 'HOUSE', at: [15, 6] },
            { t: 'PROP', type: 'HOUSE', at: [8, 11] }, { t: 'PROP', type: 'HOUSE', at: [15, 11] },
            { t: 'PROP', type: 'CAMPFIRE', at: [11, 11] },
            { t: 'PROP', type: 'BARREL', at: [13, 6] }, { t: 'PROP', type: 'CRATE', at: [9, 9] },
            { t: 'PROP', type: 'SIGN', at: [11, 13] },
            { t: 'WAYSTONE', at: [11, 5] },
        ],
    },

    // ---------------- 동쪽: 수련장 · 달빛 골짜기 · 서리 봉우리 ----------------
    EAST_ROAD: {
        name: '동쪽 숲길', biome: 'FOREST', cw: 22, ch: 15, seed: 104, trees: 0.55,
        ponds: [[5, 11, 2]],
        roads: [[[1, 7], [20, 7]], [[11, 7], [11, 1]]],
        portals: [
            { side: 'W', to: 'VILLAGE', name: '드래곤 빌리지' },
            { side: 'N', to: 'DOJO', name: '카이론의 수련장' },
            { side: 'E', to: 'HOLLOW', name: '달빛 골짜기' },
        ],
        fixtures: [
            { t: 'PROP', type: 'SIGN', at: [11, 8] },
            { t: 'CAVE', id: 'FOREST_HOLE', at: [17, 11] },   // 처음 만나는 굴
        ],
    },
    DOJO: {
        name: '카이론의 수련장', biome: 'FOREST', cw: 18, ch: 13, seed: 105, trees: 0.3,
        clearings: [[9, 6, 4]],
        roads: [[[9, 12], [9, 6]]],
        portals: [{ side: 'S', to: 'EAST_ROAD', name: '동쪽 숲길' }],
        fixtures: [
            { t: 'NPC', name: 'Kairon', at: [9, 4] },
            { t: 'NPC', name: 'Nara', at: [12, 6] },
            { t: 'PROP', type: 'HOUSE', at: [5, 4] },
            { t: 'PROP', type: 'CAMPFIRE', at: [6, 9] }, { t: 'PROP', type: 'CAMPFIRE', at: [12, 9] },
            { t: 'PROP', type: 'CRATE', at: [13, 4] },
            { t: 'WAYSTONE', at: [7, 9] },
            { t: 'DUMMY_SPOT', at: [9, 7] },
        ],
    },
    HOLLOW: {
        name: '달빛 골짜기', biome: 'HOLLOW', cw: 22, ch: 16, seed: 106, trees: 0.6,
        ponds: [[17, 12, 2]],
        roads: [[[1, 8], [20, 8]], [[11, 8], [11, 1]]],
        portals: [
            { side: 'W', to: 'EAST_ROAD', name: '동쪽 숲길' },
            { side: 'N', to: 'SNOW_ROAD', name: '서리 고개' },
            { side: 'E', to: 'MORGATH_LAIR', name: '뼈용의 둥지' },
        ],
        fixtures: [
            { t: 'CAVE', id: 'HOLLOW_BARROW', at: [5, 12] },
            { t: 'WAYSTONE', at: [11, 9] },
        ],
    },
    MORGATH_LAIR: {
        name: '뼈용의 둥지', biome: 'HOLLOW', cw: 18, ch: 13, seed: 107, trees: 0.25,
        clearings: [[10, 6, 5]],
        roads: [[[1, 6], [10, 6]]],
        portals: [{ side: 'W', to: 'HOLLOW', name: '달빛 골짜기' }],
        fixtures: [
            { t: 'BOSS', id: 'MORGATH', at: [10, 6] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 9] }, { t: 'PROP', type: 'CAMPFIRE', at: [14, 9] },
        ],
    },
    SNOW_ROAD: {
        name: '서리 고개', biome: 'SNOW', cw: 20, ch: 15, seed: 108, trees: 0.45,
        ponds: [[4, 4, 2]],
        roads: [[[9, 13], [9, 1]]],
        portals: [
            { side: 'S', to: 'HOLLOW', name: '달빛 골짜기' },
            { side: 'N', to: 'GLACIA_LAIR', name: '얼어붙은 봉우리' },
        ],
        fixtures: [{ t: 'WAYSTONE', at: [11, 7] }],
    },
    GLACIA_LAIR: {
        name: '얼어붙은 봉우리', biome: 'SNOW', cw: 18, ch: 13, seed: 109, trees: 0.2,
        clearings: [[9, 7, 5]],
        roads: [[[9, 12], [9, 7]]],
        portals: [{ side: 'S', to: 'SNOW_ROAD', name: '서리 고개' }],
        fixtures: [
            { t: 'BOSS', id: 'GLACIA', at: [9, 6] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 10] }, { t: 'PROP', type: 'CAMPFIRE', at: [13, 10] },
        ],
    },

    // ---------------- 남쪽: 밀림 · 사막 ----------------
    SOUTH_ROAD: {
        name: '남쪽 숲길', biome: 'FOREST', cw: 22, ch: 15, seed: 110, trees: 0.55,
        ponds: [[17, 4, 2]],
        roads: [[[11, 1], [11, 13]], [[11, 7], [1, 7]]],
        portals: [
            { side: 'N', to: 'VILLAGE', name: '드래곤 빌리지' },
            { side: 'S', to: 'JUNGLE', name: '환영의 밀림' },
            { side: 'W', to: 'DESERT', name: '죽은 사구' },
        ],
        fixtures: [{ t: 'PROP', type: 'SIGN', at: [12, 7] }],
    },
    JUNGLE: {
        name: '환영의 밀림', biome: 'JUNGLE', cw: 22, ch: 16, seed: 111, trees: 0.7,
        ponds: [[5, 5, 2]],
        roads: [[[11, 1], [11, 14]], [[11, 8], [20, 8]]],
        portals: [
            { side: 'N', to: 'SOUTH_ROAD', name: '남쪽 숲길' },
            { side: 'E', to: 'ZALGORA_LAIR', name: '쌍두룡의 둥지' },
            { side: 'S', to: 'AUTUMN', name: '단풍 골' },
        ],
        fixtures: [
            { t: 'CAVE', id: 'JUNGLE_HOLLOW', at: [6, 12] },
            { t: 'WAYSTONE', at: [12, 9] },
        ],
    },
    ZALGORA_LAIR: {
        name: '쌍두룡의 둥지', biome: 'JUNGLE', cw: 18, ch: 13, seed: 112, trees: 0.25,
        clearings: [[10, 6, 5]],
        roads: [[[1, 6], [10, 6]]],
        portals: [{ side: 'W', to: 'JUNGLE', name: '환영의 밀림' }],
        fixtures: [
            { t: 'BOSS', id: 'ZALGORA', at: [10, 6] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 9] }, { t: 'PROP', type: 'CAMPFIRE', at: [14, 9] },
        ],
    },
    DESERT: {
        name: '죽은 사구', biome: 'DESERT', cw: 22, ch: 16, seed: 113, trees: 0.2,
        roads: [[[20, 7], [11, 7], [11, 14]]],
        portals: [
            { side: 'E', to: 'SOUTH_ROAD', name: '남쪽 숲길' },
            { side: 'S', to: 'BASIL_LAIR', name: '모래 폭군의 둥지' },
        ],
        fixtures: [{ t: 'WAYSTONE', at: [12, 7] }, { t: 'PROP', type: 'ROCK', at: [7, 5] }],
    },
    BASIL_LAIR: {
        name: '모래 폭군의 둥지', biome: 'DESERT', cw: 18, ch: 13, seed: 114, trees: 0.1,
        clearings: [[9, 7, 5]],
        roads: [[[9, 1], [9, 7]]],
        portals: [{ side: 'N', to: 'DESERT', name: '죽은 사구' }],
        fixtures: [
            { t: 'BOSS', id: 'BASIL', at: [9, 7] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 10] }, { t: 'PROP', type: 'CAMPFIRE', at: [13, 10] },
        ],
    },

    // ---------------- 먼 남동쪽: 단풍 골 · 잿빛 화산 ----------------
    AUTUMN: {
        name: '단풍 골', biome: 'AUTUMN', cw: 20, ch: 15, seed: 115, trees: 0.6,
        ponds: [[15, 11, 2]],
        roads: [[[9, 1], [9, 7], [18, 7]]],
        portals: [
            { side: 'N', to: 'JUNGLE', name: '환영의 밀림' },
            { side: 'E', to: 'VOLCANO', name: '잿빛 화산' },
        ],
        fixtures: [{ t: 'WAYSTONE', at: [9, 8] }],
    },
    VOLCANO: {
        name: '잿빛 화산', biome: 'VOLCANO', cw: 22, ch: 16, seed: 116, trees: 0.25,
        roads: [[[1, 8], [20, 8]]],
        portals: [
            { side: 'W', to: 'AUTUMN', name: '단풍 골' },
            { side: 'E', to: 'IGNAR_LAIR', name: '화산 정상' },
        ],
        fixtures: [
            { t: 'CAVE', id: 'EMBER_SHAFT', at: [6, 12] },
            { t: 'WAYSTONE', at: [11, 9] },
            { t: 'PROP', type: 'ROCK', at: [15, 5] },
        ],
    },
    IGNAR_LAIR: {
        name: '화산 정상', biome: 'VOLCANO', cw: 18, ch: 13, seed: 117, trees: 0.05,
        clearings: [[10, 6, 6]],
        roads: [[[1, 6], [10, 6]]],
        portals: [{ side: 'W', to: 'VOLCANO', name: '잿빛 화산' }],
        fixtures: [
            { t: 'BOSS', id: 'IGNAR', at: [10, 6] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 9] }, { t: 'PROP', type: 'CAMPFIRE', at: [15, 9] },
        ],
    },
};

/** 이야기가 흐르는 차례. 미니맵의 '가 볼 곳' 과 빠른 이동 목록을 이 순서로 보여 준다 */
export const MAP_ORDER = [
    'VILLAGE', 'DEN', 'LAKE', 'FALLS', 'CLOUDTOP', 'EAST_ROAD', 'DOJO', 'HOLLOW', 'MORGATH_LAIR',
    'SNOW_ROAD', 'GLACIA_LAIR', 'SOUTH_ROAD', 'JUNGLE', 'ZALGORA_LAIR',
    'DESERT', 'BASIL_LAIR', 'AUTUMN', 'VOLCANO', 'IGNAR_LAIR',
];

// 굴(data/dens.js)도 지도 하나로 친다. 이름은 여기서 함께 풀어 준다
let denNames = {};
export function registerMapNames(extra) { denNames = { ...denNames, ...extra }; }
export const mapName = (id) => (MAPS[id] ? MAPS[id].name : denNames[id] || id);
