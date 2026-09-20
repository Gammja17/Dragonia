import { state } from '../core/state.js';
import { DAY_LENGTH } from '../core/config.js';
import { getGlow, drawGlow } from './pixel.js';

// 조명: 절반 해상도의 "빛 지도"를 만들어 화면에 곱한다(multiply).
// 빛 지도는 시간대별 주변광 색으로 채우고, 광원마다 밝은 원을 더한다. 흰색 = 원래 색 그대로.
// 엔티티는 light 속성({ r, color, intensity?, emissive?, dy? })만 내놓으면 된다.

const LM_SCALE = 0.5;

// [하루 중 시각(0~1), 주변광 RGB]
const AMBIENT_KEYS = [
    [0.00, [58, 72, 140]],    // 밤
    [0.20, [58, 72, 140]],
    [0.27, [255, 178, 142]],  // 새벽
    [0.36, [255, 246, 228]],  // 낮 (살짝 따뜻하게)
    [0.68, [255, 246, 228]],
    [0.76, [255, 150, 112]],  // 해질녘
    [0.84, [58, 72, 140]],
    [1.00, [58, 72, 140]],
];

const lm = document.createElement('canvas');
const lmCtx = lm.getContext('2d');
let vignette = null;

const CLOUD_SPAN = 4200;   // 구름이 흘러가는 범위 (지도 한 장보다 넉넉하게)
const clouds = Array.from({ length: 10 }, (_, i) => ({ x: i * (CLOUD_SPAN / 10) + (i % 2) * 300, y: (i * 977) % 2400, r: 380 + (i * 53) % 160 }));
const fireflies = Array.from({ length: 40 }, () => ({ x: Math.random() * 4000, y: Math.random() * 4000, phase: Math.random() * 6.28, speed: 0.5 + Math.random() }));

const CAVE_AMBIENT = [26, 26, 38];   // 굴 속: 횃불과 제 몸의 불빛만 보인다

function ambient() {
    if (state.dungeon || state.indoors) return CAVE_AMBIENT;
    const t = state.dayTime;
    let i = 1;
    while (AMBIENT_KEYS[i][0] < t) i++;
    const [t0, a] = AMBIENT_KEYS[i - 1], [t1, b] = AMBIENT_KEYS[i];
    const k = (t - t0) / (t1 - t0 || 1);
    return a.map((v, n) => Math.round(v + (b[n] - v) * k));
}

export function dayPhaseName() {
    const t = state.dayTime;
    if (t < 0.22 || t >= 0.82) return '밤';
    if (t < 0.36) return '새벽';
    if (t < 0.68) return '낮';
    return '해질녘';
}

export function updateLighting(dt) {
    state.dayTime += dt / DAY_LENGTH;
    if (state.dayTime >= 1) { state.dayTime -= 1; state.day++; }
}

function collectLights() {
    const E = state.entities;
    const out = [];
    for (const group of [E.props, E.nests, E.npcs, E.babies, E.enemies, E.bosses, E.hazards, E.bullets, E.effects, [state.player]]) {
        for (const e of group) {
            const l = e.light;
            if (l) out.push({ x: e.x, y: e.y + (l.dy || 0), r: l.r, color: l.color, intensity: l.intensity ?? 1, emissive: !!l.emissive });
        }
    }
    return out;
}

function buildVignette(w, h) {
    vignette = document.createElement('canvas');
    vignette.width = w; vignette.height = h;
    const g = vignette.getContext('2d');
    const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    grad.addColorStop(0, 'rgba(8,10,25,0)');
    grad.addColorStop(1, 'rgba(8,10,25,0.42)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
}

/** 월드를 다 그린 뒤, 화면 좌표계에서 호출 */
export function drawLighting(ctx, cam) {
    const w = cam.w, h = cam.h;
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    const lw = Math.ceil(w * LM_SCALE), lh = Math.ceil(h * LM_SCALE);
    if (lm.width !== lw || lm.height !== lh) { lm.width = lw; lm.height = lh; }
    if (!vignette || vignette.width !== w || vignette.height !== h) buildVignette(w, h);

    // 비가 오면 푸르스름하게 어두워진다
    const wet = state.weather.intensity;
    let [r, g, b] = ambient().map((v, i) => Math.round(v * (1 - wet * [0.34, 0.28, 0.16][i])));
    if (state.event === 'BLOOD_MOON') {   // 어두울수록 붉게
        const k = Math.min(1, (1 - (r + g + b) / 765) * 1.6);
        r = Math.round(r + (170 - r) * k); g = Math.round(g + (48 - g) * k); b = Math.round(b + (70 - b) * k);
    }
    const dark = 1 - (0.3 * r + 0.59 * g + 0.11 * b) / 255; // 0(낮) ~ 0.7(밤)
    const lights = collectLights().filter(l => l.x + l.r > cx && l.x - l.r < cx + w && l.y + l.r > cy && l.y - l.r < cy + h);

    // 1) 빛 지도
    lmCtx.globalCompositeOperation = 'source-over';
    lmCtx.globalAlpha = 1;
    lmCtx.fillStyle = `rgb(${r},${g},${b})`;
    lmCtx.fillRect(0, 0, lw, lh);

    // 낮에는 구름 그림자가 천천히 지나간다
    const cloudAlpha = state.dungeon || state.indoors ? 0 : 0.3 * Math.max(0, 1 - dark * 2.5);   // 굴 속엔 구름 그림자가 없다
    if (cloudAlpha > 0.01) {
        const shadow = getGlow('#141c3a');
        lmCtx.globalAlpha = cloudAlpha;
        for (const c of clouds) {
            const x = ((c.x + state.gameTime * 14) % CLOUD_SPAN) - 600, y = c.y + Math.sin(state.gameTime * 0.05 + c.r) * 80;
            lmCtx.drawImage(shadow, (x - c.r - cx) * LM_SCALE, (y - c.r * 0.7 - cy) * LM_SCALE, c.r * 2 * LM_SCALE, c.r * 1.4 * LM_SCALE);
        }
    }

    lmCtx.globalCompositeOperation = 'lighter';
    const lightPower = Math.min(1, dark * 1.7);
    for (const l of lights) {
        lmCtx.globalAlpha = Math.min(1, l.intensity * lightPower);
        const rr = l.r * LM_SCALE;
        lmCtx.drawImage(getGlow(l.color), (l.x - cx) * LM_SCALE - rr, (l.y - cy) * LM_SCALE - rr, rr * 2, rr * 2);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lm, 0, 0, lw, lh, 0, 0, w, h);

    // 2) 불처럼 스스로 빛나는 것들은 낮에도 은은하게 번진다
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
        if (l.emissive) drawGlow(ctx, l.x - cx, l.y - cy, l.r * 0.45, l.color, (0.16 + dark * 0.3) * l.intensity);
    }

    // 3) 밤의 반딧불이 (굴 속엔 없다)
    const night = state.dungeon || state.indoors ? 0 : Math.min(1, Math.max(0, (dark - 0.3) * 3));
    if (night > 0) {
        for (const f of fireflies) {
            const t = state.gameTime * f.speed + f.phase;
            const x = (((f.x + Math.sin(t * 0.7) * 60 - cx) % w) + w) % w;
            const y = (((f.y + Math.cos(t * 0.9) * 40 - cy) % h) + h) % h;
            const blink = 0.5 + 0.5 * Math.sin(t * 3);
            drawGlow(ctx, x, y, 9, '#d8ff7a', night * blink);
        }
    }

    // 4) 화면 가장자리를 살짝 어둡게
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(vignette, 0, 0);
    ctx.restore();
}
