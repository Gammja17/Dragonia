// 지도 한 장씩. 좌표는 모두 "큰 칸"(96px) 단위다.
//
//   cw, ch     지도 크기 (큰 칸 수). 22×16 이면 2112×1536px — 화면 한두 개 크기
//   plaza      흙으로 깔 네모 [cx, cy, cw, ch]
//   clearings  흙 공터 [[cx, cy, r]] — 결투장·수련장
//   ponds      물웅덩이 [[cx, cy, r]]
//   roads      흙길. 점을 차례로 이어 간다
//   trees      나무 빽빽한 정도 (0~1). 가장자리는 늘 빽빽하게 막는다
//   safe       참이면 야생 적이 안 나온다 (바이옴의 safe 와 별개로 지도 하나만)
//   enemyCap   한 번에 있을 수 있는 적 수 (없으면 world/spawn.js 의 기본값 10)
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
        name: '웨스턴 마을', biome: 'VILLAGE', cw: 24, ch: 17, seed: 101, trees: 0.1,
        plaza: [6, 5, 12, 8],
        roads: [[[12, 1], [12, 15]], [[1, 8], [22, 8]]],
        portals: [
            { side: 'E', to: 'EAST_ROAD', name: '동쪽 숲길' },
            { side: 'S', to: 'SOUTH_ROAD', name: '남쪽 숲길' },
            { side: 'W', to: 'LAKE', name: '신비의 호수' },
        ],
        fixtures: [
            { t: 'NPC', name: 'Elder', at: [10, 7] },
            { t: 'NPC', name: 'Gron', at: [15, 7] },
            { t: 'NPC', name: 'Poco', at: [8, 13] },   // 집 바로 뒤 칸(8,11)에 세우면 집 그림에 가려 안 보인다
            { t: 'NPC', name: 'Tiamat', at: [17, 10] },
            { t: 'NPC', name: 'Doran', at: [5, 9] }, { t: 'NPC', name: 'Miru', at: [6, 9] },
            { t: 'NPC', name: 'Dan', at: [15, 13] }, { t: 'NPC', name: 'Soi', at: [17, 13] }, { t: 'NPC', name: 'Nuri', at: [16, 14] },
            { t: 'PROP', type: 'FOUNTAIN', at: [12, 7] },
            { t: 'PROP', type: 'HOUSE', at: [7, 6] }, { t: 'PROP', type: 'HOUSE', at: [16, 6] },
            { t: 'PROP', type: 'HOUSE', at: [9, 12] }, { t: 'PROP', type: 'HOUSE', at: [16, 12] },
            { t: 'PROP', type: 'CAMPFIRE', at: [12, 10] },
            { t: 'PROP', type: 'BOARD', at: [11, 9] },      // 잡일 게시판 (systems/chores.js)
            { t: 'PROP', type: 'BARREL', at: [14, 6] }, { t: 'PROP', type: 'CRATE', at: [15, 11] },
            { t: 'WAYSTONE', at: [12, 12] },
        ],
    },
    LAKE: {
        name: '신비의 호수', biome: 'LAKE', cw: 20, ch: 15, seed: 103, trees: 0.4,
        ponds: [[8, 10, 4]],
        roads: [[[18, 7], [14, 7], [14, 11]], [[14, 7], [10, 7], [10, 1]]],
        portals: [
            { side: 'E', to: 'VILLAGE', name: '웨스턴 마을' },
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
        portals: [
            { side: 'S', to: 'FALLS', name: '구름 폭포' },
            { side: 'N', to: 'SKY_RUINS', name: '구름 위', needsFlight: true },   // 걸어서는 못 넘는다
        ],
        fixtures: [
            { t: 'NPC', name: 'On', at: [10, 9] }, { t: 'NPC', name: 'Biryu', at: [13, 9] },
            { t: 'PROP', type: 'FOUNTAIN', at: [11, 8] },
            { t: 'PROP', type: 'HOUSE', at: [7, 6] }, { t: 'PROP', type: 'HOUSE', at: [15, 6] },
            { t: 'PROP', type: 'HOUSE', at: [8, 11] }, { t: 'PROP', type: 'HOUSE', at: [15, 11] },
            { t: 'PROP', type: 'CAMPFIRE', at: [11, 11] },
            { t: 'PROP', type: 'BARREL', at: [13, 6] }, { t: 'PROP', type: 'CRATE', at: [9, 9] },
            { t: 'PROP', type: 'SIGN', at: [11, 13] },
            { t: 'WAYSTONE', at: [11, 5] },
        ],
    },

    // 구름 위. 성체가 되어 날 수 있어야 온다. 땅은 구름 조각이고 그 사이는 뚫린 하늘이라
    // 걸어서는 건널 수 없다. 이그나르가 돌던 궤도 아래 옛 용들의 폐허가 남아 있다
    SKY_RUINS: {
        name: '구름 위 폐허', biome: 'SKY', cw: 22, ch: 16, seed: 130, trees: 0.06, wanderer: false, chests: 5,
        ponds: [[4, 4, 3], [17, 4, 3], [4, 12, 3], [17, 12, 3], [14, 11, 2], [11, 3, 2], [7, 8, 2], [15, 6, 2]],   // 가운데 세로줄(11)은 비워 둔다. 석비와 남쪽 문이 걸어서 이어져야 한다
        portals: [{ side: 'S', to: 'CLOUDTOP', name: '구름마루 마을' }],
        fixtures: [
            { t: 'WAYSTONE', at: [11, 7] },
            { t: 'PROP', type: 'RUIN', at: [11, 4] },   // 빈 둥지 — 하늘의 용이 태어난 자리. 성체가 여기 서면 고룡으로 깨어난다 (systems/story.js)
            { t: 'PROP', type: 'STONE_WALL', at: [9, 4] }, { t: 'PROP', type: 'STONE_WALL', at: [13, 4] },
            { t: 'PROP', type: 'ROCK', at: [10, 6] }, { t: 'PROP', type: 'ROCK', at: [12, 6] },
            { t: 'PROP', type: 'STUMP', at: [3, 8] }, { t: 'PROP', type: 'STUMP', at: [19, 8] },
        ],
    },

    // ---------------- 동쪽: 수련장 · 달빛 골짜기 · 서리 봉우리 ----------------
    EAST_ROAD: {
        name: '동쪽 숲길', biome: 'FOREST', cw: 22, ch: 15, seed: 104, trees: 0.55, enemyCap: 9,
        ponds: [[5, 11, 2]],
        roads: [[[1, 7], [20, 7]], [[11, 7], [11, 1]]],
        portals: [
            { side: 'W', to: 'VILLAGE', name: '웨스턴 마을' },
            { side: 'N', to: 'DOJO', name: '카이론의 수련장' },
            { side: 'E', to: 'HOLLOW', name: '달빛 골짜기' },
        ],
        fixtures: [
            { t: 'WAYSTONE', at: [11, 4] },   // 늘 지나다니는 길이라 여기서도 건너뛸 수 있게
            { t: 'PROP', type: 'WELL', at: [4, 4] }, { t: 'PROP', type: 'STONE_WALL', at: [18, 5] }, { t: 'PROP', type: 'STONE_WALL', at: [18, 9] },   // 옛 우물, 골짜기 어귀의 돌담
            { t: 'PROP', type: 'SIGN', at: [11, 8] },
            { t: 'CAVE', id: 'FOREST_HOLE', at: [17, 11] },   // 처음 만나는 굴
        ],
    },
    DOJO: {
        name: '카이론의 수련장', biome: 'FOREST', cw: 18, ch: 13, seed: 105, trees: 0.3, safe: true,   // 야생 적 없음. 시험장 표지판이 무리를 부른다
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
            { t: 'PROP', type: 'ARENA', at: [12, 7] },
        ],
    },
    HOLLOW: {
        name: '달빛 골짜기', biome: 'HOLLOW', cw: 22, ch: 16, seed: 106, trees: 0.6,
        ponds: [[17, 12, 2]],
        roads: [[[1, 8], [20, 8]], [[11, 8], [11, 1]]],
        portals: [
            { side: 'W', to: 'EAST_ROAD', name: '동쪽 숲길' },
            { side: 'N', to: 'SNOW_ROAD', name: '서리 고개' },
            { side: 'E', to: 'HOLLOW_DEEP', name: '뼈의 골짜기' },
        ],
        fixtures: [
            { t: 'CAVE', id: 'HOLLOW_BARROW', at: [5, 12] },
            { t: 'WAYSTONE', at: [11, 9] },
            { t: 'PROP', type: 'CAVE_ARCH', at: [19, 8] }, { t: 'PROP', type: 'RUIN', at: [4, 4] }, { t: 'PROP', type: 'BANNER', at: [15, 5] },
        ],
    },
    // 골짜기 안쪽. 삼백 년 전 굴이 골짜기마다 있었다는 그 골짜기. 길이 꺾이며 옛 굴 터를 지난다
    HOLLOW_DEEP: {
        name: '뼈의 골짜기', biome: 'HOLLOW', cw: 22, ch: 16, seed: 161, trees: 0.55, enemyCap: 11, chests: 4,
        ponds: [[3, 13, 2]],
        roads: [[[1, 8], [6, 8], [6, 3], [12, 3], [12, 12], [18, 12], [18, 8], [20, 8]]],
        portals: [
            { side: 'W', to: 'HOLLOW', name: '달빛 골짜기' },
            { side: 'E', to: 'MORGATH_LAIR', name: '뼈용의 둥지' },
        ],
        fixtures: [
            { t: 'WAYSTONE', at: [12, 7] },
            { t: 'PROP', type: 'RUIN', at: [7, 5] }, { t: 'PROP', type: 'RUIN', at: [9, 5] }, { t: 'PROP', type: 'RUIN', at: [14, 10] },   // 옛 굴 터
            { t: 'PROP', type: 'CAVE_ARCH', at: [16, 13] }, { t: 'PROP', type: 'STONE_WALL', at: [11, 2] }, { t: 'PROP', type: 'STONE_WALL', at: [13, 2] },
            { t: 'PROP', type: 'BANNER', at: [6, 9] }, { t: 'PROP', type: 'CAMPFIRE', at: [9, 11] },
        ],
    },
    MORGATH_LAIR: {
        name: '뼈용의 둥지', biome: 'HOLLOW', cw: 18, ch: 13, seed: 107, trees: 0.25,
        clearings: [[10, 6, 5]],
        roads: [[[1, 6], [10, 6]]],
        portals: [{ side: 'W', to: 'HOLLOW_DEEP', name: '뼈의 골짜기' }],
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
            { side: 'N', to: 'SNOW_RIDGE', name: '얼음 능선' },
        ],
        fixtures: [{ t: 'WAYSTONE', at: [11, 7] }, { t: 'PROP', type: 'STONE_WALL', at: [8, 3] }, { t: 'PROP', type: 'STONE_WALL', at: [10, 3] }, { t: 'PROP', type: 'CAMPFIRE', at: [15, 10] }],
    },
    // 서리 고개 위. 얼어붙은 망루와 버려진 야영지를 지나 봉우리로 오른다
    SNOW_RIDGE: {
        name: '얼음 능선', biome: 'SNOW', cw: 20, ch: 18, seed: 162, trees: 0.4, enemyCap: 11, chests: 4,
        ponds: [[16, 15, 2]],
        roads: [[[10, 17], [10, 13], [4, 13], [4, 7], [15, 7], [15, 3], [10, 3], [10, 1]]],
        portals: [
            { side: 'S', to: 'SNOW_ROAD', name: '서리 고개' },
            { side: 'N', to: 'GLACIA_LAIR', name: '얼어붙은 봉우리' },
        ],
        fixtures: [
            { t: 'WAYSTONE', at: [10, 9] },
            { t: 'PROP', type: 'RUIN', at: [4, 5] }, { t: 'PROP', type: 'STONE_WALL', at: [3, 8] }, { t: 'PROP', type: 'STONE_WALL', at: [5, 8] },   // 얼어붙은 망루
            { t: 'PROP', type: 'GATE', at: [15, 5] }, { t: 'PROP', type: 'CAMPFIRE', at: [14, 9] }, { t: 'PROP', type: 'BANNER', at: [12, 12] },
        ],
    },
    GLACIA_LAIR: {
        name: '얼어붙은 봉우리', biome: 'SNOW', cw: 18, ch: 13, seed: 109, trees: 0.2,
        clearings: [[9, 7, 5]],
        roads: [[[9, 12], [9, 7]]],
        portals: [{ side: 'S', to: 'SNOW_RIDGE', name: '얼음 능선' }],
        fixtures: [
            { t: 'BOSS', id: 'GLACIA', at: [9, 6] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 10] }, { t: 'PROP', type: 'CAMPFIRE', at: [13, 10] },
        ],
    },

    // ---------------- 남쪽: 밀림 · 사막 ----------------
    SOUTH_ROAD: {
        name: '남쪽 숲길', biome: 'FOREST', cw: 22, ch: 15, seed: 110, trees: 0.55, enemyCap: 9,
        ponds: [[17, 4, 2]],
        roads: [[[11, 1], [11, 13]], [[11, 7], [1, 7]]],
        portals: [
            { side: 'N', to: 'VILLAGE', name: '웨스턴 마을' },
            { side: 'S', to: 'JUNGLE', name: '환영의 밀림' },
            { side: 'W', to: 'DESERT', name: '죽은 사구' },
        ],
        fixtures: [
            { t: 'WAYSTONE', at: [14, 7] },{ t: 'PROP', type: 'SIGN', at: [12, 7] }],
    },
    JUNGLE: {
        name: '환영의 밀림', biome: 'JUNGLE', cw: 22, ch: 16, seed: 111, trees: 0.7,
        ponds: [[5, 5, 2]],
        roads: [[[11, 1], [11, 14]], [[11, 8], [20, 8]]],
        portals: [
            { side: 'N', to: 'SOUTH_ROAD', name: '남쪽 숲길' },
            { side: 'E', to: 'JUNGLE_DEEP', name: '뿌리 미궁' },
            { side: 'W', to: 'ROOTVALE', name: '뿌리골' },
            { side: 'S', to: 'AUTUMN', name: '단풍 골' },
        ],
        fixtures: [
            { t: 'CAVE', id: 'JUNGLE_HOLLOW', at: [6, 12] },
            { t: 'WAYSTONE', at: [12, 9] },
            { t: 'PROP', type: 'VINE_PILLAR', at: [16, 4] }, { t: 'PROP', type: 'VINE_PILLAR', at: [18, 4] }, { t: 'PROP', type: 'GARDEN', at: [4, 9] },
        ],
    },
    // 밀림 동쪽 깊은 곳. 뿌리에 삼켜진 사당을 지나 잘고라의 사냥터로
    JUNGLE_DEEP: {
        name: '뿌리 미궁', biome: 'JUNGLE', cw: 22, ch: 16, seed: 163, trees: 0.75, enemyCap: 12, chests: 4,
        ponds: [[8, 11, 2], [14, 4, 2]],
        roads: [[[1, 8], [5, 8], [5, 3], [10, 3], [10, 13], [16, 13], [16, 8], [20, 8]]],
        portals: [
            { side: 'W', to: 'JUNGLE', name: '환영의 밀림' },
            { side: 'E', to: 'ZALGORA_LAIR', name: '쌍두룡의 둥지' },
        ],
        fixtures: [
            { t: 'WAYSTONE', at: [10, 6] },
            { t: 'PROP', type: 'TEMPLE', at: [10, 8] },   // 묻힌 사당
            { t: 'PROP', type: 'VINE_PILLAR', at: [9, 7] }, { t: 'PROP', type: 'VINE_PILLAR', at: [11, 7] }, { t: 'PROP', type: 'VINE_PILLAR', at: [9, 9] }, { t: 'PROP', type: 'VINE_PILLAR', at: [11, 9] },
            { t: 'PROP', type: 'GARDEN', at: [17, 10] }, { t: 'PROP', type: 'STUMP', at: [3, 11] }, { t: 'PROP', type: 'STUMP', at: [18, 4] }, { t: 'PROP', type: 'STUMP', at: [4, 12] },
        ],
    },
    ZALGORA_LAIR: {
        name: '쌍두룡의 둥지', biome: 'JUNGLE', cw: 18, ch: 13, seed: 112, trees: 0.25,
        clearings: [[10, 6, 5]],
        roads: [[[1, 6], [10, 6]]],
        portals: [{ side: 'W', to: 'JUNGLE_DEEP', name: '뿌리 미궁' }],
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
            { side: 'S', to: 'DESERT_BONES', name: '뼈 사구' },
            { side: 'W', to: 'STONEBACK', name: '돌등' },
        ],
        fixtures: [{ t: 'WAYSTONE', at: [12, 7] }, { t: 'PROP', type: 'ROCK', at: [7, 5] }, { t: 'PROP', type: 'RUIN', at: [5, 12] }, { t: 'PROP', type: 'BANNER', at: [17, 4] }, { t: 'PROP', type: 'STONE_WALL', at: [16, 12] }],
    },
    // 사구 남쪽. 모래에 반쯤 묻힌 폐허와, 그론의 동료 셋이 마지막으로 선 자리
    DESERT_BONES: {
        name: '뼈 사구', biome: 'DESERT', cw: 22, ch: 16, seed: 164, trees: 0.15, enemyCap: 11, chests: 4,
        roads: [[[11, 1], [11, 5], [4, 5], [4, 11], [16, 11], [16, 7], [11, 7], [11, 14]]],
        portals: [
            { side: 'N', to: 'DESERT', name: '죽은 사구' },
            { side: 'S', to: 'BASIL_LAIR', name: '모래 폭군의 둥지' },
        ],
        fixtures: [
            { t: 'WAYSTONE', at: [11, 8] },
            { t: 'PROP', type: 'RUIN', at: [4, 4] }, { t: 'PROP', type: 'STONE_WALL', at: [4, 12] },
            { t: 'PROP', type: 'BANNER', at: [15, 10] }, { t: 'PROP', type: 'BANNER', at: [16, 10] }, { t: 'PROP', type: 'BANNER', at: [17, 10] },   // 세 개의 깃발 (그론의 못 세 개)
            { t: 'PROP', type: 'ROCK', at: [7, 8] }, { t: 'PROP', type: 'ROCK', at: [14, 3] }, { t: 'PROP', type: 'ROCK', at: [18, 13] }, { t: 'PROP', type: 'ROCK', at: [8, 13] },
        ],
    },
    BASIL_LAIR: {
        name: '모래 폭군의 둥지', biome: 'DESERT', cw: 18, ch: 13, seed: 114, trees: 0.1,
        clearings: [[9, 7, 5]],
        roads: [[[9, 1], [9, 7]]],
        portals: [{ side: 'N', to: 'DESERT_BONES', name: '뼈 사구' }, { side: 'S', to: 'ASH_CITY', name: '불탄 도시' }],
        fixtures: [
            { t: 'BOSS', id: 'BASIL', at: [9, 7] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 10] }, { t: 'PROP', type: 'CAMPFIRE', at: [13, 10] },
        ],
    },

    // 밀림 서쪽 깊은 곳, 풀의 용들이 사는 마을. 잘고라가 사냥터를 차지한 동안 같이 굶었다
    ROOTVALE: {
        name: '뿌리골', biome: 'JUNGLE', cw: 18, ch: 13, seed: 141, trees: 0.5, safe: true, wanderer: false,
        clearings: [[9, 6, 4]],
        roads: [[[17, 6], [9, 6]]],
        portals: [{ side: 'E', to: 'JUNGLE', name: '환영의 밀림' }],
        fixtures: [
            { t: 'NPC', name: 'Moss', at: [8, 5] }, { t: 'NPC', name: 'Fern', at: [11, 8] }, { t: 'NPC', name: 'Beodeul', at: [6, 8] },
            { t: 'PROP', type: 'HOUSE', at: [6, 4] }, { t: 'PROP', type: 'HOUSE', at: [12, 4] },
            { t: 'PROP', type: 'CAMPFIRE', at: [9, 7] }, { t: 'WAYSTONE', at: [14, 7] },
        ],
    },
    // 사막 서쪽의 바위 고원, 땅의 용들이 사는 마을. 바실 때문에 예순 해 동안 바깥과 끊겨 있었다
    STONEBACK: {
        name: '돌등', biome: 'DESERT', cw: 18, ch: 13, seed: 142, trees: 0.04, safe: true, wanderer: false,
        clearings: [[9, 6, 4]],
        roads: [[[17, 6], [9, 6]]],
        portals: [{ side: 'E', to: 'DESERT', name: '죽은 사구' }],
        fixtures: [
            { t: 'NPC', name: 'Garam', at: [8, 5] }, { t: 'NPC', name: 'Dol', at: [11, 8] }, { t: 'NPC', name: 'Jagal', at: [13, 6] },
            { t: 'PROP', type: 'HOUSE', at: [6, 4] }, { t: 'PROP', type: 'HOUSE', at: [12, 4] },
            { t: 'PROP', type: 'ROCK', at: [5, 8] }, { t: 'PROP', type: 'ROCK', at: [13, 9] },
            { t: 'PROP', type: 'CAMPFIRE', at: [9, 7] }, { t: 'WAYSTONE', at: [14, 7] },
        ],
    },

    // 사막 너머. 예순 해 전 이그나르가 통째로 태운 인간의 도시 (7장). 아무도 살지 않는다
    ASH_CITY: {
        name: '불탄 도시', biome: 'VOLCANO', cw: 20, ch: 14, seed: 131, trees: 0.03, safe: true, wanderer: false,
        roads: [[[10, 1], [10, 12]], [[3, 7], [17, 7]]],
        portals: [{ side: 'N', to: 'BASIL_LAIR', name: '모래 폭군의 둥지' }],
        fixtures: [
            { t: 'PROP', type: 'HOUSE', at: [6, 4] }, { t: 'PROP', type: 'HOUSE', at: [14, 4] },
            { t: 'PROP', type: 'HOUSE', at: [5, 10] }, { t: 'PROP', type: 'HOUSE', at: [15, 10] },
            { t: 'PROP', type: 'ROCK', at: [8, 6] }, { t: 'PROP', type: 'ROCK', at: [12, 9] }, { t: 'PROP', type: 'ROCK', at: [16, 7] },
            { t: 'PROP', type: 'CRATE', at: [9, 9] }, { t: 'PROP', type: 'BARREL', at: [11, 5] },
            { t: 'WAYSTONE', at: [10, 3] },
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
        fixtures: [{ t: 'WAYSTONE', at: [9, 8] }, { t: 'PROP', type: 'GATE', at: [16, 7] }, { t: 'PROP', type: 'STUMP_TABLE', at: [5, 11] }, { t: 'PROP', type: 'RUIN', at: [4, 4] }],
    },
    VOLCANO: {
        name: '잿빛 화산', biome: 'VOLCANO', cw: 22, ch: 16, seed: 116, trees: 0.15, safe: true, wanderer: false,   // 기슭에 잿마루가 있다. 예순 해 동안 아무것도 이 마을을 건드리지 못했다
        roads: [[[1, 8], [20, 8]]],
        portals: [
            { side: 'W', to: 'AUTUMN', name: '단풍 골' },
            { side: 'E', to: 'VOLCANO_PATH', name: '잿길' },
        ],
        fixtures: [
            { t: 'CAVE', id: 'EMBER_SHAFT', at: [6, 12] },
            { t: 'WAYSTONE', at: [11, 9] },
            { t: 'PROP', type: 'ROCK', at: [15, 5] },
            // 잿마루: 같은 크기의 집이 같은 간격으로 늘어서 있다
            { t: 'NPC', name: 'Vesna', at: [5, 8] }, { t: 'NPC', name: 'Heukdan', at: [11, 10] }, { t: 'NPC', name: 'Jaetbyeol', at: [15, 10] },
            { t: 'PROP', type: 'HOUSE', at: [8, 5] }, { t: 'PROP', type: 'HOUSE', at: [12, 5] }, { t: 'PROP', type: 'HOUSE', at: [16, 5] },
            { t: 'PROP', type: 'HOUSE', at: [8, 12] }, { t: 'PROP', type: 'HOUSE', at: [12, 12] }, { t: 'PROP', type: 'HOUSE', at: [16, 12] },
            { t: 'PROP', type: 'CAMPFIRE', at: [10, 8] }, { t: 'PROP', type: 'CAMPFIRE', at: [14, 8] },
        ],
    },
    // 잿마루에서 정상으로 오르는 잿길. 잿마루가 세운 검은 문을 지난다
    VOLCANO_PATH: {
        name: '잿길', biome: 'VOLCANO', cw: 22, ch: 14, seed: 165, trees: 0.1, enemyCap: 10, chests: 3,
        roads: [[[1, 7], [6, 7], [6, 3], [12, 3], [12, 11], [18, 11], [18, 7], [20, 7]]],
        portals: [
            { side: 'W', to: 'VOLCANO', name: '잿빛 화산' },
            { side: 'E', to: 'IGNAR_LAIR', name: '화산 정상' },
        ],
        fixtures: [
            { t: 'WAYSTONE', at: [12, 7] },
            { t: 'PROP', type: 'GATE', at: [6, 5] }, { t: 'PROP', type: 'BANNER', at: [5, 6] }, { t: 'PROP', type: 'BANNER', at: [7, 6] },   // 잿마루의 문
            { t: 'PROP', type: 'STONE_WALL', at: [10, 2] }, { t: 'PROP', type: 'STONE_WALL', at: [14, 2] }, { t: 'PROP', type: 'RUIN', at: [17, 12] }, { t: 'PROP', type: 'CAMPFIRE', at: [13, 10] },
        ],
    },
    IGNAR_LAIR: {
        name: '화산 정상', biome: 'VOLCANO', cw: 18, ch: 13, seed: 117, trees: 0.05,
        clearings: [[10, 6, 6]],
        roads: [[[1, 6], [10, 6]]],
        portals: [{ side: 'W', to: 'VOLCANO_PATH', name: '잿길' }],
        fixtures: [
            { t: 'BOSS', id: 'IGNAR', at: [10, 6] },
            { t: 'PROP', type: 'CAMPFIRE', at: [5, 9] }, { t: 'PROP', type: 'CAMPFIRE', at: [15, 9] },
        ],
    },
};

