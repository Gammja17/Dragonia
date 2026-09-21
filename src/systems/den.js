import { state } from '../core/state.js';
import { FURNITURE, cozyTier, COZY_TIERS } from '../data/furniture.js';
import { DENS, MY_DEN, denOf } from '../data/dens.js';
import { MATERIALS } from '../data/materials.js';
import { matCount, addMaterial } from './smithing.js';
import { TILE } from '../data/tiles.js';
import { ROOM_PAD } from '../world/room.js';
import { showToast } from '../ui/toast.js';
import { play } from './audio.js';

// 굴 꾸미기.
//
//  state.furniture   가지고 있는 살림살이 { 가구id: 개수 }
//  state.denDecor    내 굴에 놓아 둔 것 [{ id, tx, ty }]  (방 안쪽 타일 좌표)
//
// 남의 굴은 data/dens.js 에 적힌 대로 고정이다. 내 굴만 손댈 수 있다.

export function isDen(mapId) { return !!DENS[mapId]; }
export function denSpec(mapId) { return DENS[mapId] || null; }
export function inMyDen() { return state.mapId === MY_DEN; }

export function owned(id) { return (state.furniture || {})[id] || 0; }
export function ownedList() {
    return Object.keys(FURNITURE).filter(id => owned(id) > 0);
}

export function giveFurniture(id, n = 1) {
    if (!FURNITURE[id]) return;
    state.furniture = state.furniture || {};
    state.furniture[id] = owned(id) + n;
    showToast(`살림살이: ${FURNITURE[id].name} +${n}`, '🪑');
}

/** 내 굴에 놓여 있는 것들 */
export function placed() { return state.denDecor || (state.denDecor = []); }

/** 굴 하나의 살림살이 목록 (내 굴이면 놓아 둔 것, 남의 굴이면 정해진 것) */
export function decorOf(mapId) {
    const spec = DENS[mapId];
    if (!spec) return [];
    if (spec.mine) return placed().map(d => ({ id: d.id, tx: d.tx, ty: d.ty }));
    return (spec.decor || []).map(([id, tx, ty]) => ({ id, tx, ty }));
}

/** 아늑함 점수 */
export function cozyOf(mapId) {
    return cozyTier(decorOf(mapId).reduce((n, d) => n + (FURNITURE[d.id] ? FURNITURE[d.id].cozy : 0), 0));
}

/** 방 안쪽 타일 좌표 → 월드 좌표 (칸 한가운데, 발끝 기준) */
export function tileToWorld(tx, ty) {
    return { x: (ROOM_PAD + tx) * TILE + TILE / 2, y: (ROOM_PAD + ty) * TILE + TILE };
}

/** 월드 좌표 → 방 안쪽 타일 좌표 */
export function worldToTile(x, y) {
    return { tx: Math.floor(x / TILE) - ROOM_PAD, ty: Math.floor((y - 1) / TILE) - ROOM_PAD };
}

/** 그 칸에 놓을 수 있나 */
export function canPlace(id, tx, ty, map, ignoreIndex = -1) {
    const f = FURNITURE[id];
    if (!f || !map || !map.room) return false;
    const [sw, sh] = f.span;
    const tw = map.tw - ROOM_PAD * 2, th = map.th - ROOM_PAD * 2;
    if (tx < 0 || ty < 0 || tx + sw > tw || ty + sh > th) return false;
    if (f.wall && ty !== 0) return false;                 // 벽에 거는 것은 맨 윗줄에만
    if (!f.wall && ty === 0) return false;                // 바닥 물건은 벽줄을 비워 둔다
    // 이미 놓인 것과 겹치면 안 된다
    return !placed().some((d, i) => {
        if (i === ignoreIndex) return false;
        const g = FURNITURE[d.id];
        if (!g) return false;
        return tx < d.tx + g.span[0] && tx + sw > d.tx && ty < d.ty + g.span[1] && ty + sh > d.ty;
    });
}

