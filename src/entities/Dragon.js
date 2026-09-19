import { Entity } from './Entity.js';
import { Projectile, addBullet } from './Projectile.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { input } from '../core/input.js';
import { isOnScreen } from '../core/camera.js';
import { WORLD_SIZE, MAX_KIDS, PLAYER_SPAWN } from '../core/config.js';
import { rand, dist, clamp, pick, roundRect } from '../core/utils.js';
import { IDLE_LINES } from '../data/dialogues.js';
import { ELEMENTS, STAGES, SKILLS } from '../data/elements.js';
import { applyStatus } from '../systems/status.js';
import { notify, questMarker } from '../systems/quests.js';
import { weatherDamageMult } from '../systems/weather.js';
import { updateActivityNpc } from '../systems/npcActions.js';
import { NPC_TALK } from '../data/npcTalk.js';
import { spawnText } from '../render/vfx.js';
import { hasRelic } from '../systems/relics.js';
import { play, toggleMute } from '../systems/audio.js';
import { toggleJournal } from '../ui/journal.js';
import { getDragonSheet } from '../render/dragonSprites.js';
import { Animator, drawFrame } from '../render/spritesheet.js';
import { drawIcon } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { setInteractTarget } from '../ui/hud.js';
import { groundAt } from '../world/terrain.js';
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
        this.gold = 0;
        // 성장/브레스 (플레이어용)
        this.stageIndex = 0;
        this.elements = ['FIRE'];
        this.element = 'FIRE';
        this.cooldowns = { NOVA: 0, ROAR: 0 };
        this.atkTimer = 0;  // NPC 전투: 다음 사격까지
        this.downTimer = 0; // NPC 전투: 쓰러져 쉬는 시간
        if (!isPlayer && config.maxHp) this.hp = this.maxHp = config.maxHp;
        this.carrying = null; // 'EGG'
        this.fishing = null;  // { x, y, wait, bite } 낚시 중일 때

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
        if (this.isPlayer && state.blessingDay === state.day) amount *= 1.25; // 엘더의 축복
        this.xp += amount;
        if (this.xp < this.maxXp) return;
        while (this.xp >= this.maxXp) {   // 퀘스트 보상처럼 한 번에 여러 레벨이 오를 수 있다
            this.level++;
            this.xp -= this.maxXp;
            this.maxXp = Math.floor(this.maxXp * 1.3);
            this.maxHp += 20;
        }
        this.hp = this.maxHp;
        if (!this.isPlayer) return;
        showToast(`LEVEL UP! LV.${this.level}`, '🔥');
        play('level');
        burst(this.x, this.y, '#f1c40f', 1.2, 25);
        spawnEffect('STAR', this.x, this.y - 50, { size: 1.6 });
        this.checkEvolution();
    }

    get stage() { return STAGES[this.stageIndex]; }

    /** 레벨이 다음 성장 단계에 닿았으면 진화 */
    checkEvolution() {
        let idx = this.stageIndex;
        while (idx + 1 < STAGES.length && this.level >= STAGES[idx + 1].minLevel) idx++;
        if (idx === this.stageIndex) return;
        this.stageIndex = idx;
        this.maxHp += 30;
        this.hp = this.maxHp;
        const st = this.stage;
        showToast(`진화! [${st.name}](이)가 되었습니다` + (st.unlock ? ` — ${st.unlock}` : ''), '🐲');
        spawnEffect('RING', this.x, this.y - 40, { size: 2.2 });
        burst(this.x, this.y - 30, () => `hsl(${40 + Math.floor(Math.random() * 3) * 10},100%,65%)`, 1.4, 40);
        notify('stage', idx);
    }

    unlockElement(id) {
        if (this.elements.includes(id)) return;
        this.elements.push(id);
        this.element = id;
        showToast(`새 숨결 [${ELEMENTS[id].name}] 획득! — ${ELEMENTS[id].desc} ([${ELEMENTS[id].key}]번 키)`, '✨');
    }

    takeDamage(dmg) {
        const a = state.activity;
        if (a && a.type === 'SPAR' && a.npc === this) {   // 대련: 실제 체력 대신 기력이 깎인다
            a.hp -= dmg;
            if (this.animator) this.animator.play('hit');
            return;
        }
        if (!this.isPlayer && this.downTimer > 0) return;
        this.hp -= dmg;
        burst(this.x, this.y - 40, '#e74c3c', 0.8, 5);
        if (this.isPlayer && dmg >= 3) play('hurt');
        if (this.isPlayer && dmg >= 3) spawnText(this.x, this.y - 90 * this.stage.scale, `-${Math.round(dmg)}`, '#ff6b5e', 15);
        if (this.animator) this.animator.play('hit');
        if (this.hp <= 0 && !this.isPlayer) {           // 마을 용은 죽지 않고 잠시 쓰러진다
            this.hp = 0;
            this.downTimer = 25;
            const talk = NPC_TALK[this.config.name];
            this.say(talk ? talk.down : '으윽…');
            if (this.config.fixed) showToast(`${this.config.name}(이)가 쓰러졌습니다! 잠시 후 일어납니다.`, '💫');
        }
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
        if (this.fishing) this.updateFishing(dt, dx || dy);
        if (dx || dy) {
            this.moveBy(dx, dy, WALK_SPEED * this.stage.speed * (1 + 0.04 * (state.upgrades.spd || 0)) * (hasRelic('WIND_FEATHER') ? 1.08 : 1) * (input.down('sprint') ? SPRINT_MULT : 1), dt);
            this.hunger -= 0.5 * dt * (hasRelic('IRON_STOMACH') ? 0.5 : 1);
        } else {
            this.hunger -= 0.1 * dt * (hasRelic('IRON_STOMACH') ? 0.5 : 1);
        }
        if (hasRelic('LIFE_STONE')) this.hp = Math.min(this.maxHp, this.hp + 1.5 * dt);
        this.hunger = Math.max(0, this.hunger);

        const nearNpc = state.entities.npcs.find(n => dist(this, n) < INTERACT_RANGE) || null;
        setInteractTarget(nearNpc);

        for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
        ['FIRE', 'ICE', 'THUNDER'].forEach((el, i) => {
            if (input.pressed('el' + (i + 1)) && this.elements.includes(el)) this.element = el;
        });

        if (input.pressed('attack')) this.attack();
        if (input.pressed('nova')) this.useSkill('NOVA');
        if (input.pressed('roar')) this.useSkill('ROAR');
        if (input.pressed('interact')) this.interact();
        if (input.pressed('talk') && nearNpc) startDialogue(nearNpc, 'TALK');
        if (input.pressed('flirt') && nearNpc) startDialogue(nearNpc, 'FLIRT');
        if (input.pressed('kids')) toggleKidsPanel();
        if (input.pressed('journal')) toggleJournal();
        if (input.pressed('mute')) showToast(toggleMute() ? '효과음 끔' : '효과음 켬', '🔊');
    }

    attack() {
        if (this.hunger < 10) { showToast("배가 너무 고파요!", "😫"); return; }
        this.hunger -= 2;
        if (this.animator) this.animator.play('attack');
        this.breathe(this.angle);
    }

    /** 현재 속성의 브레스 한 발 */
    breathe(angle, damageMult = 1) {
        const sc = this.stage.scale;
        const mx = this.x + Math.cos(angle) * MOUTH_OFFSET * sc;
        const my = this.y - 40 * sc + Math.sin(angle) * MOUTH_OFFSET * sc;
        const damage = ELEMENTS[this.element].damage * this.stage.damage * (1 + 0.08 * (state.upgrades.dmg || 0)) * (hasRelic('OLD_FANG') ? 1.15 : 1) * weatherDamageMult(this.element) * damageMult;
        addBullet(new Projectile(mx, my, angle, { faction: 'ALLY', element: this.element, damage, scale: 0.7 + sc * 0.3 }));
        play(this.element === 'ICE' ? 'ice' : this.element === 'THUNDER' ? 'zap' : 'shoot');
    }

    useSkill(id) {
        const skill = SKILLS[id];
        if (this.stageIndex < skill.stage) { showToast(`[${skill.name}]은(는) ${STAGES[skill.stage].name}부터 쓸 수 있어요.`, '🔒'); return; }
        if (this.cooldowns[id] > 0) return;
        if (this.hunger < skill.hunger + 5) { showToast("배가 너무 고파요!", "😫"); return; }
        this.hunger -= skill.hunger;
        this.cooldowns[id] = skill.cooldown;
        if (this.animator) this.animator.play('attack');

        if (id === 'NOVA') {            // 사방으로 브레스
            for (let i = 0; i < 14; i++) this.breathe((i / 14) * Math.PI * 2, 0.8);
            spawnEffect('RING', this.x, this.y - 40, { size: 1.4 });
        } else {                        // 포효: 주변 적을 밀치고 기절시킨다
            const E = state.entities;
            for (const e of [...E.enemies, ...E.humans, ...E.bosses]) {
                const d = dist(this, e);
                if (d > 340) continue;
                e.takeDamage(15 * this.stage.damage);
                applyStatus(e, 'STUN', 1.8);
                if (!e.statusImmune) { e.x += ((e.x - this.x) / (d || 1)) * 90; e.y += ((e.y - this.y) / (d || 1)) * 90; }
            }
            spawnEffect('RING', this.x, this.y - 40, { size: 3 });
            burst(this.x, this.y - 40, '#fff2a8', 0.9, 30);
            play('roar');
        }
    }

    /** 가까운 물 타일의 좌표 (없으면 null) */
    nearWater() {
        for (let i = 0; i < 12; i++) {
            const a = this.angle + (i / 12) * Math.PI * 2;
            const x = this.x + Math.cos(a) * 110, y = this.y + Math.sin(a) * 110;
            if (groundAt(x, y) === 'WATER') return { x, y };
        }
        return null;
    }

    updateFishing(dt, moved) {
        const f = this.fishing;
        if (moved) { this.fishing = null; return; }   // 움직이면 낚시를 접는다
        if (f.bite > 0) {
            f.bite -= dt;
            if (f.bite <= 0) { this.fishing = null; showToast('물고기가 달아났습니다…', '💨'); }
        } else {
            f.wait -= dt;
            if (f.wait <= 0) { f.bite = 1.0; burst(f.x, f.y, '#bfe9ff', 0.5, 6); play('splash'); }
        }
    }

    interact() {
        const E = state.entities;

        // 0) 낚시 중: 입질이 왔을 때 E 를 누르면 낚는다
        if (this.fishing) {
            if (this.fishing.bite > 0) {
                const n = Math.random() < 0.25 ? 2 : 1;
                this.inventory.meat += n;
                spawnText(this.x, this.y - 100 * this.stage.scale, `물고기 +${n}`, '#9fe3ff', 16);
                burst(this.fishing.x, this.fishing.y, '#bfe9ff', 0.7, 10);
                this.gainXp(6);
            } else {
                showToast('너무 일찍 당겼습니다.', '🎣');
            }
            this.fishing = null;
            return;
        }

        // 1) 줍기
        let picked = false;
        for (const item of E.items) {
            if (item.remove || dist(this, item) >= 60) continue;
            if (item.type === 'MEAT') {
                this.inventory.meat++; item.remove = true; picked = true;
                play('pickup');
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
        }

        // 3) 열매 따기
        const berry = E.props.find(b => b.type === 'BERRY' && b.ripe && dist(this, b) < 80);
        if (berry && this.hunger < 95) { berry.harvest(); return; }

        // 3-0) 보물상자 열기
        const chest = E.props.find(c => c.type === 'CHEST' && !c.opened && dist(this, c) < 80);
        if (chest) { chest.open(); return; }

        // 3-1) 아기 쓰다듬기
        const kid = E.babies.find(b => dist(this, b) < 80);
        if (kid && !this.carrying && kid.pet()) return;

        // 4) 알을 둥지에 놓기
        const nest = E.nests.find(n => dist(this, n) < 80);
        if (nest && this.carrying === 'EGG' && !nest.hasEgg) {
            if (state.kids.length >= MAX_KIDS) { showToast("둥지가 꽉 찼습니다! 더 이상 알을 둘 수 없어요.", "😅"); return; }
            this.carrying = null;
            nest.layEgg(this, state.partner);
            showToast("알을 둥지에 안착시켰습니다.", "🏠");
            return;
        }

        // 5) 물가라면 낚시
        const water = !this.carrying && this.nearWater();
        if (water) {
            this.fishing = { x: water.x, y: water.y, wait: rand(1.5, 4.5), bite: 0 };
            showToast('낚싯줄을 드리웠습니다. 찌가 흔들릴 때 [E]!', '🎣');
        } else if (this.inventory.meat > 0 && this.hunger >= 90) {
            showToast("배가 너무 불러요!", "✋");
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

        if (state.activity && state.activity.npc === this) { updateActivityNpc(this, dt); return; }

        if (this.downTimer > 0) {               // 쓰러져 쉬는 중
            this.downTimer -= dt;
            if (this.downTimer <= 0) { this.hp = this.maxHp; this.say('다시 싸울 수 있어!'); }
            return;
        }
        if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 4 * dt);

        const following = this.state !== 'WANDER';
        const busy = (this.config.fixed || following) && this.fight(dt, following);
        if (following) this.updatePartner(dt, busy);
        else if (!busy) this.updateWander(dt);
    }

    /** 마을 용·짝·동료의 전투. 싸우는 중이면 true */
    fight(dt, following) {
        const E = state.entities;
        let foe = null, best = 460;
        for (const e of [...E.humans, ...E.enemies, ...E.bosses]) {
            if (e.awake === false) continue;
            const d = dist(this, e);
            if (d < best) { best = d; foe = e; }
        }
        if (!foe) return false;
        // 따라다니는 중이 아니면 적당한 거리를 유지하며 맞선다
        if (!following) {
            const a = Math.atan2(foe.y - this.y, foe.x - this.x);
            const move = best > 280 ? a : best < 170 ? a + Math.PI : a + Math.PI / 2;
            this.moveBy(Math.cos(move), Math.sin(move), 130, dt);
        }
        this.facing = facingFromVector(foe.x - this.x, foe.y - this.y, this.facing);
        this.atkTimer -= dt;
        if (this.atkTimer <= 0 && best < 400) {
            const element = this.config.element || 'FIRE';
            const aim = Math.atan2(foe.y - 20 - (this.y - 40), foe.x - this.x);
            addBullet(new Projectile(this.x, this.y - 40, aim, { faction: 'ALLY', element, damage: this.config.power || 8 }));
            if (this.animator) this.animator.play('attack');
            this.atkTimer = 1.25;
            const talk = NPC_TALK[this.config.name];
            if (talk && Math.random() < 0.18) this.say(pick(talk.battle));
        }
        return true;
    }

    /** 짝·동료: 플레이어를 따라다닌다. fighting 중엔 조금 더 떨어져도 봐준다 */
    updatePartner(dt, fighting = false) {
        const player = state.player;
        if (dist(this, player) > (fighting ? 260 : 110)) {
            this.moveBy(player.x - this.x, player.y - this.y, 240, dt);
        }

        // 둥지에 도착하면 알을 낳는다
        const nest = state.entities.nests[0];
        if (this !== state.partner) return; // 동료는 알을 낳지 않는다
        this.eggTimer = (this.eggTimer ?? 0) - dt;
        if (nest && !nest.hasEgg && this.eggTimer <= 0 && dist(this, nest) < 100 && state.kids.length < MAX_KIDS) {
            nest.layEgg(state.player, this);
            this.eggTimer = 150; // 다음 알까지 (초). 짝은 계속 곁에 남는다
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
        const sc = this.isPlayer ? this.stage.scale : 0.92;
        this.drawShadow(ctx, (this.sheet && !this.sheet.flying ? 26 : 34) * sc);
        ctx.restore();

        if (this.animator) {
            const f = this.animator.frame(this.facing);
            if (this.downTimer > 0) ctx.globalAlpha = 0.55;
            drawFrame(ctx, this.sheet, f, this.x, this.y + (this.downTimer > 0 ? 18 : this.hoverY), sc);
            ctx.globalAlpha = 1;
        } else {
            // 시트 로딩 전 임시 표시
            ctx.fillStyle = this.colors.body;
            ctx.beginPath(); ctx.ellipse(this.x, this.y - 30, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
        }

        if (this.fishing) {
            const f = this.fishing, bob = f.bite > 0 ? Math.sin(state.gameTime * 40) * 5 : Math.sin(state.gameTime * 3) * 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(this.x, this.y - 50 * sc); ctx.quadraticCurveTo((this.x + f.x) / 2, Math.min(this.y, f.y) - 70, f.x, f.y + bob); ctx.stroke();
            ctx.fillStyle = '#ff4d4d'; ctx.fillRect(f.x - 4, f.y - 5 + bob, 8, 5);
            ctx.fillStyle = '#fff'; ctx.fillRect(f.x - 4, f.y + bob, 8, 5);
            if (f.bite > 0) {
                ctx.font = '900 30px Fredoka'; ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5; ctx.strokeText('!', f.x, f.y - 22);
                ctx.fillStyle = '#ffd84a'; ctx.fillText('!', f.x, f.y - 22);
            }
        }
        if (this.carrying === 'EGG') {
            drawIcon(ctx, 'EGG', this.x, this.y - 100 * sc + this.hoverY, 2.5);
        }

        if (!this.isPlayer) {
            this.drawNameplate(ctx);
            this.drawHpBar(ctx, this.hp / this.maxHp, -12, 60);
        }
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
        const mark = questMarker(this);
        if (mark) {
            ctx.font = '900 26px Fredoka';
            ctx.fillStyle = mark === '?' ? '#7dff9a' : '#ffd84a';
            ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
            const my = -36 + Math.sin(state.gameTime * 4) * 3;
            ctx.strokeText(mark, 0, my); ctx.fillText(mark, 0, my);
            ctx.font = '10px Fredoka';
        }
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
