import { state } from '../core/state.js';
import { GROWTH_NODES, NODES_BY_ID } from '../data/growth.js';
import { SKILLS, SKILL_RANKS, MAX_SKILL_RANK } from '../data/skills.js';
import { showToast } from '../ui/toast.js';
import { play } from './audio.js';

// 성장 포인트 한 주머니로 성장 트리(data/growth.js)와 스킬 강화를 모두 쓴다.
// state.growth = { points: 남은 포인트, nodes: { 노드id: 찍은 단수 }, ranks: { 스킬id: 강화 단수 } }
export const POINTS_PER_LEVEL = 2;
export const POINTS_PER_STAGE = 3;

function G() {
    if (!state.growth) state.growth = { points: 0, nodes: {}, ranks: {} };
    return state.growth;
}

// ---------- 성장 트리 ----------
export function nodeRank(id) { return G().nodes[id] || 0; }

/** 수치 보정의 합. 'hp' 는 찍는 순간 maxHp 에 바로 더하므로 여기서 세지 않는다 */
export function stat(name) {
    let sum = 0;
    for (const n of GROWTH_NODES) if (n.stat === name) sum += nodeRank(n.id) * n.per;
    return sum;
}

/** 꼭대기 노드의 특별 효과를 찍었는지 ('SCORN' | 'UNDYING' | 'GALE') */
export function hasPerk(flag) {
    const n = GROWTH_NODES.find(x => x.flag === flag);
    return !!n && nodeRank(n.id) > 0;
}

/** 이 노드를 지금 찍을 수 있는지. 못 찍으면 이유를 돌려준다 */
export function nodeStatus(node) {
    const rank = nodeRank(node.id);
    const stageIndex = state.player ? state.player.stageIndex : 0;
    if (rank >= node.max) return { rank, can: false, reason: '최대' };
    if (stageIndex < node.tier) return { rank, can: false, reason: `${STAGE_LABEL[node.tier]} 필요` };
    if (node.need && nodeRank(node.need[0]) < node.need[1]) {
        return { rank, can: false, reason: `${NODES_BY_ID[node.need[0]].name} ${node.need[1]}단 필요` };
    }
    if (G().points < node.cost) return { rank, can: false, reason: `포인트 ${node.cost} 필요` };
    return { rank, can: true, reason: null };
}

const STAGE_LABEL = ['해츨링', '어린 용', '성체', '고룡', '삼원룡'];

export function investNode(id) {
    const node = NODES_BY_ID[id];
    const st = nodeStatus(node);
    if (!st.can) { showToast(st.reason === '최대' ? '이미 끝까지 키웠습니다.' : `${st.reason}`, '🌱'); return false; }
    const g = G();
    g.points -= node.cost;
    g.nodes[id] = st.rank + 1;
    if (node.stat === 'hp') {   // 최대 체력만은 찍는 즉시 몸에 반영한다 (세이브에도 그대로 실린다)
        state.player.maxHp += node.per;
        state.player.hp += node.per;
    }
    showToast(`[${node.name}] ${g.nodes[id]}단. ${node.desc(g.nodes[id])}`, '🌱');
    play('level');
    return true;
}

// ---------- 스킬 강화 ----------
/** 배우지 않았으면 0, 배웠으면 1 이상 */
export function skillRank(id) {
    if (!state.player || !state.player.skills.includes(id)) return 0;
    return G().ranks[id] || 1;
}
export function skillPower(id) { return SKILL_RANKS[skillRank(id) - 1].power; }
export function skillCdMult(id) { return SKILL_RANKS[skillRank(id) - 1].cd * (1 - stat('cdr')); }
export function skillUpgradeCost(id) {
    const r = skillRank(id);
    return r >= MAX_SKILL_RANK ? null : SKILL_RANKS[r].cost;
}

export function upgradeSkill(id) {
    const cost = skillUpgradeCost(id);
    if (cost === null) { showToast('이미 끝까지 익힌 기술입니다.', '📖'); return false; }
    const g = G();
    if (g.points < cost) { showToast(`성장 포인트가 ${cost} 필요합니다.`, '📖'); return false; }
    g.points -= cost;
    g.ranks[id] = skillRank(id) + 1;
    showToast(`[${SKILLS[id].name}] ${g.ranks[id]}단. 위력 ↑ 대기 시간 ↓`, '📖');
    play('level');
    return true;
}

// ---------- 포인트 ----------
export function points() { return G().points; }

export function grantPoints(n, why) {
    G().points += n;
    if (why) showToast(`${why}. 성장 포인트 +${n} ([G] 성장)`, '🌟');
}

/** 이미 쓴 포인트의 합. 옛 세이브를 불러올 때 남은 포인트를 되짚는 데 쓴다 */
function spentPoints() {
    const g = G();
    let sum = 0;
    for (const n of GROWTH_NODES) sum += (g.nodes[n.id] || 0) * n.cost;
    for (const id in g.ranks) for (let r = 1; r < g.ranks[id]; r++) sum += SKILL_RANKS[r].cost;
    return sum;
}

/**
 * 성장 트리가 없던 세이브를 불러왔을 때 지금까지 쌓였어야 할 포인트를 채워 준다.
 * applySave() 가 플레이어 레벨·단계를 복원한 뒤에 호출한다.
 */
export function reconcilePoints() {
    const p = state.player;
    const earned = (p.level - 1) * POINTS_PER_LEVEL + p.stageIndex * POINTS_PER_STAGE;
    G().points = Math.max(0, earned - spentPoints());
}