/** 놓는다. 가진 것에서 하나 뺀다 */
export function place(id, tx, ty) {
    if (owned(id) <= 0) return false;
    state.furniture[id] -= 1;
    if (state.furniture[id] <= 0) delete state.furniture[id];
    placed().push({ id, tx, ty });
    play('ui');
    return true;
}

/** 치운다. 가진 것으로 돌아온다 */
export function pickUp(index) {
    const d = placed()[index];
    if (!d) return null;
    placed().splice(index, 1);
    state.furniture = state.furniture || {};
    state.furniture[d.id] = owned(d.id) + 1;
    play('ui');
    return d;
}

/** 그 칸에 놓여 있는 것의 번호 (없으면 -1) */
export function indexAt(tx, ty) {
    return placed().findIndex(d => {
        const f = FURNITURE[d.id];
        if (!f) return false;
        return tx >= d.tx && tx < d.tx + f.span[0] && ty >= d.ty && ty < d.ty + f.span[1];
    });
}

// ---------- 엮기 (굴 안에서 직접 만든다) ----------

export function costText(id) {
    const c = FURNITURE[id].cost || {};
    const parts = [];
    if (c.gold) parts.push(`${c.gold}G`);
    for (const [m, n] of Object.entries(c)) {
        if (m === 'gold') continue;
        parts.push(`${MATERIALS[m] ? MATERIALS[m].name : m} ${matCount(m)}/${n}`);
    }
    return parts.length ? parts.join(' · ') : '그냥 주워 오면 된다';
}

export function canAfford(id) {
    const c = FURNITURE[id].cost || {};
    if ((c.gold || 0) > state.player.gold) return false;
    return Object.entries(c).every(([m, n]) => m === 'gold' || matCount(m) >= n);
}

export function craft(id) {
    if (!canAfford(id)) return false;
    const c = FURNITURE[id].cost || {};
    state.player.gold -= c.gold || 0;
    for (const [m, n] of Object.entries(c)) if (m !== 'gold') addMaterial(m, -n);
    giveFurniture(id, 1);
    play('relic');
    return true;
}

/** 굴에서 자고 일어날 때의 덤. 아늑할수록 더 낫는다 */
export function cozyRest() {
    const c = cozyOf(MY_DEN);
    return { heal: Math.min(0.5, c.score * 0.012), tier: c };
}

// 놀러 온 용이 내 굴을 보고 하는 말. 아늑함 단계마다 달라진다
const VISIT_LINES = {
    0: ['돌바닥밖에 없네. 여기서 어떻게 자?', '아직 아무것도 없구나. 천천히 채워 가면 되지.'],
    1: ['오, 뭔가 생겼네. 이제 좀 굴 같다.', '하나씩 들여놓고 있구나. 좋아.'],
    2: ['여기 앉아도 돼? 생각보다 훨씬 아늑한데.', '어라, 우리 굴보다 낫다.'],
    3: ['들어오자마자 눕고 싶어지는 굴이야.', '이 정도면 자랑해도 되겠는걸.'],
    4: ['여기는 확실히 네 집이구나.', '이만한 굴은 마을에 몇 없어. 정말이야.'],
};

/** 내 굴에서 말을 걸면, 인사 대신 굴에 대한 한마디부터 */
export function visitLine() {
    const c = cozyOf(MY_DEN);
    const tier = COZY_TIERS.findIndex(t => t[1] === c.name);
    const lines = VISIT_LINES[Math.max(0, tier)] || VISIT_LINES[0];
    return lines[Math.floor(Math.random() * lines.length)];
}

/** 이 굴에 들어갈 수 있나 (남의 굴은 사이가 어느 정도 되어야) */
export function denLocked(mapId) {
    const spec = DENS[mapId];
    if (!spec || spec.mine || !spec.locked) return null;
    const npc = state.entities.npcs.find(n => n.config.name === spec.owner);
    const rel = npc ? (npc.relation || 0) : 0;
    if (rel >= spec.locked) return null;
    return `아직 ${spec.name.replace('의 굴', '')}과(와) 그리 가까운 사이는 아니다. 함부로 들어갈 수는 없다.`;
}

export { denOf };
