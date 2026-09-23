import { state } from '../core/state.js';
import { npcName } from '../data/npcs.js';
import { planFor } from './routine.js';
import { clamp } from '../core/utils.js';
import { QUESTS, ACT_NAMES, questById } from '../data/quests.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { mapName } from '../data/maps.js';
import { STAGES } from '../data/elements.js';
import { showToast } from '../ui/toast.js';
import { questBanner } from '../ui/questBanner.js';

// 퀘스트 하나는 여러 '대목'으로 이어진다.
//
//   숫자 하나를 채우면 끝나는 부탁은 이제 퀘스트가 아니다. 그건 마을 게시판의 잡일로 나갔다
//   (data/chores.js). 퀘스트는 대목을 하나씩 넘기며 이야기가 굴러가는 것만 남긴다.
//
//   대목을 끝내면 그 자리에서 장면이 재생되고(step.scene) 다음 대목이 열린다.
//   추적창과 일지에는 지금 대목 하나만 보인다. 그래서 여러 개를 동시에 떠안은 느낌이 안 난다.
//
// state.quests = {
//   active:  { [퀘스트 id]: { step: 지금 몇 번째 대목, n: 그 대목의 진행도 } }
//   done:    [끝낸 id]
//   tracked: 추적창에 띄울 id | null
//   choices: { [퀘스트 id]: 고른 선택지 id }   — 나중 대사·사건이 이걸 읽는다
// }

let onChange = () => {};
/** 퀘스트 상태가 바뀔 때 호출될 함수 (추적창·로그 갱신용) */
export function setQuestListener(fn) { onChange = fn; }
/** 퀘스트 바깥에서 추적창에 뜨는 것이 바뀌었을 때 (systems/training.js) */
export function questsChanged() { onChange(); }

/** 한 번에 떠안을 수 있는 퀘스트 수. 이야기 하나에 집중하게 하는 문턱 */
const MAX_ACTIVE = 2;

// ---------- 대목 ----------

/** 대목 목록. steps 가 없는 옛 모양(goal 하나)도 그대로 돈다 */
export function steps(q) { return q.steps || [q]; }
function entry(q) { return state.quests.active[q.id]; }
export function stepIndex(q) { const e = entry(q); return e ? e.step : 0; }
/** 지금 해야 할 대목 (다 끝냈으면 null) */
export function curStep(q) { return steps(q)[stepIndex(q)] || null; }
/** 대목을 다 끝내서 보고만 남은 상태 */
export function isComplete(q) { return !!entry(q) && stepIndex(q) >= steps(q).length; }
export function activeQuests() { return QUESTS.filter(q => q.id in state.quests.active); }

function goalCount(g) { return (g && g.count) || 1; }

/** 가방을 세는 목표 — 건네주는 것은 진행도가 아니라 지금 가진 수를 본다 */
function fromBag(g) { return g.type === 'collect' || g.type === 'bring'; }

/** 지금 대목의 진행도 */
export function questProgress(q) {
    const st = curStep(q);
    if (!st) return 0;
    if (fromBag(st.goal)) return Math.min(goalCount(st.goal), state.player.inventory.meat);
    return Math.min(goalCount(st.goal), (entry(q) || {}).n || 0);
}
/** 지금 대목의 목표 수 */
export function stepTotal(q) { const st = curStep(q); return st ? goalCount(st.goal) : 1; }
/** 지금 대목까지 다 채웠나 (보고 대기와는 다르다) */
function stepFilled(q) { return questProgress(q) >= stepTotal(q); }

/** 보고하러 갈 용. 따로 적지 않으면 의뢰인이다 */
export function turnInNpc(q) { return q.turnIn || q.giver; }

// ---------- 목표를 한 줄로 ----------

