import { state } from '../core/state.js';
import { npcName } from '../data/npcs.js';
import { clamp } from '../core/utils.js';
import { QUESTS, ACT_NAMES, questById } from '../data/quests.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { mapName } from '../data/maps.js';
import { STAGES } from '../data/elements.js';
import { showToast } from '../ui/toast.js';

// state.quests = { active: { [id]: 진행도 }, done: [id, ...], tracked: id|null }
// 추적창(화면 오른쪽)에는 tracked 한 개만 뜬다. 나머지는 퀘스트 로그([J] 첫 번째 탭)에서 본다.
let onChange = () => {};
/** 퀘스트 상태가 바뀔 때 호출될 함수 (추적창·로그 갱신용) */
export function setQuestListener(fn) { onChange = fn; }

function goalCount(q) { return q.goal.count || 1; }

/** 현재 진행도. collect 는 가방 속 고기 수로 계산 */
export function questProgress(q) {
    if (q.goal.type === 'collect') return Math.min(goalCount(q), state.player.inventory.meat);
    return Math.min(goalCount(q), state.quests.active[q.id] || 0);
}
export function isComplete(q) { return questProgress(q) >= goalCount(q); }
export function activeQuests() { return QUESTS.filter(q => q.id in state.quests.active); }

/** 목표 한 줄 ("슬라임 3마리 처치" 처럼) */
export function goalText(q) {
    const g = q.goal, n = goalCount(q);
    switch (g.type) {
        case 'kill': return `${g.target === 'HUNTER' ? '인간 사냥꾼' : (ENEMIES[g.target] || {}).name || g.target} ${n}마리 처치`;
        case 'killAny': return `아무 적이나 ${n}마리 처치`;
        case 'elite': return `정예 몬스터 ${n}마리 처치`;
        case 'boss': return `${BOSSES[g.id].name} 처치`;
        case 'stage': return `[${STAGES[g.index].name}](으)로 성장`;
        case 'collect': return `고기 ${n}개 전달`;
        case 'visit': return `${mapName(g.target)} 방문`;
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

/** 보상 한 줄 */
export function rewardText(q) {
    const r = q.reward, parts = [];
    if (r.xp) parts.push(`경험치 ${r.xp}`);
    if (r.gold) parts.push(`${r.gold}G`);
    if (r.meat) parts.push(`고기 ${r.meat}`);
    if (r.relation) parts.push('호감도 상승');
    return parts.join(' · ') || '-';
}

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
        if ((type === 'kill' || type === 'visit') && g.target !== target) continue;
        if (type === 'boss' && g.id !== target) continue;
        if (type === 'stage' && target < g.index) continue;
        // 'delve' 는 쌓이는 게 아니라 "가장 깊이 내려간 층"이다
        if (type === 'delve') state.quests.active[q.id] = Math.max(state.quests.active[q.id] || 0, target);
        else state.quests.active[q.id]++;
        if (isComplete(q)) showToast(`[${q.title}] 목표 달성! ${npcName(q.giver)}에게 돌아가자`, '📜');
    }
    onChange();
}

/** NPC가 직접 건네줄 수 있는 부탁. auto 퀘스트는 사건으로만 열리므로 뺀다 */
export function offerFor(npc) {
    const Q = state.quests;
    return QUESTS.find(q => !q.auto && q.giver === npc.config.name && !(q.id in Q.active) && !Q.done.includes(q.id)
        && (!q.requires || Q.done.includes(q.requires)));
}
export function activeFor(npc) { return activeQuests().find(q => q.giver === npc.config.name); }

/** NPC 머리 위 표시: '?' 완료 보고 가능, '!' 새 퀘스트, 없으면 null */
export function questMarker(npc) {
    if (!npc.config.name || !state.quests) return null;
    const a = activeFor(npc);
    if (a) return isComplete(a) ? '?' : null;
    return offerFor(npc) ? '!' : null;
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
    state.quests.active[q.id] = presetProgress(q);
    if (!state.quests.tracked) state.quests.tracked = q.id;
    showToast(`퀘스트 수락: ${q.title}  —  [J] 일지에서 내용을 볼 수 있습니다`, '📜');
    onChange();
}

export function turnInQuest(q, npc) {
    const p = state.player, r = q.reward;
    if (q.goal.type === 'collect') p.inventory.meat -= q.goal.count;
    delete state.quests.active[q.id];
    state.quests.done.push(q.id);
    if (state.quests.tracked === q.id) state.quests.tracked = null;
    if (r.meat) p.inventory.meat += r.meat;
    if (r.gold) p.gold += r.gold;
    if (r.relation && npc) npc.relation = clamp((npc.relation || 0) + r.relation, 0, 100);
    showToast(`퀘스트 완료: ${q.title} (${rewardText(q)})`, '🎉');
    if (r.xp) p.gainXp(r.xp);
    onChange();
}

/** 추적창에 보여 줄 한 개 (없으면 null) */
export function trackedLine() {
    const q = trackedQuest();
    if (!q) return null;
    return {
        title: q.title,
        goal: goalText(q),
        text: isComplete(q) ? `완료! → ${npcName(q.giver)}에게 보고` : `${questProgress(q)} / ${goalCount(q)}`,
        complete: isComplete(q),
        more: activeQuests().length - 1,
    };
}

/** 퀘스트 로그용: 장별로 묶은 { act, name, rows: [...] } 목록 */
export function questLog() {
    const Q = state.quests;
    const seen = new Set();
    const groups = [];
    for (const q of QUESTS) {
        const active = q.id in Q.active, done = Q.done.includes(q.id);
        // 아직 받지도 않았고 앞선 퀘스트도 안 끝냈으면 로그에 나오지 않는다
        if (!active && !done) continue;
        if (!seen.has(q.act)) { seen.add(q.act); groups.push({ act: q.act, name: ACT_NAMES[q.act] || q.act, rows: [] }); }
        groups.find(g => g.act === q.act).rows.push({
            id: q.id, title: q.title, giver: npcName(q.giver),
            summary: q.summary || '', hint: q.hint || '', goal: goalText(q), reward: rewardText(q),
            progress: active ? `${questProgress(q)} / ${goalCount(q)}` : '완료',
            done, complete: active && isComplete(q),
            tracked: Q.tracked === q.id,
        });
    }
    // 다음에 열릴 퀘스트를 '???' 로 한 줄 귀띔
    for (const g of groups) {
        const next = QUESTS.find(q => (ACT_NAMES[q.act] || q.act) === g.name && !(q.id in Q.active) && !Q.done.includes(q.id)
            && (!q.requires || Q.done.includes(q.requires)));
        if (next) g.rows.push({
            id: next.id, title: '???', giver: npcName(next.giver), upcoming: true,
            hint: next.auto ? '아직 때가 아니다. 세상을 더 돌아다녀 보자.' : `${npcName(next.giver)}에게 말을 걸어 보자.`,
        });
    }
    return groups;
}

export { questById };
