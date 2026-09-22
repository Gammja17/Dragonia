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
import { onKill } from '../systems/flow.js';
import { onCaptainDown } from '../systems/ambush.js';
import { onThiefDug, onKidGrabbed, onKidFreed, onKidLost, onPerched, onUnperched, myDenMouth, towerProp, DIG_TIME_SEC } from '../systems/objectives.js';
import { shake } from '../core/camera.js';
import { burst } from './Particle.js';

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
        this.swing = 0;   // 내려치기 예고 (초)
        this.stagger = 0; // 돌진이 빗나가 비틀거리는 시간. 그동안 두 배로 맞는다 (systems/ambush.js)
        // 습격의 목표 (systems/objectives.js)
        this.hunts = null;     // 이 용만 노린다 (이름)
        this.huntsKid = null;  // 이 아기를 잡아채 간다 (개체)
        this.raids = null;     // 'DEN'(굴 입구를 판다) | 'TOWER'(망루에 오른다)
        this.digging = 0;      // 입구를 파는 중 (초)
        this.perched = false;  // 망루에 올라 있다
        this.carrying = null;  // 끌고 가는 아기
    }

    /** 머리 위에 한마디. 대장의 외침은 화면 위에도 띄운다 */
    say(text) {
        spawnText(this.x, this.y - 70, text.length > 12 ? text.slice(0, 12) + '…' : text, '#ffd8c0', 14);
        if (this.type === 'CAPTAIN') showToast(text, '📣');
    }

    /** 알이 있는 둥지가 가까우면 둥지, 아니면 가장 가까운 용(플레이어·마을 용·동료) */
    pickTarget() {
        const nest = state.entities.nests[0];
        if (nest && nest.hasEgg && dist(this, nest) < 320) return nest;
        // 이 습격의 목표 (systems/objectives.js): 아기를 잡아채거나, 굴 입구를 파거나, 망루에 오른다
        if (this.huntsKid && !this.huntsKid.hidden && !this.huntsKid.grabbedBy && state.entities.babies.includes(this.huntsKid)) return this.huntsKid;
        if (this.raids === 'DEN') { const m = myDenMouth(); if (m && state.denNest && state.denNest.hasEgg) return m; }
        if (this.raids === 'TOWER') { const t = towerProp(); if (t) return t; }
        // 이 습격에서 특정한 용만 노리기로 한 사냥꾼 (systems/raid.js 의 RESCUE)
        if (this.hunts) { const prey = state.entities.npcs.find(n => n.config.name === this.hunts && !(n.downTimer > 0)); if (prey) return prey; }
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
        // 달아난다: 플레이어에게서 멀어지다가 화면 밖으로 나가면 사라진다. 아기를 끌고 가는 놈은 조금 느리다
        if (this.fleeing) {
            const a = Math.atan2(this.y - state.player.y, this.x - state.player.x);
            this.angle = a + Math.PI;
            const k = this.carrying ? 0.95 : 1.4;
            slideMove(this, this.x + Math.cos(a) * speed * k * dt, this.y + Math.sin(a) * speed * k * dt, 14);
            if (this.carrying) { this.carrying.x = this.x + 14; this.carrying.y = this.y + 6; }
            if (dist(this, state.player) > (this.carrying ? 1100 : 1000)) {
                if (this.carrying) onKidLost(this.carrying, this);
                this.remove = true;
            }
            return;
        }
        // 망루에 올라 있다: 자리를 지키며 멀리까지 쏜다
        if (this.perched) {
            const target = this.pickTarget();
            const d = dist(this, target);
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            if (this.cooldown <= 0 && d < this.def.range + 140 && target !== towerProp()) { this.attack(target); this.cooldown = this.def.cooldown * 0.85; }
            return;
        }
        if (this.stagger > 0) { this.stagger -= dt; return; }
        if (this.charge) { this.updateCharge(dt); return; }

        const target = this.pickTarget();
        const d = dist(this, target);
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);

        // 내려치기 예고. 0.45초 동안 칼을 치켜들고, 그때도 닿는 거리에 있어야 맞는다 (대시로 빠져나갈 수 있다)
        if (this.swing > 0) {
            this.swing -= dt;
            if (this.swing <= 0) {
                if (dist(this, this.swingAt) < this.def.range + 34) this.attack(this.swingAt);
                this.cooldown = this.def.cooldown;
            }
            return;
        }
        // 뒤에서 지휘만 하는 대장 (포위 1페): 너무 가까워지면 물러선다
        if (this.holdBack) {
            if (d < 330) slideMove(this, this.x - Math.cos(this.angle) * speed * dt, this.y - Math.sin(this.angle) * speed * dt, 14);
            return;
        }
        // 목표에 닿았다: 아기는 잡아채고, 굴 입구는 파고, 망루는 오른다
        if (target === this.huntsKid) {
            if (d < 46) { onKidGrabbed(target, this); return; }
        } else if (target.type === 'DEN_MOUTH') {
            if (d < 74) {
                this.digging += dt;
                if (this.digging >= DIG_TIME_SEC) { this.digging = 0; onThiefDug(this); this.raids = null; this.fleeing = true; }
                return;
            }
        } else if (target.type === 'TOWER') {
            if (d < 64) {
                this.perched = true;
                this.raids = null;
                if (onPerched(this)) { /* 망루를 빼앗겼다. 원군은 raid.js 가 부른다 */ }
                return;
            }
        }
        if (d > this.def.range || target.type) {
            slideMove(this, this.x + Math.cos(this.angle) * speed * dt, this.y + Math.sin(this.angle) * speed * dt, 14);
        } else if (this.cooldown <= 0) {
            if (this.def.attack === 'MELEE' && target !== state.entities.nests[0]) { this.swing = 0.45; this.swingAt = target; }
            else { this.attack(target); this.cooldown = this.def.cooldown; }
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

    /** 돌진: 예고 뒤에 한 방향으로 내달린다. 맞히지 못하면 비틀거린다 (간발로 피할 수 있다) */
    updateCharge(dt) {
        const c = this.charge, p = state.player;
        if (c.windup > 0) { c.windup -= dt; this.angle = c.dir; return; }
        c.t -= dt;
        slideMove(this, this.x + Math.cos(c.dir) * c.speed * dt, this.y + Math.sin(c.dir) * c.speed * dt, 14);
        if (Math.random() < 0.5) burst(this.x, this.y, '#c9a24a', 0.6, 2);
        if (!c.hit && dist(this, { x: p.x, y: p.y }) < 70) {
            c.hit = true;
            p.takeDamage(this.def.damage * this.power * 1.6);
            p.x += Math.cos(c.dir) * 90; p.y += Math.sin(c.dir) * 90;
            shake(10);
        }
        if (c.t <= 0) {
            this.charge = null;
            if (!c.hit) { this.stagger = 2.4; spawnText(this.x, this.y - 80, '비틀!', '#9fe3ff', 16); spawnEffect('PUFF', this.x, this.y - 10, { size: 1.4 }); }
            this.cooldown = 1;
        }
    }

    takeDamage(dmg, silent = false) {
        if (this.stagger > 0) dmg *= 2;   // 빈틈
        if (this.digging > 0) this.digging = Math.max(0, this.digging - 0.6);   // 맞으면 파던 손이 멈칫한다
        this.hp -= dmg;
        if (!silent) this.hitFlash = 1;
        if (this.hp <= 0 && !this.remove) this.die();
    }

    die() {
        this.remove = true;
        if (this.carrying) { onKidFreed(this.carrying); this.carrying = null; }
        if (this.perched) { this.perched = false; onUnperched(); }
        onKill(this.type === 'CAPTAIN');
        if (this.type === 'CAPTAIN') state.raid.captainFell = true;
        if (this.type === 'CAPTAIN' && state.ambush) onCaptainDown(this);   // 남은 사냥꾼이 흔들린다 (systems/raid.js)
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
        if (this.charge && this.charge.windup > 0) {   // 돌진 예고: 붉은 선
            const k = 1 - this.charge.windup / 0.75;
            ctx.save();
            ctx.strokeStyle = `rgba(255,90,60,${(0.3 + k * 0.5).toFixed(2)})`;
            ctx.lineWidth = 8 + k * 10; ctx.setLineDash([18, 10]);
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.charge.dir) * 520, this.y + Math.sin(this.charge.dir) * 520); ctx.stroke();
            ctx.restore();
        }
        if (this.stagger > 0) drawGlow(ctx, this.x, this.y - 18, 40, '#9fe3ff', 0.4 + Math.sin(state.gameTime * 14) * 0.2);
        if (this.perched) drawGlow(ctx, this.x, this.y - 30, 44, '#9fe3ff', 0.3);
        if (this.digging > 0) {   // 굴 입구를 파는 중: 노란 고리가 차오른다
            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(this.x, this.y - 30, 30, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(this.x, this.y - 30, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.digging / DIG_TIME_SEC); ctx.stroke();
            ctx.restore();
        }
        if (this.carrying) {   // 아기를 끌고 간다: 붉은 느낌표
            ctx.save();
            ctx.fillStyle = '#ff6b5e'; ctx.font = '900 20px Fredoka, "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('!', this.x, this.y - 70 + Math.sin(state.gameTime * 8) * 3);
            ctx.restore();
        }
        if (this.swing > 0) {   // 치켜든 칼: 닿는 범위가 붉게 차오른다
            const k = 1 - this.swing / 0.45;
            ctx.save();
            ctx.fillStyle = `rgba(255,70,50,${(0.12 + k * 0.25).toFixed(2)})`;
            ctx.beginPath(); ctx.ellipse(this.x, this.y, (this.def.range + 20) * k, (this.def.range + 20) * k * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        const bob = Math.abs(Math.sin(state.gameTime * 9 + this.x)) * 3;
        const [tx, ty] = this.def.sprite;
        drawPixelSprite(ctx, this.hitFlash > 0 ? whiteCopy(sheet) : sheet, { sx: tx * 16, sy: ty * 16, sw: 16, sh: 16 }, this.x, this.y + 4 - bob, { scale, flip: Math.cos(this.angle) < 0 });
        this.drawHpBar(ctx, this.hp / this.maxHp, 16 * scale + 8, scale > 3 ? 60 : 34);
    }
}
