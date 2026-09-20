// 대장간 소재. 골드로 스탯을 사던 것을 대신한다.
// 돈을 내면 비늘이 두꺼워진다는 게 이상했다. 이제는 잡은 것에서 나온 것을 모아,
// 그론의 모루에서 직접 두드려 붙인다.
export const MATERIALS = {
    HIDE: { name: '질긴 가죽', icon: 'HIDE', desc: '슬라임·게·거미처럼 껍질이 두꺼운 놈에게서' },
    FANG: { name: '날카로운 이빨', icon: 'FANG', desc: '고블린·박쥐·도적처럼 물어뜯는 놈에게서' },
    ORE:  { name: '쇳조각', icon: 'ORE', desc: '인간 사냥꾼의 갑옷 조각. 보물상자에서도 나온다' },
};

// 적 종류별로 나오는 소재. 없으면 HIDE
const BY_ENEMY = {
    SLIME: 'HIDE', FROST_SLIME: 'HIDE', MAGMA_SLIME: 'HIDE',
    CRAB: 'HIDE', SAND_CRAB: 'HIDE', PREY: 'HIDE',
    SPIDER: 'FANG', EMBER_SPIDER: 'FANG', BAT: 'FANG', SNOW_BAT: 'FANG',
    GOBLIN: 'FANG', RAT: 'FANG', BANDIT: 'FANG', GHOST: 'FANG',
    CULTIST: 'ORE', ICE_MAGE: 'ORE',
};

export function materialFor(enemyType) { return BY_ENEMY[enemyType] || 'HIDE'; }

// 그론의 모루. 두드릴수록 재료가 더 든다.
//   base  1회차에 드는 재료
//   step  한 번 두드릴 때마다 늘어나는 양
export const RECIPES = [
    {
        id: 'hp', name: '비늘 단련', effect: '최대 체력 +25',
        base: { HIDE: 4, ORE: 1 }, step: { HIDE: 2, ORE: 1 },
        flavor: '가죽을 겹쳐 비늘 사이에 덧댄다. 무겁지만 살아 돌아오게 해 준다.',
    },
    {
        id: 'dmg', name: '송곳니 연마', effect: '브레스 피해 +8%',
        base: { FANG: 4, ORE: 1 }, step: { FANG: 2, ORE: 1 },
        flavor: '이빨을 갈아 만든 가루를 목구멍에 문지른다. 숨결이 날카로워진다.',
    },
    {
        id: 'spd', name: '날개 손질', effect: '이동 속도 +4%',
        base: { HIDE: 2, FANG: 2 }, step: { HIDE: 1, FANG: 2 },
        flavor: '날개 뼈 사이의 낡은 막을 벗겨 내고 새로 입힌다. 한동안 따끔하다.',
    },
];

// 골드로 살 수 있는 것들. 스탯은 이제 돈으로 사지 않는다
export const GOODS = [
    { id: 'meat', name: '훈제 고기', desc: '고기 1개', cost: 12 },
    { id: 'HIDE', name: '질긴 가죽', desc: '소재 1개 (직접 잡는 게 훨씬 싸다)', cost: 35, material: true },
    { id: 'FANG', name: '날카로운 이빨', desc: '소재 1개 (직접 잡는 게 훨씬 싸다)', cost: 40, material: true },
    { id: 'ORE',  name: '쇳조각', desc: '소재 1개 (사냥꾼에게서 나온다)', cost: 55, material: true },
];
