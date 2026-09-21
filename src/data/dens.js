import { registerMapNames } from './maps.js';

// 굴. 마을 용들은 저마다 굴 하나씩을 배정받아 산다.
//
// 내 굴은 비어 있는 채로 시작하고, 살림살이를 하나씩 들여 꾸밀 수 있다 (systems/den.js).
// 남의 굴은 처음부터 그 용답게 꾸며져 있다 — 들어가 보면 그 용을 조금 더 알게 된다.
//
//   at     굴 입구가 서 있는 바깥 지도의 큰 칸 좌표
//   tw,th  방 안쪽 타일 수 (48px 단위)
//   decor  처음부터 놓여 있는 살림살이 [가구id, 타일x, 타일y]  (방 안쪽 기준, 0,0 이 왼쪽 위)
//   locked 호감도가 이만큼은 되어야 들어갈 수 있다

export const DENS = {
    DEN_MINE: {
        id: 'DEN_MINE', name: '나의 굴', owner: null, mine: true,   // 마을 안, 다른 용들 곁에 산다
        outer: 'VILLAGE', at: [5, 10], tw: 19, th: 13, seed: 401, torches: 3,
        decor: [],
        intro: '(내 굴이다. 누가 마른 풀 잠자리를 하나 깔아 놓았다. 나머지는 하나씩 들여놓으면 될 일이다.)',
    },
    DEN_ELDER: {
        id: 'DEN_ELDER', name: '엘더의 굴', owner: 'Elder',
        outer: 'VILLAGE', at: [9, 12], tw: 15, th: 11, seed: 402, torches: 4, locked: 10,
        decor: [['SHELF', 2, 1], ['SHELF', 3, 1], ['SHELF', 4, 1], ['TABLE', 7, 4], ['STOOL', 6, 4],
                ['STOOL', 8, 4], ['PICTURE', 11, 0], ['ORB', 12, 3], ['STRAW', 11, 8], ['POTIONS', 2, 8]],
        intro: '(두루마리가 벽 한 면을 다 덮었다. 얼마나 오래 모은 걸까.)',
    },
    DEN_KAIRON: {
        id: 'DEN_KAIRON', name: '카이론의 굴', owner: 'Kairon',
        outer: 'DOJO', at: [5, 4], tw: 15, th: 11, seed: 403, torches: 2, locked: 10,
        decor: [['SWORD', 4, 0], ['SWORD', 6, 0], ['SHIELD', 8, 0], ['BANNER', 10, 0],
                ['STRAW', 2, 7], ['ANVIL', 12, 5], ['RUBBLE', 12, 7], ['STOOL', 7, 5]],
        intro: '(무기 말고는 아무것도 없다. 잠자리조차 마른 풀 한 줌이다.)',
    },
    DEN_NARA: {
        id: 'DEN_NARA', name: '나라의 굴', owner: 'Nara',
        outer: 'DOJO', at: [13, 4], tw: 13, th: 10, seed: 404, torches: 2, locked: 15,
        decor: [['STRAW', 1, 7], ['SWORD', 3, 0], ['RUBBLE', 5, 6], ['RUBBLE', 6, 6],
                ['STOOL', 9, 5], ['SHIELD', 7, 0], ['POTIONS', 10, 7]],
        intro: '(구석에 금 간 목검이 여러 자루 쌓여 있다. 다 혼자 부러뜨린 것이다.)',
    },
    DEN_GRON: {
        id: 'DEN_GRON', name: '그론의 굴', owner: 'Gron',
        outer: 'VILLAGE', at: [16, 12], tw: 15, th: 11, seed: 405, torches: 3, locked: 10,
        decor: [['ANVIL', 7, 4], ['BRAZIER', 5, 4], ['HAMMER', 6, 0], ['HAMMER', 9, 0],
                ['CHEST', 11, 5], ['RUBBLE', 2, 6], ['RUBBLE', 3, 7], ['STRAW', 12, 8], ['FENCE', 4, 7]],
        intro: '(쇳내가 굴 안에 배어 있다. 모루 옆 재는 아직 따뜻하다.)',
    },
    DEN_POCO: {
        id: 'DEN_POCO', name: '포코의 굴', owner: 'Poco',
        outer: 'VILLAGE', at: [8, 12], tw: 12, th: 9, seed: 406, torches: 2, locked: 5,
        decor: [['STRAW', 5, 4], ['STRAW', 6, 4], ['RUBBLE', 1, 6], ['POTIONS', 9, 2],
                ['PICTURE', 4, 0], ['STOOL', 2, 3], ['CHEST', 10, 5]],
        intro: '(주워 온 것들이 아무렇게나 널려 있다. 반쯤은 먹다 남긴 것이다.)',
    },
    DEN_TIAMAT: {
        id: 'DEN_TIAMAT', name: '티아맷의 굴', owner: 'Tiamat',
        outer: 'VILLAGE', at: [16, 6], tw: 13, th: 10, seed: 407, torches: 3, locked: 10,
        decor: [['BANNER', 3, 0], ['BANNER', 9, 0], ['TABLE', 6, 4], ['STOOL', 5, 4],
                ['SHIELD', 6, 0], ['STRAW', 10, 7], ['ORB', 2, 6], ['PILLAR', 11, 3]],
        intro: '(창 대신 뚫린 구멍으로 마을이 내려다보인다. 망루지기의 굴답다.)',
    },

    // ---- 구름마루 마을의 굴들. 물가 쪽으로 열려 있어 늘 물소리가 난다 ----
    DEN_RIUN: {
        id: 'DEN_RIUN', name: '리운의 굴', owner: 'Riun',
        outer: 'CLOUDTOP', at: [7, 6], tw: 15, th: 11, seed: 411, torches: 4, locked: 10,
        decor: [['SHELF', 2, 1], ['SHELF', 3, 1], ['ORB', 11, 3], ['TABLE', 7, 4],
                ['STOOL', 6, 4], ['STOOL', 8, 4], ['PILLAR', 12, 2], ['STRAW', 11, 8], ['PICTURE', 5, 0]],
        intro: '(굴 안쪽까지 물소리가 들어온다. 벽이 젖어 반들거린다.)',
    },
    DEN_SEIRAN: {
        id: 'DEN_SEIRAN', name: '세이란의 굴', owner: 'Seiran',
        outer: 'CLOUDTOP', at: [15, 6], tw: 13, th: 10, seed: 412, torches: 3, locked: 15,
        decor: [['POTIONS', 2, 2], ['POTIONS', 3, 2], ['POTIONS', 4, 2], ['SHELF', 9, 1],
                ['ORB', 6, 4], ['STRAW', 10, 7], ['TABLE', 5, 6], ['PICTURE', 7, 0]],
        intro: '(약초 말리는 냄새가 가득하다. 바닥에 고인 물에 천장이 비친다.)',
    },
    DEN_HARU: {
        id: 'DEN_HARU', name: '하루의 굴', owner: 'Haru',
        outer: 'CLOUDTOP', at: [8, 11], tw: 12, th: 9, seed: 413, torches: 2, locked: 5,
        decor: [['STRAW', 5, 4], ['RUBBLE', 2, 6], ['RUBBLE', 3, 6], ['CHEST', 9, 5],
                ['POTIONS', 1, 3], ['BANNER', 6, 0], ['STOOL', 8, 2]],
        intro: '(주워 온 돌이 종류별로 줄 맞춰 놓여 있다. 아래 세상에서 흘러온 것들이다.)',
    },
    DEN_YUAN: {
        id: 'DEN_YUAN', name: '유안의 굴', owner: 'Yuan',
        outer: 'CLOUDTOP', at: [15, 11], tw: 13, th: 10, seed: 414, torches: 2, locked: 25,
        decor: [['SWORD', 3, 0], ['SWORD', 5, 0], ['SHIELD', 7, 0], ['SHIELD', 9, 0],
                ['STRAW', 1, 7], ['ANVIL', 10, 5], ['FENCE', 6, 6], ['RUBBLE', 11, 7]],
        intro: '(무기가 벽 한 면을 채우고 있다. 전부 손질이 되어 있고, 전부 쓰인 적이 없다.)',
    },
};

export const DEN_IDS = Object.keys(DENS);

// 굴 이름도 mapName() 으로 풀리게 등록해 둔다 (이동 안내·미니맵 머리글)
registerMapNames(Object.fromEntries(DEN_IDS.map(id => [id, DENS[id].name])));

/** 그 용의 굴 id (없으면 null) */
export function denOf(name) {
    return DEN_IDS.find(id => DENS[id].owner === name) || null;
}

/** 이 바깥 지도에 입구가 있는 굴들 */
export function densOn(mapId) {
    return DEN_IDS.filter(id => DENS[id].outer === mapId);
}

export const MY_DEN = 'DEN_MINE';