/** 목표 한 줄 ("슬라임 3마리 처치" 처럼). 게시판 잡일도 이걸 쓴다 */
export function goalText(g) {
    const n = goalCount(g);
    switch (g.type) {
        case 'kill': return `${g.target === 'HUNTER' ? '인간 사냥꾼' : (ENEMIES[g.target] || {}).name || g.target} ${n}마리 처치`;
        case 'killAny': return `아무 적이나 ${n}마리 처치`;
        case 'elite': return `정예 몬스터 ${n}마리 처치`;
        case 'boss': return `${BOSSES[g.id].name} 처치`;
        case 'stage': return `[${STAGES[g.index].name}](으)로 성장`;
        case 'collect': return `고기 ${n}개 모으기`;
        case 'bring': return `${npcName(g.target)}에게 고기 ${n}개 건네기`;
        case 'talk': return `${npcName(g.target)}에게 말 걸기`;
        case 'tour': return '마을 둘러보기';
        case 'event': return '그 자리에 가 있기';
        case 'visit': return `${mapName(g.target)} 방문`;
        case 'sleep': return n > 1 ? `${n}밤 자고 나기` : '하룻밤 자고 나기';
        case 'hatch': return `알 ${n}개 부화`;
        case 'raid': return `마을 습격 ${n}회 격퇴`;
        case 'spar': return `대련 ${n}회 승리`;
        case 'tag': return `술래잡기 ${n}회 승리`;
        case 'upgrade': return `비늘 단련 ${n}회`;
        case 'chest': return `보물상자 ${n}개 개봉`;
        case 'delve': return `굴의 지하 ${n}층까지 내려가기`;
        default: return '목표';
    }
}
/** 지금 대목의 목표 한 줄 */
export function stepGoalText(q) { const st = curStep(q); return st ? goalText(st.goal) : '보고하러 간다'; }

/** 보상 한 줄 */
export function rewardText(q) {
    const r = q.reward || {}, parts = [];
    if (r.xp) parts.push(`경험치 ${r.xp}`);
    if (r.gold) parts.push(`${r.gold}G`);
    if (r.meat) parts.push(`고기 ${r.meat}`);
    if (r.relation) parts.push('호감도 상승');
    return parts.join(' · ') || '-';
}

// ---------- 장면 대기줄 ----------
// 대목을 끝낸 자리가 싸움 한복판일 수 있다. 장면은 대기줄에 넣어 두고,
// systems/chronicle.js 가 조용해진 틈에 꺼내 재생한다 (사건 장면과 같은 문턱을 쓴다).

function queueScene(title, lines) {
    if (!state.questScenes) state.questScenes = [];
    state.questScenes.push({ title, lines });
}
/** 재생할 장면이 있으면 하나 꺼낸다 (systems/chronicle.js 가 호출) */
export function takeQuestScene() {
    const q = state.questScenes;
    return q && q.length ? q.shift() : null;
}

// ---------- 대목 넘기기 ----------

/**
 * 지금 대목을 끝내고 다음으로 넘긴다.
 *   quiet: 장면을 부르는 쪽이 직접 재생한다 (대화 중에 끝낸 대목)
 */
export function completeStep(q, { quiet = false } = {}) {
    const e = entry(q);
    if (!e) return null;
    const st = steps(q)[e.step];
    if (!st) return null;
    e.step++;
    e.n = 0;
    if (!quiet && st.scene) queueScene(q.title, st.scene);
    if (st.flag) onFlag(st.flag);
    if (st.toast) showToast(st.toast, st.icon || '📜');
    if (isComplete(q)) questBanner('다음 할 일', q.title, `${npcName(turnInNpc(q))}에게 돌아간다${whereIs(turnInNpc(q))}`);
    else questBanner('다음 할 일', q.title, curStep(q).hint || stepGoalText(q));
    catchUp(q);
    onChange();
    return st;
}

/** 이미 이룬 목표(잡아 둔 보스, 다 자란 몸, 가 본 곳)는 받자마자 넘긴다 */
function catchUp(q) {
    for (let guard = 0; guard < steps(q).length; guard++) {
        const st = curStep(q);
        if (!st) return;
        const g = st.goal;
        const already = (g.type === 'boss' && state.bossesDefeated[g.id])
            || (g.type === 'stage' && state.player.stageIndex >= g.index)
            || (g.type === 'visit' && (state.visited || []).includes(g.target));
        if (!already) return;
        const e = entry(q);
        e.step++; e.n = 0;
        if (st.scene) queueScene(q.title, st.scene);
    }
}

