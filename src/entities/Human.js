import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { Projectile, addBullet } from './Projectile.js';
import { state } from '../core/state.js';
import { slideMove } from '../world/collision.js';
import { isOnScreen } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { HUNTERS } from '../data/enemies.js';
import { getTileImage } from '../world/terrain.js';
import { drawPixelSprite, whiteCopy, drawGlow } from '../render/pixel.js';
import { spawnEffect, spawnText } from '../render/vfx.js';
import { updateStatus, statusTint } from '../systems/status.js';
import { allies } from '../systems/combat.js';
import { notify } from '../systems/quests.js';
import { xpMult } from '../systems/events.js';
import { showToast } from '../ui/toast.js';

/** 마을을 습격하는 사냥꾼. type: data/enemies.js 의 HUNTERS 키 */
export class Human extends Entity {
    constructor(x, y, type = 'KNIGHT') {
        super(x, y);
        this.type = type;
        this.def = HUNTERS[type];
        this.hp = this.maxHp = this.def.hp;
        this.angle = 0;
        this.hitFlash = 0;
        this.cooldown = 1;
        this.power = 1;   // 습격 회차에 따른 공격력 배율 (systems/raid.js)
    }

    /** 알이 있는 둥지가 가까우면 둥지, 아니면 가장 가까운 용(플레이어·마을 용·동료) */
    pickTarget() {
        const nest = state.entities.nests[0];
        if (nest && nest.hasEgg && dist(this, nest) < 320) return nest;
        let best = state.player, bestD = dist(this, state.player);
        for (const a of allies()) {
            const d = dist(this, a);
            if (d < bestD) { best = a; bestD = d; }
        }
        return best;
    }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 10;
        this.cooldown -= dt;
        const speed = this.def.speed * updateStatus(this, dt);
        if (this.remove || speed === 0) return;

        const target = this.pickTarget();
        const d = dist(this, target);
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);

        if (d > this.def.range) {
            slideMove(this, this.x + Math.cos(this.angle) * speed * dt, this.y + Math.sin(this.angle) * speed * dt, 14);
        } else if (this.cooldown <= 0) {
            this.attack(target);
            this.cooldown = this.def.cooldown;
        }
    }

    attack(target) {
        const def = this.def;
        const aim = Math.atan2(target.y - 30 - (this.y - 16), target.x - this.x);
        if (def.attack === 'ARROW') {
            addBullet(new Projectile(this.x, this.y - 16, aim, { faction: 'ENEMY', kind: 'ARROW', damage: def.damage * this.power, speed: 520 }));
        } else if (def.attack === 'NET') {
            // 그물은 느리게 날아오니 보고 피할 수 있다. 맞으면 한동안 느려진다
            addBullet(new Projectile(this.x, this.y - 16, aim, { faction: 'ENEMY', kind: 'ARROW', damage: def.damage * this.power, speed: 300, life: 1.6, slow: 2.6 }));
        } else if (def.attack === 'ORB') {
            addBullet(new Projectile(this.x, this.y - 16, aim, { faction: 'ENEMY', element: 'FIRE', damage: def.damage * this.power, speed: 300, life: 2.4, scale: 0.7 }));
        } else if (target === state.entities.nests[0]) {
            target.attackEgg(30);
        } else {
            target.takeDamage(def.damage * this.power);
        }
    }

    takeDamage(dmg, silent = false) {
        this.hp -= dmg;
        if (!silent) this.hitFlash = 1;
        if (this.hp <= 0 && !this.remove) this.die();
    }

    die() {
        this.remove = true;
        state.player.gainXp(this.def.xp * xpMult());
        state.stats.kills.HUNTER = (state.stats.kills.HUNTER || 0) + 1;
        notify('kill', 'HUNTER');
        notify('killAny');
        spawnEffect('SMOKE', this.x, this.y - 16, { size: this.def.scale ? 1.8 : 1 });
        const items = state.entities.items;
        items.push(new Item(this.x, this.y, 'GOLD', this.def.gold));
        if (Math.random() < 0.6) items.push(new Item(this.x + 20, this.y, 'MEAT'));
        // 사냥꾼의 갑옷 조각 — 대장간 소재 중 가장 귀한 것 (systems/smithing.js)
        const ore = this.type === 'CAPTAIN' ? 4 : Math.random() < 0.55 ? 1 : 0;
        for (let i = 0; i < ore; i++) items.push(new Item(this.x - 18 - i * 26, this.y + 12, 'MAT', 'ORE'));
        if (this.type === 'CAPTAIN') {
            showToast('사냥꾼 대장을 쓰러뜨렸습니다!', '🏆');
            spawnText(this.x, this.y - 80, '대장 처치!', '#ffd84a', 22);
        }
    }

    draw(ctx) {
        if (!isOnScreen(this)) return;
        const scale = this.def.scale || 3;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 20 * scale / 3);
        ctx.restore();
        const sheet = getTileImage('dungeon');
        if (!sheet) return;
        const tint = statusTint(this);
        if (tint) drawGlow(ctx, this.x, this.y - 18, 34 * scale / 3, tint, 0.55);
        const bob = Math.abs(Math.sin(state.gameTime * 9 + this.x)) * 3;
        const [tx, ty] = this.def.sprite;
        drawPixelSprite(ctx, this.hitFlash > 0 ? whiteCopy(sheet) : sheet, { sx: tx * 16, sy: ty * 16, sw: 16, sh: 16 }, this.x, this.y + 4 - bob, { scale, flip: Math.cos(this.angle) < 0 });
        this.drawHpBar(ctx, this.hp / this.maxHp, 16 * scale + 8, scale > 3 ? 60 : 34);
    }
}
