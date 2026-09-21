import { Entity } from './Entity.js';
import { Projectile, addBullet } from './Projectile.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { npcName } from '../data/npcs.js';
import { input, mouse } from '../core/input.js';
import { isOnScreen, screenToWorld, cam } from '../core/camera.js';
import { MAX_KIDS } from '../core/config.js';
import { rand, dist, clamp, pick, roundRect } from '../core/utils.js';
import { IDLE_LINES, NIGHT_LINES, RAIN_LINES } from '../data/dialogues.js';
import { ELEMENTS, STAGES, canFuse } from '../data/elements.js';
import { SKILL_SLOTS, ELEMENT_SKILLS } from '../data/skills.js';
import { useSlot, updateChannels, checkSkillUnlocks, learnSkill } from '../systems/skills.js';
import { stat, hasPerk, grantPoints, POINTS_PER_LEVEL, POINTS_PER_STAGE } from '../systems/growth.js';
import { openNestMenu, pendingTrial } from '../systems/story.js';
import { applyStatus } from '../systems/status.js';
import { notify, questMarker } from '../systems/quests.js';
import { weatherDamageMult } from '../systems/weather.js';
import { updateActivityNpc } from '../systems/npcActions.js';
import { NPC_TALK } from '../data/npcTalk.js';
import { spawnText, spawnBolt } from '../render/vfx.js';
import { hitStop, flash } from '../render/feedback.js';
import { flowDamageMult, flowRateMult, flowCooldownRate, onPlayerHurt, tryPerfectDodge, tryBite, momentumTier, TIER_COLORS } from '../systems/flow.js';
import { addHazard } from './Hazard.js';
import { noteTaken } from '../render/debugOverlay.js';
import { shake, kick } from '../core/camera.js';
import { hasRelic, resonates } from '../systems/relics.js';
import { play, toggleMute } from '../systems/audio.js';
import { toggleJournal } from '../ui/journal.js';
import { openKidHub } from '../systems/kidActions.js';
import { getDragonSheet } from '../render/dragonSprites.js';
import { Animator, drawFrame, averageColor } from '../render/spritesheet.js';
import { crisp } from '../render/overlay.js';
import { rgbToHsl, hslToRgb } from '../render/tint.js';
import { drawIcon, drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { setInteractTarget, toggleHelp, toggleUi } from '../ui/hud.js';
import { groundAt, currentMapBounds, activeBiome } from '../world/terrain.js';
import { DENS } from '../data/dens.js';
import { slideMove, solidAt } from '../world/collision.js';
import { nearbyWaystone, openTravelMenu } from '../systems/travel.js';
import { openChoreBoard } from '../systems/chores.js';
import { tryDelveInteract } from '../systems/delve.js';
import { tryDenInteract } from '../systems/denEnter.js';
import { nearbyArena, openArena } from '../systems/arena.js';
import { inMyDen } from '../systems/den.js';
import { reviveInVillage } from '../systems/world.js';
import { markTutorial } from '../systems/tutorial.js';
import { inCutscene } from '../systems/cutscene.js';

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
const ADULT_STAGE = STAGES.findIndex(s => s.id === 'ADULT');   // 이 단계부터 제 알을 품을 수 있다
const MOUTH_OFFSET = 40; // 화염구가 생성되는 위치(발 기준점에서 바라보는 방향으로)

/**
 * 발 기준점에서 그림 꼭대기까지의 높이(px). 이름표와 체력바를 머리 바로 위에 붙이는 데 쓴다.
 * box(칸 안에서 그림이 실제로 차지하는 자리, data/sprites.js)가 있으면 그 값을 쓴다 — 체구가
 * 작은 용은 칸 위쪽이 통째로 비어 있어서, 칸 높이로 재면 이름표가 허공에 떠 버린다.
 */
export function headTop(sheet, scale = 1) {
    if (!sheet) return 90;
    return (sheet.fh * sheet.anchor.y - (sheet.box ? sheet.box.y : 0)) * sheet.scale * scale;
}

/**
 * 흰 바탕 기본 말풍선. 몸통(x,y,w,h)과 아래를 가리키는 꼬리를 한 붓으로 채운다.
 * tailY 는 꼬리가 나오는 높이 — 말풍선 아래쪽 변과 같게 준다.
 */
export function bubble(ctx, x, y, w, h, tailY) {
    const r = 9;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.moveTo(-7, tailY - 1); ctx.lineTo(7, tailY - 1); ctx.lineTo(0, tailY + 8);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.restore();
}

/** 머리 위 장신구. accessory: render/pixel.js 의 아이콘 이름 */
export function drawAccessory(ctx, sheet, accessory, facing, x, y, scale) {
    if (!accessory || !sheet.head) return;
    if (sheet.procedural && (facing === 'up' || facing === 'down')) return;   // 좌우 그림만 있는 외형은 어느 쪽을 보는지 여기선 알 수 없다
    const s = sheet.scale * scale, [hx, hy] = sheet.head[facing];
    const b = sheet.box || { x: 0, y: 0, w: sheet.fw, h: sheet.fh };          // head 비율은 칸이 아니라 용 몸을 기준으로 읽는다
    const left = x - sheet.fw * s * sheet.anchor.x, top = y - sheet.fh * s * sheet.anchor.y;
    drawIcon(ctx, accessory, left + (b.x + b.w * hx) * s, top + (b.y + b.h * hy) * s, Math.max(2, Math.round(3 * scale)));
}

// 지금 보고 있는 축(가로/세로)을 조금 우대한다. 정확히 대각선으로 움직일 때
// |dx| 와 |dy| 가 엎치락뒤치락하면서 매 프레임 방향이 갈리던 것을 막는다
const FACE_BIAS = 1.2;

/** 어떤 색의 '진한 형제' 색. 색조는 그대로 두고 채도를 올리고 밝기를 낮춘다 (테두리용) */
function deepen([r0, g0, b0], l, s, alpha) {
    const [h, s0] = rgbToHsl(r0, g0, b0);
    const [r, g, b] = hslToRgb(h, Math.max(s, s0 * 0.8), l);
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

/**
 * 그 용이 실제로 띠는 색에서 뽑은 테두리. 용마다 한 번만 계산한다 (f: 지금 그리는 칸)
 *
 * 색조는 그 용의 것을 따르되 밝기는 충분히 낮춰야 한다. 예전엔 제 색을 조금만
 * 어둡게 했더니, 초록 용(그론)은 초록 풀밭 위에서 테두리까지 풀색이라 윤곽이
 * 아예 사라져 반투명한 것처럼 보였다. 파란 용·분홍 용만 멀쩡했던 것도 그래서다.
 * 테두리는 용을 배경에서 떼어 놓으라고 있는 것이니 배경과 같은 밝기면 안 된다.
 */
export function outlineFor(f, isPlayer) {
    const rgb = averageColor(f.img, f.sx, f.sy, f.sw, f.sh);
    return isPlayer
        ? { color: deepen(rgb, 0.14, 0.7, 0.95), width: 2.2 }
        : { color: deepen(rgb, 0.10, 0.45, 0.92), width: 2 };
}

/** 이동 벡터 → 4방향. fallback 은 지금 보고 있는 방향 */
export function facingFromVector(dx, dy, fallback = 'down') {
    if (!dx && !dy) return fallback;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    const wasHoriz = fallback === 'left' || fallback === 'right';
    const horiz = wasHoriz ? ax * FACE_BIAS >= ay : ax >= ay * FACE_BIAS;
    if (horiz) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
}

// 안내문의 키 이름. 터치 기기에서는 키가 없으니 '탭'
const TAP = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? '탭' : 'Space';

/** 플레이어와 NPC 공용. config: { name, species, colors:{body,belly,wing}, personality?, role?, canPartner? } */
export class Dragon extends Entity {
    constructor(x, y, config, isPlayer = false) {
        super(x, y);
        this.isPlayer = isPlayer;
        this.config = config;
        this.species = config.species || 'WESTERN'; // WESTERN | WYVERN | HYDRA | BEHEMOTH | BONE
        this.colors = { ...config.colors };

        // 성장은 느긋하게: 예전(150, ×1.45)엔 둘째 날이면 어린 용이 됐다. 초반 레벨이 1.5배쯤 더 든다
        this.level = 1; this.xp = 0; this.maxXp = 240;
        this.hp = 80; this.maxHp = 80; this.hunger = 100;
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
        this.cdMax = {};                        // 스킬 id → 그때 걸린 전체 대기 시간 (HUD 의 대기 표시용)
        this.gale = 0;        // 성장 트리 '질풍': 대시 뒤 연사가 빨라지는 남은 시간
        this.channels = [];                     // 진행 중인 스킬 (systems/skills.js)
        this.guard = 0;       // 강철 비늘 남은 시간
        this.ult = 0;         // 필살기 게이지 0~100 (숨결이 셋 모이면 찬다)
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
        let levels = 0;
        while (this.xp >= this.maxXp) {   // 퀘스트 보상처럼 한 번에 여러 레벨이 오를 수 있다
            this.level++;
            levels++;
            this.xp -= this.maxXp;
            this.maxXp = Math.floor(this.maxXp * 1.38);
            this.maxHp += 12;
        }
        this.hp = this.maxHp;
        if (!this.isPlayer) return;
        grantPoints(levels * POINTS_PER_LEVEL, `레벨 ${this.level} 달성`);
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
        this.maxHp += 30;
        this.hp = this.maxHp;
        grantPoints(POINTS_PER_STAGE, `${this.stage.name}(으)로 진화`);
        showToast(`진화! [${this.stage.name}](이)가 되었습니다` + (this.stage.unlock ? `. ${this.stage.unlock}` : ''), '🐲');
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
        showToast(`새 숨결 [${ELEMENTS[id].name}] 획득! ${ELEMENTS[id].desc} ([${ELEMENTS[id].key}]번 키)`, '✨');
        if (this.isPlayer && ELEMENT_SKILLS[id]) learnSkill(ELEMENT_SKILLS[id]);   // 맡겨 받은 숨결은 기술도 같이 온다
        // 숨결이 셋이 되는 순간 필살기가 열린다
        if (this.elements.length === 3) showToast('품은 숨결이 셋이 되었다. 적을 맞혀 게이지를 채우면 [X]로 융합 브레스를 쓸 수 있다.', '🌈');
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
        if (this.isPlayer) dmg *= 1 - Math.min(0.6, stat('armor'));   // 성장 트리 '단단한 등'
        if (this.isPlayer && hasRelic('GRON_PLATE')) dmg *= 0.85;
        if (this.isPlayer) dmg *= 1 - Math.min(0.2, 0.04 * (state.upgrades.def || 0));   // 대장간 '비늘돌 박기'
        if (this.isPlayer && hasRelic('GLASS_FANG')) dmg *= 1.3;
        if (this.isPlayer && resonates('scale')) dmg *= 0.92;
        if (this.isPlayer && dmg >= 3) {
            onPlayerHurt();   // 기세가 꺾인다 (systems/flow.js)
            if (hasRelic('THORN_SHELL')) {   // 맞은 만큼 둘레에 되돌려 주고 밀어낸다
                for (const e of [...state.entities.enemies, ...state.entities.humans]) {
                    if (e.remove || dist(e, this) > 150) continue;
                    e.takeDamage(dmg * 1.5 + 6, false, this);
                }
                spawnEffect('SHOCKWAVE', this.x, this.y - 20, { size: 1.2, color: '#9fe07a' });
            }
        }
        const wasSafe = this.isPlayer && this.hp > this.maxHp * 0.2;
        if (this.isPlayer) noteTaken(dmg);
        this.hp -= dmg;
        // 위기를 몇 번 넘겼는지는 '허물 벗기'를 스스로 깨우치는 조건이 된다
        if (wasSafe && this.hp > 0 && this.hp <= this.maxHp * 0.2) state.stats.brinks = (state.stats.brinks || 0) + 1;
        burst(this.x, this.y - 40, '#e74c3c', 0.8, 5);
        if (this.isPlayer && dmg >= 3) {
            play('hurt');
            shake(Math.min(14, 4 + dmg * 0.45));
            hitStop(0.07);                                   // 맞은 순간 세상이 잠깐 멈춘다
            flash(Math.min(0.85, 0.3 + dmg / 40));           // 화면이 붉게 번쩍
            this.hurtFlash = 0.35;                           // 몸이 붉게 물든다
            spawnEffect('SPARK', this.x, this.y - 44 * this.stage.scale, { size: 1.2, color: '#ff6b5e' });
            spawnText(this.x, this.y - 90 * this.stage.scale, `-${Math.round(dmg)}`, '#ff6b5e', 18);
        }
        if (this.animator) this.animator.play('hit');
        if (this.hp <= 0 && !this.isPlayer) {           // 마을 용은 죽지 않고 잠시 쓰러진다
            this.hp = 0;
            this.downTimer = 25;
            const talk = NPC_TALK[this.config.name];
            this.say(talk ? talk.down : '으윽…');
            if (this.config.fixed) showToast(`${npcName(this.config.name)}(이)가 쓰러졌습니다! 잠시 후 일어납니다.`, '💫');
        }
        if (this.hp <= 0 && this.isPlayer) {
            // 성장 트리 '불사의 심장': 하루 한 번은 쓰러지지 않고 버틴다
            // 유물 '마지막 불씨': 하루 한 번, 쓰러질 일격을 버티고 둘레를 불태운다
            if (hasRelic('LAST_EMBER') && state.emberDay !== state.day) {
                state.emberDay = state.day;
                this.hp = 1;
                this.invuln = 3;
                addHazard(this.x, this.y, { faction: 'ALLY', r: 220, delay: 0.1, linger: 0, damage: 60 * this.damageMult, color: '#ff7a2a', effect: 'FIRE_HIT', effectSize: 2.4, sound: 'boom', shake: 10, status: { type: 'BURN', duration: 4 } });
                showToast('마지막 불씨가 타올랐다! 체력 1로 버텼습니다 (하루 한 번)', '🔥');
                return;
            }
            if (hasPerk('UNDYING') && state.revivedDay !== state.day) {
                state.revivedDay = state.day;
                this.hp = 1;
                this.invuln = 3;
                spawnEffect('AURA', this.x, this.y - 40, { size: 2.4, color: '#ffd84a' });
                showToast('불사의 심장이 뛴다! 체력 1로 버텼습니다 (하루 한 번)', '💛');
                play('evolve');
                return;
            }
            showToast("쓰러졌습니다... 마을에서 눈을 뜹니다.", "💀");
            this.hp = this.maxHp;
            this.hunger = Math.max(this.hunger, 40);
            reviveInVillage();
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
        // 날아오르는 중이면 몸이 천천히 떠오르고, 내려앉으면 내려온다 (그리기는 전부 hoverY 를 쓴다)
        if (this.isPlayer) {
            const want = this.flying ? -(38 + Math.sin(state.gameTime * 2.4) * 7) * this.stage.scale : 0;
            this.flyLift = (this.flyLift || 0) + (want - (this.flyLift || 0)) * Math.min(1, dt * 5);
            this.hoverY += this.flyLift;
        }

        this.moving = false;
        if (this.hurtFlash > 0) this.hurtFlash -= dt;
        if (this.isPlayer) this.updatePlayer(dt);
        else this.updateNpc(dt);

        const b = currentMapBounds();
        this.x = clamp(this.x, 40, b.w - 40);
        this.y = clamp(this.y, 40, b.h - 40);

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
        if (this.flying) { this.x += dx * speed * dt; this.y += dy * speed * dt; }   // 하늘에는 벽이 없다
        else slideMove(this, this.x + dx * speed * dt, this.y + dy * speed * dt, 20);
        this.angle = Math.atan2(dy, dx);
        this.facing = facingFromVector(dx, dy, this.facing);
        this.moving = true;
    }

    // ---------- 비행 ----------
    /** 성체부터 난다. 하늘에서는 벽도 물도 없고 땅의 적이 못 치지만, 배가 세 배로 꺼진다 */
    toggleFlight() {
        if (this.flying) { if (this.canLand()) this.land(); else showToast('여기엔 내려앉을 수 없다.', '☁️'); return; }
        if (this.stageIndex < 2) { showToast('아직 날개가 몸을 못 든다. 성체가 되면 난다.', '🪽'); return; }
        if (state.dungeon || state.indoors || DENS[state.mapId]) { showToast('천장이 있다. 밖에서 날자.', '🪽'); return; }
        if (this.fishing || state.activity) return;
        this.flying = true;
        this.invuln = Math.max(this.invuln, 0.3);
        spawnEffect('PUFF', this.x, this.y - 6, { size: 1.4 });
        play('dash');
        showToast('날아오른다. 같은 키로 내려앉는다.', '🪽');
    }
    /** 발밑이 땅이고 비어 있어야 내려앉는다 */
    canLand() { return !solidAt(this.x, this.y, 20); }
    land(msg) {
        this.flying = false;
        spawnEffect('PUFF', this.x, this.y - 6, { size: 1.2 });
        play('dash');
        if (msg) showToast(msg, '🪽');
    }

    // ---------- 플레이어 ----------
    updatePlayer(dt) {
        if (state.prologue) { this.moving = false; return; }   // 떨어지던 밤엔 아직 내 몸이 아니다
        const { dx, dy } = input.axis();
        if (this.fishing) this.updateFishing(dt, dx || dy);
        this.feast = (this.feast || 0) - dt;
        this.dashCd -= dt; this.invuln -= dt; this.fury -= dt; this.guard -= dt; this.slowTimer -= dt; this.gale -= dt;
        const baseSpeed = WALK_SPEED * this.stage.speed * (1 + 0.04 * (state.upgrades.spd || 0)) * (1 + stat('speed')) * (hasRelic('WIND_FEATHER') ? 1.08 : 1)
            * (this.slowTimer > 0 ? 0.55 : 1) * [1, 0.86, 0.7][this.hungerLevel];
        const locked = this.channels.some(c => c.lock);   // 급강하 중엔 조작 불가
        // Shift 를 탁 누르면 대시(잠깐 무적), 계속 누르고 있으면 달리기
        if (locked) { /* 스킬이 몸을 움직이는 중 */ }
        else if (input.pressed('sprint') && (dx || dy) && this.dashCd <= 0) {
            const len = Math.hypot(dx, dy);
            this.dashDir = { x: dx / len, y: dy / len };
            this.dashTime = DASH_TIME; this.dashCd = DASH_COOLDOWN * (1 - Math.min(0.6, stat('dash'))); this.invuln = DASH_TIME + 0.12;
            this.dashEdge = false; this.dashTrail = 0;
            if (resonates('wing')) this.dashCd *= 0.75;
            if (hasPerk('GALE')) this.gale = 3;   // 성장 트리 '질풍'
            play('dash');
            spawnEffect('PUFF', this.x, this.y - 6);
        }
        if (locked) { /* no-op */ }
        else if (this.dashTime > 0) {
            if (this.dashTime > DASH_TIME - 0.16) tryPerfectDodge(this);   // 대시 첫머리에 스친 것만 간발로 친다 (systems/flow.js)
            this.dashTime -= dt;
            this.moveBy(this.dashDir.x, this.dashDir.y, baseSpeed * DASH_MULT, dt);
            tryBite(this);
            // 유물 '불씨 발자국': 대시가 지나간 자리에 불길이 남는다
            this.dashTrail -= dt;
            if (hasRelic('EMBER_TRAIL') && this.dashTrail <= 0) {
                this.dashTrail = 0.06;
                addHazard(this.x, this.y, { faction: 'ALLY', r: 60, delay: 0.05, linger: 2.2, damage: 4 * this.damageMult, dps: 9 * this.damageMult, color: '#ff7a2a', effect: 'FLAMES', effectSize: 0.9, status: { type: 'BURN', duration: 2 } });
            }
            burst(this.x, this.y - 30 * this.stage.scale, this.colors.body, 0.35);
        } else if (dx || dy) {
            this.moveBy(dx, dy, baseSpeed * (input.down('sprint') ? SPRINT_MULT : 1) * (this.flying ? 1.45 : 1), dt);
            this.hunger -= 0.35 * dt * this.hungerMult * (this.flying ? 3 : 1);   // 나는 건 배가 빨리 꺼진다
            markTutorial('moved');
        } else {
            this.hunger -= 0.08 * dt * this.hungerMult * (this.flying ? 3 : 1);
        }
        if (input.pressed('fly')) this.toggleFlight();
        if (this.flying && this.hunger <= 0 && this.canLand()) this.land('배가 꺼져서 내려앉았다.');
        if (hasRelic('LIFE_STONE')) this.hp = Math.min(this.maxHp, this.hp + 1.5 * dt);
        if (hasRelic('VOW_RING') && state.partner && state.partner.state !== 'WANDER' && dist(this, state.partner) < 420) this.hp = Math.min(this.maxHp, this.hp + 2 * dt);
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
        // 굴 입구·굴 안은 [E] 로
        const mouth = !target && !nestNear ? E0.props.find(x => x.type === 'DEN_MOUTH' && dist(this, x) < 120) : null;
        // 이동 석비 (systems/travel.js). 마을 광장처럼 용이 북적이는 곳에서는 말 걸 상대가 늘 먼저
        // 잡혀 석비를 쓸 수가 없었다. 상대보다 가까이 서 있으면 석비가 먼저다
        const stone = !this.flying && !this.fishing && !this.carrying ? nearbyWaystone() : null;
        const stoneFirst = !!stone && !nestNear && (!target || dist(this, stone) < 95 || dist(this, stone) < dist(this, target));
        // 눈앞의 것이 먼저다. 굴 꾸미기 안내가 둥지·상대를 가리면 안 된다
        if (nestNear) setInteractTarget(nestNear, inMyDen() ? 'Space · E 둥지에서 잔다' : 'Space 둥지에서 쉬기');
        else if (stoneFirst) setInteractTarget(stone, `${TAP} 석비로 건너뛴다`);
        else if (target) setInteractTarget(target, `${TAP} ${isKid ? '아이와 대화' : '대화'}`);
        else if (mouth) setInteractTarget(mouth, mouth.denId === 'DEN_MINE' ? 'E 내 굴에 들어간다 (둥지)' : 'E 굴에 들어간다');
        else if (inMyDen()) setInteractTarget(this, 'E 굴 꾸미기');
        else setInteractTarget(null);

        // 말 걸기는 [Space]. T 도 그대로 쓸 수 있다.
        // 왼쪽 버튼은 브레스라, 탭으로 말 걸기는 터치 기기에서만 (mouse.inside 가 false)
        const tapped = mouse.clicked && !mouse.inside;
        const wantTalk = !this.flying && (input.pressed('confirm') || input.pressed('talk') || (tapped && pointed && pointed === target));
        if (tapped && pointed && pointed !== target) showToast('너무 멀어요. 가까이 가서 말을 거세요.', '💬');
        if (wantTalk && stoneFirst) openTravelMenu(stone);
        else if (wantTalk && target) { if (isKid) openKidHub(target); else startDialogue(target, 'TALK'); }
        else if (wantTalk && nestNear) openNestMenu();
        else if (input.pressed('confirm') && !this.flying) this.interact();   // 말 걸 상대가 없으면 눈앞의 것을 집는다

        for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt * flowCooldownRate());   // 기세가 절정이면 기술이 빨리 돌아온다
        updateChannels(this, dt);
        Object.keys(ELEMENTS).forEach((el, i) => {
            if (input.pressed('num' + (i + 1)) && this.elements.includes(el)) this.element = el;
        });

        this.fireTimer -= dt;
        // 마우스 왼쪽 버튼(모바일은 [불] 버튼)을 꾹 누르고 있으면 연사.
        // 대화창이 떠 있을 땐 updatePlayer 가 아예 안 돈다
        if ((input.down('attack') || mouse.down) && this.fireTimer <= 0) this.attack();
        for (const slot of SKILL_SLOTS) if (input.pressed('skill' + slot)) useSlot(this, slot);
        if (input.pressed('ultimate')) this.useUltimate();
        if (this.beam) this.updateBeam(dt);
        if (input.pressed('interact')) this.interact();
        if (input.pressed('eat')) this.eat();
        if (input.pressed('kids')) toggleKidsPanel();
        if (input.pressed('help')) toggleHelp();
        if (input.pressed('hideUi')) toggleUi();
        if (input.pressed('journal')) toggleJournal();
        if (input.pressed('skillbook')) toggleJournal('skills');   // 스킬 나무
        if (input.pressed('growthTab')) toggleJournal('growth');   // 성장 나무
        if (input.pressed('worldmap')) toggleJournal('map');       // 지도
        if (input.pressed('inventory')) toggleJournal('bag');      // 소지품
        if (input.pressed('mute')) showToast(toggleMute() ? '소리 끔' : '소리 켬', '🔊');

        // 보는 방향은 프레임 끝에 딱 한 번, 아래 순서대로 정한다.
        //   1) 쏘는 중이면 겨눈 쪽   — 숨결이 엉뚱한 쪽에서 나가지 않게
        //   2) 걷는 중이면 가는 쪽   — 방향키로도 자연스럽게 몸을 튼다
        //   3) 가만히 서 있으면 커서 쪽
        // '쏘는 중'은 버튼을 누르고 있는 동안 계속 참이라 한 번 정해지면 흔들리지 않는다.
        // 예전엔 moveBy 가 매 프레임 '가는 쪽'으로, attack 이 쏠 때마다 '겨눈 쪽'으로 따로 돌려놔서
        // 왼쪽으로 달리며 오른쪽을 쏘면 스프라이트가 좌우로 튀었다
        if (!locked) {
            const firing = input.down('attack') || mouse.down;
            const look = firing ? this.aimAngle().angle
                : (dx || dy) ? Math.atan2(dy, dx)
                : mouse.inside ? this.aimAngle().angle : null;
            if (look !== null) this.facing = facingFromVector(Math.cos(look), Math.sin(look), this.facing);
        }

        // 스스로 깨우치는 스킬·각성은 1초에 한 번만 살펴본다
        this.unlockTimer = (this.unlockTimer || 0) - dt;
        if (this.unlockTimer <= 0) { this.unlockTimer = 1; checkSkillUnlocks(); }
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

    /** 허기가 주는 속도. 유물 '무쇠 위장'과 성장 트리 '무쇠 위장'이 함께 줄여 준다 */
    get hungerMult() { return (hasRelic('IRON_STOMACH') ? 0.5 : 1) * (1 - Math.min(0.6, stat('hunger'))); }

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
        const scorn = hasPerk('SCORN') && this.hp <= this.maxHp * 0.35 ? 1.45 : 1;   // 성장 트리 '역린'
        return this.stage.damage * (1 + 0.08 * (state.upgrades.dmg || 0)) * (1 + stat('dmg')) * scorn
            * (hasRelic('OLD_FANG') ? 1.15 : 1) * (this.fury > 0 ? 1.3 : 1)
            * (this.isPlayer ? flowDamageMult() * (hasRelic('GLASS_FANG') ? 1.4 : 1) * (this.feast > 0 ? 1.25 : 1) : 1);
    }

    attack() {
        const el = ELEMENTS[this.element];
        const st = this.stageIndex;
        const slug = [1, 1.25, 1.5][this.hungerLevel];   // 배가 고프면 숨결이 굼떠진다
        this.fireTimer = (el.rateByStage ? el.rateByStage[st] : el.rate) * (this.fury > 0 ? 0.75 : 1) * slug * (this.gale > 0 ? 0.65 : 1) * flowRateMult();
        if (this.animator) this.animator.play('attack');
        const { angle } = this.aimAngle();
        const pellets = el.pelletsByStage ? el.pelletsByStage[st] : el.pellets;
        for (let i = 0; i < pellets; i++) this.breathe(angle + (i - (pellets - 1) / 2) * el.spread);
        const sc = this.stage.scale;
        spawnEffect('MUZZLE', this.x + Math.cos(angle) * 50 * sc, this.y - 40 * sc + Math.sin(angle) * 50 * sc, { angle: angle + Math.PI / 2, size: 0.7 + sc * 0.4, color: el.color });
        kick(angle, el.pellets > 1 ? 3.5 : 2);   // 쏘는 반대쪽으로 화면이 살짝 밀린다
        play(el.sound);
    }

    /** 현재 속성의 브레스 한 발 */
    breathe(angle, damageMult = 1) {
        const sc = this.stage.scale;
        const mx = this.x + Math.cos(angle) * MOUTH_OFFSET * sc;
        const my = this.y - 40 * sc + Math.sin(angle) * MOUTH_OFFSET * sc;
        const breathBonus = this.isPlayer ? 1 + stat('breath') : 1;   // 성장 트리 '타오르는 목'
        const damage = ELEMENTS[this.element].damage * this.damageMult * breathBonus * weatherDamageMult(this.element) * damageMult;
        const el = ELEMENTS[this.element];
        addBullet(new Projectile(mx, my, angle, { faction: 'ALLY', element: this.element, damage, scale: 0.7 + sc * 0.3, pierce: !!el.pierce && this.stageIndex >= (el.pierceFromStage || 0), fromPlayer: true }));
    }

    /** 필살기: 삼원 융합 브레스. 세 숨결을 하나로 뭉쳐 2.6초 동안 앞을 쓸어버린다 (삼원룡 전용) */
    useUltimate() {
        if (!canFuse(this)) return;
        if (this.ult < 100) { showToast(`필살기 게이지 ${Math.floor(this.ult)}%. 적을 맞혀 채우세요.`, '🌈'); return; }
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
            if (groundAt(x, y) === 'WATER' && activeBiome() !== 'VOLCANO') return { x, y }; // 용암에선 낚시 불가
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

    /**
     * 들고 있는 알을 곁의 둥지에 놓는다. 놓았거나 못 놓는 까닭을 알렸으면 true.
     * 둥지는 내 굴 안에만 있으므로, 곁에 없으면 아무 일도 없던 것처럼 false 를 돌려주어
     * [E] 가 원래 하던 일(굴 꾸미기 · 줍기 · 낚시)로 넘어가게 한다.
     */
    putEggInNest() {
        const nest = state.entities.nests.find(n => dist(this, n) < 110);
        if (!nest) return false;
        if (!state.den.built) { showToast('아직 둥지가 없습니다. 둥지 앞에서 [E]로 먼저 지으세요. (나뭇가지 8, 30G)', '🪹'); return true; }
        if (nest.hasEgg) { showToast('둥지에 이미 알이 있습니다.', '🥚'); return true; }
        if (state.kids.length >= MAX_KIDS) { showToast('둥지가 꽉 찼습니다! 더 이상 알을 둘 수 없어요.', '😅'); return true; }
        // 제 알을 품으려면 다 자라야 한다. 아직 어리면 엘더에게 맡기는 길이 있다 (systems/npcActions.js)
        if (this.stageIndex < ADULT_STAGE) { showToast('아직 알을 품을 몸이 아닙니다. 엘더에게 맡겨 보세요.', '🥚'); return true; }
        this.carrying = null;
        nest.layEgg(this, state.partner);
        showToast('알을 둥지에 안착시켰습니다. 곁에 있어 주면 빨리 자랍니다.', '🏠');
        return true;
    }

    interact() {
        const E = state.entities;

        // 0) 알을 들고 둥지 앞에 섰으면 놓는 것이 먼저다.
        //    내 굴 안에서는 아래 tryDenInteract 가 [E] 를 늘 채 가기 때문에(둥지 곁이면 잠자기,
        //    아니면 꾸미기), 예전에 여기 아래쪽에 있던 '알을 둥지에 놓기' 에는 닿을 수가 없었다.
        //    알을 주워도 내려놓을 길이 없어 영영 들고 다니게 됐다.
        if (!this.fishing && this.carrying === 'EGG' && this.putEggInNest()) return;

        // 0) 수련장 시험 표지 (systems/arena.js)
        if (!this.fishing && nearbyArena()) { openArena(); return; }

        // 0) 보금자리 굴 — 들어가기 / 안에서는 꾸미기 (systems/denEnter.js)
        if (!this.fishing && tryDenInteract()) return;

        // 0) 굴 입구·오르내리는 구멍 (systems/delve.js)
        if (!this.fishing && tryDelveInteract()) return;

        // 0) 이동 석비가 곁에 있으면 먼저 (systems/travel.js)
        if (!this.fishing && !this.carrying) {
            const stone = nearbyWaystone();
            if (stone) { openTravelMenu(stone); return; }
        }

        // 0) 마을 게시판 — 숫자를 채우는 일거리는 여기에만 붙는다 (systems/chores.js)
        if (!this.fishing && !this.carrying) {
            const board = E.props.find(b => b.type === 'BOARD' && dist(this, b) < 90);
            if (board) { openChoreBoard(); return; }
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

        // 2-1) 그루터기에서 나뭇가지 줍기 (둥지 재료)
        const stump = E.props.find(s => s.type === 'STUMP' && s.ripe && dist(this, s) < 80);
        if (stump && !state.den.built) { stump.gather(); return; }

        // 3) 열매 따기
        const berry = E.props.find(b => b.type === 'BERRY' && b.ripe && dist(this, b) < 80);
        if (berry && this.hunger < 95) { berry.harvest(); return; }

        // 3-0) 보물상자 열기
        const chest = E.props.find(c => c.type === 'CHEST' && !c.opened && dist(this, c) < 80);
        if (chest) { chest.open(); return; }

        // 3-1) 아기 쓰다듬기 (고기를 먹이는 건 아이 대화창에서)
        const kid = E.babies.find(b => dist(this, b) < 80);
        if (kid && !this.carrying && kid.pet()) return;

        // 5) 물가라면 낚시
        const water = !this.carrying && this.nearWater();
        if (water) {
            this.fishing = { x: water.x, y: water.y, wait: rand(1.5, 4.5), bite: 0 };
            showToast('낚싯줄을 드리웠습니다. 찌가 흔들릴 때 [Space]!', '🎣');
        }
    }

    /** [C] 고기를 먹는다. 상호작용과 섞어 두면 상자를 열려다 고기가 먹힌다 */
    eat() {
        if (this.inventory.meat <= 0) { showToast('가진 고기가 없습니다.', '🍖'); return; }
        if (this.hunger >= 95) { showToast('배가 너무 불러요!', '✋'); return; }
        this.inventory.meat--;
        this.hunger = Math.min(100, this.hunger + 40);
        this.hp = Math.min(this.maxHp, this.hp + 30);
        markTutorial('ate');
        spawnText(this.x, this.y - 90 * this.stage.scale, '+40', '#9fe08a', 15);
        if (hasRelic('GREEDY_MAW')) { this.feast = 12; spawnText(this.x, this.y - 112 * this.stage.scale, '포식!', '#ffb347', 15); }
        showToast('고기를 먹었습니다.', '😋');
        play('eat');
    }

    // ---------- NPC ----------
    updateNpc(dt) {
        this.chatTimer -= dt;
        if (this.chatTimer <= 0) {
            this.say(this.idleLine());
            this.chatTimer = rand(14, 32);
        }

        if (state.activity && state.activity.npc === this) { updateActivityNpc(this, dt); return; }
        if (state.activity && state.activity.rival === this) return;   // 허수아비 내기 중인 맞수 (systems/story.js 가 움직인다)

        if (this.downTimer > 0) {               // 쓰러져 쉬는 중
            this.downTimer -= dt;
            if (this.downTimer <= 0) { this.hp = this.maxHp; this.say('다시 싸울 수 있어!'); }
            return;
        }
        if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 4 * dt);

        if (this.walkTo) { this.facing = facingFromVector(this.walkTo.x - this.x, this.walkTo.y - this.y, this.facing); return; }   // 일과대로 걸어가는 중 (systems/routine.js 가 옮긴다)
        const following = this.state !== 'WANDER';
        const busy = (this.config.fixed || following) && this.fight(dt, following);
        if (following) this.updatePartner(dt, busy);
        else if (!busy) this.updateWander(dt);
    }

    /**
     * 혼잣말 한 줄. 성격만 보고 고르면 네댓 줄이 돌아 금방 외워진다.
     * 때(밤·비)와 지금 하는 일(systems/routine.js 의 doing)을 섞어 고른다.
     */
    idleLine() {
        const night = state.dayTime < 0.22 || state.dayTime > 0.82;
        const wet = state.weather.type === 'RAIN' || state.weather.type === 'SNOW';
        const r = Math.random();
        // 지금 하는 일을 흘리듯 말한다 — 이게 있어야 "저 용이 뭘 하는 중"이 읽힌다
        if (this.doing && r < 0.3) return `(${this.doing}.)`;
        if (wet && r < 0.5) return pick(RAIN_LINES);
        if (night && r < 0.55) return pick(NIGHT_LINES);
        const lines = IDLE_LINES[this.config.personality];
        return lines && lines.length ? pick(lines) : '…';
    }

    /** 마을 용·짝·동료의 전투. 싸우는 중이면 true */
    fight(dt, following) {
        const E = state.entities;
        if (this.passive) return false;   // 오늘은 구경만 하기로 한 스승 (systems/training.js)
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
            addBullet(new Projectile(this.x, this.y - 40, aim, { faction: 'ALLY', element, damage: (this.config.power || 8) * (state.rally > 0 ? 1.5 : 1) * (hasRelic('TWIN_SOUL') && (this === state.partner || this === state.companion) ? 1.5 : 1) * (hasRelic('VOW_RING') && this === state.partner ? 1.3 : 1) }));
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
            // 싸우는 중이라면 몸은 플레이어를 쫓아가도 얼굴은 적에게 둔다 (fight 가 정해 둔 방향).
            // 그러지 않으면 따라붙는 거리 경계를 넘나들 때마다 적 쪽과 플레이어 쪽으로 번갈아 돌아본다
            const look = fighting ? this.facing : null;
            this.moveBy(player.x - this.x, player.y - this.y, 240, dt);
            if (look) this.facing = look;
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
        const plaza = state.raid.active ? { x: this.homeX, y: this.homeY } : null;
        if (plaza && this.config.fixed && this.config.role !== 'MASTER' && dist(this, plaza) > 320) {
            this.moveBy(plaza.x - this.x, plaza.y - this.y, 210, dt);
            return;
        }
        if (this.resting) return;
        // 집에서 너무 멀어지면 돌아온다. 한 번 돌아서면 넉넉히 가까워질 때까지 계속 간다.
        // 예전엔 500 을 넘자마자 집 쪽, 넘지 않으면 다시 바깥쪽이라 경계 위에서 매 프레임
        // 방향이 뒤집혔고, 그래서 스프라이트가 좌우로 파르르 떨렸다
        const away = dist(this, { x: this.homeX, y: this.homeY });
        if (away > 500) this.goingHome = true;
        else if (away < 380) this.goingHome = false;
        const a = this.goingHome ? Math.atan2(this.homeY - this.y, this.homeX - this.x) : this.wanderAngle;
        this.moveBy(Math.cos(a), Math.sin(a), 60, dt);
    }

    // ---------- 드로잉 ----------
    draw(ctx) {
        if (this.hidden) return;        // 프롤로그에서 떨어지는 동안: 용이 아니라 빛으로만 보인다
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
        // 내 용은 발밑에 은은한 빛을 깔아, 용이 여럿 뒤엉켜 있어도 어느 쪽이 나인지 바로 보이게 한다
        if (this.isPlayer) drawGlow(ctx, this.x, this.y - 6, 86 * this.stage.scale, '#ffe6a8', 0.17);
        if (this.isPlayer && momentumTier() > 0) drawGlow(ctx, this.x, this.y - 40 * this.stage.scale, 60 + momentumTier() * 18, TIER_COLORS[momentumTier()], 0.07 + momentumTier() * 0.04 + Math.sin(state.gameTime * 9) * 0.03);
        if (this.fury > 0) drawGlow(ctx, this.x, this.y - 40 * this.stage.scale, 90, '#ff5a3c', 0.35 + Math.sin(state.gameTime * 12) * 0.1);
        if (this.guard > 0) drawGlow(ctx, this.x, this.y - 40 * this.stage.scale, 100, '#cfd8e6', 0.45);
        if (this.channels.some(c => c.id === 'STORM')) drawGlow(ctx, this.x, this.y - 40 * this.stage.scale, 110, '#ffe27a', 0.3);
        ctx.save();
        ctx.translate(this.x, this.y);
        const sc = this.isPlayer ? this.stage.scale : 0.92 * (this.config.scale || 1);
        // 마을 용은 발밑에 은은한 테를 늘 둔다 — 나무·풀 사이에서 사람이 어디 있는지 보이게
        if (!this.isPlayer && this.config.fixed && state.talkTarget !== this) {
            ctx.strokeStyle = 'rgba(216,178,90,0.45)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 0, 40 * sc, 15 * sc, 0, 0, Math.PI * 2); ctx.stroke();
        }
        if (state.talkTarget === this) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + Math.sin(state.gameTime * 6) * 0.3; ctx.beginPath(); ctx.ellipse(0, 0, 46 * sc, 18 * sc, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
        if (this.flying) ctx.globalAlpha = 0.45;
        this.drawShadow(ctx, (this.sheet && !this.sheet.flying ? 26 : 34) * sc * (this.flying ? 0.7 : 1));
        ctx.globalAlpha = 1;
        ctx.restore();

        if (this.animator) {
            const f = this.animator.frame(this.facing);
            if (this.downTimer > 0) ctx.globalAlpha = 0.55;
            drawFrame(ctx, this.sheet, f, this.x, this.y + (this.downTimer > 0 ? 18 : this.hoverY) - this.diveHeight, sc,
                { t: state.gameTime + this.animPhase, moving: this.moving, attacking: this.animator.name === 'attack' && !this.animator.done,
                  hurt: this.animator.name === 'hit' && !this.animator.done ? Math.max(0, 1 - this.animator.t * 4) : 0,
                  shape: this.isPlayer ? this.stage.shape : null },   // 자라면서 몸 비율이 바뀌는 건 내 용뿐이다 (마을 용은 다 성체)
                (this._outline || (this._outline = outlineFor(f, this.isPlayer))));
            ctx.globalAlpha = 1;
            drawAccessory(ctx, this.sheet, this.config.accessory, this.facing, this.x, this.y + this.hoverY - this.diveHeight, sc);
            // 정체의 무늬. 어린 용이 된 뒤 목 아래에서 희미하게 빛나고, 자랄수록 또렷해진다
            if (this.isPlayer && state.story.rites && state.story.rites.length) {
                const n = state.story.rites.length;
                const pulse = 0.22 + n * 0.08 + Math.sin(state.gameTime * 2.2) * 0.08;
                drawGlow(ctx, this.x + (this.facing === 'left' ? -6 : this.facing === 'right' ? 6 : 0) * sc, this.y + this.hoverY - this.diveHeight - 30 * sc, (7 + n * 2) * sc, '#c58aff', pulse);
            }
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
            this.drawNameplate(crisp(ctx));   // 이름표는 번짐을 타지 않는 층에
            this.drawHpBar(ctx, this.hp / this.maxHp, -12, 60);
        } else {
            this.drawPlayerBar(ctx);
        }
    }

    /**
     * 내 용 머리 위의 체력바. HUD 구석의 막대만으로는 싸우는 중에 눈이 가지 않아
     * 언제 맞았는지도 모른 채 쓰러진다. 다쳤을 때만 머리 위에 띄운다.
     */
    drawPlayerBar(ctx) {
        const r = this.hp / this.maxHp;
        if (r >= 1) return;
        const top = headTop(this.sheet);
        const k = 1 / cam.zoom;
        const W = 74, H = 8;
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y - top - 2 + this.hoverY));
        ctx.scale(k, k);
        ctx.fillStyle = 'rgba(8, 7, 14, 0.82)';
        ctx.fillRect(-W / 2 - 2, -H - 2, W + 4, H + 4);
        ctx.fillStyle = r > 0.5 ? '#7ddc5a' : r > 0.25 ? '#ffc93c' : '#ff5a4d';
        ctx.fillRect(-W / 2, -H, W * r, H);
        // 위험하면 테두리가 맥박친다
        if (r <= 0.3) {
            ctx.strokeStyle = `rgba(255,90,77,${(0.5 + Math.sin(state.gameTime * 8) * 0.4).toFixed(2)})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(-W / 2 - 2, -H - 2, W + 4, H + 4);
        }
        ctx.restore();
    }

    /**
     * 이름표 · 말풍선 · 퀘스트 표시.
     * 월드 좌표계 안이지만 1/zoom 으로 되돌려 그린다. 그래야 멀리 당겨 봐도
     * 글씨가 같은 크기로 또렷하게 남는다 (예전엔 10px 글씨가 줌 아웃하면 6px이 됐다).
     */
    drawNameplate(ctx) {
        if (inCutscene()) return;   // 컷씬에서는 대화창이 말하는 이를 알려 준다
        const top = headTop(this.sheet);
        const k = 1 / cam.zoom;
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y - top - 14 + this.hoverY));
        ctx.scale(k, k);            // 여기서부터는 화면 픽셀 단위로 생각한다
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        // 이름
        const name = this.isPlayer ? (this.config.name || '용') : npcName(this.config.name);
        ctx.font = '600 13px "Noto Sans KR"';
        const nw = Math.ceil(ctx.measureText(name).width) + 16;
        ctx.fillStyle = 'rgba(10, 9, 16, 0.78)';
        ctx.fillRect(-nw / 2, -16, nw, 21);
        ctx.fillStyle = 'rgba(216, 178, 90, 0.55)';
        ctx.fillRect(-nw / 2, 4, nw, 1);
        ctx.fillStyle = '#ece3cf';
        ctx.fillText(name, 0, 0);

        // 퀘스트 표시 (! 새 부탁 / ? 보고할 것)
        const mark = questMarker(this);
        if (mark) {
            ctx.font = '900 30px Fredoka';
            ctx.fillStyle = mark === '?' ? '#7dd36a' : '#ffd84a';
            ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 5;
            const my = -26 + Math.sin(state.gameTime * 4) * 3;
            ctx.strokeText(mark, 0, my); ctx.fillText(mark, 0, my);
        }

        // 말풍선. 길면 줄을 나눈다
        if (this.chatFade > 0 && this.currentChat) {
            ctx.globalAlpha = Math.min(1, this.chatFade);
            ctx.font = '13px "Noto Sans KR"';
            const lines = wrapText(ctx, this.currentChat, 230);
            const lh = 19, padX = 12, padY = 9;
            const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2;
            const h = lines.length * lh + padY * 2 - 4;
            const bottom = -28 - (mark ? 30 : 0);
            const topY = bottom - h;
            bubble(ctx, -w / 2, topY, w, h, bottom);
            ctx.fillStyle = '#20202a';
            lines.forEach((line, i) => ctx.fillText(line, 0, topY + padY + lh * i + 11));
        }
        ctx.restore();
    }
}

/** 글상자 너비에 맞춰 줄을 나눈다 (한국어라 글자 단위로 끊는다) */
function wrapText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const lines = [];
    let line = '';
    for (const ch of text) {
        if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ''; }
        line += ch;
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
}