/**
 * 게임 곳곳에서 호출. 지금 대목의 목표와 맞으면 진행도가 오른다.
 *   notify('kill', 'SLIME') / ('stage', 1) / ('boss', 'MORGATH') / ('visit', 'DESERT')
 *   ('talk', 'Gron') / ('sleep') / ('hatch' | 'raid' | 'spar' | 'tag' | 'upgrade' | 'chest' | 'delve')
 * 건네주는 목표(collect·bring)는 여기가 아니라 handOver() 로 끝낸다.
 */
export function notify(type, target) {
    for (const q of activeQuests()) {
        const st = curStep(q);
        if (!st || fromBag(st.goal)) continue;
        const g = st.goal;
        if (g.type !== type) continue;
        if ((type === 'kill' || type === 'visit' || type === 'talk' || type === 'event') && g.target !== target) continue;
        if (type === 'boss' && g.id !== target) continue;
        if (type === 'stage' && target < g.index) continue;
        const e = entry(q);
        // 'delve' 는 쌓이는 게 아니라 "가장 깊이 내려간 층"이다
        if (type === 'delve') e.n = Math.max(e.n || 0, target);
        else e.n = (e.n || 0) + 1;
        if (stepFilled(q)) completeStep(q);
    }
    choreNotify(type, target);
    training.notify(type, target);
    onChange();
}

// 게시판 잡일도 같은 통지를 듣는다. systems/chores.js 가 시작할 때 자기를 끼워 넣는다
// (quests → chores 로 거꾸로 import 하면 두 파일이 서로를 물어 버린다)
// 대목을 끝내며 세상이 바뀌는 일 (st.flag). systems/story.js 가 받아서 처리한다
let onFlag = () => {};
export function setFlagListener(fn) { onFlag = fn; }
/** 사건의 선택지도 깃발을 세운다 (systems/chronicle.js) */
export function raiseFlag(flag) { onFlag(flag); }

let choreNotify = () => {};
export function setChoreNotify(fn) { choreNotify = fn; }

// 스승의 하루 일과도 퀘스트처럼 추적창·일지·머리 위 표시에 뜬다. systems/training.js 가 자기를 끼워 넣는다
let training = { notify() {}, line: () => null, row: () => null, marker: () => null };
export function setTrainingHooks(hooks) { training = hooks; }

// ---------- 말을 걸어서 넘기는 대목 ----------

/** 이 용에게 물어보려던 대목이 있으면 그 퀘스트 (systems/npcActions.js) */
export function talkQuestFor(npc) {
    const name = npc.config.name;
    return activeQuests().find(q => { const st = curStep(q); return st && st.goal.type === 'talk' && st.goal.target === name; });
}
/** 이 용에게 건네주려던 대목이 있으면 그 퀘스트 */
export function bringQuestFor(npc) {
    const name = npc.config.name;
    return activeQuests().find(q => { const st = curStep(q); return st && st.goal.type === 'bring' && st.goal.target === name; });
}
/** 고기를 건네고 대목을 넘긴다. 모자라면 false */
export function handOver(q) {
    const st = curStep(q);
    if (!st || !fromBag(st.goal) || !stepFilled(q)) return false;
    state.player.inventory.meat -= goalCount(st.goal);
    return true;
}

// ---------- 받고, 보고하고 ----------

/** 지금 이 NPC가 건넬 수 있는 부탁. 없으면 null */
export function offerFor(npc) {
    const cand = findOffer(npc);
    if (!cand) return null;
    if (activeQuests().length >= MAX_ACTIVE) return null;
    // 본 이야기가 굴러가는 동안 곁가지는 기다린다. 다섯 용이 한꺼번에 부탁하면 정신이 없다
    if (cand.act !== 'main' && activeQuests().some(q => q.act === 'main')) return null;
    return cand;
}
/** 문턱에 걸려 아직 안 꺼내는 부탁 (NPC가 "그 일이 먼저지" 하고 한마디 한다) */
export function heldOffer(npc) { return offerFor(npc) ? null : findOffer(npc); }

