import { Entity } from './Entity.js';
import { Fireball, addBullet } from './Fireball.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { input } from '../core/input.js';
import { isOnScreen } from '../core/camera.js';
import { WORLD_SIZE, MAX_KIDS, PLAYER_SPAWN } from '../core/config.js';
import { rand, dist, clamp, pick, roundRect } from '../core/utils.js';
import { IDLE_LINES } from '../data/dialogues.js';
import { getDragonSheet } from '../render/dragonSprites.js';
import { Animator, drawFrame } from '../render/spritesheet.js';
import { drawIcon } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { setInteractTarget } from '../ui/hud.js';
import { toggleKidsPanel } from '../ui/kidsPanel.js';
import { startDialogue } from '../systems/dialogue.js';

const WALK_SPEED = 260;
const SPRINT_MULT = 1.5;
const INTERACT_RANGE = 180;
const MOUTH_OFFSET = 40; // 화염구가 생성되는 위치(발 기준점에서 바라보는 방향으로)

/** 이동 벡터 → 4방향 */
export function facingFromVector(dx, dy, fallback = 'down') {
    if (!dx && !dy) return fallback;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
}

/** 플레이어와 NPC 공용. config: { name, species, colors:{body,belly,wing}, personality?, role?, canPartner? } */
export class Dragon extends Entity {
    constructor(x, y, config, isPlayer = false) {
        super(x, y);
        this.isPlayer = isPlayer;
        this.config = config;
        this.species = config.species || 'WESTERN'; // WESTERN | WYVERN | HYDRA | BEHEMOTH | BONE
        this.colors = { ...config.colors };

        this.level = 1; this.xp = 0; this.maxXp = 100;
        this.hp = 100; this.maxHp = 100; this.hunger = 100;
        this.angle = 0;         // 마지막 이동/조준 방향 (라디안)
        this.facing = 'down';   // 스프라이트 방향
        this.moving = false;
        this.hoverY = 0;
        this.inventory = { meat: 0 };
        this.carrying = null; // 'EGG'

        this.sheet = getDragonSheet(this.species, this.colors);
        this.animator = this.sheet ? new Animator(this.sheet) : null;
        this.animPhase = Math.random() * 5;

        // NPC 전용
        this.homeX = x; this.homeY = y;
        this.state = 'WANDER'; // WANDER | PARTNER_FOLLOW
        this.wanderTimer = 0;
        this.chatTimer = rand(5, 15);
        this.currentChat = null; this.chatFade = 0;
        this.relation = 0; // 0~100
    }

    // ---------- 공통 ----------
    gainXp(amount) {
        this.xp += amount;
        if (this.xp < this.maxXp) return;
        this.level++;
        this.xp -= this.maxXp;
        this.maxXp = Math.floor(this.maxXp * 1.3);
        this.maxHp += 20;
        this.hp = this.maxHp;
        if (this.isPlayer) {
            showToast(`LEVEL UP! LV.${this.level}`, '🔥');
            burst(this.x, this.y, '#f1c40f', 1.2, 25);
            spawnEffect('STAR', this.x, this.y - 50, { size: 1.6 });
        }
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        burst(this.x, this.y - 40, '#e74c3c', 0.8, 5);
        if (this.animator) this.animator.play('hit');
        if (this.hp <= 0 && this.isPlayer) {
            showToast("쓰러졌습니다... 마을에서 부활합니다.", "💀");
            this.hp = this.maxHp;
            this.x = PLAYER_SPAWN.x; this.y = PLAYER_SPAWN.y;
        }
    }

    /** 밤에 주변을 밝히는 빛 (render/lighting.js) */
    get light() {
        return this.isPlayer ? { r: 300, color: '#ffe2b0', dy: -40 } : { r: 170, color: '#ffe2b0', intensity: 0.55, dy: -40 };
    }

    say(text) {
        this.currentChat = text;
        this.chatFade = 3.0;
    }

