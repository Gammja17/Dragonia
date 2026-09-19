import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { ENEMIES } from '../data/enemies.js';
import { getTileImage } from '../world/terrain.js';
import { drawPixelSprite, whiteCopy, drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { updateStatus, statusTint } from '../systems/status.js';
import { notify } from '../systems/quests.js';

export class Enemy extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // data/enemies.js 의 키
        this.def = ENEMIES[type];
        this.hp = this.def.hp;
        this.hitFlash = 0;
        this.angle = 0;
        this.phase = Math.random() * 6.28;
    }
    get light() { return this.def.glow ? { r: 120, color: this.def.glow, intensity: 0.6 } : null; }
    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 10;
        const speed = this.def.speed * updateStatus(this, dt);
        if (this.remove) return;
        const player = state.player;
        const d = dist(this, player);
        if (this.def.move === 'flee') {          // 사냥감: 가까이 오면 달아나고, 아니면 어슬렁거린다
            if (d < 300) this.angle = Math.atan2(this.y - player.y, this.x - player.x) + Math.sin(state.gameTime * 3 + this.phase) * 0.6;
            else if (Math.random() < dt * 0.5) this.angle = Math.random() * 6.28;
            const v = d < 300 ? speed : speed * 0.25;
            this.x += Math.cos(this.angle) * v * dt;
            this.y += Math.sin(this.angle) * v * dt;
            return;
        }
        if (d < 420 && d > 30) {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            // erratic: 곧장 오지 않고 좌우로 흔들리며 다가온다
            const a = this.def.move === 'erratic' ? this.angle + Math.sin(state.gameTime * 4 + this.phase) * 1.1 : this.angle;
            this.x += Math.cos(a) * speed * dt;
            this.y += Math.sin(a) * speed * dt;
        }
        if (d < 40 && speed > 0) player.takeDamage(this.def.damage * dt);
    }
    /** silent: 지속 피해(화상)처럼 번쩍임 없이 깎을 때 */
    takeDamage(dmg, silent = false) {
        this.hp -= dmg;
        if (!silent) this.hitFlash = 1;
        if (this.hp <= 0 && !this.remove) this.die();
    }
    die() {
        this.remove = true;
        state.player.gainXp(this.def.xp);
        burst(this.x, this.y, this.def.color, 0.8, 8);
        spawnEffect('SMOKE', this.x, this.y - 16);
        const meat = this.def.meat ?? (Math.random() < 0.45 ? 1 : 0);
        for (let i = 0; i < meat; i++) state.entities.items.push(new Item(this.x + i * 22, this.y, 'MEAT'));
        if (Math.random() < 0.7) state.entities.items.push(new Item(this.x - 16, this.y, 'GOLD', Math.max(2, Math.round(this.def.xp / 7))));
        notify('kill', this.type);
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        const lift = this.def.flying ? 22 + Math.sin(state.gameTime * 5 + this.phase) * 5 : 0;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, this.def.flying ? 14 : 20);
        ctx.restore();
        const sheet = getTileImage('dungeon');
        if (!sheet) return;
        const tint = statusTint(this);
        if (tint) drawGlow(ctx, this.x, this.y - 18 - lift, 34, tint, 0.55);
        const hop = this.def.hop ? Math.abs(Math.sin(state.gameTime * 5 + this.phase)) * 10 : Math.abs(Math.sin(state.gameTime * 10 + this.phase)) * 4;
        const [tx, ty] = this.def.sprite;
        drawPixelSprite(ctx, this.hitFlash > 0 ? whiteCopy(sheet) : sheet, { sx: tx * 16, sy: ty * 16, sw: 16, sh: 16 }, this.x, this.y + 4 - hop - lift, { flip: Math.cos(this.angle) < 0 });
        this.drawHpBar(ctx, this.hp / this.def.hp, 58 + lift);
    }
}
