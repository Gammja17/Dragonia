import { Entity } from './Entity.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { MAX_BULLETS } from '../core/config.js';
import { isOnScreen } from '../core/camera.js';
import { getTileImage } from '../world/terrain.js';
import { drawPixelSprite } from '../render/pixel.js';
import { getVfxImage, spawnEffect } from '../render/vfx.js';

const ARROW = { sx: 176, sy: 160, sw: 16, sh: 16 }; // Tiny Dungeon 시트의 화살(위쪽을 향함)

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
        this.angle = angle;
        this.t = 0;
    }
    get light() {
        return this.faction === 'ALLY' ? { r: 170, color: '#ff9a3c', emissive: true } : null;
    }
    /** 무언가에 맞았을 때 (systems/combat.js) */
    explode() {
        this.remove = true;
        if (this.faction === 'ALLY') spawnEffect('FIRE_HIT', this.x, this.y, { angle: this.angle });
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.t += dt;
        if (this.life < 0) this.remove = true;
        if (Math.random() < 0.25) burst(this.x, this.y, this.faction === 'ALLY' ? '#e67e22' : '#bdc3c7', 0.4);
    }
    draw(ctx) {
        if (!isOnScreen(this, 50)) return;
        if (this.faction === 'ALLY') {
            const img = getVfxImage('firebolt');
            if (!img) return;
            const frame = Math.floor(this.t * 14) % 4;
            ctx.globalCompositeOperation = 'lighter';
            drawPixelSprite(ctx, img, { sx: frame * 48, sy: 0, sw: 48, sh: 48 }, this.x, this.y, { ax: 0.8, ay: 0.6, angle: this.angle });
            ctx.globalCompositeOperation = 'source-over';
        } else {
            const img = getTileImage('dungeon');
            if (img) drawPixelSprite(ctx, img, ARROW, this.x, this.y, { scale: 2.5, ay: 0.5, angle: this.angle + Math.PI / 2 });
        }
    }
}

export function addBullet(b) {
    const B = state.entities.bullets;
    B.push(b);
    if (B.length > MAX_BULLETS) B.splice(0, B.length - MAX_BULLETS);
}
