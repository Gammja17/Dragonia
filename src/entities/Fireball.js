import { Entity } from './Entity.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { MAX_BULLETS } from '../core/config.js';
import { isOnScreen } from '../core/camera.js';

const SPEED = 580;

/**
 * faction: 'ALLY' (플레이어/자식) 는 적·인간에게, 'ENEMY' 는 플레이어에게만 맞는다.
 * 예전엔 소유자 구분이 없어서 궁수가 쏜 화살이 궁수 본인에게 맞았다.
 */
export class Fireball extends Entity {
    constructor(x, y, angle, owner, faction = 'ALLY') {
        super(x, y);
        this.vx = Math.cos(angle) * SPEED;
        this.vy = Math.sin(angle) * SPEED;
        this.life = 1.2;
        this.owner = owner;
        this.faction = faction;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life < 0) this.remove = true;
        if (Math.random() < 0.25) burst(this.x, this.y, this.faction === 'ALLY' ? '#e67e22' : '#bdc3c7', 0.4);
    }
    draw(ctx) {
        if (!isOnScreen(this, 50)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.faction === 'ALLY') { ctx.fillStyle = '#f1c40f'; ctx.shadowColor = 'orange'; }
        else { ctx.fillStyle = '#ecf0f1'; ctx.shadowColor = '#95a5a6'; }
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export function addBullet(b) {
    const B = state.entities.bullets;
    B.push(b);
    if (B.length > MAX_BULLETS) B.splice(0, B.length - MAX_BULLETS);
}
