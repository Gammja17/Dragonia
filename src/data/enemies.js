// 적 정의. sprite: Tiny Dungeon 시트의 타일 좌표 [tx, ty]. move: 'chase' | 'erratic'(박쥐처럼 흔들리며) | 'flee'(사냥감: 공격하지 않고 도망친다)
// meat: 죽을 때 반드시 떨어뜨리는 고기 수 (없으면 45% 확률로 1개)
// filter: 같은 그림을 색만 바꿔 쓰는 변종 (canvas filter). move 'ranged': 거리를 두고 element 속성 구슬을 쏜다
export const ENEMIES = {
    DUMMY:   { name: '허수아비', sprite: [6, 5],  hp: 40,  speed: 0,   damage: 0,  xp: 0,   color: '#c9a06a', move: 'none', noLoot: true },
    PREY:    { name: '들쥐',     sprite: [4, 10], hp: 18,  speed: 175, damage: 0,  xp: 8,   color: '#9aa0a8', move: 'flee', meat: 1 },
    SLIME:   { name: '슬라임',   sprite: [0, 9],  hp: 30,  speed: 50,  damage: 5,  xp: 30,  color: '#2ecc71', move: 'chase', hop: true },
    GOBLIN:  { name: '고블린',   sprite: [1, 9],  hp: 60,  speed: 110, damage: 6,  xp: 40,  color: '#e0a060', move: 'chase' },
    RAT:     { name: '밀림쥐',   sprite: [3, 10], hp: 45,  speed: 170, damage: 6,  xp: 45,  color: '#b07a4a', move: 'erratic' },
    CRAB:    { name: '붉은 게',  sprite: [2, 9],  hp: 120, speed: 70,  damage: 12, xp: 70,  color: '#e74c3c', move: 'chase', meat: 2 },
    SPIDER:  { name: '독거미',   sprite: [2, 10], hp: 80,  speed: 130, damage: 9,  xp: 65,  color: '#8e5a3c', move: 'chase' },
    BAT:     { name: '흡혈박쥐', sprite: [0, 10], hp: 50,  speed: 190, damage: 7,  xp: 55,  color: '#c07a4a', move: 'erratic', flying: true },
    BANDIT:  { name: '도적',     sprite: [4, 9],  hp: 110, speed: 165, damage: 12, xp: 80,  color: '#3f8f5a', move: 'erratic' },
    CULTIST: { name: '광신도',   sprite: [3, 9],  hp: 95,  speed: 80,  damage: 12, xp: 95,  color: '#7a3b3b', move: 'ranged', element: 'FIRE' },
    FROST_SLIME: { name: '서리 슬라임', sprite: [0, 9], hp: 90,  speed: 60,  damage: 10, xp: 75, color: '#bfe9ff', move: 'chase', hop: true, filter: 'hue-rotate(40deg) brightness(1.35)' },
    SNOW_BAT:    { name: '눈박쥐',     sprite: [0, 10], hp: 80, speed: 200, damage: 10, xp: 80, color: '#e8f4ff', move: 'erratic', flying: true, filter: 'grayscale(0.8) brightness(1.7)' },
    ICE_MAGE:    { name: '서리 주술사', sprite: [3, 9], hp: 120, speed: 75, damage: 13, xp: 110, color: '#7fd4ff', move: 'ranged', element: 'ICE', filter: 'hue-rotate(190deg) brightness(1.2)' },
    MAGMA_SLIME: { name: '용암 슬라임', sprite: [0, 9], hp: 150, speed: 70, damage: 16, xp: 120, color: '#ff7a2a', move: 'chase', hop: true, filter: 'hue-rotate(-130deg) saturate(2.2)', glow: '#ff7a2a' },
    EMBER_SPIDER: { name: '불씨 거미',  sprite: [2, 10], hp: 130, speed: 150, damage: 14, xp: 115, color: '#ff5a2a', move: 'chase', filter: 'hue-rotate(-20deg) saturate(2.5) brightness(1.1)' },
    SAND_CRAB:   { name: '모래 게',    sprite: [2, 9],  hp: 170, speed: 85, damage: 15, xp: 105, color: '#d8b25a', move: 'chase', meat: 2, filter: 'hue-rotate(40deg) saturate(0.7) brightness(1.2)' },
    GHOST:   { name: '망령',     sprite: [1, 10], hp: 110, speed: 85,  damage: 11, xp: 90,  color: '#cfd8ff', move: 'chase', flying: true, glow: '#9fb4ff' },
};