function findOffer(npc) {
    const Q = state.quests;
    return QUESTS.find(q => !q.auto && q.giver === npc.config.name && !(q.id in Q.active) && !Q.done.includes(q.id)
        && (!q.requires || Q.done.includes(q.requires))
        && (!q.needs || q.needs(state)));      // 스승의 부탁은 수련 진도를 따라 열린다
}

/** 그 용이 지금 어디 있는지 (' (지금 수련장)') · 일과를 모르는 용이면 빈 문자열 */
function whereIs(name) {
    const plan = planFor(name);
    return plan ? ` (지금 ${plan.mapName})` : '';
}

/** 추적창의 📍 줄: 이 대목에서 찾아가야 할 용이 지금 어디 있는지 */
function whereLine(q) {
    let who = null;
    if (isComplete(q)) who = turnInNpc(q);
    else { const g = curStep(q).goal; if (g.type === 'talk' || g.type === 'bring') who = g.target; }
    if (!who) return '';
    const plan = planFor(who);
    return plan ? `${npcName(who)} · ${plan.mapName}` : '';
}

/** 의뢰인 이름과, 일과를 아는 용이라면 지금 어디 있는지까지 */
function giverLine(name) {
    const plan = planFor(name);
    return plan ? `${npcName(name)} (지금 ${plan.mapName})` : npcName(name);
}

/** 이 NPC가 준 진행 중인 퀘스트 (대화창에 진행도를 한 줄 깔아 준다) */
export function runningFor(npc) { return activeQuests().find(q => q.giver === npc.config.name && !isComplete(q)); }
/** 이 NPC에게 보고할 수 있는 퀘스트 */
export function reportableFor(npc) { return activeQuests().find(q => isComplete(q) && turnInNpc(q) === npc.config.name); }

/**
 * 맡은 일이 없을 때 "다음에 할 만한 일". 처음 하는 사람이 퀘스트 하나를 끝내고 멍하니 서 있지 않게.
 *   { who: 말을 걸 용 | null, title, goal }
 */
export function suggestion() {
    const Q = state.quests;
    if (!Q) return null;
    const ready = (q) => !(q.id in Q.active) && !Q.done.includes(q.id) && (!q.requires || Q.done.includes(q.requires)) && (!q.needs || q.needs(state));
    // 본 이야기는 누구에게 가면 되는지 바로 알려 주고, 곁가지 부탁은 "누군가 할 말이 있는 눈치" 정도로만 귀띔한다
    // — 다 알려 주면 마을을 돌아다니며 찾아내는 재미가 없다
    const main = QUESTS.find(q => !q.auto && q.act === 'main' && ready(q));
    if (main) {
        const plan = planFor(main.giver);
        return { who: main.giver, main: true, title: `${npcName(main.giver)}에게 말을 걸어 보자`, goal: plan ? `지금 ${plan.mapName}에 있다 · ${plan.doing}` : '마을 어딘가에 있다' };
    }
    // 돌아다니다 저절로 열리는 본 이야기. 어디로 가야 열리는지는 lead 가 귀띔한다 (그론이 죽은 뒤 사막으로 가야 하는 걸 아무도 안 알려 주던 것)
    const auto = QUESTS.find(q => q.auto && q.act === 'main' && q.lead && ready(q));
    if (auto) return { who: null, main: true, place: auto.lead.map, title: auto.lead.text, goal: `${mapName(auto.lead.map)} 쪽으로 가 본다` };
    const side = QUESTS.filter(q => !q.auto && ready(q));
    if (side.length) {
        const where = [...new Set(side.map(q => { const p = planFor(q.giver); return p ? p.mapName : null; }).filter(Boolean))];
        return { who: side[0].giver, main: false, title: '누군가 할 말이 있는 눈치다', goal: `마을 용들에게 말을 걸어 보자. 머리 위에 ! 가 뜬 용이 있다${where.length ? ` (${where.slice(0, 2).join(' · ')} 쪽)` : ''}` };
    }
    const t = training.line();
    if (t) return { who: 'Kairon', title: '오늘의 수련', goal: t.goal || '카이론을 찾아간다' };
    if (QUESTS.some(q => q.auto && ready(q))) return { who: null, title: '세상을 돌아다녀 보자', goal: '숲길·호수를 걷다 보면 다음 이야기가 열린다. 굴을 파 보거나 마을 용들과 이야기해도 좋다' };
    return { who: null, title: '한숨 돌리자', goal: '굴을 꾸미거나, 게시판의 잡일을 맡거나, 마을 용들과 이야기해 보자' };
}

