import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { hitStop } from '../render/feedback.js';
import { onKill } from '../systems/flow.js';
import { isOnScreen, cam, shake } from '../core/camera.js';
import { dist } from '../core/utils.js';
import { ENEMIES } from '../data/enemies.js';
import { getTileImage } from '../world/terrain.js';
import { slideMove } from '../world/collision.js';
import { drawPixelSprite, whiteCopy, coloredCopy, drawGlow } from '../render/pixel.js';
import { crisp } from '../render/overlay.js';
import { updateStatus, statusTint } from '../systems/status.js';
import { notify } from '../systems/quests.js';
import { play } from '../systems/audio.js';
import { Projectile, addBullet } from './Projectile.js';
import { xpMult } from '../systems/events.js';
import { grantRelic, randomRelic } from '../systems/relics.js';
import { materialFor } from '../data/materials.js';
import { onGuardianDown } from '../systems/delve.js';
import { updateAI, initAI, drawTell, alert } from './enemyAI.js';
import { AFFIXES, rollAffix } from '../data/affixes.js';
import { noteDealt } from '../render/debugOverlay.js';
import { spawnEffect, spawnText, spawnShatter } from '../render/vfx.js';
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
        if (this.squash > 0) this.squash -= dt * 7;    // 눌렸다 튕겨 돌아오는 0.14초
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
        noteDealt(dmg);
        if (!silent) alert(this);              // 먼저 때리면 그 무리가 돌아본다
        if (!silent) {
            this.hitFlash = 1;
            this.squash = 1;                     // 옆으로 퍼지고 위아래로 눌린다 (draw)
            // 맞은 쪽으로 밀린다. 맞은 티가 나야 때린 맛이 난다
            if (from) {
                const a = Math.atan2(this.y - from.y, this.x - from.x);
                const push = Math.min(14, 5 + dmg * 0.4) * (this.elite ? 0.55 : 1);
                this.knock = { x: Math.cos(a) * push, y: Math.sin(a) * push, t: 1 };
            }
        }
        if (this.hp <= 0 && !this.remove) {
            // 마지막 타는 한 박자 멈추고 화면이 살짝 흔들린다. 정예는 더 길게
            hitStop(this.elite ? 0.11 : 0.07);
            shake(this.elite ? 5 : 2);
            this.die();
        }
    }
    die() {
        this.remove = true;
        if (!this.def.noLoot) onKill(this.elite);
        if (this.def.noLoot) { spawnEffect('PUFF', this.x, this.y - 16); play('die'); return; }
        if (this.affix && this.affix.id === 'SPLIT' && !this.splitChild) {   // 둘로 갈라진다 (한 번만)
            for (const side of [-1, 1]) {
                const c = new Enemy(this.x + side * 34, this.y + 8, this.type, false);
                c.splitChild = true; c.aggro = true;
                c.maxHp = c.hp = Math.round(this.def.hp * 0.35);
                state.entities.enemies.push(c);
                burst(c.x, c.y, this.def.color, 0.6, 6);
            }
        }
        // 몸이 가로 띠로 쪼개져 흩날린다. 그냥 사라지면 "없어졌다"지만 조각이 날면 "부쉈다"가 된다
        const deadSheet = getTileImage('dungeon');
        if (deadSheet) {
            const [dtx, dty] = this.def.sprite;
            spawnShatter(this.x, this.y - (this.def.flying ? 22 : 4), deadSheet, { sx: dtx * 16, sy: dty * 16, sw: 16, sh: 16 },
                { scale: this.elite ? 4.5 : 3, flip: Math.cos(this.angle) < 0, color: this.def.color });
        }
        const bonus = this.elite ? 3 : 1;
        state.player.gainXp(this.def.xp * bonus * xpMult());
        state.stats.kills[this.type] = (state.stats.kills[this.type] || 0) + 1;
        if (this.elite && Math.random() < 0.3) { const id = randomRelic(); if (id) grantRelic(id, this.x, this.y); }
        burst(this.x, this.y, this.def.color, this.elite ? 1.4 : 1, this.elite ? 16 : 10);
        spawnEffect(this.def.flying ? 'PUFF' : 'SMOKE', this.x, this.y - 16, { size: this.elite ? 1.8 : 1 });
        spawnEffect('SHOCKWAVE', this.x, this.y, { size: this.elite ? 1.2 : 0.6, color: this.def.color });
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
        if (this.isGuardian) onGuardianDown(this);
    }
    /** 바닥 층에 그리는 예고 (main.js 가 개체보다 먼저 부른다) */
    drawGround(ctx) {
        if (!isOnScreen(this)) return;
        drawTell(ctx, this);
    }
    /**
     * 머리 위 이름표. 줌과 무관하게 같은 크기로 (용 이름표와 같은 방식).
     * 정예는 접사를 작게 한 줄 덧붙인다. 무엇과 싸우는지 알아야 싸움이 된다.
     */
    drawName(ctx, lift) {
        const k = 1 / cam.zoom;
        const top = (this.elite ? 96 : 66) + lift;
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y - top));
        ctx.scale(k, k);
        ctx.textAlign = 'center';
        ctx.font = `600 ${this.elite ? 13 : 12}px "Bookk Myungjo", "Noto Sans KR"`;
        const name = (this.elite ? '★ ' : '') + this.def.name;
        const w = Math.ceil(ctx.measureText(name).width) + 12;
        ctx.fillStyle = 'rgba(8,7,14,0.72)';
        ctx.fillRect(-w / 2, -14, w, 18);
        ctx.fillStyle = this.elite ? '#ffd84a' : '#e8dcc4';
        ctx.fillText(name, 0, 0);
        if (this.affix) {
            const ax = AFFIXES[this.affix.id];
            const tag = ax.name + (this.affix.element ? `·${{ FIRE: '불', ICE: '얼음', THUNDER: '번개' }[this.affix.element]}` : '');
            ctx.font = '600 10px "Bookk Myungjo", "Noto Sans KR"';
            const tw = Math.ceil(ctx.measureText(tag).width) + 10;
            ctx.fillStyle = 'rgba(8,7,14,0.72)';
            ctx.fillRect(-tw / 2, -30, tw, 14);
            ctx.fillStyle = ax.color;
            ctx.fillText(tag, 0, -19);
        }
        ctx.restore();
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
        const kx = this.knock && this.knock.t > 0 ? this.knock.x * this.knock.t : 0;
        const ky = this.knock && this.knock.t > 0 ? this.knock.y * this.knock.t : 0;
        const telling = this.ai && (this.ai.s === 'tell' || this.ai.s === 'tell2');
        const sc = (this.elite ? 4.5 : 3) * (telling ? 0.86 : 1);
        // 눌림: 맞는 순간 가로 1.28 · 세로 0.74 로 찌그러졌다가 되돌아온다
        const q = this.squash > 0 ? Math.sin(this.squash * Math.PI) : 0;
        // 예고 중엔 몸이 부르르 떤다. 바닥 표시(drawTell)만으로는 부족하다 —
        // 싸울 땐 시선이 적의 몸에 가 있지 바닥에 가 있지 않다
        const shiver = telling ? (Math.random() - 0.5) * 3.5 : 0;
        const rect = { sx: tx * 16, sy: ty * 16, sw: 16, sh: 16 };
        const px = this.x + kx + shiver, py = this.y + 4 - (telling ? 0 : hop) - lift + ky;
        const opts = { flip: Math.cos(this.angle) < 0, scale: sc, stretchX: 1 + 0.28 * q, stretchY: 1 - 0.26 * q };

        // 덤비기 직전엔 몸이 경고색으로 달아오른다 (후처리의 번짐이 이 빛을 받아 준다)
        if (telling) drawGlow(ctx, px, py - 14, 46, '#ff6b3c', 0.45 + Math.sin(state.gameTime * 24) * 0.35);

        // 16px 그림이라 풀숲에 묻힌다. 제 색으로 테를 둘러 배경에서 떼어 놓는다.
        // 같은 그림을 filter 로 돌려 쓰는 변종(서리·용암·모래 …)도 이 테 색으로 구별된다
        const sil = coloredCopy(sheet, this.def.color);
        for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) drawPixelSprite(ctx, sil, rect, px + ox, py + oy, opts);

        if (this.def.filter && !(this.hitFlash > 0)) ctx.filter = this.def.filter;
        drawPixelSprite(ctx, this.hitFlash > 0 ? whiteCopy(sheet) : sheet, rect, px, py, opts);
        ctx.filter = 'none';
        this.drawHpBar(ctx, this.hp / this.maxHp, (this.elite ? 82 : 58) + lift, this.elite ? 50 : 34);
        this.drawName(crisp(ctx), lift);   // 이름표는 번짐을 타지 않는 층에
    }
}
