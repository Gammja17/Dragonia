import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist } from '../core/utils.js';

const TAU = Math.PI * 2;

export class Enemy extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // SLIME | GOBLIN
        const slime = type === 'SLIME';
        this.hp = slime ? 30 : 60;
        this.speed = slime ? 50 : 110;
        this.color = slime ? '#2ecc71' : '#e74c3c';
        this.damage = 5;
        this.hitFlash = 0;
        this.angle = 0;
    }
    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 10;
        const player = state.player;
        const d = dist(this, player);
        if (d < 400 && d > 30) {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(this.angle) * this.speed * dt;
            this.y += Math.sin(this.angle) * this.speed * dt;
        }
        if (d < 40) player.takeDamage(this.damage * dt);
    }
    takeDamage(dmg) {
        this.hp -= dmg;
        this.hitFlash = 1;
        if (this.hp <= 0) {
            this.remove = true;
            state.player.gainXp(30);
            burst(this.x, this.y, this.color, 0.8, 8);
            if (Math.random() < 0.3) state.entities.items.push(new Item(this.x, this.y, 'MEAT'));
        }
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 20);
        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
        if (this.type === 'SLIME') {
            ctx.translate(0, -Math.abs(Math.sin(state.gameTime * 5)) * 10);
            ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI, 0); ctx.lineTo(15, 10); ctx.lineTo(-15, 10); ctx.fill();
        } else {
            if (Math.cos(this.angle) < 0) ctx.scale(-1, 1);
            ctx.translate(0, Math.sin(state.gameTime * 10) * 5);
            ctx.beginPath(); ctx.arc(0, -15, 10, 0, TAU); ctx.fill();
            ctx.fillRect(-10, -5, 20, 20);
        }
        ctx.restore();
    }
}