// 바이옴별 등장 적 (많이 적을수록 자주)
export const BIOME_ENEMIES = {
    FOREST: ['SLIME', 'SLIME', 'GOBLIN', 'PREY', 'PREY'],
    LAKE:   ['SLIME', 'PREY', 'CRAB'],
    JUNGLE: ['RAT', 'RAT', 'CRAB', 'SPIDER', 'PREY'],
    HOLLOW: ['BAT', 'BAT', 'GHOST', 'SPIDER', 'PREY'],
    AUTUMN: ['GOBLIN', 'BANDIT', 'BANDIT', 'RAT', 'PREY', 'PREY'],
    SNOW:   ['FROST_SLIME', 'FROST_SLIME', 'SNOW_BAT', 'ICE_MAGE', 'PREY'],
    DESERT: ['SAND_CRAB', 'BANDIT', 'CULTIST', 'SPIDER'],
    VOLCANO: ['MAGMA_SLIME', 'MAGMA_SLIME', 'EMBER_SPIDER', 'CULTIST'],
};

// 보스. 드래곤 시트를 크게 그려 쓴다. unlock: 처치 시 해금되는 속성
export const BOSSES = {
    MORGATH: {
        name: '뼈용 모르가스', title: '달빛 골짜기의 주인', species: 'BONE', colors: { body: '#ffffff', wing: '#ffffff' },
        x: 4400, y: 1500, scale: 2.0, hp: 1100, speed: 120, contact: 18, xp: 600,
        element: 'ICE', unlock: 'ICE', revive: true, patterns: ['RING', 'SUMMON', 'AIMED', 'BONE_RAIN'],
    },
    ZALGORA: {
        name: '쌍두룡 잘고라', title: '환영의 밀림의 폭군', species: 'HYDRA', colors: { body: '#a3262b', wing: '#e0a020' },
        x: 1500, y: 4400, scale: 1.9, hp: 1700, speed: 150, contact: 22, xp: 900,
        element: 'THUNDER', unlock: 'THUNDER', twin: true, patterns: ['TWIN_BEAM', 'AIMED', 'SPIRAL', 'AIMED', 'CHARGE'],
    },
    GLACIA: {
        name: '서리 여왕 글라시아', title: '얼어붙은 봉우리의 지배자', species: 'WYVERN', colors: { body: '#cfeaff', wing: '#7fb8ff' },
        x: 6800, y: 1600, scale: 2.1, hp: 2600, speed: 165, contact: 24, xp: 1300,
        element: 'ICE', unlock: null, patterns: ['HOMING', 'ICE_FIELD', 'BLIZZARD', 'RING', 'HOMING'],
    },
    BASIL: {
        name: '모래 폭군 바실', title: '죽은 사구의 포식자', species: 'BEHEMOTH', colors: { body: '#c9a24a', wing: '#8a5a2a' },
        x: 2000, y: 6800, scale: 2.1, hp: 3200, speed: 140, contact: 30, xp: 1600,
        element: 'FIRE', unlock: null, chargeChain: true, patterns: ['BURROW', 'CHARGE', 'QUAKE', 'AIMED', 'BURROW'],
    },
    IGNAR: {
        name: '고룡 이그나르', title: '하늘에서 떨어진 재앙', species: 'SHADOW', colors: { body: '#3a2a4a', wing: '#ff5a1f' },
        x: 6700, y: 6700, scale: 2.0, hp: 4500, speed: 175, contact: 32, xp: 3000,
        element: 'FIRE', unlock: null, phase2: true, patterns: ['METEOR_RAIN', 'AIMED', 'FLAME_WALL', 'CHARGE', 'SPIRAL'],
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
