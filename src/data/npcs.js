// 마을 고정 NPC
export const FIXED_NPCS = [
    {
        name: 'Elder', personality: 'WISE', role: 'ELDER', canPartner: false,
        species: 'HYDRA', colors: { body: '#7d4fb3', belly: '#af7ac5', wing: '#d4a017' }, element: 'ICE', maxHp: 420, power: 14,
        x: 1200, y: 1200,
    },
    {
        name: 'Tiamat', personality: 'BRAVE', canPartner: true,
        species: 'WYVERN', colors: { body: '#2f6fb5', belly: '#3498db', wing: '#c9c9c9' }, element: 'THUNDER', maxHp: 300, power: 12,
        x: 1300, y: 1250,
    },
    {
        name: 'Poco', personality: 'PLAYFUL', canPartner: true,
        species: 'WESTERN', colors: { body: '#e67e22', belly: '#f1c40f', wing: '#f7d354' }, element: 'FIRE', maxHp: 220, power: 8,
        x: 1200, y: 1300,
    },
    {
        name: 'Gron', personality: 'GRUMPY', canPartner: false,
        species: 'BEHEMOTH', colors: { body: '#6f7d7d', belly: '#95a5a6', wing: '#b08d57' }, element: 'FIRE', maxHp: 380, power: 10,
        x: 1100, y: 1220,
    },
];

export const WANDER_NAMES = ['Nara', 'Kirin', 'Raze', 'Mira', 'Dusk', 'Iro', 'Sora', 'Flint'];
export const WANDER_PERSONALITIES = ['WISE', 'BRAVE', 'PLAYFUL', 'GRUMPY'];
export const WANDER_SPECIES = ['WESTERN', 'WYVERN', 'HYDRA', 'BEHEMOTH'];

export const SPECIES_COLORS = {
    WESTERN:  { body: '#c0392b', belly: '#f1c40f', wing: '#e0a020' },
    WYVERN:   { body: '#2980b9', belly: '#3498db', wing: '#bfc9d1' },
    HYDRA:    { body: '#1f6fb0', belly: '#5dade2', wing: '#d4a017' },
    BEHEMOTH: { body: '#2e8b57', belly: '#9b59b6', wing: '#c8a04a' },
};