/** NPC 머리 위 표시: '?' 지금 찾아갈 곳, '!' 새 부탁, 없으면 null */
export function questMarker(npc) {
    if (!npc.config.name || !state.quests) return null;
    if (reportableFor(npc) || talkQuestFor(npc) || bringQuestFor(npc)) return '?';
    return offerFor(npc) ? '!' : training.marker(npc);
}

/** 추적할 퀘스트를 바꾼다 (로그에서 클릭) */
export function setTracked(id) {
    state.quests.tracked = state.quests.tracked === id ? null : id;
    onChange();
}

/** 지금 추적 중인 퀘스트. 지정한 게 없으면 완료된 것 → 가장 먼저 받은 것 순으로 고른다 */
export function trackedQuest() {
    const act = activeQuests();
    if (!act.length) return null;
    const pinned = act.find(q => q.id === state.quests.tracked);
    return pinned || act.find(q => isComplete(q)) || act[0];
}

export function acceptQuest(q) {
    if (q.id in state.quests.active || state.quests.done.includes(q.id)) return;
    state.quests.active[q.id] = { step: 0, n: 0 };
    catchUp(q);
    if (!state.quests.tracked) state.quests.tracked = q.id;
    questBanner('새 이야기', q.title, isComplete(q) ? `${npcName(turnInNpc(q))}에게 돌아간다` : (curStep(q).hint || stepGoalText(q)));
    onChange();
}

/** 정체의 단서를 적어 둔다 (일지 [기록]). chronicle.js 의 것과 같은 자리 */
function addClue(id) {
    if (!state.story.clues) state.story.clues = [];
    if (!state.story.clues.includes(id)) state.story.clues.push(id);
}

/**
 * 보고하고 보상을 받는다.
 *   choiceId: 마무리에서 고른 선택지 (q.choice). state.quests.choices 에 남아
 *             나중 대사·사건이 읽는다
 */
export function turnInQuest(q, npc, choiceId = null) {
    const p = state.player, r = q.reward || {};
    if (!state.quests.choices) state.quests.choices = {};
    if (choiceId) state.quests.choices[q.id] = choiceId;
    delete state.quests.active[q.id];
    state.quests.done.push(q.id);
    if (state.quests.tracked === q.id) state.quests.tracked = null;
    if (r.meat) p.inventory.meat += r.meat;
    if (r.gold) p.gold += r.gold;
    if (r.relation && npc) npc.relation = clamp((npc.relation || 0) + r.relation, 0, 100);
    if (r.clue) addClue(r.clue);
    if (r.element) p.unlockElement(r.element);      // 싸워서 얻는 게 아니라 맡겨 받는 숨결 (text/story-bible.md 5절)
    questBanner('이야기 완료', q.title, rewardText(q));
    if (r.xp) p.gainXp(r.xp);
    // 고른 선택지에 딸린 장면이 먼저, 그다음이 퀘스트 마무리 장면
    const opt = (q.choice && (q.choice.options || []).find(o => o.id === choiceId)) || null;
    if (opt && opt.scene) queueScene(q.title, opt.scene);
    if (r.scene) queueScene(q.title, r.scene);
    // 끝냈으면 다음에 할 만한 일을 한 번 귀띔한다 (추적창에도 남는다)
    if (!activeQuests().length) { const s = suggestion(); if (s) questBanner('다음에 할 만한 일', s.title, s.goal); }
    onChange();
}

