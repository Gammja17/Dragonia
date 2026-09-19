export const rand = (min, max) => Math.random() * (max - min) + min;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** '#rrggbb' 색을 percent(-1~1)만큼 어둡게/밝게 */
export function shadeColor(color, percent) {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const R = f >> 16, G = (f >> 8) & 0xff, B = f & 0xff;
    const mix = (c) => Math.round((t - c) * p) + c;
    return '#' + (0x1000000 + mix(R) * 0x10000 + mix(G) * 0x100 + mix(B)).toString(16).slice(1);
}

export function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}
