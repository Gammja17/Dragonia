import { state } from '../core/state.js';
import { cam, worldToScreen } from '../core/camera.js';
import { trackedQuest, curStep, isComplete, turnInNpc, suggestion } from './quests.js';
import { planFor } from './routine.js';
import { MAPS, mapName } from '../data/maps.js';
import { DENS } from '../data/dens.js';
import { mapOpen } from '../data/chapters.js';
import { npcName } from '../data/npcs.js';
import { coarseCenter } from '../world/mapgen.js';
import { solidAt } from '../world/collision.js';
import { currentMapBounds } from '../world/terrain.js';
import { showToast } from '../ui/toast.js';

// 퀘스트 길잡이.
//
// 처음 하는 사람은 "티아맷에게 묻는다"는 글만 보고는 티아맷이 누군지, 어디 있는지 모른다.
// 지금 대목이 가리키는 곳을 찾아서:
//
//   · 그 용(또는 그 자리) 머리 위에 금빛 화살표를 띄운다
//   · 화면 밖이면 가장자리에 방향 화살표를 띄운다
//   · 미니맵에 표시한다
//   · 추적창을 누르면 그곳까지 알아서 걸어간다 (아무 방향키나 누르면 멈춘다)
//
// 딴 지도에 있으면 그 지도로 가는 문(포탈)을 가리킨다. 문을 넘으면 다음 문을 가리킨다.

let cache = null, cacheAt = -1, cacheMap = null;

// 얼마나 알려 줄까. 다 가리켜 주면 찾아내는 재미가 없고, 안 가리키면 처음 온 사람이 헤맨다.
//   'main'  본 이야기만 가리킨다 (기본). 곁가지 부탁과 "그 자리에 가 있기" 대목은 스스로 찾는다
//   'all'   맡은 일은 다 가리킨다
//   'off'   화살표를 끈다 (추적창의 글만 남는다)
const LEVEL_KEY = 'dragonia-guide';
let level = ['main', 'all', 'off'].includes(localStorage.getItem(LEVEL_KEY)) ? localStorage.getItem(LEVEL_KEY) : 'main';
export const GUIDE_LEVELS = { main: '본 이야기만', all: '맡은 일 전부', off: '끔' };
export function guideLevel() { return level; }
export function setGuideLevel(v) { level = v; try { localStorage.setItem(LEVEL_KEY, v); } catch { /* 사생활 보호 모드 */ } cacheAt = -1; }
export function cycleGuideLevel() { const keys = Object.keys(GUIDE_LEVELS); setGuideLevel(keys[(keys.indexOf(level) + 1) % keys.length]); return GUIDE_LEVELS[level]; }

/** 지도 사이의 길. 지금 지도에서 dest 로 가려면 먼저 어느 지도로 넘어가야 하는지 */
function nextHop(from, dest) {
    if (from === dest) return null;
    const prev = { [from]: null };
    const queue = [from];
    while (queue.length) {
        const id = queue.shift();
        for (const p of (MAPS[id] && MAPS[id].portals) || []) {
            const to = p.to;
            if (to in prev) continue;
            if (to !== dest && !mapOpen(state, to)) continue;   // 아직 닫힌 길로는 돌아가지 않는다
            prev[to] = id;
            if (to === dest) {
                let cur = dest;
                while (prev[cur] !== from) cur = prev[cur];
                return cur;
            }
            queue.push(to);
        }
    }
    return null;
}

/** 그 용의 집 (일과가 없는 용은 지도 명세의 자리) */
function homeOf(name) {
    for (const [id, spec] of Object.entries(MAPS)) {
        const f = (spec.fixtures || []).find(x => x.t === 'NPC' && x.name === name);
        if (f) return { map: id, x: coarseCenter(f.at[0]), y: coarseCenter(f.at[1]) };
    }
    return null;
}

function bossPlace(id) {
    for (const [mid, spec] of Object.entries(MAPS)) {
        const f = (spec.fixtures || []).find(x => x.t === 'BOSS' && x.id === id);
        if (f) return { map: mid, x: coarseCenter(f.at[0]), y: coarseCenter(f.at[1]), label: '결투장' };
    }
    return null;
}

