import { state } from '../core/state.js';
import { cozyRest, inMyDen } from './den.js';
import { MY_DEN } from '../data/dens.js';
import { travelTo } from './world.js';
import { openDecorPanel } from '../ui/denPanel.js';
import { RITES } from '../data/ceremony.js';
import { npcName } from '../data/npcs.js';
import { playScene, addClue } from './chronicle.js';
import { dist, rand, pick } from '../core/utils.js';

import { LESSONS, TRIALS, SCENES } from '../data/story.js';
import { NPC_TALK } from '../data/npcTalk.js';
import { STAGES } from '../data/elements.js';
import { SKILLS } from '../data/skills.js';
import { Enemy } from '../entities/Enemy.js';
import { BabyDragon } from '../entities/BabyDragon.js';
import { registerKid } from './kids.js';
import { notify } from './quests.js';
import { Projectile, addBullet } from '../entities/Projectile.js';
import { spawnEffect } from '../render/vfx.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { setBossBar, fadeScreen, showRegionBanner } from '../ui/hud.js';
import { currentChapter } from '../data/chapters.js';
import { learnSkill } from './skills.js';
import { saveGame } from './save.js';
import { play } from './audio.js';
import { raidWanted, triggerRaid } from './raid.js';

// 스승의 수련 · 승급 시험 · 잠 · 아침 장면.
// state.story = { scenes: [본 장면 id], lessons: [끝낸 수련 id], lessonDay: 마지막으로 수련한 날 }
// 수련 중에는 state.activity = { type: 'TARGETS' | 'DODGE' | 'DUEL', npc(스승), ... }


function close() { state.isDialogueOpen = false; state.currentNpc = null; dialogueUI.hide(); }

// ---------- 스승과의 대화에 끼워 넣는 선택지 (systems/npcActions.js 가 호출) ----------
export function nextLesson() { return LESSONS.find(l => !state.story.lessons.includes(l.id)); }
/** 지금 청할 수 있는 승급 시험 (없으면 null) */
export function pendingTrial() {
    const t = nextTrial();
    return t && !t.blocked ? t : null;
}

/**
 * 다음 승급 시험과, 아직 안 되는 이유.
 *   { ...trial, blocked: '레벨이 모자라다' | '아직 배운 게 적다' | null }
 * 레벨만 채우면 이틀 만에 성체가 되던 것을, 배운 것·겪은 것에도 묶었다.
 */
export function nextTrial() {
    const p = state.player;
    const t = TRIALS.find(tr => tr.stage === p.stageIndex + 1);
    if (!t) return null;
    const st = STAGES[t.stage];
    if (p.level < st.minLevel) return { ...t, blocked: `아직 이르다. 레벨 ${st.minLevel}은 되어야 몸이 버틴다. (지금 ${p.level})` };
    if (st.needsAllElements && p.elements.length < 3) return { ...t, blocked: '세 숨결을 모두 제 것으로 만든 뒤의 이야기다.' };
    if (t.needs && !t.needs(state)) return { ...t, blocked: t.why };
    return { ...t, blocked: null };
}

export function masterOptions(npc) {
    const p = state.player, opts = [];
    // 첫날 밤을 자고 나야(제1장) 엘더가 스승을 소개해 준다
    if (!state.story.scenes.includes('ch1')) {
        return [{ label: '[수련] 가르침을 청한다', onSelect: () => say(npc, "엘더 영감한테 아직 얘기를 못 들었나 보군. 오늘은 마을을 둘러보고, 둥지에서 하룻밤 자고 오너라.") }];
    }
    const trial = nextTrial();
    if (trial && !trial.blocked) {
        opts.push({ label: `[승급 시험] ${STAGES[trial.stage].name}(으)로 자란다`, onSelect: () => startDrill(npc, { type: 'DUEL', hp: trial.hp }, { trial }) });
    } else if (trial) {
        opts.push({ label: `[승급 시험] ${STAGES[trial.stage].name} (아직 이르다)`, onSelect: () => say(npc, trial.blocked) });
    }
    opts.push({ label: '연습 대련을 청한다 (보상 없음)', onSelect: () => startDrill(npc, { type: 'DUEL', hp: 220 + p.level * 12 }, { practice: true }) });
    // 수련과 쉬는 날은 여기서 고르지 않는다. 그날 스승이 정해 준다 (systems/training.js)
    const lesson = nextLesson();
    if (lesson && p.level < lesson.level) opts.push({ label: `(다음 기본기: ${lesson.title} → ${SKILLS[lesson.skill].name}. 레벨 ${lesson.level} 필요)`, onSelect: () => say(npc, `아직 이르다. 레벨 ${lesson.level}은 돼서 와라. 숲에서 몸을 더 굴리고.`) });
    return opts;
}

