import { Entity } from './Entity.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { MAX_BULLETS } from '../core/config.js';
import { isOnScreen, shake } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { ELEMENTS, REACTIONS, canFuse } from '../data/elements.js';
import { getTileImage } from '../world/terrain.js';
import { drawPixelSprite } from '../render/pixel.js';
import { getVfxImage, spawnEffect, spawnBolt, spawnText } from '../render/vfx.js';
import { hitStop } from '../render/feedback.js';
import { blocksFrom } from './enemyAI.js';
import { showToast } from '../ui/toast.js';
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
        this.fromPlayer = !!opts.fromPlayer;   // 플레이어가 쏜 탄만 필살기 게이지를 채운다
        this.slow = opts.slow || 0;       // 맞은 용을 이만큼(초) 느리게 한다 (그물)
        this.homing = opts.homing || 0;   // 초당 꺾을 수 있는 각도(rad). 플레이어를 따라온다
        this.speed = speed;
        this.t = 0;
    }
    get light() {
        return this.kind === 'BREATH' ? { r: 170 * this.scale, color: ELEMENTS[this.element].color, emissive: true } : null;
    }
    update(dt) {
        if (this.homing) {
            const p = state.player;
            let da = Math.atan2(p.y - 30 - this.y, p.x - this.x) - this.angle;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            this.angle += Math.max(-this.homing * dt, Math.min(this.homing * dt, da));
            this.vx = Math.cos(this.angle) * this.speed; this.vy = Math.sin(this.angle) * this.speed;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.t += dt;
        if (this.life < 0) this.remove = true;
        if (this.kind === 'BREATH' && Math.random() < 0.25) burst(this.x, this.y, ELEMENTS[this.element].trail, 0.4);
    }
    /** 이 숨결이 대상에 걸린 상태와 반응하나 */
    reaction(target) {
        const table = REACTIONS[this.element], s = target.status;
        if (!table || !s) return null;
        const key = Object.keys(table).find(k => s[k] > 0);
        return key ? { ...table[key], on: key } : null;
    }

    applyReaction(r, target, targets) {
        spawnText(target.x, target.y - 78, r.name, ELEMENTS[this.element].color, 17);
        if (r.clear) target.status[r.on] = 0;
        if (r.stun) applyStatus(target, 'STUN', r.stun);
        if (r.burn) applyStatus(target, 'BURN', r.burn);
        if (r.poison) applyStatus(target, 'POISON', r.poison);
        if (r.spread) {
            spawnEffect('SHOCKWAVE', target.x, target.y - 20, { size: r.spread / 90, color: ELEMENTS[this.element].color });
            for (const e of targets) {
                if (e === target || e.remove || dist(e, target) > r.spread) continue;
                e.takeDamage(this.damage * 0.8, false, this);
                if (r.burn) applyStatus(e, 'BURN', r.burn);
            }
        }
        this.chainBonus = r.chain || 0;
    }

    /** 대상에 맞았을 때 (systems/combat.js). targets: 번개가 튈 수 있는 다른 대상들 */
    hit(target, targets = []) {
        if (this.hitSet.has(target)) return;
        this.hitSet.add(target);
        if (!this.pierce) this.remove = true;
        const el = ELEMENTS[this.element];
        if (this.kind === 'BREATH') spawnEffect(el.hit, this.x, this.y, { angle: this.angle, size: this.scale });
        if (this.faction !== 'ALLY') {
            target.takeDamage(this.damage);
            if (this.slow && target === state.player && !(target.invuln > 0)) { target.slowTimer = Math.max(target.slowTimer || 0, this.slow); showToast('그물에 걸렸다! 잠깐 발이 무겁다.', '🕸️'); }
            return;
        }
        if (this.fromPlayer && canFuse(state.player)) state.player.ult = Math.min(100, state.player.ult + 1.5);
        const crit = Math.random() < CRIT_CHANCE + (hasRelic('HUNTER_CHARM') ? 0.1 : 0);
        play(crit ? 'crit' : 'hit');
        // 속성 연계: 이미 걸려 있는 상태에 이 숨결이 닿으면 반응이 난다 (data/elements.js 의 REACTIONS)
        const react = this.kind === 'BREATH' ? this.reaction(target) : null;
        const dmg = this.damage * (crit ? (hasRelic('BASIL_FANG') ? 3 : 2) : 1) * (react && react.mult ? react.mult : 1);
        if (blocksFrom(target, this.x, this.y)) {        // 방패 고블린의 정면 — 튕긴다
            spawnEffect('SPARK', this.x, this.y, { size: 0.9, color: '#cfe0ff' });
            spawnText(target.x, target.y - 50, '막힘', '#cfe0ff', 13);
            this.remove = true;
            return;
        }
        target.takeDamage(dmg, false, this);   // 맞은 쪽을 넘겨 주면 그쪽으로 밀린다
        spawnEffect(crit ? 'CRIT_FLASH' : 'HIT_SPARK', target.x, target.y - 24, { size: crit ? 1.2 : 1, color: crit ? null : el.color });
        shake(crit ? 3 : 1.2);
        spawnText(target.x, target.y - 50, crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`, crit ? '#ffd84a' : '#fff', crit ? 22 : 15);
        if (crit) { hitStop(0.05); shake(4); }   // 치명타는 한 박자 멈춘다
        else hitStop(0.018);                     // 보통 타도 한 프레임쯤은 멈춘다. 맞았다는 느낌은 여기서 난다
        if (this.kind !== 'BREATH') return;
        if (react) this.applyReaction(react, target, targets);
        if (el.push && !target.statusImmune && !target.def?.scale) { target.x += Math.cos(this.angle) * el.push; target.y += Math.sin(this.angle) * el.push; }
        if (el.status) {
            // 이미 느려진 적에게 냉기를 또 맞히면 얼어붙는다
            if (el.status.type === 'SLOW' && target.status && target.status.SLOW > 0) applyStatus(target, 'STUN', 1.2);
            applyStatus(target, el.status.type, el.status.duration);
        }
        if (el.chain) {
            let from = target;
            const used = new Set([target]);
            const bounces = el.chain.count + (hasRelic('ZALGORA_SCALE') ? 1 : 0) + (this.chainBonus || 0);   // 젖은 적에게는 더 멀리 튄다 (감전)
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
        if (!p.solid) ctx.globalCompositeOperation = 'lighter';
        drawPixelSprite(ctx, img, { sx: frame * p.fw, sy: 0, sw: p.fw, sh: p.fh }, this.x, this.y, { scale: 3 * this.scale, ax: p.ax, ay: p.ay, angle: this.angle + (p.spin || 0) * this.t });
        ctx.globalCompositeOperation = 'source-over';
    }
}

export function addBullet(b) {
    const B = state.entities.bullets;
    B.push(b);
    if (B.length > MAX_BULLETS) B.splice(0, B.length - MAX_BULLETS);
}
