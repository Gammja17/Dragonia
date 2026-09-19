// 마을 고정 NPC
export const FIXED_NPCS = [
    {
        name: 'Elder', personality: 'WISE', role: 'ELDER', canPartner: false,
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
        name: 'Gron', personality: 'GRUMPY', canPartner: false,
        species: 'LOOK', look: 4, accessory: 'HELM', colors: { body: '#6f7d7d', belly: '#95a5a6', wing: '#b08d57' }, element: 'FIRE', maxHp: 380, power: 10,
        x: 1430, y: 1120,   // 광장의 가게 앞
    },
    {
        name: 'Kairon', personality: 'WISE', role: 'MASTER', canPartner: false,
        species: 'LOOK', look: 22, accessory: 'HAT', colors: { body: '#8a2f2a', belly: '#d8a24a', wing: '#3a2a2a' }, element: 'FIRE', maxHp: 600, power: 16, scale: 1.18,
        x: 2448, y: 1000,   // 수련장
    },
];

export const WANDER_NAMES = ['Nara', 'Kirin', 'Raze', 'Mira', 'Dusk', 'Iro', 'Sora', 'Flint'];
export const WANDER_LOOKS = [0, 1, 2, 3, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 19];
export const WANDER_ACCESSORIES = [null, null, 'LEAF', 'FLOWER', 'PLUME'];
export const WANDER_PERSONALITIES = ['WISE', 'BRAVE', 'PLAYFUL', 'GRUMPY'];
export const WANDER_SPECIES = ['WESTERN', 'WYVERN', 'HYDRA', 'BEHEMOTH'];

export const SPECIES_COLORS = {
    WESTERN:  { body: '#c0392b', belly: '#f1c40f', wing: '#e0a020' },
    WYVERN:   { body: '#2980b9', belly: '#3498db', wing: '#bfc9d1' },
    HYDRA:    { body: '#1f6fb0', belly: '#5dade2', wing: '#d4a017' },
    BEHEMOTH: { body: '#2e8b57', belly: '#9b59b6', wing: '#c8a04a' },
};
