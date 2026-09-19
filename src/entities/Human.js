import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { Fireball, addBullet } from './Fireball.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist } from '../core/utils.js';

const TAU = Math.PI * 2;

export class Human extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = 80;
        this.speed = 90;
        this.angle = 0;
        this.hitFlash = 0;
        this.type = Math.random() < 0.3 ? 'ARCHER' : 'KNIGHT';
        this.cooldown = 0;
    }
    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 10;
        this.cooldown -= dt;

        const player = state.player;
        const nest = state.entities.nests[0];
        const target = (nest && dist(this, nest) < 300) ? nest : player;
        const d = dist(this, target);
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);

        const range = this.type === 'ARCHER' ? 250 : 40;
        if (d > range) {
            this.x += Math.cos(this.angle) * this.speed * dt;
            this.y += Math.sin(this.angle) * this.speed * dt;
        } else if (this.cooldown <= 0) {
            if (this.type === 'ARCHER') addBullet(new Fireball(this.x, this.y, this.angle, this, 'ENEMY'));
            else if (target === player) player.takeDamage(10);
            this.cooldown = 2.0;
        }
    }
    takeDamage(dmg) {
        this.hp -= dmg;
        this.hitFlash = 1;
        if (this.hp <= 0) {
            this.remove = true;
            state.player.gainXp(100);
            state.entities.items.push(new Item(this.x, this.y, 'MEAT'));
        }
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 20);
        if (Math.cos(this.angle) < 0) ctx.scale(-1, 1);
        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : '#bdc3c7';
        ctx.beginPath(); ctx.arc(0, -20, 8, 0, TAU); ctx.fill();
        ctx.fillRect(-8, -12, 16, 20);
        if (this.type === 'ARCHER') {
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(10, 0, 15, -1, 1); ctx.stroke();
        } else {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(10, -10, 5, 25);
        }
        ctx.restore();
    }
}
