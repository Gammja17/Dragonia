// 굴 안에 놓는 살림살이.
//
// 포켓몬 불가사의 던전의 캠프처럼, 제 굴을 조금씩 채워 가는 재미를 위한 것이다.
// 능력치를 크게 올려 주지는 않는다. 대신 아늑함(cozy)이 쌓이면 굴에서 자고 일어날 때
// 몸이 더 잘 낫고, 놀러 온 용들이 한마디씩 한다.
//
//   tile   assets/tiles/dungeon.png 의 [칸x, 칸y] (16px 단위)
//   span   차지하는 칸 수 [가로, 세로] — 2칸짜리는 위로 솟는다
//   cozy   아늑함
//   light  스스로 빛을 낸다 (굴 안이 밝아진다)
//   cost   만드는 데 드는 것. gold 와 소재(data/materials.js 의 id)
//   wall   벽에 거는 것. 방 가장자리 줄에만 놓을 수 있다

export const FURNITURE = {
    STRAW:   { name: '마른 풀 잠자리', tile: [3, 4], span: [2, 1], cozy: 3, cost: { gold: 0 },                    note: '깔고 자면 등이 배기지 않는다.' },
    STOOL:   { name: '나무 걸상',      tile: [0, 6], span: [1, 1], cozy: 1, cost: { gold: 20 },                   note: '앉을 자리 하나쯤은 있어야지.' },
    TABLE:   { name: '작은 탁자',      tile: [1, 6], span: [1, 1], cozy: 2, cost: { gold: 45 },                   note: '올려놓을 데가 생겼다.' },
    RUBBLE:  { name: '모아 둔 돌',     tile: [0, 1], span: [1, 1], cozy: 1, cost: { gold: 10 },                   note: '주워 온 돌을 쌓아 두었다.' },
    FENCE:   { name: '나무 울타리',    tile: [7, 5], span: [1, 1], cozy: 1, cost: { gold: 25, HIDE: 1 },          note: '구석을 나눠 놓는다.' },
    CHEST:   { name: '보물함',         tile: [5, 7], span: [1, 1], cozy: 2, cost: { gold: 60, ORE: 2 },           note: '모은 것을 넣어 둔다.' },
    SHELF:   { name: '책 선반',        tile: [3, 5], span: [1, 2], cozy: 3, cost: { gold: 90, ORE: 1 },           note: '엘더가 빌려준 두루마리들.' },
    ANVIL:   { name: '작은 모루',      tile: [2, 6], span: [1, 1], cozy: 2, cost: { gold: 70, ORE: 4 },           note: '그론에게 얻어 온 것.' },
    SHIELD:  { name: '나무 방패',      tile: [6, 5], span: [1, 1], cozy: 2, wall: true, cost: { gold: 40, HIDE: 3 }, note: '벽에 걸어 둔다.' },
    SWORD:   { name: '걸어 둔 검',     tile: [10, 8], span: [1, 1], cozy: 2, wall: true, cost: { gold: 80, ORE: 3, FANG: 2 }, note: '쓸 일이 없기를.' },
    HAMMER:  { name: '걸어 둔 망치',   tile: [9, 9], span: [1, 1], cozy: 2, wall: true, cost: { gold: 75, ORE: 4 }, note: '무겁다.' },
    STAFF:   { name: '걸어 둔 지팡이', tile: [9, 10], span: [1, 1], cozy: 2, wall: true, cost: { gold: 85, FANG: 3 }, note: '무엇에 쓰는지는 모른다.' },
    BANNER:  { name: '붉은 깃발',      tile: [5, 2], span: [1, 1], cozy: 3, wall: true, cost: { gold: 100, HIDE: 4 }, note: '제 표식을 내건다.' },
    PICTURE: { name: '액자',           tile: [4, 3], span: [1, 1], cozy: 3, wall: true, cost: { gold: 120, HIDE: 2 }, note: '마을이 내려다보이는 그림.' },
    PILLAR:  { name: '돌기둥',         tile: [6, 1], span: [1, 2], cozy: 2, cost: { gold: 110, ORE: 6 },          note: '천장을 받쳐 준다. 사실은 멋으로.' },
    POTIONS: { name: '약병 선반',      tile: [6, 9], span: [1, 1], cozy: 1, cost: { gold: 35 },                   note: '무슨 맛인지는 모르겠다.' },
    ORB:     { name: '빛나는 구슬',    tile: [6, 8], span: [1, 1], cozy: 4, light: '#9fe3ff', cost: { gold: 150, ORE: 3, FANG: 3 }, note: '밤에도 굴이 환하다.' },
    BRAZIER: { name: '화로',           tile: [4, 2], span: [1, 1], cozy: 4, light: '#ffb347', cost: { gold: 130, ORE: 5 }, note: '불을 피워 두면 겨울에도 따뜻하다.' },
};

export const FURNITURE_IDS = Object.keys(FURNITURE);

/** 아늑함 단계 */
export const COZY_TIERS = [
    [0,  '휑하다',   '아직 돌바닥뿐이다.'],
    [6,  '살 만하다', '조금씩 굴 같아진다.'],
    [14, '아늑하다',  '들어서면 마음이 놓인다.'],
    [26, '포근하다',  '누구라도 눌러앉고 싶어진다.'],
    [40, '누구의 집', '이제 여기는 분명히 네 집이다.'],
];

export function cozyTier(n) {
    let t = COZY_TIERS[0];
    for (const c of COZY_TIERS) if (n >= c[0]) t = c;
    return { score: n, name: t[1], note: t[2] };
}
