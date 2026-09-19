import { loadImages } from './assets.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';

// 출처는 CREDITS.md 참고
const VFX_IMAGES = {
    firebolt: 'assets/vfx/firebolt.png',   // 48x48 × 11: 0~3 날아가는 불, 5~10 폭발
    ice: 'assets/vfx/ice.png',             // 48x32 × 10 날아가는 얼음
    ice_hit: 'assets/vfx/ice_hit.png',     // 48x32 × 8
    thunder: 'assets/vfx/thunder.png',     // 32x32 × 5 날아가는 번개
    thunder_hit: 'assets/vfx/thunder_hit.png', // 32x32 × 6
    smoke: 'assets/vfx/smoke.png',         // 64x64 × 13
    campfire: 'assets/vfx/campfire.png',   // 64x64, 10열 × 6행
    star: 'assets/vfx/star.png',
    ring: 'assets/vfx/ring.png',
};

let images = null;
export async function preloadVfx() { images = await loadImages(VFX_IMAGES); }
export function getVfxImage(key) { return images ? images[key] : null; }

/**
 * 한 번 재생되고 사라지는 효과.
 *  - 시트형: { img, fw, fh, frames:[...], fps, scale, ax, ay, additive }
 *  - 한 장짜리(커지며 사라짐): { img, life, from, to, spin, additive }
 * light: 조명 시스템이 읽는 값 { r, color }
 */
const EFFECTS = {
    FIRE_HIT: { img: 'firebolt', fw: 48, fh: 48, frames: [5, 6, 7, 8, 9, 10], fps: 20, scale: 3, ax: 0.83, ay: 0.5, additive: true, light: { r: 220, color: '#ff9a3c' } },
    ICE_HIT:  { img: 'ice_hit', fw: 48, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 20, scale: 3, ax: 0.5, ay: 0.5, additive: true, light: { r: 200, color: '#7fd4ff' } },
    THUNDER_HIT: { img: 'thunder_hit', fw: 32, fh: 32, frames: [0, 1, 2, 3, 4, 5], fps: 22, scale: 3.5, ax: 0.5, ay: 0.5, additive: true, light: { r: 240, color: '#ffe27a' } },
    SMOKE:    { img: 'smoke', fw: 64, fh: 64, frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], fps: 18, scale: 2, ax: 0.5, ay: 0.6 },
    STAR:     { img: 'star', life: 0.5, from: 0.3, to: 1.6, spin: 1.5, additive: true, light: { r: 260, color: '#fff2b0' } },
    RING:     { img: 'ring', life: 0.7, from: 0.2, to: 2.2, spin: 0.8, additive: true, light: { r: 300, color: '#ffe9a0' } },
};

class Effect {
    constructor(x, y, def, angle, size) {
        this.x = x; this.y = y;
        this.def = def;
        this.angle = angle;
        this.size = size;
        this.t = 0;
        this.remove = false;
        this.duration = def.frames ? def.frames.length / def.fps : def.life;
    }
    get light() {
        const l = this.def.light;
        return l ? { r: l.r * this.size, color: l.color, intensity: 1 - this.t / this.duration, emissive: true } : null;
    }
    update(dt) {
        this.t += dt;
        if (this.t >= this.duration) this.remove = true;
    }
    draw(ctx) {
        if (this.remove || !isOnScreen(this, 200)) return;
        const d = this.def, img = images[d.img];
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        if (d.additive) ctx.globalCompositeOperation = 'lighter';
        if (d.frames) {
            const f = d.frames[Math.min(d.frames.length - 1, Math.floor(this.t * d.fps))];
            const w = d.fw * d.scale * this.size, h = d.fh * d.scale * this.size;
            ctx.rotate(this.angle);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, f * d.fw, 0, d.fw, d.fh, -w * d.ax, -h * d.ay, w, h);
        } else {
            const k = this.t / this.duration;
            const s = (d.from + (d.to - d.from) * (1 - (1 - k) * (1 - k))) * 128 * this.size;
            ctx.rotate(this.angle + k * d.spin);
            ctx.globalAlpha = 1 - k * k;
            ctx.drawImage(img, -s / 2, -s / 2, s, s);
        }
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
    }
}

export function spawnEffect(name, x, y, { angle = 0, size = 1 } = {}) {
    if (!images) return;
    state.entities.effects.push(new Effect(x, y, EFFECTS[name], angle, size));
}

/** 번개가 튈 때 두 점을 잇는 지그재그 섬광 */
class Bolt {
    constructor(x1, y1, x2, y2) {
        this.x = (x1 + x2) / 2; this.y = (y1 + y2) / 2;
        this.t = 0; this.remove = false;
        this.points = [];
        const n = 7;
        for (let i = 0; i <= n; i++) {
            const k = i / n, jitter = i === 0 || i === n ? 0 : 14;
            this.points.push([x1 + (x2 - x1) * k + (Math.random() - 0.5) * jitter * 2, y1 + (y2 - y1) * k + (Math.random() - 0.5) * jitter * 2]);
        }
    }
    get light() { return { r: 200, color: '#ffe27a', intensity: 1 - this.t / 0.18, emissive: true }; }
    update(dt) { this.t += dt; if (this.t > 0.18) this.remove = true; }
    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 1 - this.t / 0.18);
        ctx.lineJoin = 'round';
        for (const [w, c] of [[7, 'rgba(255,226,122,0.35)'], [2.5, '#fffbe0']]) {
            ctx.strokeStyle = c; ctx.lineWidth = w;
            ctx.beginPath();
            this.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
        }
        ctx.restore();
    }
}

export function spawnBolt(x1, y1, x2, y2) {
    state.entities.effects.push(new Bolt(x1, y1, x2, y2));
}
