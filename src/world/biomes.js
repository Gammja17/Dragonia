// 지형 종류. 지도마다 하나씩 붙는다 (data/maps.js 의 biome).
//   name   화면에 띄우는 이름
//   safe   적이 돌아다니지 않는 곳
//   palette  숲 타일 시트를 다시 칠할 색상판 번호 (render/palette.js)
//   decor      바닥에 흩뿌릴 잡동사니 (data/tiles.js 의 PROP_SPRITES 키). 밟고 지나갈 수 있다
//   landmarks  지도마다 한두 개만 서는 큰 것. "여기가 어디였지"가 기억에 남게 한다
//
// 예전엔 어느 지도든 덤불·고사리·바위·그루터기 넷만 깔려서, 색만 다른 같은 풀밭으로 보였다.
// 바이옴마다 깔 것을 달리 주면 같은 생성기로 만든 지도도 저마다 다른 곳이 된다.
export const BIOMES = {
    VILLAGE: { name: '드래곤 빌리지', safe: true,  palette: 0,
               decor: ['POT', 'CRATE_BIG', 'BARRELS', 'FENCE', 'ROCK_MOSS', 'PEBBLES'], landmarks: ['WELL', 'STALL', 'BENCH', 'GARDEN'] },
    LAKE:    { name: '신비의 호수',   safe: true,  palette: 0,
               decor: ['PEBBLES', 'ROCK_MOSS', 'STEPSTONE'], landmarks: ['STUMP_TABLE', 'BENCH', 'WELL'] },
    FALLS:   { name: '구름 폭포',     safe: true,  palette: 0,
               decor: ['ROCK_MOSS', 'PEBBLES', 'GRAVEL'], landmarks: ['RUIN', 'STONE_WALL', 'TEMPLE'] },
    CLOUDTOP:{ name: '구름마루 마을', safe: true,  palette: 0,
               decor: ['POT', 'CRATE_BIG', 'FENCE', 'CROPS'], landmarks: ['BANNER', 'TEMPLE', 'STALL'] },
    FOREST:  { name: '숲',            safe: false, palette: 0,
               decor: ['ROCK_MOSS', 'PEBBLES', 'DEAD_BRANCH'], landmarks: ['RUIN', 'WELL', 'STUMP_TABLE'] },
    JUNGLE:  { name: '밀림',          safe: false, palette: 1,
               decor: ['VINE_PILLAR', 'PEBBLES', 'ROCK_MOSS', 'DEAD_BRANCH'], landmarks: ['RUIN', 'STONE_WALL', 'CAVE_ARCH'] },
    HOLLOW:  { name: '골짜기',        safe: false, palette: 2,
               decor: ['GRAVEL', 'ROCK_MOSS', 'SKULL', 'DEAD_BRANCH'], landmarks: ['GRAVE', 'RUIN', 'CAVE_ARCH'] },
    SNOW:    { name: '설원',          safe: false, palette: 3,
               decor: ['PEBBLES', 'DEAD_BRANCH', 'ROCK_MOSS'], landmarks: ['GRAVE', 'STONE_WALL', 'RUIN'] },
    VOLCANO: { name: '화산',          safe: false, palette: 4,
               decor: ['GRAVEL', 'SKULL', 'ROCK_MOSS'], landmarks: ['RUIN', 'CAVE_ARCH', 'GATE'] },
    AUTUMN:  { name: '단풍숲',        safe: false, palette: 5,
               decor: ['DEAD_BRANCH', 'PEBBLES', 'CRATE_BIG', 'ROCK_MOSS'], landmarks: ['WELL', 'STUMP_TABLE', 'FENCE'] },
    DESERT:  { name: '사막',          safe: false, palette: 6,
               decor: ['SKULL', 'GRAVEL', 'POT', 'PEBBLES'], landmarks: ['RUIN', 'GRAVE', 'TEMPLE'] },
    SKY:     { name: '구름 위',       safe: false, palette: 7,   // 날아야 갈 수 있다. 물 자리가 뚫린 하늘이다
               decor: ['PEBBLES', 'ROCK_MOSS'], landmarks: ['TEMPLE', 'BANNER', 'STONE_WALL'] },
};
