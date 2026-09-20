// 지형 종류. 지도마다 하나씩 붙는다 (data/maps.js 의 biome).
//   name   화면에 띄우는 이름
//   safe   적이 돌아다니지 않는 곳
//   palette  숲 타일 시트를 다시 칠할 색상판 번호 (render/palette.js)
export const BIOMES = {
    VILLAGE: { name: '드래곤 빌리지', safe: true,  palette: 0 },
    LAKE:    { name: '신비의 호수',   safe: true,  palette: 0 },
    FALLS:   { name: '구름 폭포',     safe: true,  palette: 0 },
    CLOUDTOP:{ name: '구름마루 마을', safe: true,  palette: 0 },
    FOREST:  { name: '숲',            safe: false, palette: 0 },
    JUNGLE:  { name: '밀림',          safe: false, palette: 1 },
    HOLLOW:  { name: '골짜기',        safe: false, palette: 2 },
    SNOW:    { name: '설원',          safe: false, palette: 3 },
    VOLCANO: { name: '화산',          safe: false, palette: 4 },
    AUTUMN:  { name: '단풍숲',        safe: false, palette: 5 },
    DESERT:  { name: '사막',          safe: false, palette: 6 },
};
