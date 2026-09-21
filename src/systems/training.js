import { state } from '../core/state.js';
import { rand, pick } from '../core/utils.js';
import { PLANS, TRIPS, RESTS } from '../data/training.js';
import { MAPS } from '../data/maps.js';
import { mapOpen } from '../data/chapters.js';
import { npcName } from '../data/npcs.js';
import { Enemy } from '../entities/Enemy.js';
import { setTrainingHooks, questsChanged } from './quests.js';
import { nextLesson, startLesson, startDrill } from './story.js';
import { playScene } from './chronicle.js';
import { anyNpc, mapEnemies } from './world.js';
import { planFor } from './routine.js';
import { inDungeon } from './delve.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { fadeScreen } from '../ui/hud.js';
import { saveGame } from './save.js';
import { play } from './audio.js';

// 카이론과의 하루 (data/training.js).
//
// 아침마다 그날의 일과가 하나 정해지고, 일지와 추적창에 "오늘의 수련"으로 뜬다.
// 스승을 찾아가 말을 걸면 메뉴를 거치지 않고 바로 그 얘기부터 나온다.
//
// state.story.plan = { day, kind, stage: 'offered' | 'active' | 'done', n, ... }
//   kind: 'DRILL' | 'HUNT_CLEAN' | 'HUNT_ELITE' | 'DELVE' | 'RACE' | 'WATCH' | 'TRIP' | 'REST'
// state.story.planLog = { count: 지금까지 정해진 일과 수, last: 어제 것, trips: [다녀온 곳], rests: [쉰 날] }

const master = () => anyNpc('Kairon');
const log = () => state.story.planLog || (state.story.planLog = { count: 0, last: null, trips: [], rests: [] });

const nextTrip = () => TRIPS.find(t => !log().trips.includes(t.id) && t.when(state) && mapOpen(state, t.map));
const nextRest = () => RESTS.find(r => !log().rests.includes(r.id) && r.when(state));

// 여덟 번의 기본기는 스승의 일정 안에 날짜가 박혀 있다: n번째 기본기는 일과를 이만큼 받은 뒤에야 나온다.
// 그날이 와도 레벨이 모자라면 다른 일과로 넘어가고, 레벨이 차는 대로 바로 다음 날 나온다.
// (예전엔 매일 "오늘은 기본기를 하겠습니다"를 대신 고를 수 있어서, 일과가 둘 중 하나 고르기가 됐었다)
const LESSON_DAYS = [0, 2, 4, 6, 9, 12, 15, 18];

/** 오늘의 일과 하나를 고른다. 무엇을 할지는 스승이 정한다 */
function choose() {
    const p = state.player, L = state.story.lessons.length, last = log().last;
    const lesson = nextLesson();
    const canDrill = lesson && p.level >= lesson.level && log().count >= (LESSON_DAYS[L] || 0);
    if (L === 0) return canDrill ? 'DRILL' : null;              // 첫 수련은 늘 기본기다

    // 어제 습격을 막았거나 날이 궂으면 쉬어 간다
    const rough = state.story.yesterday.raid || ['RAIN', 'SNOW'].includes(state.weather.type);
    if (rough && last !== 'REST' && nextRest()) return 'REST';
    if (canDrill && last !== 'DRILL') return 'DRILL';

    const others = ['HUNT_CLEAN'];
    if (nextTrip()) others.push('TRIP');
    others.push('RACE');
    if (p.level >= 3) others.push('HUNT_ELITE');
    if (nextRest()) others.push('REST');
    if (p.level >= 3 && L >= 2) others.push('DELVE');
    if (L >= 2 && !log().watched) others.push('WATCH');
    const list = others.filter(k => k !== last);
    return list[log().count % list.length] || (canDrill ? 'DRILL' : 'HUNT_CLEAN');
}

/** 오늘의 일과. 스승을 소개받기 전(ch1)이면 null */
export function todaysPlan() {
    if (!state.story.scenes.includes('ch1')) return null;
    let plan = state.story.plan;
    if (plan && plan.day === state.day) return plan;
    if (plan && plan.stage === 'active') endCompany();          // 어제 것을 못 끝내고 날이 넘어갔다
    const kind = choose();
    if (!kind) return (state.story.plan = null);
    plan = state.story.plan = { day: state.day, kind, stage: 'offered', n: 0 };
    if (kind === 'TRIP') plan.trip = nextTrip().id;
    if (kind === 'REST') plan.rest = nextRest().id;
    log().count++;
    return plan;
}

const def = (plan) => plan.kind === 'TRIP' ? TRIPS.find(t => t.id === plan.trip)
    : plan.kind === 'REST' ? RESTS.find(r => r.id === plan.rest)
    : PLANS[plan.kind];

function planTitle(plan) {
    if (plan.kind === 'DRILL') { const l = nextLesson(); return l ? l.title : PLANS.DRILL.title; }
    return def(plan).title;
}

// ---------- 스승에게 말을 걸었을 때 (systems/npcActions.js) ----------