/** 지금 대목이 가리키는 곳 { map, x, y, label, who } */
function wanted() {
    if (level === 'off') return null;
    const q = trackedQuest();
    let who = null, place = null;
    if (q) {
        if (level === 'main' && q.act !== 'main') return null;   // 곁가지는 스스로 찾는다
        if (isComplete(q)) who = turnInNpc(q);
        else {
            const st = curStep(q), g = st.goal;
            if (st.discover) return null;                          // 이 대목은 일부러 안 가리킨다
            if (st.where) place = { map: st.where.map, x: coarseCenter(st.where.spot[0]), y: coarseCenter(st.where.spot[1]), label: st.where.label || '' };
            else if (g.type === 'talk' || g.type === 'bring') who = g.target;
            else if (g.type === 'visit') place = { map: g.target };
            else if (g.type === 'boss') place = bossPlace(g.id);
            else if (g.type === 'tour') who = 'Poco';
            else if (g.type === 'stage') who = 'Kairon';
            else if (g.type === 'delve') {
                const cave = state.entities.props.find(p => p.type === 'CAVE');
                place = cave ? { map: state.mapId, x: cave.x, y: cave.y, label: '굴 입구' } : { map: 'EAST_ROAD' };
            }
            else if ((g.type === 'kill' || g.type === 'killAny' || g.type === 'elite') && (state.mapId === 'VILLAGE' || state.mapId === 'DOJO')) place = { map: 'EAST_ROAD', label: '사냥터' };
        }
    } else {
        const s = suggestion();
        if (s && s.who && s.main) who = s.who;   // 곁가지 부탁은 누가 줄지 귀띔만 하고 가리키지는 않는다
        else if (s && s.place && s.main) place = { map: s.place };   // 저절로 열리는 이야기는 그 지도로 가는 문을 가리킨다
    }
    if (who) {
        const here = state.entities.npcs.find(n => n.config.name === who && !n.remove && !n.hidden);
        if (here) return { map: state.mapId, x: here.x, y: here.y, entity: here, label: npcName(who), who };
        const plan = planFor(who) || homeOf(who);
        if (!plan) return null;
        place = { map: plan.map, x: plan.x, y: plan.y, label: npcName(who), who };
        // 굴 안에 있으면 그 굴의 입구를 가리킨다
        if (DENS[place.map]) {
            const d = DENS[place.map];
            place = { map: d.outer, x: coarseCenter(d.at[0]), y: coarseCenter(d.at[1]), label: `${npcName(who)} · ${d.name}`, who };
        }
    }
    return place;
}

/**
 * 화살표를 띄울 곳 (지금 지도 위의 좌표). 없으면 null
 *   { x, y, label, entity?, far: 딴 지도로 가는 문인가, dest: 최종 목적지 지도 }
 */
export function guideTarget() {
    if (!state.player || state.prologue || state.dungeon) return null;
    if (state.gameTime - cacheAt < 0.4 && cacheAt >= 0 && cacheMap === state.mapId) return cache;
    cacheAt = state.gameTime; cacheMap = state.mapId;
    cache = compute();
    return cache;
}

function compute() {
    const w = wanted();
    if (!w) return null;
    if (w.map === state.mapId) {
        if (w.x == null) return null;
        return { x: w.x, y: w.y, label: w.label || '', entity: w.entity || null, far: false, dest: w.map };
    }
    const hop = nextHop(state.mapId, w.map);
    if (!hop) return null;
    const gate = state.entities.props.find(p => p.portal && p.portal.to === hop);
    if (!gate) return null;
    const dest = w.who ? `${npcName(w.who)} · ${mapName(w.map)}` : mapName(w.map);
    return { x: gate.x, y: gate.y, label: `${dest} 쪽`, entity: gate, far: true, dest: w.map };
}

// ---------- 그리기 ----------