/** 기본기 수련을 시작한다 (systems/training.js 가 부른다) */
export function startLesson(npc, lesson) {
    say(npc, lesson.intro, () => startDrill(npc, lesson.drill, { lesson }));
}

function say(npc, text, then) {
    state.isDialogueOpen = true;
    dialogueUI.show({ name: npcName(npc.config.name), text, sheet: npc.sheet, onClose: close, options: [{ label: then ? '시작한다!' : '알겠습니다.', onSelect: () => { close(); if (then) then(); } }] });
}

// ---------- 수련 ----------
/** extra.rival: 같이 허수아비를 깨는 맞수 · extra.onEnd(win): 끝났을 때 보상 대신 부를 것 */
export function startDrill(npc, drill, extra) {
    close();
    const p = state.player;
    const a = state.activity = { ...extra, type: drill.type, npc, timer: 1, time: drill.time || 0, max: drill.time || drill.hp, hp: drill.hp, startHp: p.hp };
    if (extra.trial) say(npc, extra.trial.intro, () => {});
    if (drill.type === 'TARGETS') {
        a.dummies = [];
        for (let i = 0; i < drill.count; i++) {
            const ang = (i / drill.count) * Math.PI * 2;
            const spot = state.dojoSpot || { x: npc.x, y: npc.y + 120 };
            const d = new Enemy(spot.x + Math.cos(ang) * 200, spot.y + 40 + Math.sin(ang) * 140, 'DUMMY');
            d.maxHp = d.hp = drill.hp;
            a.dummies.push(d);
            state.entities.enemies.push(d);
            spawnEffect('PUFF', d.x, d.y - 10);
        }
        showToast(extra.rival ? `내기: ${npcName(extra.rival.config.name)}보다 허수아비를 많이 부수세요!` : `수련: 허수아비 ${drill.count}개를 ${drill.time}초 안에 부수세요!`, '🎯');
    } else if (drill.type === 'DODGE') {
        a.rate = drill.rate;
        showToast(`수련: ${drill.time}초 동안 불씨를 피하세요! 체력이 40% 아래로 떨어지면 실패. ([Shift] 대시)`, '💨');
    } else {
        showToast('스승의 기력을 모두 깎으세요! 체력이 25% 아래로 떨어지면 패배.', '⚔️');
    }
    play('warn');
}

function endDrill(win) {
    const a = state.activity, p = state.player;
    state.activity = null;
    setBossBar(null);
    for (const d of a.dummies || []) d.remove = true;
    for (const b of state.entities.bullets) if (b.faction === 'ENEMY') b.remove = true;
    p.hp = Math.max(p.hp, p.maxHp * 0.5);
    if (a.onEnd) { a.onEnd(win); return; }
    if (!win) {
        a.npc.say('아직 멀었다. 다시 오너라.');
        showToast('수련 실패… 다시 도전할 수 있습니다.', '💫');
        return;
    }
    if (a.practice) {
        a.npc.say('좋은 몸놀림이다.');
        p.gainXp(20 + p.level * 4);
        return;
    }
    if (a.trial) {
        p.evolve(a.trial.stage);
        playRite(a.trial.stage);        // 마을이 모여 새 이름을 불러 준다
    } else {
        state.story.lessons.push(a.lesson.id);
        state.story.lessonDay = state.day;
        a.npc.say('잘했다. 오늘은 여기까지.');
        // 같이 구르는 또래가 곁에 있으면 한마디 거든다
        const nara = state.entities.npcs.find(n => n.config.name === 'Nara');
        if (nara && dist(nara, p) < 900) nara.say(pick(NPC_TALK.Nara.trainingLines));
        learnSkill(a.lesson.skill);
        p.gainXp(40 + a.lesson.level * 25);
        showToast(`${a.lesson.title} 완료! 둥지에서 자고 나면 다음 수련을 받을 수 있습니다.`, '🎓');
    }
    saveGame();
}

/**
 * 이름을 얻는 의식. 승급 시험을 넘으면 마을이 모여 칭호를 불러 준다.
 * (고양이전사들의 전사 이름 수여식에서 가져왔다)
 */