/** 오늘 일과를 아직 안 받았으면 true — 대화가 메뉴 대신 그 얘기부터 시작한다 */
export function trainingPending() {
    const plan = todaysPlan();
    return !!plan && plan.stage === 'offered' && !state.activity && !state.raid.active;
}

function close() { state.isDialogueOpen = false; state.currentNpc = null; dialogueUI.hide(); }

function ask(npc, text, options) {
    state.isDialogueOpen = true;
    dialogueUI.show({ name: npcName(npc.config.name), text, sheet: npc.sheet, onClose: close, options });
}

/** 스승이 오늘 할 일을 말해 준다. other: 다른 용건으로 넘어갈 때 부른다 */
export function openTraining(npc, other) {
    const plan = todaysPlan();
    const lesson = nextLesson();
    const options = [{ label: '따라나선다', onSelect: () => { close(); begin(npc, plan); } }];
    options.push({ label: '조금 이따 오겠습니다', onSelect: close });
    options.push({ label: '다른 얘기를 한다', onSelect: other });

    if (plan.kind === 'DRILL') return ask(npc, `오늘은 기본기다. ${lesson.title}.`, options);
    // 제안은 한 줄씩 넘기다가, 마지막 줄에서 따라나설지 고른다 (나라가 받아치고 끝나는 제안도 있다)
    const lines = def(plan).offer;
    const say = (i) => ask(anyNpc(lines[i].who) || npc, lines[i].text,
        i < lines.length - 1 ? [{ label: '다음', onSelect: () => say(i + 1) }] : options);
    say(0);
}

function begin(npc, plan) {
    plan.stage = 'active';
    log().last = plan.kind;
    const d = def(plan);
    if (plan.kind === 'DRILL') return startLesson(npc, nextLesson());
    if (plan.kind === 'REST') return rest(npc, plan, d);
    if (plan.kind === 'WATCH') return watch(npc, plan, d);
    if (plan.kind === 'RACE') return race(npc, plan, d);
    // 나머지는 스승이 따라나선다
    if (state.companion && state.companion !== npc) state.companion.state = 'WANDER';
    state.companion = npc;
    npc.state = 'COMPANION_FOLLOW';
    plan.lastHp = state.player.hp;
    showToast(`오늘의 수련: ${d.title}. ${npcName('Kairon')}(이)가 따라나선다.`, '🎓');
    play('quest');
    saveGame();
}

/** 스승이 제자리로 돌아간다 (다음에 그 지도에 들르면 일과대로 서 있다) */
function endCompany() {
    const npc = master();
    if (npc && state.companion === npc) { state.companion = null; npc.state = 'WANDER'; npc.passive = false; }
}

function finish(plan, lines) {
    plan.stage = 'done';
    const p = state.player, npc = master();
    const reward = () => {
        endCompany();
        p.gainXp(30 + p.level * 15);
        if (npc) npc.relation = Math.min(100, (npc.relation || 0) + 4);
        showToast(`오늘의 수련을 마쳤다: ${planTitle(plan)}`, '🎓');
        play('quest');
        saveGame();
    };
    if (lines) playScene(planTitle(plan), lines, reward); else reward();
}

// ---------- 쉬는 날 · 구경하는 날 · 내기 ----------

function rest(npc, plan, d) {
    log().rests.push(d.id);
    fadeScreen(d.fade, () => {
        const p = state.player;
        state.dayTime = Math.min(0.78, state.dayTime + 0.12);
        p.hp = p.maxHp;
        p.hunger = Math.min(100, p.hunger + 30);
        for (const k in p.cooldowns) p.cooldowns[k] = 0;
    }, () => playScene(d.title, d.lines, () => finish(plan, null), { place: d.place }));
}

function watch(npc, plan, d) {
    log().watched = true;
    const cheer = (name) => { close(); playScene(d.title, [...d.cheer[name], ...d.done], () => {
        const who = anyNpc(name);
        if (who) who.relation = Math.min(100, (who.relation || 0) + 5);
        finish(plan, null);
    }); };
    ask(npc, d.prompt, [
        { label: `${npcName('Nara')}를 응원한다`, onSelect: () => cheer('Nara') },
        { label: `${npcName('Tiamat')}을 응원한다`, onSelect: () => cheer('Tiamat') },
    ]);
}

function race(npc, plan, d) {
    // 나라가 이 지도에 없으면 불러온다 (수련이 끝나면 일과대로 제 갈 길을 간다)
    const nara = anyNpc('Nara');
    if (!state.entities.npcs.includes(nara)) { nara.x = npc.x + 90; nara.y = npc.y + 40; state.entities.npcs.push(nara); }
    const hp = 40 + state.player.level * 14;
    startDrill(npc, { type: 'TARGETS', count: d.dummies, hp, time: 60 }, {
        rival: nara, rivalKills: 0, rivalDps: hp / 5,
        onEnd: (won) => playScene(d.title, won ? d.win : d.lose, () => finish(plan, null)),
    });
}

// ---------- 매 프레임 (main.js) ----------

