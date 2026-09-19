// 게임 전역 상수
export const WORLD_SIZE = 8000;

export const VILLAGE_CENTER = { x: 1200, y: 1200 };
export const PLAYER_SPAWN = { x: 1200, y: 1250 };
// 둥지 자리들은 지형의 큰 칸(96px) 중심이어야 한다 (96n - 144). 돌무더기가 그 칸에 구워진다
export const NEST_POS = { x: 1296, y: 624 };   // 플레이어의 아지트: 마을 북쪽 숲속 공터
export const HOMES = [                          // 마을 용들의 보금자리 (마당 + 둥지)
    { owner: 'Tiamat', x: 1776, y: 1200 },      // 동쪽 망루
    { owner: 'Poco', x: 816, y: 1776 },         // 남서쪽 꽃밭
];
export const TRAINING = { x: 2448, y: 1104 };   // 스승 카이론의 수련장 (마을 동쪽 숲 너머)

export const DAY_LENGTH = 240; // 하루 길이(초)

export const CHEST_COUNT = 48;
export const MAX_KIDS = 6;
export const MAX_PARTICLES = 350;
export const MAX_BULLETS = 100;
export const MAX_ENEMIES = 14; // 플레이어 주변에 유지되는 적 수

export const RAID_FIRST_DELAY = 120; // 초
export const RAID_INTERVAL = 150;
