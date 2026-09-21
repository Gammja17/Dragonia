import { loadImages } from './assets.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { coloredCopy } from './pixel.js';

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
    flames: 'assets/vfx/flames.png',           // 48x48, 2행: 타오르는 불 4프레임
    ice_spike: 'assets/vfx/ice_spike.png',     // 32x32 × 9 솟아오르는 얼음
    thunder_ball: 'assets/vfx/thunder_ball.png', // 48x48 × 16
    puff: 'assets/vfx/puff.png',               // 48x32 × 9 먼지
    // Kenney Particle Pack (흰색이라 spawnEffect 의 color 로 물들여 쓴다)
    slash: 'assets/vfx/slash.png', scorch: 'assets/vfx/scorch.png', twirl: 'assets/vfx/twirl.png', spark: 'assets/vfx/spark.png',
    muzzle: 'assets/vfx/muzzle.png', dirt: 'assets/vfx/dirt.png', flare: 'assets/vfx/flare.png', circle_magic: 'assets/vfx/circle_magic.png',
    shockwave: 'assets/vfx/shockwave.png', heart: 'assets/vfx/heart.png', aura: 'assets/vfx/aura.png',
};

let images = null;
export async function preloadVfx() { images = await loadImages(VFX_IMAGES); }
export function getVfxImage(key) { return images ? images[key] : null; }

/**
 * 한 번 재생되고 사라지는 효과.
 *  - 시트형: { img, fw, fh, row?, frames:[...], fps, scale, ax, ay, additive }
 *  - 한 장짜리(커지며 사라짐): { img, life, from, to, spin, additive, flat?(바닥에 눕힘), rise?(떠오름) }
 * light: 조명 시스템이 읽는 값 { r, color }
 */
const EFFECTS = {
    FIRE_HIT: { img: 'firebolt', fw: 48, fh: 48, frames: [5, 6, 7, 8, 9, 10], fps: 20, scale: 3, ax: 0.83, ay: 0.5, additive: true, light: { r: 220, color: '#ff9a3c' } },
    ICE_HIT:  { img: 'ice_hit', fw: 48, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 20, scale: 3, ax: 0.5, ay: 0.5, additive: true, light: { r: 200, color: '#7fd4ff' } },
    THUNDER_HIT: { img: 'thunder_hit', fw: 32, fh: 32, frames: [0, 1, 2, 3, 4, 5], fps: 22, scale: 3.5, ax: 0.5, ay: 0.5, additive: true, light: { r: 240, color: '#ffe27a' } },
    SMOKE:    { img: 'smoke', fw: 64, fh: 64, frames: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], fps: 18, scale: 2, ax: 0.5, ay: 0.6 },
    STAR:     { img: 'star', life: 0.5, from: 0.3, to: 1.6, spin: 1.5, additive: true, light: { r: 260, color: '#fff2b0' } },
    FLAMES:   { img: 'flames', fw: 48, fh: 48, row: 1, frames: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3], fps: 10, scale: 2.4, ax: 0.5, ay: 0.85, additive: true, light: { r: 170, color: '#ff9a3c' } },
    ICE_SPIKE: { img: 'ice_spike', fw: 32, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8], fps: 16, scale: 3.4, ax: 0.5, ay: 0.85, additive: true, light: { r: 160, color: '#7fd4ff' } },
    THUNDER_BALL: { img: 'thunder_ball', fw: 48, fh: 48, frames: [8, 9, 10, 11, 12, 13, 14, 15], fps: 20, scale: 3, ax: 0.5, ay: 0.5, additive: true, light: { r: 220, color: '#ffe27a' } },
    PUFF:     { img: 'puff', fw: 48, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], fps: 22, scale: 2.2, ax: 0.5, ay: 0.7 },
    SLASH:    { img: 'slash', life: 0.22, from: 0.9, to: 1.5, spin: 2.6, additive: true },
    HIT_SPARK: { img: 'flare', life: 0.16, from: 0.5, to: 1.5, spin: 0, additive: true },
    CRIT_FLASH: { img: 'star', life: 0.3, from: 0.5, to: 2.0, spin: 0.6, additive: true, light: { r: 200, color: '#ffd84a' } },
    SPARK:    { img: 'spark', life: 0.25, from: 0.7, to: 1.3, spin: 0.4, additive: true },
    MUZZLE:   { img: 'muzzle', life: 0.12, from: 0.5, to: 0.9, spin: 0, additive: true },
    DUST:     { img: 'dirt', life: 0.5, from: 0.4, to: 1.1, spin: 0.3 },
    SHOCKWAVE: { img: 'shockwave', life: 0.45, from: 0.2, to: 3.2, spin: 0, additive: true, flat: true },
    SCORCH:   { img: 'scorch', life: 2.5, from: 1.6, to: 1.7, spin: 0, flat: true },
    GUST:     { img: 'twirl', life: 0.4, from: 0.8, to: 2.4, spin: 5, additive: true },
    MAGIC_CIRCLE: { img: 'circle_magic', life: 0.9, from: 1.4, to: 1.8, spin: 2.5, additive: true, flat: true },
    HEART:    { img: 'heart', life: 0.9, from: 0.25, to: 0.4, spin: 0, rise: 60 },
    AURA:     { img: 'aura', life: 0.8, from: 0.6, to: 1.8, spin: 1, additive: true },
    RING:     { img: 'ring', life: 0.7, from: 0.2, to: 2.2, spin: 0.8, additive: true, light: { r: 300, color: '#ffe9a0' } },
    // 떨어지는 별의 꼬리 (systems/prologue.js). 다른 효과와 달리 뒤로 갈수록 작아진다 —
    // 커지면서 사라지는 STAR 로 꼬리를 그리면 뒤가 부풀어 흰 덩어리가 된다
    METEOR:   { img: 'star', life: 0.34, from: 0.8, to: 0.12, spin: 1.2, additive: true, light: { r: 200, color: '#fff2b0' } },
};

