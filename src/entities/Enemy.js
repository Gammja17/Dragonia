import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { hitStop } from '../render/feedback.js';
import { isOnScreen } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { ENEMIES } from '../data/enemies.js';
import { getTileImage } from '../world/terrain.js';
import { slideMove } from '../world/collision.js';
import { drawPixelSprite, whiteCopy, drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { updateStatus, statusTint } from '../systems/status.js';
import { notify } from '../systems/quests.js';
import { play } from '../systems/audio.js';
import { Projectile, addBullet } from './Projectile.js';
import { xpMult } from '../systems/events.js';
import { grantRelic, randomRelic } from '../systems/relics.js';
import { materialFor } from '../data/materials.js';
import { onGuardianDown } from '../systems/delve.js';
import { updateAI, initAI, drawTell } from './enemyAI.js';

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
        initAI(this);
    }
    get light() {
        if (this.elite) return { r: 150, color: '#ffd84a', intensity: 0.7 };
        return this.def.glow ? { r: 120, color: this.def.glow, intensity: 0.6 } : null;
    }
    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 10;
        // 맞고 움찔하는 표시. 실제로 밀어내면 조준한 자리에서 벗어나 총알이 빗나간다.
        // 그려질 때만 어긋나게 하고 자리는 그대로 둔다
        if (this.knock && this.knock.t > 0) this.knock.t -= dt * 6;
        const speed = this.def.speed * updateStatus(this, dt);
        if (this.remove) return;
        if (this.def.move === 'none') return;   // 수련용 허수아비
        updateAI(this, dt, speed);              // 예고 → 발동 → 숨 고르기 (entities/enemyAI.js)
    }
    /** silent: 지속 피해(화상)처럼 번쩍임 없이 깎을 때 */
    takeDamage(dmg, silent = false, from = null) {
        if (this.hidden) return;                 // 땅속에 있을 땐 못 맞힌다
        this.hp -= dmg;
        if (!silent) {
            this.hitFlash = 1;
            // 맞은 쪽으로 밀린다. 맞은 티가 나야 때린 맛이 난다
            if (from) {
                const a = Math.atan2(this.y - from.y, this.x - from.x);
                const push = Math.min(14, 5 + dmg * 0.4) * (this.elite ? 0.55 : 1);
                this.knock = { x: Math.cos(a) * push, y: Math.sin(a) * push, t: 1 };
            }
        }
        if (this.hp <= 0 && !this.remove) { hitStop(0.05); this.die(); }
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
        // 대장간 소재 (systems/smithing.js). 정예는 확실히, 보통은 절반쯤 떨어뜨린다
        const mats = this.elite ? 2 : Math.random() < 0.5 ? 1 : 0;
        for (let i = 0; i < mats; i++) state.entities.items.push(new Item(this.x + 20 - i * 30, this.y + 14, 'MAT', materialFor(this.type)));
        notify('kill', this.type);
        if (this.def.move !== 'flee') notify('killAny');
        if (this.elite) notify('elite');
        if (this.isGuardian) onGuardianDown();
    }
    /** 바닥 층에 그리는 예고 (main.js 가 개체보다 먼저 부른다) */
    drawGround(ctx) {
        if (!isOnScreen(this)) return;
        drawTell(ctx, this);
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        if (this.hidden) return;                 // 땅속 — 흙더미만 보인다 (drawGround)
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
        const kx = this.knock && this.knock.t > 0 ? this.knock.x * this.knock.t : 0;
        const ky = this.knock && this.knock.t > 0 ? this.knock.y * this.knock.t : 0;
        const telling = this.ai && (this.ai.s === 'tell' || this.ai.s === 'tell2');
        const sc = (this.elite ? 4.5 : 3) * (telling ? 0.86 : 1);
        drawPixelSprite(ctx, this.hitFlash > 0 ? whiteCopy(sheet) : sheet, { sx: tx * 16, sy: ty * 16, sw: 16, sh: 16 }, this.x + kx, this.y + 4 - (telling ? 0 : hop) - lift + ky, { flip: Math.cos(this.angle) < 0, scale: sc });
        ctx.filter = 'none';
        this.drawHpBar(ctx, this.hp / this.maxHp, (this.elite ? 82 : 58) + lift, this.elite ? 50 : 34);
    }
}
