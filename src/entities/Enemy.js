import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { getTileImage } from '../world/terrain.js';
import { drawPixelSprite, whiteCopy } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';

// Tiny Dungeon 시트에서의 위치
const SPRITES = {
    SLIME:  { sx: 0,  sy: 144, sw: 16, sh: 16 },
    GOBLIN: { sx: 16, sy: 144, sw: 16, sh: 16 },
};

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
            spawnEffect('SMOKE', this.x, this.y - 16);
            if (Math.random() < 0.3) state.entities.items.push(new Item(this.x, this.y, 'MEAT'));
        }
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 20);
        ctx.restore();
        const sheet = getTileImage('dungeon');
        if (!sheet) return;
        const hop = this.type === 'SLIME' ? Math.abs(Math.sin(state.gameTime * 5)) * 10 : Math.abs(Math.sin(state.gameTime * 10)) * 4;
        drawPixelSprite(ctx, this.hitFlash > 0 ? whiteCopy(sheet) : sheet, SPRITES[this.type], this.x, this.y + 4 - hop, { flip: Math.cos(this.angle) < 0 });
    }
}
