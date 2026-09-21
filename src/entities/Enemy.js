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
import { updateStatus, statusTint } from '../systems/status.js';
import { notify } from '../systems/quests.js';
import { play } from '../systems/audio.js';
import { Projectile, addBullet } from './Projectile.js';
import { xpMult } from '../systems/events.js';
import { grantRelic, randomRelic } from '../systems/relics.js';
import { materialFor } from '../data/materials.js';
import { onGuardianDown } from '../systems/delve.js';
import { updateAI, initAI, drawTell } from './enemyAI.js';
import { AFFIXES, rollAffix } from '../data/affixes.js';
import { spawnEffect, spawnText } from '../render/vfx.js';
import { applyStatus } from '../systems/status.js';

export class Enemy extends Entity {
    /** elite: 정예 — 크고 단단하고 아프지만 보상이 두둑하다 */
    constructor(x, y, type, elite = false) {
        super(x, y);
        this.type = type; // data/enemies.js 의 키
        this.def = ENEMIES[type];
        this.elite = elite;
        this.affix = elite ? rollAffix(this.def) : null;   // 정예는 접사로 다르게 싸운다 (data/affixes.js)
        this.maxHp = this.hp = this.def.hp * (elite ? 2.2 : 1) * (this.affix && this.affix.id === 'SPLIT' ? 0.8 : 1);
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
        let speed = this.def.speed * updateStatus(this, dt);
        if (this.remove) return;
        if (this.def.move === 'none') return;   // 수련용 허수아비
        // 광폭: 궁지에 몰리면 폭주한다
        this.frenzied = this.affix && this.affix.id === 'FRENZY' && this.hp < this.maxHp * 0.3;
        if (this.frenzied) speed *= 1.6;
        updateAI(this, dt, speed);              // 예고 → 발동 → 숨 고르기 (entities/enemyAI.js)
    }
    /** silent: 지속 피해(화상)처럼 번쩍임 없이 깎을 때 */
    takeDamage(dmg, silent = false, from = null) {
        if (this.hidden) return;                 // 땅속에 있을 땐 못 맞힌다
        if (this.affix && from && !silent) {
            const ax = this.affix.id;
            if (ax === 'MIRROR' && from.element === this.affix.element) {
                spawnText(this.x, this.y - 52, '튕김', '#ffe27a', 13);
                spawnEffect('SPARK', this.x, this.y - 20, { size: 0.8, color: '#ffe27a' });
                return;
            }
            if (ax === 'ARMORED') {
                let da = Math.atan2(from.y - this.y, from.x - this.x) - this.angle;
                da = Math.atan2(Math.sin(da), Math.cos(da));
                if (Math.abs(da) < Math.PI * 0.39) { dmg *= 0.4; spawnText(this.x, this.y - 52, '단단함', '#b8c8d8', 12); }
            }
            if (ax === 'PLAGUE' && this.status) {
                for (const o of state.entities.enemies) {
                    if (o === this || o.remove || dist(o, this) > 150) continue;
                    for (const k of ['BURN', 'SLOW']) if (this.status[k] > 0) applyStatus(o, k, this.status[k] * 0.8);
                }
            }
        }
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
        if (this.affix && this.affix.id === 'SPLIT' && !this.splitChild) {   // 둘로 갈라진다 (한 번만)
            for (const side of [-1, 1]) {
                const c = new Enemy(this.x + side * 34, this.y + 8, this.type, false);
                c.splitChild = true;
                c.maxHp = c.hp = Math.round(this.def.hp * 0.35);
                state.entities.enemies.push(c);
                burst(c.x, c.y, this.def.color, 0.6, 6);
            }
        }
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
        if (this.elite) {
            const col = this.affix ? AFFIXES[this.affix.id].color : '#ffd84a';
            drawGlow(ctx, this.x, this.y - 26 - lift, this.frenzied ? 74 : 58, this.frenzied ? '#ff3b1f' : col, 0.4 + Math.sin(state.gameTime * (this.frenzied ? 12 : 5)) * 0.12);
        }
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
        if (this.affix) {
            // 접사 이름표 — 무엇이 다른지 보고 싸우게
            const label = AFFIXES[this.affix.id].name + (this.affix.element ? ` · ${{ FIRE: '불', ICE: '얼음', THUNDER: '번개' }[this.affix.element]} 면역` : '');
            ctx.save();
            ctx.font = '600 11px "Noto Sans KR"';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(8,7,14,0.8)';
            const w = ctx.measureText(label).width + 10;
            ctx.fillRect(this.x - w / 2, this.y - 100 - lift, w, 15);
            ctx.fillStyle = AFFIXES[this.affix.id].color;
            ctx.fillText(label, this.x, this.y - 89 - lift);
            ctx.restore();
        }
    }
}