class Effect {
    constructor(x, y, def, angle, size, color) {
        this.x = x; this.y = y;
        this.def = def;
        this.color = color;
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
            ctx.drawImage(img, f * d.fw, (d.row || 0) * d.fh, d.fw, d.fh, -w * d.ax, -h * d.ay, w, h);
        } else {
            const k = this.t / this.duration;
            const s = (d.from + (d.to - d.from) * (1 - (1 - k) * (1 - k))) * 128 * this.size;
            if (d.rise) ctx.translate(0, -d.rise * k);
            if (d.flat) ctx.scale(1, 0.5);   // 바닥에 누운 원
            ctx.rotate(this.angle + k * d.spin);
            ctx.globalAlpha = 1 - k * k;
            ctx.drawImage(this.color ? tinted(d.img, this.color) : img, -s / 2, -s / 2, s, s);
        }
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
    }
}

const tintCache = new Map();
/** 흰색 파티클 그림을 color 로 물들인 사본 (한 번만 만든다) */
function tinted(key, color) {
    const id = key + color;
    if (tintCache.has(id)) return tintCache.get(id);
    const src = images[key], c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tintCache.set(id, c);
    return c;
}

/** color: 한 장짜리(흰색) 효과를 물들일 색 */
export function spawnEffect(name, x, y, { angle = 0, size = 1, color = null } = {}) {
    if (!images) return;
    state.entities.effects.push(new Effect(x, y, EFFECTS[name], angle, size, color));
}

/**
 * 쓰러질 때 몸이 가로 띠로 쪼개져 흩날린다.
 * 적이 그냥 사라지면 "없어졌다"로 끝나는데, 조각이 날아가면 "부쉈다"가 된다.
 * 죽는 순간의 그림을 그대로 띠로 잘라 쓰므로 적마다 따로 그림을 준비할 필요가 없다.
 */
class Shatter {
    constructor(x, y, img, rect, { scale = 3, flip = false, color = '#fff', bands = 6 } = {}) {
        this.x = x; this.y = y;
        this.img = img; this.rect = rect;
        this.scale = scale; this.flip = flip; this.color = color;
        this.t = 0; this.life = 0.34; this.remove = false;
        // 띠마다 날아가는 방향이 다르다. 위쪽 띠가 더 멀리 튄다
        this.bits = Array.from({ length: bands }, (_, i) => ({
            i,
            vx: (Math.random() - 0.5) * 210,
            vy: -60 - (bands - i) * 26 - Math.random() * 50,
            spin: (Math.random() - 0.5) * 7,
        }));
    }
    get light() { return { r: 90, color: this.color, intensity: (1 - this.t / this.life) * 0.7, emissive: true }; }
    update(dt) { this.t += dt; if (this.t >= this.life) this.remove = true; }
    draw(ctx) {
        if (this.remove || !isOnScreen(this, 200)) return;
        const k = this.t / this.life;
        const r = this.rect, n = this.bits.length;
        const sh = r.sh / n, w = r.sw * this.scale, bh = sh * this.scale;
        // 처음엔 하얗게 타다가 제 색으로 식으며 사라진다
        const img = k < 0.45 ? coloredCopy(this.img, '#fff') : this.img;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1 - k * k;
        for (const b of this.bits) {
            ctx.save();
            ctx.translate(this.x + b.vx * k, this.y - r.sh * this.scale * 0.5 + b.i * bh + b.vy * k + 340 * k * k);
            ctx.rotate(b.spin * k);
            if (this.flip) ctx.scale(-1, 1);
            ctx.drawImage(img, r.sx, r.sy + sh * b.i, r.sw, sh, -w / 2, -bh / 2, w, bh + 1);
            ctx.restore();
        }
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = 1;
    }
}

export function spawnShatter(x, y, img, rect, opts) {
    state.entities.effects.push(new Shatter(x, y, img, rect, opts));
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

/** 떠오르며 사라지는 글자 (피해량, 획득 골드 등) */
class FloatText {
    constructor(x, y, text, color, size) {
        this.x = x + (Math.random() - 0.5) * 24; this.y = y;
        this.text = text; this.color = color; this.size = size;
        this.t = 0; this.remove = false;
    }
    get light() { return null; }
    update(dt) { this.t += dt; this.y -= (60 - this.t * 50) * dt; if (this.t > 0.9) this.remove = true; }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (0.9 - this.t) * 3);
        ctx.font = `900 ${this.size}px Fredoka`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export function spawnText(x, y, text, color = '#fff', size = 16) {
    state.entities.effects.push(new FloatText(x, y, text, color, size));
}
