import { Entity } from './Entity.js';
import { Projectile, addBullet } from './Projectile.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { npcName } from '../data/npcs.js';
import { input, mouse } from '../core/input.js';
import { isOnScreen, screenToWorld } from '../core/camera.js';
import { WORLD_SIZE, MAX_KIDS, PLAYER_SPAWN, VILLAGE_CENTER } from '../core/config.js';
import { rand, dist, clamp, pick, roundRect } from '../core/utils.js';
import { IDLE_LINES } from '../data/dialogues.js';
import { ELEMENTS, STAGES } from '../data/elements.js';
import { SKILL_SLOTS } from '../data/skills.js';
import { useSlot, updateChannels, openSkillBook } from '../systems/skills.js';
import { openNestMenu, pendingTrial } from '../systems/story.js';
import { applyStatus } from '../systems/status.js';
import { notify, questMarker } from '../systems/quests.js';
import { weatherDamageMult } from '../systems/weather.js';
import { updateActivityNpc } from '../systems/npcActions.js';
import { NPC_TALK } from '../data/npcTalk.js';
import { spawnText, spawnBolt } from '../render/vfx.js';
import { shake } from '../core/camera.js';
import { hasRelic } from '../systems/relics.js';
import { play, toggleMute } from '../systems/audio.js';
import { toggleJournal } from '../ui/journal.js';
import { openKidHub } from '../systems/kidActions.js';
import { getDragonSheet } from '../render/dragonSprites.js';
import { Animator, drawFrame } from '../render/spritesheet.js';
import { drawIcon, drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { setInteractTarget, toggleHelp } from '../ui/hud.js';
import { groundAt, currentMapSize } from '../world/terrain.js';
import { slideMove } from '../world/collision.js';
import { nearbyWaystone, openTravelMenu } from '../systems/travel.js';
import { tryDelveInteract } from '../systems/delve.js';
import { getBiome } from '../world/biomes.js';
import { toggleKidsPanel } from '../ui/kidsPanel.js';
import { startDialogue } from '../systems/dialogue.js';

const WALK_SPEED = 260;
const SPRINT_MULT = 1.5;
const INTERACT_RANGE = 180;
const TALK_RANGE = 300;      // 마우스로 가리킨 상대에게는 조금 더 멀리서도 말을 걸 수 있다
const AIM_RANGE = 560;       // 자동 조준(터치·키보드): 이 거리 안, 바라보는 쪽 ±AIM_CONE 안의 가장 가까운 적을 겨눈다
const AIM_CONE = 1.0;
const AIM_MAGNET = 95;       // 마우스 조준: 커서가 적에게 이만큼 가까우면 그 적에게 살짝 붙여 준다
// 허기 단계: 배가 고프면 느려지고 숨결이 굼떠진다. 예전처럼 공격을 막지는 않는다
const HUNGER_PECKISH = 35, HUNGER_STARVING = 12;
const DASH_TIME = 0.2, DASH_COOLDOWN = 1.0, DASH_MULT = 3.4;
const MOUTH_OFFSET = 40; // 화염구가 생성되는 위치(발 기준점에서 바라보는 방향으로)

/** 머리 위 장신구. accessory: render/pixel.js 의 아이콘 이름 */
export function drawAccessory(ctx, sheet, accessory, facing, x, y, scale) {
    if (!accessory || !sheet.head) return;
    if (sheet.procedural && (facing === 'up' || facing === 'down')) return;   // 좌우 그림만 있는 외형은 어느 쪽을 보는지 여기선 알 수 없다
    const s = sheet.scale * scale, [hx, hy] = sheet.head[facing];
    const left = x - sheet.fw * s * sheet.anchor.x, top = y - sheet.fh * s * sheet.anchor.y;
    drawIcon(ctx, accessory, left + sheet.fw * s * hx, top + sheet.fh * s * hy, Math.max(2, Math.round(3 * scale)));
}

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

        this.level = 1; this.xp = 0; this.maxXp = 150;
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
        this.skills = [];                       // 배운 스킬 id (data/skills.js)
        this.slots = { Q: null, F: null, R: null }; // 장착한 스킬
        this.cooldowns = {};                    // 스킬 id → 남은 대기 시간
        this.channels = [];                     // 진행 중인 스킬 (systems/skills.js)
        this.guard = 0;       // 강철 비늘 남은 시간
        this.ult = 0;         // 필살기 게이지 0~100 (삼원룡만)
        this.beam = null;     // 삼원 융합 브레스 { time, angle }
        this.slowTimer = 0;   // 빙판·얼음에 느려진 시간
        this.diveHeight = 0;  // 급강하 중 떠오른 높이
        this.fireTimer = 0;   // 다음 브레스까지
        this.dashTime = 0; this.dashCd = 0; this.dashDir = { x: 0, y: 0 };
        this.invuln = 0;      // 대시 중 무적 시간
        this.fury = 0;        // 포효 뒤 분노 시간
        this.atkTimer = 0;  // NPC 전투: 다음 사격까지
        this.downTimer = 0; // NPC 전투: 쓰러져 쉬는 시간
        if (!isPlayer && config.maxHp) this.hp = this.maxHp = config.maxHp;
        this.carrying = null; // 'EGG'
        this.fishing = null;  // { x, y, wait, bite } 낚시 중일 때

        this.look = config.look || 0;                   // species 'LOOK' 일 때의 외형 번호
        this.sheet = getDragonSheet(this.species, this.colors, this.look);
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
            this.maxXp = Math.floor(this.maxXp * 1.45);
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

    /** 레벨이 다음 단계에 닿으면 스승의 승급 시험을 받을 수 있다 (systems/story.js). 자동으로 자라지는 않는다 */
    checkEvolution() {
        if (pendingTrial()) showToast('몸이 근질거린다… 스승 카이론에게 [승급 시험]을 청할 수 있습니다!', '🐲');
    }

    /** 승급 시험을 통과했을 때 */
    evolve(idx) {
        this.stageIndex = idx;
        this.maxHp += 40;
        this.hp = this.maxHp;
        showToast(`진화! [${this.stage.name}](이)가 되었습니다` + (this.stage.unlock ? ` — ${this.stage.unlock}` : ''), '🐲');
        spawnEffect('SHOCKWAVE', this.x, this.y, { size: 3, color: '#ffe9a0' });
        spawnEffect('RING', this.x, this.y - 40, { size: 2.6 });
        burst(this.x, this.y - 30, () => `hsl(${40 + Math.floor(Math.random() * 3) * 10},100%,65%)`, 1.4, 40);
        shake(10); play('evolve');
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
        if (a && (a.type === 'SPAR' || a.type === 'DUEL') && a.npc === this) {   // 대련: 실제 체력 대신 기력이 깎인다
            a.hp -= dmg;
            if (this.animator) this.animator.play('hit');
            return;
        }
        if (!this.isPlayer && this.downTimer > 0) return;
        if (this.isPlayer && this.invuln > 0) return;
        if (this.isPlayer && this.guard > 0) dmg *= 0.3;   // 강철 비늘
        this.hp -= dmg;
        burst(this.x, this.y - 40, '#e74c3c', 0.8, 5);
        if (this.isPlayer && dmg >= 3) { play('hurt'); shake(Math.min(10, 2 + dmg * 0.3)); }
        if (this.isPlayer && dmg >= 3) spawnText(this.x, this.y - 90 * this.stage.scale, `-${Math.round(dmg)}`, '#ff6b5e', 15);
        if (this.animator) this.animator.play('hit');
        if (this.hp <= 0 && !this.isPlayer) {           // 마을 용은 죽지 않고 잠시 쓰러진다
            this.hp = 0;
            this.downTimer = 25;
            const talk = NPC_TALK[this.config.name];
            this.say(talk ? talk.down : '으윽…');
            if (this.config.fixed) showToast(`${npcName(this.config.name)}(이)가 쓰러졌습니다! 잠시 후 일어납니다.`, '💫');
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
            this.sheet = getDragonSheet(this.species, this.colors, this.look);
            if (this.sheet) this.animator = new Animator(this.sheet);
        }
        const flying = this.sheet ? this.sheet.flying : true;
        this.hoverY = flying ? Math.sin(state.gameTime * 2 + this.animPhase) * 6 : 0;

        this.moving = false;
        if (this.isPlayer) this.updatePlayer(dt);
        else this.updateNpc(dt);

        const edge = currentMapSize() - 50;
        this.x = clamp(this.x, 50, edge);
        this.y = clamp(this.y, 50, edge);

        if (this.animator) {
            this.animator.playBase(this.moving ? 'move' : 'idle');
            this.animator.update(dt);
        }
    }

    /** 방향 벡터로 이동하고 facing/angle 갱신. 물·나무·집은 통과하지 못하고 미끄러진다 */
    moveBy(dx, dy, speed, dt) {
        const len = Math.hypot(dx, dy);
        if (!len) return;
        dx /= len; dy /= len;
        slideMove(this, this.x + dx * speed * dt, this.y + dy * speed * dt, 20);
        this.angle = Math.atan2(dy, dx);
        this.facing = facingFromVector(dx, dy, this.facing);
        this.moving = true;
    }

    // ---------- 플레이어 ----------
    updatePlayer(dt) {
        const { dx, dy } = input.axis();
        if (this.fishing) this.updateFishing(dt, dx || dy);
        this.dashCd -= dt; this.invuln -= dt; this.fury -= dt; this.guard -= dt; this.slowTimer -= dt;
        const baseSpeed = WALK_SPEED * this.stage.speed * (1 + 0.04 * (state.upgrades.spd || 0)) * (hasRelic('WIND_FEATHER') ? 1.08 : 1)
            * (this.slowTimer > 0 ? 0.55 : 1) * [1, 0.86, 0.7][this.hungerLevel];
        const locked = this.channels.some(c => c.lock);   // 급강하 중엔 조작 불가
        // Shift 를 탁 누르면 대시(잠깐 무적), 계속 누르고 있으면 달리기
        if (locked) { /* 스킬이 몸을 움직이는 중 */ }
        else if (input.pressed('sprint') && (dx || dy) && this.dashCd <= 0) {
            const len = Math.hypot(dx, dy);
            this.dashDir = { x: dx / len, y: dy / len };
            this.dashTime = DASH_TIME; this.dashCd = DASH_COOLDOWN; this.invuln = DASH_TIME + 0.12;
            play('dash');
            spawnEffect('PUFF', this.x, this.y - 6);
        }
        if (locked) { /* no-op */ }
        else if (this.dashTime > 0) {
            this.dashTime -= dt;
            this.moveBy(this.dashDir.x, this.dashDir.y, baseSpeed * DASH_MULT, dt);
            burst(this.x, this.y - 30 * this.stage.scale, this.colors.body, 0.35);
        } else if (dx || dy) {
            this.moveBy(dx, dy, baseSpeed * (input.down('sprint') ? SPRINT_MULT : 1), dt);
            this.hunger -= 0.35 * dt * (hasRelic('IRON_STOMACH') ? 0.5 : 1);
        } else {
            this.hunger -= 0.08 * dt * (hasRelic('IRON_STOMACH') ? 0.5 : 1);
        }
        if (hasRelic('LIFE_STONE')) this.hp = Math.min(this.maxHp, this.hp + 1.5 * dt);
        this.hunger = Math.max(0, this.hunger);

        // 말 걸 상대: 마우스(또는 터치)로 가리킨 용이 우선, 없으면 가장 가까운 용. 둥지는 그 다음
        const E0 = state.entities;
        const near = (list, range) => list.filter(e => dist(this, e) < range).sort((p, q) => dist(this, p) - dist(this, q))[0] || null;
        const cursor = screenToWorld(mouse.x, mouse.y);
        const pointed = (mouse.inside || mouse.clicked) ? [...E0.npcs, ...E0.babies].filter(e => Math.hypot(e.x - cursor.x, e.y - 50 - cursor.y) < 90)
            .sort((p, q) => Math.hypot(p.x - cursor.x, p.y - cursor.y) - Math.hypot(q.x - cursor.x, q.y - cursor.y))[0] || null : null;
        const target = (pointed && dist(this, pointed) < TALK_RANGE ? pointed : null) || near(E0.npcs, INTERACT_RANGE) || near(E0.babies, 130);
        const isKid = target && E0.babies.includes(target);
        const nestNear = !target && E0.nests[0] && dist(this, E0.nests[0]) < 110 ? E0.nests[0] : null;
        state.talkTarget = target;   // 그릴 때 발밑에 표시한다
        setInteractTarget(target || nestNear, nestNear ? 'Space 둥지에서 쉬기' : isKid ? 'Space 아이와 대화' : 'Space 대화 · L 플러팅');

        // 말 걸기는 [Space]. T 도 그대로 쓸 수 있다.
        // 왼쪽 버튼은 브레스라, 탭으로 말 걸기는 터치 기기에서만 (mouse.inside 가 false)
        const tapped = mouse.clicked && !mouse.inside;
        const wantTalk = input.pressed('confirm') || input.pressed('talk') || (tapped && pointed && pointed === target);
        if (tapped && pointed && pointed !== target) showToast('너무 멀어요. 가까이 가서 말을 거세요.', '💬');
        if (wantTalk && target) { if (isKid) openKidHub(target); else startDialogue(target, 'TALK'); }
        else if (wantTalk && nestNear) openNestMenu();
        if (input.pressed('flirt') && target && !isKid) startDialogue(target, 'FLIRT');

        for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
        updateChannels(this, dt);
        ['FIRE', 'ICE', 'THUNDER'].forEach((el, i) => {
            if (input.pressed('num' + (i + 1)) && this.elements.includes(el)) this.element = el;
        });

        this.fireTimer -= dt;
        // 마우스 왼쪽 버튼(모바일은 [불] 버튼)을 꾹 누르고 있으면 연사.
        // 대화창이 떠 있을 땐 updatePlayer 가 아예 안 돈다
        if ((input.down('attack') || mouse.down) && this.fireTimer <= 0) this.attack();
        for (const slot of SKILL_SLOTS) if (input.pressed('skill' + slot)) useSlot(this, slot);
        if (input.pressed('skillbook')) openSkillBook();
        if (input.pressed('ultimate')) this.useUltimate();
        if (this.beam) this.updateBeam(dt);
        if (input.pressed('interact')) this.interact();
        if (input.pressed('kids')) toggleKidsPanel();
        if (input.pressed('help')) toggleHelp();
        if (input.pressed('journal')) toggleJournal();
        if (input.pressed('mute')) showToast(toggleMute() ? '효과음 끔' : '효과음 켬', '🔊');
    }

    /**
     * 브레스·스킬이 날아갈 방향.
     *  마우스를 쓰는 중이면 커서 쪽이 기준이고, 커서가 적 위에 얹히면 그 적에게 살짝 붙는다.
     *  터치·키보드만 쓸 때는 예전처럼 바라보는 쪽 원뿔 안의 가장 가까운 적을 자동으로 겨눈다.
     */
    aimAngle() {
        const E = state.entities;
        const foes = [...E.enemies, ...E.humans, ...E.bosses];
        if (state.activity && (state.activity.type === 'SPAR' || state.activity.type === 'DUEL')) foes.push(state.activity.npc);
        const sc = this.stage.scale;
        const ox = this.x, oy = this.y - 40 * sc;
        const toward = (e) => ({ angle: Math.atan2(e.y - 20 - oy, e.x - ox), target: e });

        if (mouse.inside) {
            const c = screenToWorld(mouse.x, mouse.y);
            let best = null, bestD = AIM_MAGNET;
            for (const e of foes) {
                if (e.awake === false) continue;
                const d = Math.hypot(e.x - c.x, e.y - 20 - c.y);
                if (d < bestD) { best = e; bestD = d; }
            }
            return best ? toward(best) : { angle: Math.atan2(c.y - oy, c.x - ox), target: null };
        }

        let best = null, bestD = AIM_RANGE;
        for (const e of foes) {
            if (e.awake === false) continue;
            const d = dist(this, e);
            if (d >= bestD) continue;
            let da = Math.atan2(e.y - this.y, e.x - this.x) - this.angle;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) < AIM_CONE || d < 120) { best = e; bestD = d; }
        }
        return best ? toward(best) : { angle: this.angle, target: null };
    }

    /** 0 배부름 · 1 출출함(조금 느려짐) · 2 굶주림(많이 느려짐) */
    get hungerLevel() { return this.hunger < HUNGER_STARVING ? 2 : this.hunger < HUNGER_PECKISH ? 1 : 0; }

    /** 땅을 겨누는 스킬(운석·급강하)이 떨어질 자리. 커서가 적 위면 그 적, 아니면 커서 자리(최대 사거리까지) */
    aimPoint(maxRange) {
        const { angle, target } = this.aimAngle();
        if (target) return { x: target.x, y: target.y };
        if (mouse.inside) {
            const c = screenToWorld(mouse.x, mouse.y);
            const d = Math.hypot(c.x - this.x, c.y - this.y) || 1;
            const k = Math.min(1, maxRange / d);
            return { x: this.x + (c.x - this.x) * k, y: this.y + (c.y - this.y) * k };
        }
        return { x: this.x + Math.cos(angle) * maxRange, y: this.y + Math.sin(angle) * maxRange };
    }

    get damageMult() {
        return this.stage.damage * (1 + 0.08 * (state.upgrades.dmg || 0)) * (hasRelic('OLD_FANG') ? 1.15 : 1) * (this.fury > 0 ? 1.3 : 1);
    }

    attack() {
        const el = ELEMENTS[this.element];
        const st = this.stageIndex;
        const slug = [1, 1.25, 1.5][this.hungerLevel];   // 배가 고프면 숨결이 굼떠진다
        this.fireTimer = (el.rateByStage ? el.rateByStage[st] : el.rate) * (this.fury > 0 ? 0.75 : 1) * slug;
        if (this.animator) this.animator.play('attack');
        const { angle } = this.aimAngle();
        this.facing = facingFromVector(Math.cos(angle), Math.sin(angle), this.facing);
        const pellets = el.pelletsByStage ? el.pelletsByStage[st] : el.pellets;
        for (let i = 0; i < pellets; i++) this.breathe(angle + (i - (pellets - 1) / 2) * el.spread);
        const sc = this.stage.scale;
        spawnEffect('MUZZLE', this.x + Math.cos(angle) * 50 * sc, this.y - 40 * sc + Math.sin(angle) * 50 * sc, { angle: angle + Math.PI / 2, size: 0.5 + sc * 0.3, color: el.color });
        play(el.sound);
    }

    /** 현재 속성의 브레스 한 발 */
    breathe(angle, damageMult = 1) {
        const sc = this.stage.scale;
        const mx = this.x + Math.cos(angle) * MOUTH_OFFSET * sc;
        const my = this.y - 40 * sc + Math.sin(angle) * MOUTH_OFFSET * sc;
        const damage = ELEMENTS[this.element].damage * this.damageMult * weatherDamageMult(this.element) * damageMult;
        const el = ELEMENTS[this.element];
        addBullet(new Projectile(mx, my, angle, { faction: 'ALLY', element: this.element, damage, scale: 0.7 + sc * 0.3, pierce: !!el.pierce && this.stageIndex >= (el.pierceFromStage || 0), fromPlayer: true }));
    }

    /** 필살기: 삼원 융합 브레스. 세 숨결을 하나로 뭉쳐 2.6초 동안 앞을 쓸어버린다 (삼원룡 전용) */
    useUltimate() {
        if (this.stageIndex < 4) return;
        if (this.ult < 100) { showToast(`필살기 게이지 ${Math.floor(this.ult)}% — 적을 맞혀 채우세요.`, '🌈'); return; }
        this.ult = 0;
        this.beam = { time: 2.6, angle: this.aimAngle().angle, tick: 0 };
        this.invuln = Math.max(this.invuln, 0.6);
        spawnEffect('SHOCKWAVE', this.x, this.y, { size: 3.5, color: '#ffffff' });
        shake(14); play('evolve');
    }

    updateBeam(dt) {
        const b = this.beam, E = state.entities;
        b.time -= dt; b.tick -= dt;
        // 빔은 바라보는 쪽으로 천천히 따라 돈다
        let da = this.aimAngle().angle - b.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
        b.angle += Math.max(-1.4 * dt, Math.min(1.4 * dt, da));
        if (b.tick <= 0) {
            b.tick = 0.1;
            const sc = this.stage.scale, ox = this.x, oy = this.y - 40 * sc;
            for (const e of [...E.enemies, ...E.humans, ...E.bosses]) {
                if (e.awake === false) continue;
                const t = Math.max(0, Math.min(950, (e.x - ox) * Math.cos(b.angle) + (e.y - 20 - oy) * Math.sin(b.angle)));
                if (Math.hypot(e.x - (ox + Math.cos(b.angle) * t), e.y - 20 - (oy + Math.sin(b.angle) * t)) > 75 + (e.def && e.def.scale ? 50 : 0)) continue;
                e.takeDamage(9 * this.damageMult);
                applyStatus(e, 'BURN', 3); applyStatus(e, 'SLOW', 2);
                if (Math.random() < 0.3) spawnEffect(pick(['FIRE_HIT', 'ICE_HIT', 'THUNDER_HIT']), e.x, e.y - 20, { size: 0.9 });
            }
            shake(3); play(pick(['flame', 'freeze', 'zap']));
        }
        if (b.time <= 0) this.beam = null;
    }

    /** 가까운 물 타일의 좌표 (없으면 null) */
    nearWater() {
        for (let i = 0; i < 12; i++) {
            const a = this.angle + (i / 12) * Math.PI * 2;
            const x = this.x + Math.cos(a) * 110, y = this.y + Math.sin(a) * 110;
            if (groundAt(x, y) === 'WATER' && getBiome(x, y) !== 'VOLCANO') return { x, y }; // 용암에선 낚시 불가
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

        // 0) 굴 입구·오르내리는 구멍 (systems/delve.js)
        if (!this.fishing && tryDelveInteract()) return;

        // 0) 이동 석비가 곁에 있으면 먼저 (systems/travel.js)
        if (!this.fishing && !this.carrying) {
            const stone = nearbyWaystone();
            if (stone) { openTravelMenu(stone); return; }
        }

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
                play('eat');
                return;
            }
            const baby = E.babies.find(b => dist(this, b) < 80);
            if (baby) { this.inventory.meat--; baby.feed(); return; }
        }

        // 2-1) 그루터기에서 나뭇가지 줍기 (둥지 재료)
        const stump = E.props.find(s => s.type === 'STUMP' && s.ripe && dist(this, s) < 80);
        if (stump && !state.den.built) { stump.gather(); return; }

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
            if (!state.den.built) { showToast("아직 둥지가 없습니다. 아지트에서 [T]로 둥지를 지으세요. (나뭇가지 8, 30G)", "🪹"); return; }
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
            if (e.awake === false || e.type === 'DUMMY') continue;   // 허수아비는 제자의 몫이다
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
            addBullet(new Projectile(this.x, this.y - 40, aim, { faction: 'ALLY', element, damage: (this.config.power || 8) * (state.rally > 0 ? 1.5 : 1) }));
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
    }

    updateWander(dt) {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.wanderTimer = rand(3, 8);
            this.wanderAngle = rand(0, Math.PI * 2);
            this.resting = Math.random() < 0.35; // 가끔 멈춰 서 있기
        }
        // 습격 중엔 마을 용들이 광장으로 모여 함께 막는다 (스승은 수련장을 지킨다)
        if (state.raid.active && this.config.fixed && this.config.role !== 'MASTER' && dist(this, VILLAGE_CENTER) > 300) {
            this.moveBy(VILLAGE_CENTER.x - this.x, VILLAGE_CENTER.y - this.y, 210, dt);
            return;
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
        if (this.beam) {                       // 삼원 융합 브레스: 불·얼음·번개 세 가닥이 꼬인 빛줄기
            const b = this.beam, sc0 = this.stage.scale, ox = this.x, oy = this.y - 40 * sc0, k = Math.min(1, b.time * 3);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            [['#ff7a2a', -1], ['#7fd4ff', 0], ['#ffe27a', 1]].forEach(([color, off], i) => {
                const wob = Math.sin(state.gameTime * 22 + i * 2) * 14;
                const nx = -Math.sin(b.angle), ny = Math.cos(b.angle);
                ctx.strokeStyle = color; ctx.lineWidth = 46 * k; ctx.globalAlpha = 0.5;
                ctx.beginPath(); ctx.moveTo(ox, oy);
                ctx.lineTo(ox + Math.cos(b.angle) * 950 + nx * (off * 30 + wob), oy + Math.sin(b.angle) * 950 + ny * (off * 30 + wob)); ctx.stroke();
            });
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 18 * k; ctx.globalAlpha = 0.95;
            ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(b.angle) * 950, oy + Math.sin(b.angle) * 950); ctx.stroke();
            ctx.restore();
        }
        if (this.fury > 0) drawGlow(ctx, this.x, this.y - 40 * this.stage.scale, 90, '#ff5a3c', 0.35 + Math.sin(state.gameTime * 12) * 0.1);
        if (this.guard > 0) drawGlow(ctx, this.x, this.y - 40 * this.stage.scale, 100, '#cfd8e6', 0.45);
        if (this.channels.some(c => c.id === 'STORM')) drawGlow(ctx, this.x, this.y - 40 * this.stage.scale, 110, '#ffe27a', 0.3);
        ctx.save();
        ctx.translate(this.x, this.y);
        const sc = this.isPlayer ? this.stage.scale : 0.92 * (this.config.scale || 1);
        if (state.talkTarget === this) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + Math.sin(state.gameTime * 6) * 0.3; ctx.beginPath(); ctx.ellipse(0, 0, 46 * sc, 18 * sc, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
        this.drawShadow(ctx, (this.sheet && !this.sheet.flying ? 26 : 34) * sc);
        ctx.restore();

        if (this.animator) {
            const f = this.animator.frame(this.facing);
            if (this.downTimer > 0) ctx.globalAlpha = 0.55;
            drawFrame(ctx, this.sheet, f, this.x, this.y + (this.downTimer > 0 ? 18 : this.hoverY) - this.diveHeight, sc, { t: state.gameTime + this.animPhase, moving: this.moving, attacking: this.animator.name === 'attack' && !this.animator.done });
            ctx.globalAlpha = 1;
            drawAccessory(ctx, this.sheet, this.config.accessory, this.facing, this.x, this.y + this.hoverY - this.diveHeight, sc);
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
        ctx.fillText(this.isPlayer ? (this.config.name || '용') : npcName(this.config.name), 0, 0);
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
