import { DRAGON_SHEETS } from '../data/sprites.js';
import { loadImages } from './assets.js';
import { tintImage } from './tint.js';
import { buildSheet } from './spritesheet.js';

const rawImages = {};      // species → { down, left, right, up } | { sheet }
const sheetCache = new Map(); // `${species}|${body}|${wing}` → sheet
let loaded = false;

/** 게임 시작 전에 한 번 호출. 모든 종족 원본 시트를 받는다. */
export async function preloadDragonSprites() {
    await Promise.all(Object.entries(DRAGON_SHEETS).map(async ([species, desc]) => {
        rawImages[species] = await loadImages(desc.images);
    }));
    loaded = true;
}

export function dragonSpritesReady() { return loaded; }

/** 종족 + 색상 조합별로 틴트된 시트를 만들고 캐시 */
export function getDragonSheet(species, colors) {
    const desc = DRAGON_SHEETS[species] || DRAGON_SHEETS.WESTERN;
    const key = `${species}|${colors.body}|${colors.wing}`;
    if (sheetCache.has(key)) return sheetCache.get(key);
    if (!loaded) return null;

    const raw = rawImages[species] || rawImages.WESTERN;
    const images = {};
    for (const [k, img] of Object.entries(raw)) {
        images[k] = desc.zones.length ? tintImage(img, desc.zones, colors) : img;
    }
    const sheet = buildSheet(desc, images);
    sheetCache.set(key, sheet);
    return sheet;
}
