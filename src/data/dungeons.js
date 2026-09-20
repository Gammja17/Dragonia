import { BOSSES } from './enemies.js';

// 굴 입구. 바깥 세상 곳곳에 뚫려 있고, 들어갈 때마다 안은 새로 그려진다 (world/dungeon.js).
//  biome  안에 나오는 적의 무리 (data/enemies.js 의 BIOME_ENEMIES 키)
//  x, y   입구가 서 있는 자리
export const DUNGEONS = {
    HOLLOW_BARROW: {
        name: '무너진 옛 둥지', biome: 'HOLLOW',
        x: BOSSES.MORGATH.x - 760, y: BOSSES.MORGATH.y - 620,
        intro: '바위 틈으로 찬 바람이 올라온다. 삼백 년 전 용들이 파 두었다는 굴이다. 안쪽은 들어갈 때마다 길이 달라진다고들 한다.',
    },
    JUNGLE_HOLLOW: {
        name: '뿌리 아래 굴', biome: 'JUNGLE',
        x: BOSSES.ZALGORA.x + 700, y: BOSSES.ZALGORA.y + 640,
        intro: '거대한 나무 뿌리가 갈라진 틈. 축축한 흙냄새와 함께 무언가 기어 다니는 소리가 들린다.',
    },
    EMBER_SHAFT: {
        name: '잿더미 갱도', biome: 'VOLCANO',
        x: BOSSES.IGNAR.x - 820, y: BOSSES.IGNAR.y - 700,
        intro: '뜨거운 바람이 아래에서 밀려 올라온다. 인간들이 무언가를 캐내려 뚫었다가 버리고 간 갱도다.',
    },
};
