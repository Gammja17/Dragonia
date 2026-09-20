import { loadImages } from '../render/assets.js';
import { TILE_IMAGES } from '../data/tiles.js';
import { recolor, RECOLOR_NAMES } from '../render/palette.js';

// 타일 그림을 들고 있고, "지금 밟고 있는 지도" 하나를 가리킨다.
//
// 예전엔 여기서 8000×8000 월드를 통째로 만들어 구웠다. 이제는 지도가 여러 장이라
// (world/mapgen.js 가 만들고 systems/world.js 가 갈아 끼운다) 여기서는 현재 지도에
// 물어보기만 한다. 굴도 같은 얼굴(groundAt/draw/minimap)을 하고 있어서 똑같이 끼워진다.

let images = null;
let active = null;

/** 게임 시작 전에 한 번. 타일 시트를 받고 바이옴별 색상판을 만들어 둔다 */
export async function preloadTerrain() {
    images = await loadImages(TILE_IMAGES);
    // 색상판 3~6: 초록 숲 시트를 다시 칠해 설원·화산·단풍·사막을 만든다 (키는 ground4, trees4 … 식)
    RECOLOR_NAMES.forEach((name, i) => {
        for (const base of ['ground', 'trees', 'props']) images[base + (4 + i)] = recolor(images[base], name, base === 'ground');
    });
}

export function getTileImage(key) { return images ? images[key] : null; }

/** systems/world.js 와 systems/delve.js 만 부른다 */
export function setActiveMap(map) { active = map; }
export function activeMap() { return active; }

/** 지금 지도의 바이옴 (소품 색상판·등장 몬스터에 쓴다). 굴이면 그 굴의 바이옴 */
export function activeBiome() {
    if (!active) return 'FOREST';
    return active.biome || (active.spec && active.spec.biome) || 'FOREST';
}

/** 지금 지도의 크기 (월드 px) */
export function currentMapBounds() {
    return active ? { w: active.w, h: active.h } : { w: 1920, h: 1440 };
}
/** 정사각형 하나로 물어보는 옛 코드를 위해 (카메라 경계 등) */
export function currentMapSize() {
    const b = currentMapBounds();
    return Math.max(b.w, b.h);
}

/** 밟고 있는 바닥 종류: 'GRASS' | 'DIRT' | 'WATER' | (굴) 'FLOOR' | 'WALL' */
export function groundAt(x, y) {
    return active ? active.groundAt(x, y) : 'GRASS';
}

/** 카메라 영역만큼 지형을 그린다 (월드 좌표계에서 호출) */
export function drawTerrain(ctx, cam) {
    if (active) active.draw(ctx, cam);
}

/** 미니맵 바탕 */
export function getMinimapBase(size) {
    if (active) return active.minimap(size);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
}

/** 미니맵 안에서 월드 좌표가 놓일 자리 { k, ox, oy } */
export function minimapPlace(size) {
    if (active && active.minimapPlace) return active.minimapPlace(size);
    const b = currentMapBounds();
    return { k: size / Math.max(b.w, b.h), ox: 0, oy: 0 };
}
