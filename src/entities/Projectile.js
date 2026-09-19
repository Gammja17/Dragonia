import { Entity } from './Entity.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { MAX_BULLETS } from '../core/config.js';
import { isOnScreen } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { ELEMENTS } from '../data/elements.js';
import { getTileImage } from '../world/terrain.js';
import { drawPixelSprite } from '../render/pixel.js';
import { getVfxImage, spawnEffect, spawnBolt, spawnText } from '../render/vfx.js';
import { applyStatus } from '../systems/status.js';
import { hasRelic } from '../systems/relics.js';
import { play } from '../systems/audio.js';

const CRIT_CHANCE = 0.12; // 치명타: 피해 2배
const ARROW = { sx: 176, sy: 160, sw: 16, sh: 16 }; // Tiny Dungeon 시트의 화살(위쪽을 향함)

/**
 * 모든 투사체. faction 'ALLY'(플레이어/짝/자식)는 적·사냥꾼·보스에게, 'ENEMY'는 플레이어에게만 맞는다.
 * opts: { faction, element, kind: 'BREATH' | 'ARROW', damage, speed, life, scale }
 */
export class Projectile extends Entity {
    constructor(x, y, angle, opts = {}) {
        super(x, y);
        this.faction = opts.faction || 'ALLY';
        this.kind = opts.kind || 'BREATH';
        this.element = opts.element || 'FIRE';
        const el = ELEMENTS[this.element];
        this.damage = opts.damage ?? el.damage;
        const speed = opts.speed ?? el.speed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.angle = angle;
        this.life = opts.life ?? el.life ?? 1.2;
        this.scale = opts.scale ?? 1;
        this.radius = opts.radius ?? el.radius ?? 40;   // 맞는 범위
        this.pierce = (opts.pierce ?? el.pierce) && this.faction === 'ALLY'; // 관통: 같은 적은 한 번만 맞는다
        this.hitSet = new Set();
        this.t = 0;
    }
    get light() {
        return this.kind === 'BREATH' ? { r: 170 * this.scale, color: ELEMENTS[this.element].color, emissive: true } : null;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.t += dt;
        if (this.life < 0) this.remove = true;
        if (this.kind === 'BREATH' && Math.random() < 0.25) burst(this.x, this.y, ELEMENTS[this.element].trail, 0.4);
    }
    /** 대상에 맞았을 때 (systems/combat.js). targets: 번개가 튈 수 있는 다른 대상들 */
    hit(target, targets = []) {
        if (this.hitSet.has(target)) return;
        this.hitSet.add(target);
        if (!this.pierce) this.remove = true;
        const el = ELEMENTS[this.element];
        if (this.kind === 'BREATH') spawnEffect(el.hit, this.x, this.y, { angle: this.angle, size: this.scale });
        if (this.faction !== 'ALLY') { target.takeDamage(this.damage); return; }
        const crit = Math.random() < CRIT_CHANCE + (hasRelic('HUNTER_CHARM') ? 0.1 : 0);
        play(crit ? 'crit' : 'hit');
        const dmg = this.damage * (crit ? (hasRelic('BASIL_FANG') ? 3 : 2) : 1);
        target.takeDamage(dmg);
        spawnText(target.x, target.y - 50, crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`, crit ? '#ffd84a' : '#fff', crit ? 22 : 15);
        if (this.kind !== 'BREATH') return;
        if (el.status) {
            // 이미 느려진 적에게 냉기를 또 맞히면 얼어붙는다
            if (el.status.type === 'SLOW' && target.status && target.status.SLOW > 0) applyStatus(target, 'STUN', 1.2);
            applyStatus(target, el.status.type, el.status.duration);
        }
        if (el.chain) {
            let from = target;
            const used = new Set([target]);
            const bounces = el.chain.count + (hasRelic('ZALGORA_SCALE') ? 1 : 0);
            for (let i = 0; i < bounces; i++) {
                const next = targets.find(t => !t.remove && !used.has(t) && dist(from, t) < el.chain.range);
                if (!next) break;
                spawnBolt(from.x, from.y - 16, next.x, next.y - 16);
                next.takeDamage(el.chain.damage);
                spawnText(next.x, next.y - 50, `${el.chain.damage}`, '#ffe27a', 14);
                used.add(next);
                from = next;
            }
        }
    }
    draw(ctx) {
        if (!isOnScreen(this, 50)) return;
        if (this.kind === 'ARROW') {
            const img = getTileImage('dungeon');
            if (img) drawPixelSprite(ctx, img, ARROW, this.x, this.y, { scale: 2.5, ay: 0.5, angle: this.angle + Math.PI / 2 });
            return;
        }
        const p = ELEMENTS[this.element].proj;
        const img = getVfxImage(p.img);
        if (!img) return;
        const frame = p.frames[Math.floor(this.t * p.fps) % p.frames.length];
        ctx.globalCompositeOperation = 'lighter';
        drawPixelSprite(ctx, img, { sx: frame * p.fw, sy: 0, sw: p.fw, sh: p.fh }, this.x, this.y, { scale: 3 * this.scale, ax: p.ax, ay: p.ay, angle: this.angle });
        ctx.globalCompositeOperation = 'source-over';
    }
}

export function addBullet(b) {
    const B = state.entities.bullets;
    B.push(b);
    if (B.length > MAX_BULLETS) B.splice(0, B.length - MAX_BULLETS);
}
