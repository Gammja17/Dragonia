// 적 정의. sprite: Tiny Dungeon 시트의 타일 좌표 [tx, ty]. move: 'chase' | 'erratic'(박쥐처럼 흔들리며) | 'flee'(사냥감: 공격하지 않고 도망친다)
// meat: 죽을 때 반드시 떨어뜨리는 고기 수 (없으면 45% 확률로 1개)
export const ENEMIES = {
    PREY:    { name: '들쥐',     sprite: [4, 10], hp: 18,  speed: 175, damage: 0,  xp: 8,   color: '#9aa0a8', move: 'flee', meat: 1 },
    SLIME:   { name: '슬라임',   sprite: [0, 9],  hp: 30,  speed: 50,  damage: 5,  xp: 30,  color: '#2ecc71', move: 'chase', hop: true },
    GOBLIN:  { name: '고블린',   sprite: [1, 9],  hp: 60,  speed: 110, damage: 6,  xp: 40,  color: '#e0a060', move: 'chase' },
    RAT:     { name: '밀림쥐',   sprite: [3, 10], hp: 45,  speed: 170, damage: 6,  xp: 45,  color: '#b07a4a', move: 'erratic' },
    CRAB:    { name: '붉은 게',  sprite: [2, 9],  hp: 120, speed: 70,  damage: 12, xp: 70,  color: '#e74c3c', move: 'chase', meat: 2 },
    SPIDER:  { name: '독거미',   sprite: [2, 10], hp: 80,  speed: 130, damage: 9,  xp: 65,  color: '#8e5a3c', move: 'chase' },
    BAT:     { name: '흡혈박쥐', sprite: [0, 10], hp: 50,  speed: 190, damage: 7,  xp: 55,  color: '#c07a4a', move: 'erratic', flying: true },
    GHOST:   { name: '망령',     sprite: [1, 10], hp: 110, speed: 85,  damage: 11, xp: 90,  color: '#cfd8ff', move: 'chase', flying: true, glow: '#9fb4ff' },
};

// 바이옴별 등장 적 (많이 적을수록 자주)
export const BIOME_ENEMIES = {
    FOREST: ['SLIME', 'SLIME', 'GOBLIN', 'PREY', 'PREY'],
    LAKE:   ['SLIME', 'PREY', 'CRAB'],
    JUNGLE: ['RAT', 'RAT', 'CRAB', 'SPIDER', 'PREY'],
    HOLLOW: ['BAT', 'BAT', 'GHOST', 'SPIDER', 'PREY'],
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

// 마을을 습격하는 인간 사냥꾼. range: 공격 사거리, attack: 'MELEE' | 'ARROW' | 'ORB'
export const HUNTERS = {
    KNIGHT:  { name: '기사',        sprite: [0, 8], hp: 80,  speed: 90, range: 42,  attack: 'MELEE', damage: 10, cooldown: 1.6, xp: 70,  gold: 8 },
    ARCHER:  { name: '궁수',        sprite: [4, 8], hp: 60,  speed: 95, range: 270, attack: 'ARROW', damage: 8,  cooldown: 2.0, xp: 70,  gold: 8 },
    MAGE:    { name: '마법사',      sprite: [0, 7], hp: 70,  speed: 80, range: 320, attack: 'ORB',   damage: 12, cooldown: 2.6, xp: 90,  gold: 12 },
    HEAVY:   { name: '중갑 기사',   sprite: [1, 8], hp: 200, speed: 62, range: 46,  attack: 'MELEE', damage: 18, cooldown: 2.0, xp: 120, gold: 16 },
    CAPTAIN: { name: '사냥꾼 대장', sprite: [1, 8], hp: 520, speed: 78, range: 60,  attack: 'MELEE', damage: 24, cooldown: 1.8, xp: 400, gold: 80, scale: 5 },
};