/** 추적창에 보여 줄 한 개 (없으면 null) */
export function trackedLine() {
    const q = trackedQuest();
    if (!q) { const t = training.line(); return t ? { ...t, training: true } : null; }
    const total = steps(q).length;
    const done = isComplete(q);
    return {
        title: total > 1 ? `${q.title} (${Math.min(stepIndex(q) + 1, total)}/${total})` : q.title,
        goal: done ? `${npcName(turnInNpc(q))}에게 돌아간다` : (curStep(q).hint || stepGoalText(q)),
        text: done ? '' : stepTotal(q) > 1 ? `${questProgress(q)} / ${stepTotal(q)}` : '',
        where: whereLine(q),
        complete: done,
        more: activeQuests().length - 1,
    };
}

/** 퀘스트 로그용: 장별로 묶은 { act, name, rows: [...] } 목록 */
export function questLog() {
    const Q = state.quests;
    const seen = new Set();
    const groups = [];
    const today = training.row();
    if (today) groups.push({ act: 'training', name: '오늘의 수련', rows: [today] });
    for (const q of QUESTS) {
        const active = q.id in Q.active, done = Q.done.includes(q.id);
        // 아직 받지도 않았고 앞선 퀘스트도 안 끝냈으면 로그에 나오지 않는다
        if (!active && !done) continue;
        if (!seen.has(q.act)) { seen.add(q.act); groups.push({ act: q.act, name: ACT_NAMES[q.act] || q.act, rows: [] }); }
        const total = steps(q).length;
        const complete = active && isComplete(q);
        groups.find(g => g.act === q.act).rows.push({
            id: q.id, title: q.title, giver: giverLine(q.giver),
            summary: q.summary || '',
            hint: complete ? `${npcName(turnInNpc(q))}에게 돌아가 보고한다.` : active ? (curStep(q).hint || stepGoalText(q)) : '',
            goal: active && !complete ? stepGoalText(q) : '-',
            reward: rewardText(q),
            progress: done ? '완료' : complete ? '보고 대기' : `${questProgress(q)} / ${stepTotal(q)}`,
            chapter: total > 1 && active ? `대목 ${Math.min(stepIndex(q) + 1, total)} / ${total}` : '',
            // 지나온 대목과 지금 대목. 앞으로 올 대목은 숨긴다 (이야기를 미리 보이지 않게)
            steps: steps(q).map((st, i) => ({ hint: st.hint || goalText(st.goal), scene: st.scene || null, done: done || i < stepIndex(q), now: active && i === stepIndex(q) })).filter(s => s.done || s.now),
            doneText: done ? q.done : '',
            endScene: done && q.reward && q.reward.scene ? q.reward.scene : null,
            done, complete,
            tracked: Q.tracked === q.id,
        });
    }
    // 다음에 열릴 퀘스트를 '???' 로 한 줄 귀띔
    for (const g of groups) {
        const next = QUESTS.find(q => (ACT_NAMES[q.act] || q.act) === g.name && !(q.id in Q.active) && !Q.done.includes(q.id)
            && (!q.requires || Q.done.includes(q.requires)));
        if (next) g.rows.push({
            id: next.id, title: '???', giver: giverLine(next.giver), upcoming: true,
            hint: next.auto ? '아직 때가 아니다. 세상을 더 돌아다녀 보자.' : `${npcName(next.giver)}에게 말을 걸어 보자.`,
        });
    }
    return groups;
}

/** 옛 세이브 손보기: 진행도가 숫자 하나였고, 선택지 기록이 없었다 */
export function migrateQuests(Q) {
    const out = { active: {}, done: Q.done || [], tracked: Q.tracked || null, choices: Q.choices || {} };
    for (const id in (Q.active || {})) {
        const v = Q.active[id];
        out.active[id] = typeof v === 'number' ? { step: 0, n: v } : v;
    }
    // 이야기가 다시 쓰이면서 사라진 id 는 조용히 버린다 (일지에 빈 줄이 남지 않게)
    for (const id in out.active) if (!questById(id)) delete out.active[id];
    if (out.tracked && !out.active[out.tracked]) out.tracked = null;
    return out;
}

export { questById };
