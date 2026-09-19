import { Entity } from './Entity.js';
import { state } from '../core/state.js';
import { MAX_PARTICLES } from '../core/config.js';
import { getGlow } from '../render/pixel.js';

export class Particle extends Entity {
    constructor(x, y, color, life = 1) {
        super(x, y);
        this.color = color;
        this.life = life;
        this.vx = (Math.random() - 0.5) * 90;
        this.vy = (Math.random() - 0.5) * 90;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life < 0) this.remove = true;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        // 빛 알갱이. main.js 가 'lighter' 합성으로 한꺼번에 그린다
        const r = 5 + Math.min(1, this.life) * 7;
        ctx.globalAlpha = Math.min(1, this.life);
        ctx.drawImage(getGlow(this.color), this.x - r, this.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
    }
}

/** 파티클을 count개 뿌리고 상한을 유지. color는 문자열 또는 () => 문자열 */
export function burst(x, y, color, life = 1, count = 1) {
    const P = state.entities.particles;
    for (let i = 0; i < count; i++) {
        P.push(new Particle(x, y, typeof color === 'function' ? color() : color, life));
    }
    if (P.length > MAX_PARTICLES) P.splice(0, P.length - MAX_PARTICLES);
}
