import { loadImages } from './assets.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';

// 출처는 CREDITS.md 참고
const VFX_IMAGES = {
    firebolt: 'assets/vfx/firebolt.png',   // 48x48 × 11: 0~3 날아가는 불, 5~10 폭발
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