export function playRite(stage) {
    const rite = RITES[stage];
    if (!rite) return;
    const p = state.player;
    const ctx = {
        name: p.config.name,
        element: p.element || 'FIRE',
        cloudtop: (state.story.events || []).includes('ev_gathering'),
    };
    state.story.rites = state.story.rites || [];
    if (!state.story.rites.includes(stage)) state.story.rites.push(stage);
    if (rite.clue) addClue(rite.clue);
    playScene(rite.title, rite.lines(ctx), () => {
        if (rite.toast) showToast(rite.toast, '🏅');
        play('evolve');
        saveGame();
    }, { place: rite.place });
}

/** 수련 중 스승의 움직임과 판정. Dragon.updateNpc 가 호출 */
export function updateDrill(npc, dt) {
    const a = state.activity, p = state.player;
    const d = dist(npc, p);
    const toPlayer = Math.atan2(p.y - npc.y, p.x - npc.x);
    const fire = (angle, speed = 300, damage = 5) => addBullet(new Projectile(npc.x, npc.y - 50, angle, { faction: 'ENEMY', element: 'FIRE', damage, speed, life: 3, scale: 0.7 }));

    if (a.type === 'TARGETS') {
        a.time -= dt;
        if (a.rival) rivalTick(a, dt);
        const left = a.dummies.filter(x => !x.remove).length;
        const mine = a.dummies.length - left - (a.rivalKills || 0);
        setBossBar(a.rival ? `나 ${mine} : ${a.rivalKills} ${npcName(a.rival.config.name)}` : `허수아비 ${left}개 남음`, a.time / a.max);
        if (left === 0) endDrill(a.rival ? mine > a.rivalKills : true);
        else if (a.time <= 0) endDrill(false);
        return;
    }
    if (a.type === 'DODGE') {
        a.time -= dt; a.timer -= dt;
        setBossBar('불씨 피하기', a.time / a.max);
        if (a.timer <= 0) {
            a.timer = a.rate;
            a.wave = (a.wave || 0) + 1;
            if (a.wave % 5 === 0) { const off = rand(0, 6.28); for (let i = 0; i < 12; i++) fire(off + i * Math.PI / 6, 240); }
            else for (const da of [-0.25, 0, 0.25]) fire(Math.atan2(p.y - 30 - (npc.y - 50), p.x - npc.x) + da, 320);
            if (npc.animator) npc.animator.play('attack');
        }
        if (d > 520) npc.moveBy(Math.cos(toPlayer), Math.sin(toPlayer), 200, dt);
        if (p.hp < p.maxHp * 0.4) endDrill(false);
        else if (a.time <= 0) endDrill(true);
        return;
    }
    // DUEL: 스승과 대련 (수련·승급 시험 공용). 기력(a.hp)은 Dragon.takeDamage 가 깎는다
    setBossBar(a.trial ? `승급 시험: 스승 카이론` : '스승과의 대련', a.hp / a.max);
    const move = d > 320 ? toPlayer : d < 200 ? toPlayer + Math.PI : toPlayer + Math.PI / 2;
    npc.moveBy(Math.cos(move), Math.sin(move), 185, dt);
    a.timer -= dt;
    if (a.timer <= 0) {
        const hard = a.hp < a.max / 2;
        a.timer = hard ? 0.8 : 1.1;
        a.wave = (a.wave || 0) + 1;
        const aim = Math.atan2(p.y - 30 - (npc.y - 50), p.x - npc.x);
        if (a.wave % 4 === 0) { const off = rand(0, 6.28); for (let i = 0; i < (hard ? 16 : 10); i++) fire(off + i * Math.PI * 2 / (hard ? 16 : 10), 250, 7); }
        else for (const da of hard ? [-0.3, -0.1, 0.1, 0.3] : [-0.15, 0.15]) fire(aim + da, 340, 7);
        if (npc.animator) npc.animator.play('attack');
    }
    if (a.hp <= 0) endDrill(true);
    else if (p.hp < p.maxHp * 0.25 || d > 1200) endDrill(false);
}

/** 맞수가 가까운 허수아비로 달려가 두들긴다. 제 손으로 깬 것만 제 몫으로 센다 */
function rivalTick(a, dt) {
    const r = a.rival;
    const d = a.dummies.filter(x => !x.remove).sort((u, v) => dist(r, u) - dist(r, v))[0];
    if (!d) return;
    if (dist(r, d) > 90) { r.moveBy(d.x - r.x, d.y - r.y, 210, dt); return; }
    r.moving = false;
    d.hp -= a.rivalDps * dt;
    d.hitFlash = 1;
    if (d.hp <= 0) { d.remove = true; a.rivalKills++; spawnEffect('PUFF', d.x, d.y - 10); r.say(pick(['하나!', '내 거!', '느려, 느려!', '또 내 거!'])); }
}