/** 목표 위의 화살표 (월드 좌표계 안에서, 크기는 줌과 무관하게) */
export function drawGuideMarker(ctx) {
    const t = guideTarget();
    if (!t || state.isDialogueOpen) return;
    const p = state.player;
    if (Math.hypot(p.x - t.x, p.y - t.y) < 90 && !t.far) return;   // 다 왔으면 치운다
    const lift = t.entity && t.entity.config ? 150 : t.entity && t.entity.portal ? 170 : 96;
    const bob = Math.sin(state.gameTime * 5) * 6;
    ctx.save();
    ctx.translate(Math.round(t.x), Math.round(t.y - lift + bob));
    ctx.scale(1 / cam.zoom, 1 / cam.zoom);
    ctx.fillStyle = '#ffd84a';
    ctx.strokeStyle = 'rgba(30,20,0,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 14); ctx.lineTo(-13, -4); ctx.lineTo(-5, -4); ctx.lineTo(-5, -18); ctx.lineTo(5, -18); ctx.lineTo(5, -4); ctx.lineTo(13, -4);
    ctx.closePath();
    ctx.stroke(); ctx.fill();
    if (t.label && !(t.entity && t.entity.config)) {   // 용은 이름표가 있으니 이름을 또 쓰지 않는다
        ctx.font = '700 12px "Mulmaru", sans-serif';
        ctx.textAlign = 'center';
        const tw = Math.ceil(ctx.measureText(t.label).width) + 14;
        ctx.fillStyle = 'rgba(10,9,16,0.85)';
        ctx.fillRect(-tw / 2, -40, tw, 19);
        ctx.fillStyle = '#ffd84a';
        ctx.fillText(t.label, 0, -26);
    }
    ctx.restore();
}

/** 화면 밖이면 가장자리에 방향 화살표 (화면 좌표계) */
export function drawGuideEdge(ctx, w, h) {
    const t = guideTarget();
    if (!t || state.isDialogueOpen || document.body.classList.contains('cutscene')) return;
    const s = worldToScreen(t.x, t.y - 40);
    const pad = 74;
    if (s.x > pad && s.x < w - pad && s.y > pad && s.y < h - pad) return;
    const cx = w / 2, cy = h / 2;
    const ang = Math.atan2(s.y - cy, s.x - cx);
    // 화면 안쪽 사각형 테두리에 붙인다
    const hw = cx - pad, hh = cy - pad;
    const k = Math.min(hw / Math.abs(Math.cos(ang) || 1e-6), hh / Math.abs(Math.sin(ang) || 1e-6));
    const x = cx + Math.cos(ang) * k, y = cy + Math.sin(ang) * k;
    const beat = 0.75 + Math.sin(state.gameTime * 6) * 0.25;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = beat;
    ctx.fillStyle = '#ffd84a';
    ctx.strokeStyle = 'rgba(30,20,0,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13); ctx.closePath();
    ctx.stroke(); ctx.fill();
    ctx.restore();
    if (t.label) {
        ctx.save();
        ctx.font = '700 12px "Mulmaru", sans-serif';
        ctx.textAlign = 'center';
        const label = t.label;
        const tw = Math.ceil(ctx.measureText(label).width) + 14;
        const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, x - Math.cos(ang) * 40));
        const ly = Math.max(24, Math.min(h - 8, y - Math.sin(ang) * 40 + 5));
        ctx.fillStyle = 'rgba(10,9,16,0.85)';
        ctx.fillRect(lx - tw / 2, ly - 14, tw, 19);
        ctx.fillStyle = '#ffd84a';
        ctx.fillText(label, lx, ly);
        ctx.restore();
    }
}

// ---------- 자동 이동 ----------
// state.nav = { map, path: [{x,y}], i, stuck, lx, ly }

const CELL = 32;

/** 격자 위에서 길을 찾는다 (너비 우선). 못 찾으면 곧장 가는 한 점짜리 길 */
function findPath(from, to) {
    const b = currentMapBounds();
    const cols = Math.ceil(b.w / CELL), rows = Math.ceil(b.h / CELL);
    const cx = (x) => Math.max(0, Math.min(cols - 1, Math.floor(x / CELL)));
    const cy = (y) => Math.max(0, Math.min(rows - 1, Math.floor(y / CELL)));
    const sx = cx(from.x), sy = cy(from.y), tx = cx(to.x), ty = cy(to.y);
    const free = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) free[y * cols + x] = solidAt(x * CELL + CELL / 2, y * CELL + CELL / 2, 14) ? 0 : 1;
    free[sy * cols + sx] = 1;
    // 목표 칸이 막혀 있으면(용이 소품 위에 서 있거나) 그 둘레의 빈 칸으로 간다
    let goal = ty * cols + tx;
    if (!free[goal]) {
        outer: for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const gx = tx + dx, gy = ty + dy;
            if (gx < 0 || gy < 0 || gx >= cols || gy >= rows || !free[gy * cols + gx]) continue;
            goal = gy * cols + gx; break outer;
        }
    }
    const prev = new Int32Array(cols * rows).fill(-1);
    const start = sy * cols + sx;
    prev[start] = start;
    const queue = [start];
    let head = 0, found = start === goal;
    while (head < queue.length && !found) {
        const cur = queue[head++];
        const x = cur % cols, y = (cur - x) / cols;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const n = ny * cols + nx;
            if (!free[n] || prev[n] >= 0) continue;
            if (dx && dy && !(free[y * cols + nx] && free[ny * cols + x])) continue;   // 모서리를 비스듬히 뚫지 않는다
            prev[n] = cur;
            if (n === goal) { found = true; break; }
            queue.push(n);
        }
    }
    if (!found) return [{ x: to.x, y: to.y }];
    const cells = [];
    for (let c = goal; c !== start; c = prev[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map(c => ({ x: (c % cols) * CELL + CELL / 2, y: Math.floor(c / cols) * CELL + CELL / 2 }));
    // 곧장 보이는 점까지는 건너뛴다 (격자 계단을 따라 지그재그로 걷지 않게)
    const out = [];
    let i = 0;
    while (i < pts.length) {
        let j = pts.length - 1;
        while (j > i + 1 && !clear(i === 0 ? from : pts[i], pts[j])) j--;
        out.push(pts[j]);
        i = j;
        if (j === pts.length - 1) break;
    }
    out[out.length - 1] = { x: to.x, y: to.y };
    return out;
}

function clear(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 14);
    for (let i = 1; i < n; i++) {
        const t = i / n;
        if (solidAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 16)) return false;
    }
    return true;
}

