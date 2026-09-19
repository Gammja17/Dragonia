// 스프라이트 색상 교체. 원본의 특정 색상대(hue 범위)를 목표 색으로 옮기되 명암은 유지한다.
// 예: 빨간 드래곤 시트의 빨강 계열 → 플레이어가 고른 몸 색, 노랑 계열 → 포인트 색.

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
}

export function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    return rgbToHsl(n >> 16, (n >> 8) & 255, n & 255);
}

function hueDist(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * zones: [{ hue, range, refL, target }] — 원본 시트에서 hue±range 에 드는 픽셀을 colors[target] 색으로 옮긴다.
 * refL: 원본 색상대의 평균 밝기. 목표색 밝기와의 차이만큼 전체를 밝게/어둡게 해서 명암을 보존한다.
 * colors: { body:'#rrggbb', wing:'#rrggbb', ... }
 */
export function tintImage(img, zones, colors) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height);
    const d = id.data;

    const targets = zones.map(z => ({ ...z, t: hexToHsl(colors[z.target] || '#ffffff') }));

    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (s < 0.18 || l < 0.06 || l > 0.96) continue; // 회색/검정/흰색(눈, 발톱, 윤곽)은 그대로
        for (const z of targets) {
            if (hueDist(h, z.hue) > z.range) continue;
            const [th, ts, tl] = z.t;
            const ns = clamp01(s * 0.4 + ts * 0.6);
            const nl = clamp01(l + (tl - z.refL) * 0.8);
            const [r, gg, b] = hslToRgb(th, ns, nl);
            d[i] = r; d[i + 1] = gg; d[i + 2] = b;
            break;
        }
    }
    g.putImageData(id, 0, 0);
    return c;
}
