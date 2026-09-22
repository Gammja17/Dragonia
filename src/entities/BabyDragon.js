import { Entity } from './Entity.js';
import { Projectile, addBullet } from './Projectile.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { slideMove } from '../world/collision.js';
import { isOnScreen, cam } from '../core/camera.js';
import { dist, rand, pick, roundRect } from '../core/utils.js';
import { setKidStage, addAffection, findKid } from '../systems/kids.js';
import { showToast } from '../ui/toast.js';
import { KID_TALK } from '../data/npcTalk.js';
import { facingFromVector, drawAccessory, outlineFor, headTop, bubble } from './Dragon.js';
import { getDragonSheet } from '../render/dragonSprites.js';
import { Animator, drawFrame } from '../render/spritesheet.js';
import { crisp } from '../render/overlay.js';
import { STAGES } from '../data/elements.js';

const TAU = Math.PI * 2;
const STAGE_SCALE = { BABY: 0.36, TEEN: 0.55, ADULT: 0.8 }; // 부모 스프라이트 대비 크기

export class BabyDragon extends Entity {
    /** genes: { species, colors } — 부모에게서 물려받은 모습 */
    constructor(x, y, genes) {
        super(x, y);
        this.genes = genes || { species: state.player.species, colors: { ...state.player.colors }, look: state.player.look };
        this.sheet = getDragonSheet(this.genes.species, this.genes.colors, this.genes.look || 0);
        this.petTimer = 0;
        this.followGap = Math.random() * 60;
        this.element = 'FIRE'; // 부모가 다른 숨결을 가르칠 수 있다 (systems/kidActions.js)
        this.playTime = 0;     // 놀아 준 직후 신나서 도는 시간
        this.chat = null; this.chatFade = 0;
        this.animator = new Animator(this.sheet);
        this.facing = 'down';
        this.growth = 0;      // 0~200
        this.stage = 'BABY';  // BABY → TEEN → ADULT
        this.atkTimer = 0;
        this.angle = 0;
        this.home = null;     // 성체가 되면 둥지 주변을 배회
        this.wanderTimer = 0;
    }

    /** 쓰다듬기. 잠깐 쉬었다가 다시 할 수 있다 */
    pet() {
        if (this.petTimer > 0) return false;
        this.petTimer = 12;
        addAffection(this, 6);
        burst(this.x, this.y - 30, '#ff7aa8', 0.9, 8);
        showToast("아기를 쓰다듬었습니다. 기분이 좋아 보여요!", "💗");
        return true;
    }

    say(text) { this.chat = text; this.chatFade = 2.5; }

    feed() {
        addAffection(this, 20);
        showToast("아기에게 고기를 먹였습니다!", "🍖");
        burst(this.x, this.y, '#2ecc71', 0.8, 10);
        this.grow(6);   // 예전엔 34 라 고기 다섯 개면 그 자리에서 성체가 됐다
    }

    /** 성장치를 올리고, 문턱을 넘으면 다음 단계로 자란다 */
    grow(amount) {
        this.growth += amount;

        if (this.growth >= 70 && this.stage === 'BABY') {
            this.stage = 'TEEN';
            setKidStage(this, 'TEEN');
            showToast("아기 용이 청소년이 되었습니다! (전투 가능)", "🔥");
        } else if (this.growth >= 140 && this.stage === 'TEEN') {
            this.stage = 'ADULT';
            setKidStage(this, 'ADULT');
            const nest = state.entities.nests[0];
            this.home = nest ? { x: nest.x, y: nest.y } : { x: this.x, y: this.y };
            showToast("자식이 성체가 되었습니다! 이제 둥지 근처에서 지냅니다.", "🐉");
        }
    }

    get light() { return { r: 110, color: '#ffe2b0', intensity: 0.5 }; }

    update(dt) {
        const px = this.x, py = this.y;
        if (this.petTimer > 0) this.petTimer -= dt;
        if (this.chatFade > 0) this.chatFade -= dt;
        if (this.playTime > 0) {            // 신나서 제자리를 빙글빙글
            this.playTime -= dt;
            const a = state.gameTime * 7;
            this.x += Math.cos(a) * 160 * dt; this.y += Math.sin(a) * 160 * dt;
        }
        const kid = findKid(this);
        if (this.stage !== 'BABY') this.fight(dt, kid);
        // 성체이거나 '둥지 지키기'를 시킨 아이는 둥지 주변에 머문다
        if (this.stage === 'ADULT' || (kid && kid.mode === 'STAY')) this.updateAdult(dt);
        else this.updateYoung(dt);
        const moved = Math.hypot(this.x - px, this.y - py) > 0.01;
        if (moved) this.facing = facingFromVector(this.x - px, this.y - py, this.facing);
        this.animator.playBase(moved ? 'move' : 'idle');
        this.animator.update(dt);
    }

