// 굴 입구. 바깥 세상 곳곳에 뚫려 있고, 들어갈 때마다 안은 새로 그려진다 (world/dungeon.js).
//  biome  안에 나오는 적의 무리 (data/enemies.js 의 BIOME_ENEMIES 키)
//  입구가 어느 지도 어디에 서 있는지는 data/maps.js 의 fixtures 가 정한다
export const DUNGEONS = {
    FOREST_HOLE: {
        name: '나무뿌리 구멍', biome: 'FOREST',
        intro: '쓰러진 고목 아래로 구멍이 뚫려 있다. 몸을 비틀면 들어갈 만하다. 안에서 서늘한 바람이 올라온다.',
    },
    HOLLOW_BARROW: {
        name: '무너진 옛 둥지', biome: 'HOLLOW',
        intro: '바위 틈으로 찬 바람이 올라온다. 삼백 년 전 용들이 파 두었다는 굴이다. 안쪽은 들어갈 때마다 길이 달라진다고들 한다.',
    },
    JUNGLE_HOLLOW: {
        name: '뿌리 아래 굴', biome: 'JUNGLE',
        intro: '거대한 나무 뿌리가 갈라진 틈. 축축한 흙냄새와 함께 무언가 기어 다니는 소리가 들린다.',
    },
    EMBER_SHAFT: {
        name: '잿더미 갱도', biome: 'VOLCANO',
        intro: '뜨거운 바람이 아래에서 밀려 올라온다. 인간들이 무언가를 캐내려 뚫었다가 버리고 간 갱도다.',
    },
};
