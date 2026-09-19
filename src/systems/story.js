import { state } from '../core/state.js';
import { dist, rand } from '../core/utils.js';
import { TRAINING as DOJO } from '../core/config.js';
import { LESSONS, TRIALS, SCENES } from '../data/story.js';
import { STAGES } from '../data/elements.js';
import { SKILLS } from '../data/skills.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile, addBullet } from '../entities/Projectile.js';
import { spawnEffect } from '../render/vfx.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { setBossBar, fadeScreen } from '../ui/hud.js';
import { learnSkill } from './skills.js';
import { saveGame } from './save.js';
import { play } from './audio.js';

// 스승의 수련 · 승급 시험 · 잠 · 아침 장면.
// state.story = { scenes: [본 장면 id], lessons: [끝낸 수련 id], lessonDay: 마지막으로 수련한 날 }
// 수련 중에는 state.activity = { type: 'TARGETS' | 'DODGE' | 'DUEL', npc(스승), ... }


function close() { state.isDialogueOpen = false; state.currentNpc = null; dialogueUI.hide(); }

// ---------- 스승과의 대화에 끼워 넣는 선택지 (systems/npcActions.js 가 호출) ----------
export function nextLesson() { return LESSONS.find(l => !state.story.lessons.includes(l.id)); }
export function pendingTrial() {
    const p = state.player;
    const t = TRIALS.find(tr => tr.stage === p.stageIndex + 1);
    if (!t || p.level < STAGES[t.stage].minLevel) return null;
    if (STAGES[t.stage].needsAllElements && p.elements.length < 3) return null;   // 숨겨진 단계는 세 숨결이 모두 있어야
    return t;
}

export function masterOptions(npc) {
    const p = state.player, opts = [];
    // 첫날 밤을 자고 나야(제1장) 엘더가 스승을 소개해 준다
    if (!state.story.scenes.includes('ch1')) {
        return [{ label: '[수련] 가르침을 청한다', onSelect: () => say(npc, "엘더 영감한테 아직 얘기를 못 들었나 보군. 오늘은 마을을 둘러보고, 둥지에서 하룻밤 자고 오너라.") }];
    }
    const trial = pendingTrial();
    if (trial) opts.push({ label: `[승급 시험] ${STAGES[trial.stage].name}(으)로 자란다`, onSelect: () => startDrill(npc, { type: 'DUEL', hp: trial.hp }, { trial }) });
    opts.push({ label: '연습 대련을 청한다 (보상 없음)', onSelect: () => startDrill(npc, { type: 'DUEL', hp: 220 + p.level * 12 }, { practice: true }) });
    if (npc.lastMeditateDay !== state.day) opts.push({ label: '함께 명상한다 (하루 한 번)', onSelect: () => meditate(npc) });
    const lesson = nextLesson();
    if (lesson) {
        if (state.story.lessonDay === state.day) opts.push({ label: '[수련] 오늘 수련은 끝났다 (자고 나서 다시)', onSelect: () => say(npc, "수련은 하루에 하나다. 가서 푹 자거라. 용은 자면서 큰다.") });
        else if (p.level < lesson.level) opts.push({ label: `[수련] ${lesson.title} (레벨 ${lesson.level} 필요)`, onSelect: () => say(npc, `아직 이르다. 레벨 ${lesson.level}은 되어서 오너라. 숲에서 몸을 더 굴려라.`) });
        else opts.push({ label: `[수련] ${lesson.title} → ${SKILLS[lesson.skill].name}`, onSelect: () => say(npc, lesson.intro, () => startDrill(npc, lesson.drill, { lesson })) });
    }
    return opts;
}

function meditate(npc) {
    close();
    npc.lastMeditateDay = state.day;
    fadeScreen('……', () => {
        const p = state.player;
        p.hp = p.maxHp;
        p.hunger = Math.min(100, p.hunger + 20);
        for (const k in p.cooldowns) p.cooldowns[k] = 0;
    }, () => { state.player.gainXp(30 + state.player.level * 12); npc.say('마음이 고요하면 숨결도 곧다.'); showToast('명상: 체력 회복, 스킬 대기 초기화, 경험치 획득', '🧘'); });
}

function say(npc, text, then) {
    state.isDialogueOpen = true;
    dialogueUI.show({ name: npc.config.name, text, sheet: npc.sheet, onClose: close, options: [{ label: then ? '시작한다!' : '알겠습니다.', onSelect: () => { close(); if (then) then(); } }] });
}