    update(dt) {
        if (this.chatFade > 0) this.chatFade -= dt * 0.3;
        if (!this.sheet) {
            this.sheet = getDragonSheet(this.species, this.colors);
            if (this.sheet) this.animator = new Animator(this.sheet);
        }
        const flying = this.sheet ? this.sheet.flying : true;
        this.hoverY = flying ? Math.sin(state.gameTime * 2 + this.animPhase) * 6 : 0;

        this.moving = false;
        if (this.isPlayer) this.updatePlayer(dt);
        else this.updateNpc(dt);

        this.x = clamp(this.x, 50, WORLD_SIZE - 50);
        this.y = clamp(this.y, 50, WORLD_SIZE - 50);

        if (this.animator) {
            this.animator.playBase(this.moving ? 'move' : 'idle');
            this.animator.update(dt);
        }
    }

    /** 방향 벡터로 이동하고 facing/angle 갱신 */
    moveBy(dx, dy, speed, dt) {
        const len = Math.hypot(dx, dy);
        if (!len) return;
        dx /= len; dy /= len;
        this.x += dx * speed * dt;
        this.y += dy * speed * dt;
        this.angle = Math.atan2(dy, dx);
        this.facing = facingFromVector(dx, dy, this.facing);
        this.moving = true;
    }

    // ---------- 플레이어 ----------
    updatePlayer(dt) {
        const { dx, dy } = input.axis();
        if (dx || dy) {
            this.moveBy(dx, dy, WALK_SPEED * (input.down('sprint') ? SPRINT_MULT : 1), dt);
            this.hunger -= 0.5 * dt;
        } else {
            this.hunger -= 0.1 * dt;
        }
        this.hunger = Math.max(0, this.hunger);

        const nearNpc = state.entities.npcs.find(n => dist(this, n) < INTERACT_RANGE) || null;
        setInteractTarget(nearNpc);

        if (input.pressed('attack')) this.attack();
        if (input.pressed('interact')) this.interact();
        if (input.pressed('talk') && nearNpc) startDialogue(nearNpc, 'TALK');
        if (input.pressed('flirt') && nearNpc) startDialogue(nearNpc, 'FLIRT');
        if (input.pressed('kids')) toggleKidsPanel();
    }

    attack() {
        if (this.hunger < 10) { showToast("배가 너무 고파요!", "😫"); return; }
        this.hunger -= 2;
        if (this.animator) this.animator.play('attack');
        const mx = this.x + Math.cos(this.angle) * MOUTH_OFFSET;
        const my = this.y - 40 + Math.sin(this.angle) * MOUTH_OFFSET;
        addBullet(new Fireball(mx, my, this.angle, this, 'ALLY'));
    }

    interact() {
        const E = state.entities;

        // 1) 줍기
        let picked = false;
        for (const item of E.items) {
            if (item.remove || dist(this, item) >= 60) continue;
            if (item.type === 'MEAT') {
                this.inventory.meat++; item.remove = true; picked = true;
                showToast("고기 획득!", "🍖");
            } else if (item.type === 'EGG' && !this.carrying) {
                this.carrying = 'EGG'; item.remove = true; picked = true;
                showToast("알을 들었습니다.", "🥚");
            }
        }
        if (picked) return;

        // 2) 고기 사용: 배고프면 자기가 먹고, 아니면 근처 아기에게
        if (this.inventory.meat > 0) {
            if (this.hunger < 90) {
                this.inventory.meat--;
                this.hunger += 40;
                this.hp = Math.min(this.maxHp, this.hp + 30);
                showToast("고기를 먹었습니다.", "😋");
                return;
            }
            const baby = E.babies.find(b => dist(this, b) < 80);
            if (baby) { this.inventory.meat--; baby.feed(); return; }
            showToast("배가 너무 불러요!", "✋");
        }

        // 3) 알을 둥지에 놓기
        const nest = E.nests.find(n => dist(this, n) < 80);
        if (nest && this.carrying === 'EGG' && !nest.hasEgg) {
            if (state.kids.length >= MAX_KIDS) { showToast("둥지가 꽉 찼습니다! 더 이상 알을 둘 수 없어요.", "😅"); return; }
            this.carrying = null;
            nest.hasEgg = true;
            showToast("알을 둥지에 안착시켰습니다.", "🏠");
        }
    }

