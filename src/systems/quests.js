import { state } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { QUESTS } from '../data/quests.js';
import { showToast } from '../ui/toast.js';

// state.quests = { active: { [id]: 진행도 }, done: [id, ...] }
let onChange = () => {};
/** 퀘스트 상태가 바뀔 때 호출될 함수 (추적창 갱신용) */
export function setQuestListener(fn) { onChange = fn; }

function goalCount(q) { return q.goal.count || 1; }

/** 현재 진행도. collect 는 가방 속 고기 수로 계산 */
export function questProgress(q) {
    if (q.goal.type === 'collect') return Math.min(goalCount(q), state.player.inventory.meat);
    return Math.min(goalCount(q), state.quests.active[q.id] || 0);
}
export function isComplete(q) { return questProgress(q) >= goalCount(q); }
export function activeQuests() { return QUESTS.filter(q => q.id in state.quests.active); }

/** 이미 이룬 목표(성장 단계, 죽은 보스)는 받자마자 채운다 */
function presetProgress(q) {
    const g = q.goal;
    if (g.type === 'stage' && state.player.stageIndex >= g.index) return 1;
    if (g.type === 'boss' && state.bossesDefeated[g.id]) return 1;
    return 0;
}

/** 게임 곳곳에서 호출: notify('kill', 'SLIME') / ('stage', 1) / ('boss', 'MORGATH') / ('hatch' | 'raid' | 'spar' | 'tag' | 'upgrade' | 'chest') */
export function notify(type, target) {
    for (const q of activeQuests()) {
        const g = q.goal;
        if (g.type !== type || isComplete(q)) continue;
        if (type === 'kill' && g.target !== target) continue;
        if (type === 'boss' && g.id !== target) continue;
        if (type === 'stage' && target < g.index) continue;
        state.quests.active[q.id]++;
        if (isComplete(q)) showToast(`[${q.title}] 목표 달성! ${q.giver}에게 돌아가자`, '📜');
    }
    onChange();
}

function offerFor(npc) {
    const Q = state.quests;
    return QUESTS.find(q => q.giver === npc.config.name && !(q.id in Q.active) && !Q.done.includes(q.id)
        && (!q.requires || Q.done.includes(q.requires)));
}
function activeFor(npc) { return activeQuests().find(q => q.giver === npc.config.name); }

/** NPC 머리 위 표시: '?' 완료 보고 가능, '!' 새 퀘스트, 없으면 null */
export function questMarker(npc) {
    if (!npc.config.name || !state.quests) return null;
    const a = activeFor(npc);
    if (a) return isComplete(a) ? '?' : null;
    return offerFor(npc) ? '!' : null;
}

function accept(q) {
    state.quests.active[q.id] = presetProgress(q);
    showToast(`퀘스트 수락: ${q.title}`, '📜');
    onChange();
}

function turnIn(q, npc) {
    const p = state.player, r = q.reward;
    if (q.goal.type === 'collect') p.inventory.meat -= q.goal.count;
    delete state.quests.active[q.id];
    state.quests.done.push(q.id);
    if (r.meat) p.inventory.meat += r.meat;
    if (r.relation) npc.relation = clamp((npc.relation || 0) + r.relation, 0, 100);
    showToast(`퀘스트 완료: ${q.title}` + (r.meat ? ` (고기 +${r.meat})` : '') + (r.relation ? ' (호감 ↑)' : ''), '🎉');
    if (r.xp) p.gainXp(r.xp);
    onChange();
}

/**
 * 이 NPC와 퀘스트 대화가 있으면 { text, options:[{label, action}] } 를 돌려준다. action: () => 'close' | 'talk'
 * 없으면 null (평소 대화로 넘어간다)
 */
export function questDialogue(npc) {
    const a = activeFor(npc);
    if (a && isComplete(a)) {
        return { text: a.done, options: [{ label: '보상 받기', action: () => { turnIn(a, npc); return 'close'; } }] };
    }
    if (a) {
        return {
            text: `[${a.title}] 아직이냐? (${questProgress(a)}/${goalCount(a)})`,
            options: [{ label: '금방 해올게요.', action: () => 'close' }, { label: '다른 얘기를 하자.', action: () => 'talk' }],
        };
    }
    const q = offerFor(npc);
    if (!q) return null;
    return {
        text: q.offer,
        options: [
            { label: `수락한다 — ${q.title}`, action: () => { accept(q); return 'close'; } },
            { label: '다른 얘기를 하자.', action: () => 'talk' },
        ],
    };
}

/** 추적창에 보여줄 줄들 */
export function questLines() {
    return activeQuests().map(q => ({
        title: q.title,
        text: isComplete(q) ? `완료! → ${q.giver}` : `${questProgress(q)} / ${goalCount(q)}`,
        complete: isComplete(q),
    }));
}
