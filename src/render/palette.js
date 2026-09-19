import { rgbToHsl, hslToRgb } from './tint.js';

// 숲 타일 시트(초록 v01)를 통째로 다시 칠해 새 지형을 만든다. 배치는 그대로라 타일 좌표표를 그대로 쓴다.
// 원본의 색 구역: 풀·나뭇잎(hue 60~170), 흙·바위 테두리(hue 15~55), 물(hue 170~260)
const isLeaf = (h) => h >= 58 && h < 170;
const isEarth = (h) => h >= 12 && h < 58;
const isWater = (h) => h >= 170 && h < 265;

// 각 함수: (h, s, l) → [h, s, l]
const RECOLORS = {
    SNOW(h, s, l) {       // 눈 덮인 땅, 얼어붙은 물
        if (isLeaf(h)) return [205, s * 0.22, 0.52 + l * 0.5];
        if (isEarth(h)) return [215, s * 0.25, 0.3 + l * 0.55];
        if (isWater(h)) return [192, s * 0.55, 0.45 + l * 0.75];
        return [h, s, l];
    },
    VOLCANO(h, s, l) {    // 잿빛 땅, 물 대신 용암
        if (isLeaf(h)) return [8, s * 0.28, l * 0.42 + 0.03];
        if (isEarth(h)) return [14, s * 0.5, l * 0.5];
        if (isWater(h)) return [14 + l * 60, 1, 0.34 + l * 1.1];
        return [h, s, l];
    },
    AUTUMN(h, s, l) {     // 단풍 든 숲
        if (isLeaf(h)) return [Math.max(8, 52 - (h - 58) * 0.42), Math.min(1, s * 1.15), l];
        return [h, s, l];
    },
    DESERT(h, s, l) {     // 모래땅, 메마른 덤불
        if (isLeaf(h)) return [40 + (h - 58) * 0.05, s * 0.55, 0.3 + l * 0.72];
        if (isEarth(h)) return [24, s * 0.8, l * 0.95];
        if (isWater(h)) return [178, s * 0.9, 0.2 + l * 0.9];
        return [h, s, l];
    },
};

export const RECOLOR_NAMES = Object.keys(RECOLORS);

/** ground: 바닥 시트인가. 나무·소품 시트의 푸른 색은 물이 아니라 그림자라서 건드리지 않는다 */
export function recolor(img, name, ground = true) {
    const fn = RECOLORS[name];
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (s < 0.08) continue;   // 회색(바위, 그림자)은 그대로
        if (!ground && isWater(h)) continue;
        const [nh, ns, nl] = fn(h, s, l);
        const [r, gg, b] = hslToRgb(nh, Math.max(0, Math.min(1, ns)), Math.max(0, Math.min(1, nl)));
        d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    }
    g.putImageData(id, 0, 0);
    return c;
}