// ---------- 수련 ----------
function startDrill(npc, drill, extra) {
    close();
    const p = state.player;
    const a = state.activity = { ...extra, type: drill.type, npc, timer: 1, time: drill.time || 0, max: drill.time || drill.hp, hp: drill.hp, startHp: p.hp };
    if (extra.trial) say(npc, extra.trial.intro, () => {});
    if (drill.type === 'TARGETS') {
        a.dummies = [];
        for (let i = 0; i < drill.count; i++) {
            const ang = (i / drill.count) * Math.PI * 2;
            const d = new Enemy(DOJO.x + Math.cos(ang) * 240, DOJO.y + 60 + Math.sin(ang) * 170, 'DUMMY');
            d.maxHp = d.hp = drill.hp;
            a.dummies.push(d);
            state.entities.enemies.push(d);
            spawnEffect('PUFF', d.x, d.y - 10);
        }
        showToast(`수련: 허수아비 ${drill.count}개를 ${drill.time}초 안에 부수세요!`, '🎯');
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
        a.npc.say('…훌륭하다.');
        p.evolve(a.trial.stage);
    } else {
        state.story.lessons.push(a.lesson.id);
        state.story.lessonDay = state.day;
        a.npc.say('잘했다. 오늘은 여기까지.');
        learnSkill(a.lesson.skill);
        p.gainXp(40 + a.lesson.level * 25);
        showToast(`${a.lesson.title} 완료! 둥지에서 자고 나면 다음 수련을 받을 수 있습니다.`, '🎓');
    }
    saveGame();
}

/** 수련 중 스승의 움직임과 판정. Dragon.updateNpc 가 호출 */
export function updateDrill(npc, dt) {
    const a = state.activity, p = state.player;
    const d = dist(npc, p);
    const toPlayer = Math.atan2(p.y - npc.y, p.x - npc.x);
    const fire = (angle, speed = 300, damage = 5) => addBullet(new Projectile(npc.x, npc.y - 50, angle, { faction: 'ENEMY', element: 'FIRE', damage, speed, life: 3, scale: 0.7 }));

    if (a.type === 'TARGETS') {
        a.time -= dt;
        const left = a.dummies.filter(x => !x.remove).length;
        setBossBar(`허수아비 ${left}개 남음`, a.time / a.max);
        if (left === 0) endDrill(true);
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
    setBossBar(a.trial ? `승급 시험 — 스승 카이론` : '스승과의 대련', a.hp / a.max);
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

export function isDrill(a) { return a && (a.type === 'TARGETS' || a.type === 'DODGE' || a.type === 'DUEL'); }

// ---------- 잠과 아침 ----------
export function openNestMenu() {
    state.isDialogueOpen = true;
    const busy = state.raid.active || state.activity || state.entities.bosses.some(b => b.awake);
    dialogueUI.show({
        name: '둥지', text: busy ? '지금은 잠들 수 없다. 주변이 너무 소란스럽다.' : `${state.day}일째. 포근한 둥지다. 자고 일어나면 다음 날 아침이 된다.`, onClose: close,
        options: busy ? [{ label: '나중에', onSelect: close }] : [
            { label: '잠을 잔다 (다음 날 아침까지)', onSelect: sleep },
            ...(state.den.built ? [] : [{ label: `둥지를 짓는다 (나뭇가지 ${state.den.twigs}/8, 30G)`, onSelect: buildNest }]),
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
    play('sleep');
    fadeScreen(`${state.day + 1}일째 아침`, () => {
        const p = state.player;
        state.day++;
        state.dayTime = 0.27;
        state.event = null;
        state.weather.type = 'CLEAR'; state.weather.timer = rand(40, 90);
        state.raidTimer = Math.max(state.raidTimer, 45);   // 눈 뜨자마자 습격당하지 않게
        p.hp = p.maxHp;
        p.hunger = Math.max(30, p.hunger - 25);              // 자는 동안 배가 꺼진다
        for (const n of state.entities.npcs) if (n.config.fixed) { n.x = n.homeX; n.y = n.homeY; n.hp = n.maxHp; n.downTimer = 0; }
        for (const n of [state.partner, state.companion]) if (n) { n.x = p.x + 70; n.y = p.y + 20; }
        saveGame();
    }, playMorningScene);
}

/** 아직 안 본 장면 중 조건이 맞는 첫 번째를 재생 */
export function playMorningScene() {
    const scene = SCENES.find(sc => !state.story.scenes.includes(sc.id) && sc.when(state));
    if (!scene) return;
    state.story.scenes.push(scene.id);
    showToast(scene.title, '📖');
    let i = 0;
    const next = () => {
        if (i >= scene.lines.length) { close(); saveGame(); return; }
        const line = scene.lines[i++];
        const npc = state.entities.npcs.find(n => n.config.name === line.who);
        state.isDialogueOpen = true;
        dialogueUI.show({
            name: line.who === '나' ? state.player.config.name : line.who, text: line.text,
            sheet: line.who === '나' ? state.player.sheet : npc ? npc.sheet : null, onClose: next,
            options: [{ label: i < scene.lines.length ? '▶ 다음' : '▶ 끝', onSelect: next }],
        });
        play('talk');
    };
    next();
}