export function isDrill(a) { return a && (a.type === 'TARGETS' || a.type === 'DODGE' || a.type === 'DUEL'); }

// ---------- 잠과 아침 ----------
export function openNestMenu() {
    state.isDialogueOpen = true;
    const busy = state.raid.active || state.activity || state.entities.bosses.some(b => b.awake);
    dialogueUI.show({
        name: '둥지', text: busy
            ? '지금은 잠들 수 없다. 주변이 너무 소란스럽다.'
            : `${state.day}일째. 자고 일어나면 다음 날 아침이 된다.\n(굴: ${cozyRest().tier.name}. ${cozyRest().tier.note})`, onClose: close,
        options: busy ? [{ label: '나중에', onSelect: close }] : [
            { label: '잠을 잔다 (다음 날 아침까지)', onSelect: sleep },
            ...(state.den.built ? [] : [{ label: `둥지를 짓는다 (나뭇가지 ${state.den.twigs}/8, 30G)`, onSelect: buildNest }]),
            ...(inMyDen() ? [{ label: '🪑 굴을 꾸민다', onSelect: () => { close(); openDecorPanel(); } }] : []),
            { label: '아직 안 졸려', onSelect: close },
        ],
    });
}

function buildNest() {
    const p = state.player, den = state.den;
    if (den.twigs < 8 || p.gold < 30) {
        state.isDialogueOpen = true;
        dialogueUI.show({ name: '둥지', text: `재료가 모자란다. 나뭇가지 ${den.twigs}/8, 골드 ${p.gold}/30. 나뭇가지는 숲의 그루터기에서 [E]로 주울 수 있다.`, onClose: close, options: [{ label: '모아 오자', onSelect: close }] });
        return;
    }
    close();
    den.twigs -= 8; p.gold -= 30; den.built = true;
    const nest = state.entities.nests[0];
    spawnEffect('RING', nest.x, nest.y, { size: 1.6 });
    showToast('포근한 둥지를 지었습니다! 이제 알을 품을 수 있습니다.', '🪹');
    play('quest');
    saveGame();
}

function sleep() {
    close();
    // 이야기가 습격을 기다리는 밤에는 잠들지 못한다. 눕자마자 나팔이 깨운다
    if (raidWanted()) return hornAtNight();
    play('sleep');
    // 자정을 넘겨 잠들었으면 날짜는 이미 넘어가 있다 (render/lighting.js)
    const wakeDay = state.dayTime >= 0.27 ? state.day + 1 : state.day;
    fadeScreen(`${wakeDay}일째 아침`, () => {
        const p = state.player;
        state.day = wakeDay;
        state.dayTime = 0.27;
        state.event = null;
        state.weather.type = 'CLEAR'; state.weather.timer = rand(40, 90);
        state.raidTimer = Math.max(state.raidTimer, 45);   // 눈 뜨자마자 습격당하지 않게
        p.hp = p.maxHp;
        // 굴이 아늑할수록 배가 덜 꺼진다 (systems/den.js)
        const rest = cozyRest();
        p.hunger = Math.max(30, p.hunger - Math.round(25 * (1 - rest.heal)));
        for (const n of state.entities.npcs) if (n.config.fixed) { n.x = n.homeX; n.y = n.homeY; n.hp = n.maxHp; n.downTimer = 0; }
        for (const n of [state.partner, state.companion]) if (n && n.state !== 'WANDER') { n.x = p.x + 70; n.y = p.y + 20; }
        state.story.yesterday = state.story.today;   // 오늘 있었던 일은 내일 아침의 "어제"가 된다
        state.story.today = {};
        notify('sleep');           // "하룻밤 자고 나서" 로 이어지는 대목
        saveGame();
    }, playMorningScene);
}

/** 잠을 청했는데 습격이 오는 밤. 날은 넘어가지 않고, 한밤의 마을 광장에서 싸움이 시작된다 */
function hornAtNight() {
    fadeScreen('한밤중', () => { state.dayTime = 0.9; }, () => playScene('나팔 소리', [
        { who: '나', text: '(막 잠이 들려는데 밖이 소란하다. …나팔 소리다.)' },
        { who: 'Tiamat', text: '다들 일어나! 사냥꾼이야!' },
    ], triggerRaid, { place: 'VILLAGE' }));
}