/** 이야기가 흐르는 차례. 미니맵의 '가 볼 곳' 과 빠른 이동 목록을 이 순서로 보여 준다 */
export const MAP_ORDER = [
    'VILLAGE', 'LAKE', 'FALLS', 'CLOUDTOP', 'SKY_RUINS', 'EAST_ROAD', 'DOJO', 'HOLLOW', 'HOLLOW_DEEP', 'MORGATH_LAIR',
    'SNOW_ROAD', 'SNOW_RIDGE', 'GLACIA_LAIR', 'SOUTH_ROAD', 'JUNGLE', 'JUNGLE_DEEP', 'ZALGORA_LAIR',
    'DESERT', 'DESERT_BONES', 'BASIL_LAIR', 'AUTUMN', 'VOLCANO', 'VOLCANO_PATH', 'IGNAR_LAIR',
];

// 일지 [지도] 탭에 그릴 자리 (0~1). 이어진 모양이 손에 잡히게만 잡았다
export const MAP_POS = {
    SKY_RUINS: [0.30, 0.06], CLOUDTOP: [0.12, 0.10], FALLS: [0.12, 0.32], LAKE: [0.12, 0.55], VILLAGE: [0.32, 0.55],
    EAST_ROAD: [0.52, 0.55], DOJO: [0.52, 0.30], HOLLOW: [0.68, 0.55], HOLLOW_DEEP: [0.82, 0.55], MORGATH_LAIR: [0.95, 0.55],
    SNOW_ROAD: [0.68, 0.34], SNOW_RIDGE: [0.68, 0.19], GLACIA_LAIR: [0.68, 0.06],
    SOUTH_ROAD: [0.32, 0.78], DESERT: [0.12, 0.86], DESERT_BONES: [0.12, 0.93], BASIL_LAIR: [0.12, 0.99],
    JUNGLE: [0.52, 0.78], JUNGLE_DEEP: [0.66, 0.78], ZALGORA_LAIR: [0.80, 0.78], AUTUMN: [0.52, 0.97], VOLCANO: [0.68, 0.97], VOLCANO_PATH: [0.82, 0.97], IGNAR_LAIR: [0.95, 0.97],
};

// 굴(data/dens.js)도 지도 하나로 친다. 이름은 여기서 함께 풀어 준다
let denNames = {};
export function registerMapNames(extra) { denNames = { ...denNames, ...extra }; }
export const mapName = (id) => (MAPS[id] ? MAPS[id].name : denNames[id] || id);
