import { Entity } from './Entity.js';
import { state } from '../core/state.js';
import { isOnScreen, shake } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { applyStatus } from '../systems/status.js';
import { allies } from '../systems/combat.js';
import { play } from '../systems/audio.js';

/**
 * 바닥의 위험 지대. 예고(delay) → 터짐(damage) → 남아서 지속 피해(linger, dps).
 * 보스 기믹(운석, 얼음 기둥, 장판)과 플레이어 스킬(운석 낙하, 서릿발)이 함께 쓴다.
 * opts: { r, inner?(고리 모양일 때 안쪽 반지름), delay, linger, damage, dps, faction: 'ENEMY' | 'ALLY',
 *         color, effect?(터질 때 vfx), effectSize?, sound?, slow?(안에 있으면 느려짐), status?: { type, duration }, shake? }
 */
export class Hazard extends Entity {
    constructor(x, y, opts) {
        super(x, y);
        Object.assign(this, { r: 120, inner: 0, delay: 0.8, linger: 0, damage: 0, dps: 0, faction: 'ENEMY', color: '#ff5a3c' }, opts);
        this.t = 0;
        this.burst = false;
    }
    get light() { return this.burst && this.linger > 0 ? { r: this.r * 1.6, color: this.color, intensity: 0.7, emissive: true } : null; }

    targets() {
        const E = state.entities;
        const list = this.faction === 'ENEMY' ? [state.player, ...allies()] : [...E.enemies, ...E.humans, ...E.bosses].filter(e => e.awake !== false);
        return list.filter(e => { const d = dist(this, e); return d <= this.r + (e.def && e.def.scale ? 50 : 0) && d >= this.inner; });
    }

    update(dt) {
        this.t += dt;
        if (!this.burst && this.t >= this.delay) {
            this.burst = true;
            for (const e of this.targets()) {
                if (this.damage) e.takeDamage(this.damage);
                if (this.status && e !== state.player) applyStatus(e, this.status.type, this.status.duration);
                if (this.status && e === state.player && this.status.type !== 'BURN') e.slowTimer = Math.max(e.slowTimer, this.status.duration);
            }
            if (this.effect) spawnEffect(this.effect, this.x, this.y, { size: this.effectSize || 1, angle: -Math.PI / 2 });
            if (this.sound) play(this.sound);
            if (this.shake) shake(this.shake);
        }
        if (this.burst) {
            const left = this.delay + this.linger - this.t;
            if (left <= 0) { this.remove = true; return; }
            for (const e of this.targets()) {
                if (this.dps) e.takeDamage(this.dps * dt, true);
                if (this.slow && e === state.player) e.slowTimer = Math.max(e.slowTimer, 0.3);
                if (this.slow && e !== state.player) applyStatus(e, 'SLOW', 0.4);
            }
        }
    }

    draw(ctx) {
        if (!isOnScreen(this, this.r + 50)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(1, 0.55);   // 바닥에 누운 원
        if (!this.burst) {
            const k = this.t / this.delay;
            ctx.strokeStyle = this.color; ctx.lineWidth = 4; ctx.globalAlpha = 0.5 + k * 0.4;
            ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.stroke();
            if (this.inner) { ctx.beginPath(); ctx.arc(0, 0, this.inner, 0, Math.PI * 2); ctx.stroke(); }
            ctx.globalAlpha = 0.12 + k * 0.22;
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0, this.inner + (this.r - this.inner) * k, 0, Math.PI * 2);
            if (this.inner) ctx.arc(0, 0, this.inner, 0, Math.PI * 2, true);
            ctx.fill();
        } else {
            const left = (this.delay + this.linger - this.t) / (this.linger || 1);
            ctx.globalAlpha = Math.min(0.4, left * 0.8);
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2);
            if (this.inner) ctx.arc(0, 0, this.inner, 0, Math.PI * 2, true);
            ctx.fill();
        }
        ctx.restore();
        if (this.burst && this.linger > 0 && !this.inner) drawGlow(ctx, this.x, this.y, this.r * 0.9, this.color, 0.25);
    }
}

export function addHazard(x, y, opts) {
    const h = new Hazard(x, y, opts);
    state.entities.hazards.push(h);
    return h;
}