function plan() {
    const t = guideTarget();
    if (!t) { state.nav = null; return false; }
    const p = state.player;
    state.nav = { map: state.mapId, path: findPath(p, t), i: 0, stuck: 0, lx: p.x, ly: p.y, far: t.far };
    return true;
}

/** 추적창을 눌렀을 때. 이미 가는 중이면 멈춘다 */
export function toggleAutoNav() {
    if (state.nav) { cancelNav(); showToast('자동 이동을 멈췄다.', '🧭'); return; }
    const t = guideTarget();
    if (!t) { showToast('지금은 가리킬 곳이 없다.', '🧭'); return; }
    if (state.player.flying) { showToast('날고 있을 땐 알아서 걸어갈 수 없다.', '🧭'); return; }
    if (plan()) showToast(`${t.label || '목표'}(으)로 걸어간다. 방향키를 누르면 멈춘다.`, '🧭');
}

export function navActive() { return !!state.nav; }
export function cancelNav() { state.nav = null; }

/**
 * 이번 프레임의 이동 방향 (entities/Dragon.js 가 방향키 대신 쓴다). 안 가는 중이면 null.
 * 지도를 넘어가면 다음 문을 향해 길을 다시 찾는다.
 */
export function navAxis(p, dt) {
    const nav = state.nav;
    if (!nav) return null;
    if (state.isDialogueOpen || state.activity || p.flying || p.fishing) { cancelNav(); return null; }
    if (nav.map !== state.mapId) {   // 문을 넘었다. 다음 문(또는 목적지)으로
        if (!plan()) return null;
        return navAxis(p, dt);
    }
    const t = guideTarget();
    // 목표가 움직이는 용이면 도착점을 따라 다시 잡는다
    if (t && t.entity && t.entity.config && nav.path.length) {
        const last = nav.path[nav.path.length - 1];
        if (Math.hypot(last.x - t.x, last.y - t.y) > 120) { plan(); return navAxis(p, dt); }
    }
    const wp = nav.path[nav.i];
    if (!wp) { cancelNav(); return null; }
    const dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
    const lastLeg = nav.i === nav.path.length - 1;
    if (d < (lastLeg ? (nav.far ? 20 : 70) : 26)) {
        nav.i++;
        if (nav.i >= nav.path.length) {
            cancelNav();
            if (!nav.far) showToast('다 왔다.', '🧭');
            return null;
        }
        return navAxis(p, dt);
    }
    // 제자리걸음이면 길을 다시 찾고, 그래도 안 되면 포기한다
    const moved = Math.hypot(p.x - nav.lx, p.y - nav.ly);
    nav.lx = p.x; nav.ly = p.y;
    nav.stuck = moved < 0.5 ? nav.stuck + dt : 0;
    if (nav.stuck > 1.2) {
        if (nav.replanned) { cancelNav(); showToast('길이 막혀 있다. 직접 가 보자.', '🧭'); return null; }
        const ok = plan();
        if (state.nav) state.nav.replanned = true;
        return ok ? navAxis(p, dt) : null;
    }
    return { dx: dx / d, dy: dy / d };
}
