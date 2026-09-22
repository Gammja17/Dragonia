// 화면에 보여 줄 이름. 안쪽에서는 영문 키를 그대로 쓴다 (대사·퀘스트·세이브가 이 키로 묶여 있다).
// 보여 줄 때만 npcName() 을 거친다.
export const NPC_NAMES_KO = {
    Elder: '엘더', Tiamat: '티아맷', Poco: '포코', Gron: '그론', Nara: '나라', Kairon: '카이론',
    Riun: '리운', Seiran: '세이란', Haru: '하루', Yuan: '유안',
    Kirin: '키린', Raze: '레이즈', Mira: '미라', Dusk: '더스크',
    Iro: '이로', Sora: '소라', Flint: '플린트', Ember: '엠버',
    Vesna: '베스나', IGNAR: '이그나르', Ignar: '이그나르', Doran: '도란', Miru: '미루', Dan: '단', Soi: '소이', Nuri: '누리', On: '온', Biryu: '비류', Beodeul: '버들', Jagal: '자갈', Heukdan: '흑단', Jaetbyeol: '잿별',
    Moss: '모스', Fern: '펀', Garam: '가람', Dol: '돌',
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
        name: 'Elder', personality: 'WISE', role: 'ELDER', canPartner: true, elder: true,
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
        name: 'Kairon', personality: 'WISE', role: 'MASTER', canPartner: true, elder: true,
        species: 'LOOK', look: 22, accessory: 'HAT', colors: { body: '#8a2f2a', belly: '#d8a24a', wing: '#3a2a2a' }, element: 'FIRE', maxHp: 600, power: 16, scale: 1.18,
        x: 2448, y: 1000,   // 수련장
    },
    {
        // 엠버: 그론의 조수. 떠돌다 눌러앉았다. 손도 입도 빠르고, 맨날 혼난다 (text/story-bible.md 4절)
        name: 'Ember', personality: 'PLAYFUL', canPartner: false,
        species: 'LOOK', look: 11, accessory: null, scale: 0.9, colors: { body: '#b8323a', belly: '#e8a07a', wing: '#7a1f2a' }, element: 'FIRE', maxHp: 260, power: 9,
        x: 1500, y: 1180,   // 대장간 옆
    },
    {
        // 미라: 약초를 캐고 다친 용을 돌본다. 약초 핑계로 폭포 쪽에 자주 간다
        name: 'Mira', personality: 'WISE', canPartner: false,
        species: 'LOOK', look: 7, accessory: 'LEAF', scale: 0.95, colors: { body: '#4f7f4a', belly: '#b8d89a', wing: '#8a6a3a' }, element: 'ICE', maxHp: 240, power: 8,
        x: 900, y: 900,
    },
    {
        // 베스나: 잿마루의 문지기이자 이그나르의 사자. 웨스턴에서 났고, 예순 해 전에 그를 따라 나갔다
        name: 'Vesna', personality: 'WISE', canPartner: false,
        species: 'LOOK', look: 20, accessory: null, scale: 1.08, colors: { body: '#2a2630', belly: '#5a4a5a', wing: '#8a3a2a' }, element: 'FIRE', maxHp: 420, power: 14,
        x: 0, y: 0,
    },
    {
        // 결말 뒤의 이그나르. 교화 결말이면 웨스턴 마을 밖 호숫가에, 어둠의 결말이면 잿마루에 산다 (data/routines.js 의 when)
        // 곁에 두고 다닐 수도 있고(의탁), 마음을 나눌 수도 있다
        name: 'Ignar', personality: 'WISE', role: 'FALLEN', canPartner: true, elder: true,
        species: 'SHADOW', accessory: null, scale: 0.62, colors: { body: '#3a2a4a', belly: '#5a4a6a', wing: '#ff5a1f' }, element: 'FIRE', maxHp: 900, power: 22,
        x: 0, y: 0,
    },
    // ---- 웨스턴의 부부. 도란은 호숫가에서 낚시를 하고 미루는 마을에서 살림을 한다. 둘 다 짝은 안 된다 (이미 부부다) ----
    {
        name: 'Doran', personality: 'WISE', canPartner: false,
        species: 'LOOK', look: 13, accessory: 'HAT', scale: 1.0, colors: { body: '#4a6f8a', belly: '#9ab8c8', wing: '#6a8a9a' }, element: 'ICE', maxHp: 260, power: 9,
        x: 0, y: 0,
    },
    {
        name: 'Miru', personality: 'PLAYFUL', canPartner: false,
        species: 'LOOK', look: 19, accessory: 'FLOWER', scale: 0.95, colors: { body: '#c87a5a', belly: '#f0c8a0', wing: '#e8a878' }, element: 'FIRE', maxHp: 240, power: 8,
        x: 0, y: 0,
    },
    // ---- 웨스턴의 세 식구. 단은 나무를 하고 소이는 아이를 보고, 누리는 포코 뒤를 졸졸 따라다닌다 ----
    {
        name: 'Dan', personality: 'GRUMPY', canPartner: false,
        species: 'LOOK', look: 21, accessory: null, scale: 1.05, colors: { body: '#5a6a3a', belly: '#b8c890', wing: '#7a8a5a' }, element: 'FIRE', maxHp: 300, power: 11,
        x: 0, y: 0,
    },
    {
        name: 'Soi', personality: 'WISE', canPartner: false,
        species: 'LOOK', look: 18, accessory: 'FLOWER', scale: 0.95, colors: { body: '#a86a8a', belly: '#f0c8e0', wing: '#c890b0' }, element: 'ICE', maxHp: 240, power: 8,
        x: 0, y: 0,
    },
    {
        name: 'Nuri', personality: 'PLAYFUL', canPartner: false, kid: true,
        species: 'LOOK', look: 23, accessory: null, scale: 0.55, colors: { body: '#8aa86a', belly: '#e0f0b0', wing: '#a8c880' }, element: 'FIRE', maxHp: 90, power: 3,
        x: 0, y: 0,
    },
    // ---- 잿마루: 이그나르를 따라간 용들 ----
    {
        name: 'Heukdan', personality: 'GRUMPY', canPartner: false,
        species: 'LOOK', look: 4, accessory: 'HELM', scale: 1.1, colors: { body: '#2a2a30', belly: '#5a5058', wing: '#8a3a2a' }, element: 'FIRE', maxHp: 460, power: 15,
        x: 0, y: 0,
    },
    {
        name: 'Jaetbyeol', personality: 'PLAYFUL', canPartner: false, kid: true,
        species: 'LOOK', look: 17, accessory: null, scale: 0.55, colors: { body: '#4a3a4a', belly: '#c8b0c0', wing: '#ff8a5a' }, element: 'FIRE', maxHp: 90, power: 3,
        x: 0, y: 0,
    },
    // ---- 뿌리골: 밀림 깊은 곳, 풀의 용들 ----
    {
        name: 'Moss', personality: 'WISE', role: 'ELDER_ROOT', canPartner: false, elder: true,
        species: 'LOOK', look: 5, accessory: 'LEAF', scale: 1.12, colors: { body: '#5f8f4a', belly: '#cfe0a0', wing: '#8a6a3a' }, element: 'ICE', maxHp: 400, power: 12,
        x: 0, y: 0,
    },
    {
        name: 'Fern', personality: 'PLAYFUL', canPartner: false,
        species: 'LOOK', look: 15, accessory: 'FLOWER', scale: 0.82, colors: { body: '#8fcf6a', belly: '#f0e0b0', wing: '#c8e0a0' }, element: 'ICE', maxHp: 220, power: 8,
        x: 0, y: 0,
    },
    {
        // 버들: 펀의 어머니. 약초를 말리고 남의 집 아이까지 먹인다
        name: 'Beodeul', personality: 'WISE', canPartner: false,
        species: 'LOOK', look: 1, accessory: 'LEAF', scale: 1.0, colors: { body: '#4a7a4a', belly: '#c8e0a0', wing: '#8aa860' }, element: 'ICE', maxHp: 260, power: 8,
        x: 0, y: 0,
    },
    // ---- 바윗골: 사막의 바위 고원, 땅의 용들 ----
    {
        name: 'Garam', personality: 'GRUMPY', role: 'ELDER_STONE', canPartner: false, elder: true,
        species: 'LOOK', look: 24, accessory: 'HELM', scale: 1.2, colors: { body: '#7a5a3a', belly: '#c9a06a', wing: '#5a4030' }, element: 'FIRE', maxHp: 520, power: 15,
        x: 0, y: 0,
    },
    {
        name: 'Dol', personality: 'BRAVE', canPartner: false,
        species: 'LOOK', look: 25, accessory: null, scale: 0.85, colors: { body: '#8a6a4a', belly: '#d8b88a', wing: '#6a5040' }, element: 'FIRE', maxHp: 260, power: 9,
        x: 0, y: 0,
    },

    {
        // 자갈: 돌의 할머니. 바윗골에서 제일 오래 살았고, 제일 말이 많다
        name: 'Jagal', personality: 'WISE', canPartner: false,
        species: 'LOOK', look: 0, accessory: 'HAT', scale: 0.9, colors: { body: '#9a8a6a', belly: '#e0d0b0', wing: '#7a6a50' }, element: 'FIRE', maxHp: 240, power: 7,
        x: 0, y: 0,
    },

    // ---- 구름마루 마을. 폭포 위에 사는 동양용들 ----
    // 우리 마을과는 오래 서로를 모른 척해 왔다. 몸이 길고, 날개보다 물을 탄다.
    {
        // 리운: 구름마루의 어른. 물이 하는 말을 듣는다는 소문이 있다
        name: 'Riun', personality: 'WISE', role: 'ELDER_EAST', canPartner: false, east: true, elder: true,
        species: 'LOOK', look: 3, accessory: null, scale: 1.22, colors: { body: '#2a5f8f', belly: '#7fc4e8', wing: '#d8b25a' }, element: 'ICE', maxHp: 440, power: 15,
        x: 0, y: 0,
    },
    {
        // 세이란: 물을 읽는 자. 폭포에 비친 것으로 앞일을 점친다
        name: 'Seiran', personality: 'WISE', role: 'SEER', canPartner: true, east: true,
        species: 'LOOK', look: 16, accessory: 'FLOWER', scale: 1.0, colors: { body: '#2f8f6f', belly: '#9fe0c4', wing: '#e8d7a8' }, element: 'ICE', maxHp: 300, power: 11,
        x: 0, y: 0,
    },
    {
        // 하루: 구름마루의 또래 수련생. 바깥 이야기를 제일 궁금해한다
        name: 'Haru', personality: 'PLAYFUL', canPartner: true, east: true,
        species: 'LOOK', look: 8, accessory: 'LEAF', scale: 0.88, colors: { body: '#7f5fc0', belly: '#c9a8f0', wing: '#f0d890' }, element: 'THUNDER', maxHp: 250, power: 10,
        x: 0, y: 0,
    },
    {
        // 온: 구름마루의 할머니. 스무 해 전 전쟁을 두 눈으로 봤고, 그 얘기를 아무한테나 한다
        name: 'On', personality: 'WISE', canPartner: false, east: true,
        species: 'LOOK', look: 2, accessory: 'HAT', scale: 0.95, colors: { body: '#3a5f7f', belly: '#a8c8e0', wing: '#c8d8e0' }, element: 'ICE', maxHp: 250, power: 7,
        x: 0, y: 0,
    },
    {
        // 비류: 물길을 달리는 젊은 용. 하루의 단짝이고 유안의 잔소리를 같이 듣는다
        name: 'Biryu', personality: 'BRAVE', canPartner: false, east: true,
        species: 'LOOK', look: 10, accessory: 'PLUME', scale: 0.92, colors: { body: '#2a7f9f', belly: '#9fe0f0', wing: '#e0f0f8' }, element: 'ICE', maxHp: 280, power: 11,
        x: 0, y: 0,
    },
    {
        // 유안: 경계를 도는 자. 폭포 아래로 내려오는 것을 가장 싫어한다
        name: 'Yuan', personality: 'GRUMPY', canPartner: false, east: true,
        species: 'LOOK', look: 14, accessory: 'HELM', scale: 1.06, colors: { body: '#1f6f9f', belly: '#6fc0e0', wing: '#b8c8d0' }, element: 'ICE', maxHp: 360, power: 13,
        x: 0, y: 0,
    },
];

export const WANDER_NAMES = ['Kirin', 'Raze', 'Dusk', 'Iro', 'Sora', 'Flint'];   // 나라·엠버·미라·구름마루 용들은 고정 NPC라 뺀다
// 몸이 긴 동양용 외형(3 · 8 · 12 · 14 · 16)은 떠돌이에게 주지 않는다.
// 12는 엘더, 나머지는 구름마루 용들 것이고, 9는 나라 것이다
export const WANDER_LOOKS = [0, 1, 2, 10];   // 고정 인물과 겹치는 칸은 색을 달리 쓴다   // 5는 모스, 7은 미라, 11은 엠버, 15는 펀, 20은 베스나, 24·25는 바윗골
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
