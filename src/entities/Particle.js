import { Entity } from './Entity.js';
import { state } from '../core/state.js';
import { MAX_PARTICLES } from '../core/config.js';

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
        ctx.globalAlpha = Math.min(1, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
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