    // ---------- NPC ----------
    updateNpc(dt) {
        this.chatTimer -= dt;
        if (this.chatTimer <= 0) {
            const lines = IDLE_LINES[this.config.personality];
            if (lines && lines.length) this.say(pick(lines));
            this.chatTimer = rand(10, 25);
        }

        if (this.state === 'PARTNER_FOLLOW') this.updatePartner(dt);
        else this.updateWander(dt);
    }

    updatePartner(dt) {
        const player = state.player;
        if (dist(this, player) > 110) {
            this.moveBy(player.x - this.x, player.y - this.y, 220, dt);
        }

        // 둥지에 도착하면 알을 낳는다
        const nest = state.entities.nests[0];
        if (nest && !nest.hasEgg && dist(this, nest) < 100 && state.kids.length < MAX_KIDS) {
            nest.hasEgg = true;
            this.state = 'WANDER';
            this.say("우리 알을 부탁해.");
            showToast(`${this.config.name}가 알을 낳았습니다!`, '🥚');
            burst(nest.x, nest.y, '#fff', 1, 20);
        }
    }

    updateWander(dt) {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.wanderTimer = rand(3, 8);
            this.wanderAngle = rand(0, Math.PI * 2);
            this.resting = Math.random() < 0.35; // 가끔 멈춰 서 있기
        }
        if (this.resting) return;
        let a = this.wanderAngle;
        if (dist(this, { x: this.homeX, y: this.homeY }) > 500) {
            a = Math.atan2(this.homeY - this.y, this.homeX - this.x);
        }
        this.moveBy(Math.cos(a), Math.sin(a), 60, dt);
    }

    // ---------- 드로잉 ----------
    draw(ctx) {
        if (!isOnScreen(this)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, this.sheet && !this.sheet.flying ? 26 : 34);
        ctx.restore();

        if (this.animator) {
            const f = this.animator.frame(this.facing);
            drawFrame(ctx, this.sheet, f, this.x, this.y + this.hoverY, this.isPlayer ? 1 : 0.92);
        } else {
            // 시트 로딩 전 임시 표시
            ctx.fillStyle = this.colors.body;
            ctx.beginPath(); ctx.ellipse(this.x, this.y - 30, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
        }

        if (this.carrying === 'EGG') {
            drawIcon(ctx, 'EGG', this.x, this.y - 100 + this.hoverY, 2.5);
        }

        if (!this.isPlayer) this.drawNameplate(ctx);
    }

    drawNameplate(ctx) {
        const top = this.sheet ? this.sheet.fh * this.sheet.scale * this.sheet.anchor.y : 90;
        ctx.save();
        ctx.translate(this.x, this.y - top - 14 + this.hoverY);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-45, -15, 90, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText(this.config.name || 'Dragon', 0, 0);
        if (this.relation > 0) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('♥'.repeat(Math.min(3, Math.max(1, Math.ceil(this.relation / 30)))), 0, -18);
        }
        if (this.chatFade > 0 && this.currentChat) {
            ctx.globalAlpha = Math.min(1, this.chatFade);
            ctx.translate(0, -30);
            ctx.font = '11px "Noto Sans KR"';
            const w = ctx.measureText(this.currentChat).width + 24;
            ctx.fillStyle = '#fff';
            roundRect(ctx, -w / 2, -13, w, 26, 10);
            ctx.fillStyle = '#333';
            ctx.fillText(this.currentChat, 0, 4);
        }
        ctx.restore();
    }
}