// ---------- 장 ----------
/** 매 프레임 (main.js). 장이 넘어가면 이름을 한 번 띄운다 */
export function updateChapter() {
    if (state.isDialogueOpen || state.prologue || state.activity || state.raid.active) return;
    const ch = currentChapter(state);
    if (state.story.chapter === ch.id) return;
    state.story.chapter = ch.id;
    showRegionBanner(`${ch.title}. ${ch.name}`, '');
    saveGame();
}

// ---------- 어린 용의 잘 시간 ----------
// 성체가 되기 전에는 밤이 깊으면 알아서 잠든다. 밤을 새우다 아침 장면을 통째로 놓치는 일이 있었다.
const BEDTIME = 0.93, YAWN = 0.88, ADULT = STAGES.findIndex(st => st.id === 'ADULT');
const BEDTIME_LINES = {
    Elder: "아직도 안 자고 뭐 하느냐. 어린것들은 잘 시간이란다… 어서 들어가거라.",
    Kairon: "너 아직도 안 잤냐. 용은 자면서 큰다고 몇 번을 말해. 들어가.",
    Tiamat: "밤은 내가 볼게. 넌 들어가서 자. 눈이 반쯤 감겼어.",
    Gron: "애가 이 시간까지 뭘 돌아다녀. 가서 자라, 시끄럽다.",
    Nara: "야, 너 졸면서 걷고 있어. …나? 나도 이제 자러 갈 거거든.",
    Poco: "하아암… 나 졸려. 너도 자러 가자, 응?",
};

/** 매 프레임 (main.js) */
export function updateBedtime() {
    const p = state.player, t = state.dayTime;
    if (p.stageIndex >= ADULT || state.isDialogueOpen || state.prologue) return;   // 프롤로그는 밤으로 연출된다
    if (t >= YAWN && t < BEDTIME && !state.story.today.yawned) {
        state.story.today.yawned = true;
        showToast('하품이 난다. 곧 잘 시간이다.', '🥱');
    }
    if (!(t >= BEDTIME || t < 0.2)) return;
    // 한창 일이 벌어지는 중에는 재우지 않는다. 습격을 기다리는 밤도 마찬가지다
    if (state.raid.active || raidWanted() || state.activity || state.dungeon || state.tour || state.prologue || state.entities.bosses.some(b => b.awake)) return;
    const near = state.entities.npcs.find(n => BEDTIME_LINES[n.config.name] && dist(n, p) < 500);
    const lines = near ? [{ who: near.config.name, text: BEDTIME_LINES[near.config.name] }] : [];
    lines.push({ who: '나', text: '(눈꺼풀이 무겁다. 더는 못 버티겠다.)' });
    playScene(null, lines, () => { if (state.mapId !== MY_DEN) travelTo(MY_DEN); sleep(); }, { cinematic: false });
}

// 촌장이 알을 품어 주는 날수 (systems/npcActions.js 의 entrustEgg)
const EGG_SIT_DAYS = 3;

/** 촌장에게 맡긴 알이 오늘 깨어나면 데려다주는 장면. 재생했으면 true */
function deliverEgg() {
    const egg = state.eggSitting;
    if (!egg || state.day - egg.day < EGG_SIT_DAYS) return false;
    state.eggSitting = null;
    const p = state.player;
    playScene('알이 깨어났다', [
        { who: 'Elder', text: '왔다. 문 앞에서 기다리고 있었다.' },
        { who: 'Elder', text: '사흘을 품었더니 밤새 발길질을 하더구나. 성질이 급한 아이다.' },
        { who: 'Elder', text: '자, 네 아이다. 이제부터는 네가 품어라.' },
    ], () => {
        const baby = new BabyDragon(p.x + rand(-40, 40), p.y + rand(20, 50), egg.genes);
        state.entities.babies.push(baby);
        registerKid(baby);
        spawnEffect('RING', baby.x, baby.y);
        notify('hatch');
        showToast('아기 용이 태어났습니다!', '🐣');
        saveGame();
    });
    return true;
}

/** 아직 안 본 장면 중 조건이 맞는 첫 번째를 재생 (아침에 눈뜰 때) */
export function playMorningScene() {
    if (deliverEgg()) return;   // 맡긴 알이 먼저다. 되풀이되는 장면이라 SCENES 에 두지 않는다
    const scene = SCENES.find(sc => !state.story.scenes.includes(sc.id) && sc.when(state));
    if (!scene) return;
    state.story.scenes.push(scene.id);
    playScene(scene.title, scene.lines, saveGame, { place: scene.place });
}
