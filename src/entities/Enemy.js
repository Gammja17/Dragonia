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
import { play } from '../systems/audio.js';
import { Projectile, addBullet } from './Projectile.js';
import { xpMult } from '../systems/events.js';
import { grantRelic, randomRelic } from '../systems/relics.js';

export class Enemy extends Entity {
    /** elite: 정예 — 크고 단단하고 아프지만 보상이 두둑하다 */
    constructor(x, y, type, elite = false) {
        super(x, y);
        this.type = type; // data/enemies.js 의 키
        this.def = ENEMIES[type];
        this.elite = elite;
        this.maxHp = this.hp = this.def.hp * (elite ? 3.5 : 1);
        this.hitFlash = 0;
        this.angle = 0;
        this.phase = Math.random() * 6.28;
        this.shotTimer = 1 + Math.random() * 2;
    }
    get light() {
        if (this.elite) return { r: 150, color: '#ffd84a', intensity: 0.7 };
        return this.def.glow ? { r: 120, color: this.def.glow, intensity: 0.6 } : null;
    }
    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 10;
        const speed = this.def.speed * updateStatus(this, dt);
        if (this.remove) return;
        const player = state.player;
        const d = dist(this, player);
        if (this.def.move === 'none') return;   // 수련용 허수아비
        if (this.def.move === 'flee') {          // 사냥감: 가까이 오면 달아나고, 아니면 어슬렁거린다
            if (d < 300) this.angle = Math.atan2(this.y - player.y, this.x - player.x) + Math.sin(state.gameTime * 3 + this.phase) * 0.6;
            else if (Math.random() < dt * 0.5) this.angle = Math.random() * 6.28;
            const v = d < 300 ? speed : speed * 0.25;
            this.x += Math.cos(this.angle) * v * dt;
            this.y += Math.sin(this.angle) * v * dt;
            return;
        }
        if (this.def.move === 'ranged') {        // 거리를 두고 구슬을 쏜다
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            if (d < 520) {
                const a = d > 330 ? this.angle : d < 230 ? this.angle + Math.PI : this.angle + Math.PI / 2;
                this.x += Math.cos(a) * speed * dt;
                this.y += Math.sin(a) * speed * dt;
                this.shotTimer -= dt * (speed > 0 ? 1 : 0);
                if (this.shotTimer <= 0) {
                    this.shotTimer = 2.4;
                    const aim = Math.atan2(player.y - 30 - (this.y - 16), player.x - this.x);
                    addBullet(new Projectile(this.x, this.y - 16, aim, { faction: 'ENEMY', element: this.def.element, damage: this.def.damage * (this.elite ? 1.6 : 1), speed: 290, life: 2.6, scale: 0.7 }));
                }
            }
            return;
        }
        if (d < 420 && d > 30) {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            // erratic: 곧장 오지 않고 좌우로 흔들리며 다가온다
            const a = this.def.move === 'erratic' ? this.angle + Math.sin(state.gameTime * 4 + this.phase) * 1.1 : this.angle;
            this.x += Math.cos(a) * speed * dt;
            this.y += Math.sin(a) * speed * dt;
        }
        if (d < 40 && speed > 0) player.takeDamage(this.def.damage * (this.elite ? 1.6 : 1) * dt);
    }
    /** silent: 지속 피해(화상)처럼 번쩍임 없이 깎을 때 */
    takeDamage(dmg, silent = false) {
        this.hp -= dmg;
        if (!silent) this.hitFlash = 1;
        if (this.hp <= 0 && !this.remove) this.die();
    }
    die() {
        this.remove = true;
        if (this.def.noLoot) { spawnEffect('PUFF', this.x, this.y - 16); play('die'); return; }
        const bonus = this.elite ? 3 : 1;
        state.player.gainXp(this.def.xp * bonus * xpMult());
        state.stats.kills[this.type] = (state.stats.kills[this.type] || 0) + 1;
        if (this.elite && Math.random() < 0.3) { const id = randomRelic(); if (id) grantRelic(id, this.x, this.y); }
        burst(this.x, this.y, this.def.color, 0.8, 8);
        spawnEffect(this.def.flying ? 'PUFF' : 'SMOKE', this.x, this.y - 16, { size: this.elite ? 1.8 : 1 });
        play(this.elite ? 'dieBig' : 'die');
        const meat = this.def.meat ?? (Math.random() < 0.45 ? 1 : 0);
        for (let i = 0; i < meat; i++) state.entities.items.push(new Item(this.x + i * 22, this.y, 'MEAT'));
        if (Math.random() < 0.7) state.entities.items.push(new Item(this.x - 16, this.y, 'GOLD', Math.max(2, Math.round(this.def.xp / 7)) * bonus));
        notify('kill', this.type);
        if (this.def.move !== 'flee') notify('killAny');
        if (this.elite) notify('elite');
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
        if (this.elite) drawGlow(ctx, this.x, this.y - 26 - lift, 58, '#ffd84a', 0.4 + Math.sin(state.gameTime * 5) * 0.12);
        const hop = this.def.hop ? Math.abs(Math.sin(state.gameTime * 5 + this.phase)) * 10 : Math.abs(Math.sin(state.gameTime * 10 + this.phase)) * 4;
        const [tx, ty] = this.def.sprite;
        if (this.def.filter && !(this.hitFlash > 0)) ctx.filter = this.def.filter;
        drawPixelSprite(ctx, this.hitFlash > 0 ? whiteCopy(sheet) : sheet, { sx: tx * 16, sy: ty * 16, sw: 16, sh: 16 }, this.x, this.y + 4 - hop - lift, { flip: Math.cos(this.angle) < 0, scale: this.elite ? 4.5 : 3 });
        ctx.filter = 'none';
        this.drawHpBar(ctx, this.hp / this.maxHp, (this.elite ? 82 : 58) + lift, this.elite ? 50 : 34);
    }
}
