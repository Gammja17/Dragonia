// 화면에 보여 줄 이름. 안쪽에서는 영문 키를 그대로 쓴다 (대사·퀘스트·세이브가 이 키로 묶여 있다).
// 보여 줄 때만 npcName() 을 거친다.
export const NPC_NAMES_KO = {
    Elder: '엘더', Tiamat: '티아맷', Poco: '포코', Gron: '그론', Nara: '나라', Kairon: '카이론',
    Kirin: '키린', Raze: '레이즈', Mira: '미라', Dusk: '더스크',
    Iro: '이로', Sora: '소라', Flint: '플린트', Ember: '엠버',
};
export const npcName = (id) => NPC_NAMES_KO[id] || id || '???';

// 태어난 아이에게 붙여 줄 이름.
// 마을 용들(엘더 · 티아맷 · 포코 · 그론 · 나라 · 카이론)과 같은 결로 맞춘다.
// 토박이 이름이 아니라, 용들 사이에서 불리는 짧은 이름들이다.
export const KID_NAMES = [
    '레미', '카일', '세라', '루카', '에리스', '비안', '테오', '아렌',
    '셀렌', '쥬드', '파렌', '리코', '베릴', '신델', '카논', '드렌',
    '리라', '아셀', '로엔', '베인', '미카', '노이', '실바', '쿠엔',
];

// 마을 고정 NPC
export const FIXED_NPCS = [
    {
        name: 'Elder', personality: 'WISE', role: 'ELDER', canPartner: true,
        species: 'LOOK', look: 12, accessory: 'CROWN', scale: 1.15, colors: { body: '#7d4fb3', belly: '#af7ac5', wing: '#d4a017' }, element: 'ICE', maxHp: 420, power: 14,
        x: 1200, y: 1200,
    },
    {
        name: 'Tiamat', personality: 'BRAVE', canPartner: true,
        species: 'LOOK', look: 6, accessory: 'PLUME', colors: { body: '#2f6fb5', belly: '#3498db', wing: '#c9c9c9' }, element: 'THUNDER', maxHp: 300, power: 12,
        x: 1776, y: 1290,   // 동쪽 망루의 보금자리
    },
    {
        name: 'Poco', personality: 'PLAYFUL', canPartner: true,
        species: 'LOOK', look: 17, accessory: 'FLOWER', scale: 0.8, colors: { body: '#e67e22', belly: '#f1c40f', wing: '#f7d354' }, element: 'FIRE', maxHp: 220, power: 8,
        x: 816, y: 1860,    // 남서쪽 꽃밭의 보금자리
    },
    {
        name: 'Gron', personality: 'GRUMPY', canPartner: true,
        species: 'LOOK', look: 4, accessory: 'HELM', colors: { body: '#6f7d7d', belly: '#95a5a6', wing: '#b08d57' }, element: 'FIRE', maxHp: 380, power: 10,
        x: 1430, y: 1120,   // 광장의 가게 앞
    },
    {
        // 나라: 나와 같은 날 수련을 시작한 또래. 늘 한 발 앞서 가려 한다
        name: 'Nara', personality: 'RIVAL', canPartner: true,
        species: 'LOOK', look: 9, accessory: 'PLUME', scale: 0.92, colors: { body: '#c0563b', belly: '#f0a868', wing: '#e8d7a8' }, element: 'FIRE', maxHp: 280, power: 11,
        x: 2300, y: 1320,   // 수련장 한켠
    },
    {
        name: 'Kairon', personality: 'WISE', role: 'MASTER', canPartner: true,
        species: 'LOOK', look: 22, accessory: 'HAT', colors: { body: '#8a2f2a', belly: '#d8a24a', wing: '#3a2a2a' }, element: 'FIRE', maxHp: 600, power: 16, scale: 1.18,
        x: 2448, y: 1000,   // 수련장
    },
];

export const WANDER_NAMES = ['Kirin', 'Raze', 'Mira', 'Dusk', 'Iro', 'Sora', 'Flint', 'Ember'];   // 나라는 고정 NPC라 뺀다
export const WANDER_LOOKS = [0, 1, 2, 3, 5, 7, 8, 10, 11, 13, 14, 15, 16, 19];   // 9는 나라 것
export const WANDER_ACCESSORIES = [null, null, 'LEAF', 'FLOWER', 'PLUME'];
export const WANDER_PERSONALITIES = ['WISE', 'BRAVE', 'PLAYFUL', 'GRUMPY'];
// 'RIVAL' 은 나라 전용 성격이라 떠돌이에게는 주지 않는다
export const WANDER_SPECIES = ['WESTERN', 'WYVERN', 'HYDRA', 'BEHEMOTH'];

export const SPECIES_COLORS = {
    WESTERN:  { body: '#c0392b', belly: '#f1c40f', wing: '#e0a020' },
    WYVERN:   { body: '#2980b9', belly: '#3498db', wing: '#bfc9d1' },
    HYDRA:    { body: '#1f6fb0', belly: '#5dade2', wing: '#d4a017' },
    BEHEMOTH: { body: '#2e8b57', belly: '#9b59b6', wing: '#c8a04a' },
};