let shown = '';
export function updateTraining() {
    const plan = todaysPlan();
    // 추적창은 퀘스트가 바뀔 때만 다시 그려진다. 일과가 바뀐 것도 알려 준다
    const sig = plan ? `${plan.day}|${plan.kind}|${plan.stage}|${plan.n}|${plan.reached}` : '';
    if (sig !== shown) { shown = sig; questsChanged(); }
    if (!plan || plan.stage !== 'active' || state.isDialogueOpen) return;
    const p = state.player, npc = master(), d = def(plan);

    // 기본기는 systems/story.js 가 굴린다. 끝났는지만 본다
    if (plan.kind === 'DRILL') {
        if (!state.activity) plan.stage = state.story.lessonDay === state.day ? 'done' : 'offered';
        return;
    }
    if (!npc || state.companion !== npc) return;
    // 구경만 하는 날: 제자가 죽게 생겼을 때만 나선다
    npc.passive = !!d.passive && p.hp > p.maxHp * 0.35;

    if (plan.kind === 'HUNT_CLEAN') {
        if (p.hp < plan.lastHp - 0.5 && plan.n > 0) { plan.n = 0; npc.say(pick(d.onHit)); }
        plan.lastHp = p.hp;
    }
    if (plan.kind === 'HUNT_ELITE' && !plan.spawned && isWild(state.mapId)) {
        plan.spawned = true;
        const a = rand(0, Math.PI * 2);
        state.entities.enemies.push(new Enemy(p.x + Math.cos(a) * 520, p.y + Math.sin(a) * 380, mapEnemies()[0], true));
        npc.say(d.spotted);
    }
    if (plan.kind === 'TRIP' && state.mapId === d.map && !inDungeon()) { log().trips.push(d.id); finish(plan, d.done); }
    // 굴에서는 장면을 틀지 않는다. 밖에 나오면 마무리한다
    if (plan.kind === 'DELVE' && plan.reached && !inDungeon()) finish(plan, d.done.slice(1));
}

const isWild = (id) => id !== 'VILLAGE' && MAPS[id] && MAPS[id].enemyCap && !MAPS[id].safe;

// ---------- 퀘스트 쪽에 끼워 넣는 것 (추적창 · 일지 · 머리 위 표시 · 통지) ----------

function onNotify(type, target) {
    const plan = state.story.plan;
    if (!plan || plan.stage !== 'active') return;
    const npc = master(), d = def(plan);
    if (!npc || state.companion !== npc) return;
    if (plan.kind === 'HUNT_CLEAN' && type === 'kill' && target !== 'PREY' && target !== 'DUMMY') {
        plan.n++;
        if (plan.n >= d.count) finish(plan, d.done);
        else npc.say(plan.n === 1 ? d.count1 : d.count2);
    }
    if (plan.kind === 'HUNT_ELITE' && type === 'elite') finish(plan, d.done);
    // 굴 속에서는 장면을 틀지 않는다. 한마디만 하고, 밖에 나오면 마무리 장면이 나온다
    if (plan.kind === 'DELVE' && type === 'delve' && target >= d.depth && !plan.reached) { plan.reached = true; npc.say(d.done[0].text); }
}

function where() {
    const at = planFor('Kairon');
    return at ? ` (지금 ${at.mapName})` : '';
}

function hintOf(plan) {
    if (plan.stage === 'offered') return `${npcName('Kairon')}을 찾아가 오늘 할 일을 듣는다.${where()}`;
    if (plan.kind === 'DRILL') return '스승이 낸 과제를 해낸다.';
    if (plan.kind === 'DELVE' && plan.reached) return '굴 밖으로 나온다.';
    return def(plan).hint;
}

function progressOf(plan) {
    if (plan.stage !== 'active') return '';
    if (plan.kind === 'HUNT_CLEAN') return `${plan.n} / ${def(plan).count}`;
    return '';
}

setTrainingHooks({
    notify: onNotify,
    /** 추적 중인 퀘스트가 없을 때 추적창에 뜬다 */
    line() {
        const plan = todaysPlan();
        if (!plan || plan.stage === 'done') return null;
        const title = plan.stage === 'offered' ? '오늘의 수련' : `오늘의 수련: ${planTitle(plan)}`;
        return { title, goal: hintOf(plan), text: progressOf(plan), complete: false, more: 0 };
    },
    /** 일지 [퀘스트] 맨 위 한 줄 */
    row() {
        const plan = todaysPlan();
        if (!plan) return null;
        const done = plan.stage === 'done';
        return {
            id: 'training', title: plan.stage === 'offered' ? '오늘은 무엇을 할까' : planTitle(plan), giver: npcName('Kairon'),
            summary: '스승은 하루에 하나만 가르친다. 무엇을 할지는 그날 스승이 정한다.',
            hint: done ? '오늘 수련은 끝났다. 자고 나면 내일 것이 정해진다.' : hintOf(plan),
            goal: done ? '-' : hintOf(plan), reward: '경험치 · 스승의 호감',
            progress: done ? '완료' : plan.stage === 'active' ? (progressOf(plan) || '진행 중') : '스승에게 가자',
            chapter: '', done, complete: false, tracked: false,
        };
    },
    marker: (npc) => npc.config.name === 'Kairon' && trainingPending() ? '!' : null,
});
