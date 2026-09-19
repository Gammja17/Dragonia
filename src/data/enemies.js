// 적 정의. sprite: Tiny Dungeon 시트의 타일 좌표 [tx, ty]. move: 'chase' | 'erratic'(박쥐처럼 흔들리며)
export const ENEMIES = {
    SLIME:   { name: '슬라임',   sprite: [0, 9],  hp: 30,  speed: 50,  damage: 5,  xp: 30,  color: '#2ecc71', move: 'chase', hop: true },
    GOBLIN:  { name: '고블린',   sprite: [1, 9],  hp: 60,  speed: 110, damage: 6,  xp: 40,  color: '#e0a060', move: 'chase' },
    RAT:     { name: '밀림쥐',   sprite: [3, 10], hp: 45,  speed: 170, damage: 6,  xp: 45,  color: '#b07a4a', move: 'erratic' },
    CRAB:    { name: '붉은 게',  sprite: [2, 9],  hp: 120, speed: 70,  damage: 12, xp: 70,  color: '#e74c3c', move: 'chase' },
    SPIDER:  { name: '독거미',   sprite: [2, 10], hp: 80,  speed: 130, damage: 9,  xp: 65,  color: '#8e5a3c', move: 'chase' },
    BAT:     { name: '흡혈박쥐', sprite: [0, 10], hp: 50,  speed: 190, damage: 7,  xp: 55,  color: '#c07a4a', move: 'erratic', flying: true },
    GHOST:   { name: '망령',     sprite: [1, 10], hp: 110, speed: 85,  damage: 11, xp: 90,  color: '#cfd8ff', move: 'chase', flying: true, glow: '#9fb4ff' },
};

// 바이옴별 등장 적 (많이 적을수록 자주)
export const BIOME_ENEMIES = {
    FOREST: ['SLIME', 'SLIME', 'GOBLIN'],
    LAKE:   ['SLIME'],
    JUNGLE: ['RAT', 'RAT', 'CRAB', 'SPIDER'],
    HOLLOW: ['BAT', 'BAT', 'GHOST', 'SPIDER'],
};

// 보스. 드래곤 시트를 크게 그려 쓴다. unlock: 처치 시 해금되는 속성
export const BOSSES = {
    MORGATH: {
        name: '뼈용 모르가스', title: '달빛 골짜기의 주인', species: 'BONE', colors: { body: '#ffffff', wing: '#ffffff' },
        x: 4400, y: 1500, scale: 2.0, hp: 900, speed: 120, contact: 18, xp: 600,
        element: 'ICE', unlock: 'ICE', patterns: ['RING', 'AIMED'],
    },
    ZALGORA: {
        name: '쌍두룡 잘고라', title: '환영의 밀림의 폭군', species: 'HYDRA', colors: { body: '#a3262b', wing: '#e0a020' },
        x: 1500, y: 4400, scale: 1.9, hp: 1300, speed: 150, contact: 22, xp: 900,
        element: 'THUNDER', unlock: 'THUNDER', patterns: ['AIMED', 'SPIRAL', 'CHARGE'],
    },
    IGNAR: {
        name: '고룡 이그나르', title: '하늘에서 떨어진 재앙', species: 'WESTERN', colors: { body: '#3a2a4a', wing: '#ff5a1f' },
        x: 4500, y: 4500, scale: 1.9, hp: 2200, speed: 170, contact: 28, xp: 2000,
        element: 'FIRE', unlock: null, patterns: ['RING', 'SPIRAL', 'CHARGE', 'AIMED'],
    },
};