    updateYoung(dt) {
        const target = state.player;
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        const d = dist(this, target);
        const keep = 70 + this.followGap; // 아이마다 조금씩 다른 거리에서 따라온다
        if (d > keep) {
            slideMove(this, this.x + Math.cos(this.angle) * 190 * dt, this.y + Math.sin(this.angle) * 190 * dt, 12);
        }
    }

    /** 청소년·성체는 근처의 적에게 불을 쏜다. 애정이 높을수록 아프다 */
    fight(dt, kid) {
        this.atkTimer -= dt;
        if (this.atkTimer > 0) return;
        const E = state.entities;
        const foe = [...E.humans, ...E.enemies, ...E.bosses].find(e => (e.awake ?? true) && e.type !== 'DUMMY' && dist(this, e) < 300);
        if (!foe) return;
        const damage = (this.stage === 'ADULT' ? 12 : 8) * (1 + (kid ? kid.affection : 0) / 100);
        addBullet(new Projectile(this.x, this.y - 20, Math.atan2(foe.y - 20 - (this.y - 20), foe.x - this.x), { faction: 'ALLY', element: this.element, damage, scale: 0.7 }));
        this.animator.play('attack');
        if (kid && Math.random() < 0.15) this.say(pick(KID_TALK[kid.personality].bark));
        this.atkTimer = this.stage === 'ADULT' ? 1.2 : 1.6;
    }

    // 예전엔 성체가 된 순간 그 자리에 영원히 멈췄다. 이제 둥지 주변을 느긋하게 배회.
    updateAdult(dt) {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.wanderTimer = rand(2, 5);
            this.angle = rand(0, TAU);
        }
        // 둥지는 내 굴 안에만 있다. 밖에서는 지금 선 자리를 제집으로 삼는다
        if (!this.home) { const nest = state.entities.nests[0]; this.home = nest ? { x: nest.x, y: nest.y } : { x: this.x, y: this.y }; }
        if (dist(this, this.home) > 200) this.angle = Math.atan2(this.home.y - this.y, this.home.x - this.x);
        slideMove(this, this.x + Math.cos(this.angle) * 40 * dt, this.y + Math.sin(this.angle) * 40 * dt, 12);
    }

    draw(ctx) {
        if (!isOnScreen(this)) return;
        const s = STAGE_SCALE[this.stage];
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 34 * s);
        if (state.talkTarget === this) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 40 * s + 10, 16 * s + 4, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
        const hover = this.sheet.flying ? Math.sin(state.gameTime * 3 + this.x) * 4 * s : 0;
        const kf = this.animator.frame(this.facing);
        drawFrame(ctx, this.sheet, kf, this.x, this.y + hover, s,
            { t: state.gameTime + this.followGap, moving: this.animator.name === 'move', attacking: this.animator.name === 'attack' && !this.animator.done,
              hurt: this.animator.name === 'hit' && !this.animator.done ? Math.max(0, 1 - this.animator.t * 4) : 0,
              shape: STAGES[0].shape },   // 새끼는 늘 해츨링 비율 — 머리가 크고 몸이 작다
            (this._outline || (this._outline = outlineFor(kf, false))));
        if (this.stage === 'BABY') drawAccessory(ctx, this.sheet, 'SHELL', this.facing, this.x, this.y + hover, s * 1.6);

        // 이름표와 말풍선. 줌을 되돌려 그려서 멀리 당겨 봐도 같은 크기로 또렷하다.
        // 번짐(후처리)을 타지 않는 층에 그린다 — 흰 말풍선은 그냥 두면 뿌옇게 번진다
        const g = crisp(ctx);
        const kid = findKid(this);
        const top = this.y - headTop(this.sheet, s) - 6;
        const k = 1 / cam.zoom;
        g.save();
        g.translate(Math.round(this.x), Math.round(top));
        g.scale(k, k);
        g.textAlign = 'center';
        if (kid) {
            g.font = '700 12px "Mulmaru", sans-serif';
            const w = Math.ceil(g.measureText(kid.name).width) + 14;
            g.fillStyle = 'rgba(10, 9, 16, 0.78)';
            g.fillRect(-w / 2, -14, w, 19);
            g.fillStyle = '#ffe9a0';
            g.fillText(kid.name, 0, 0);
        }
        if (this.chatFade > 0 && this.chat) {
            g.globalAlpha = Math.min(1, this.chatFade);
            g.font = '12px "Mulmaru", sans-serif';
            const w = Math.ceil(g.measureText(this.chat).width) + 24;
            bubble(g, -w / 2, -46, w, 26, -20);
            g.fillStyle = '#20202a';
            g.fillText(this.chat, 0, -28);
            g.globalAlpha = 1;
        }
        g.restore();
    }
}
