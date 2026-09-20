import { state } from '../core/state.js';
import { ROUTINES, slotAtHour } from '../data/routines.js';
import { MAPS, mapName } from '../data/maps.js';
import { coarseCenter } from '../world/mapgen.js';
import { npcName } from '../data/npcs.js';

// 하루 일과. data/routines.js 가 "누가 몇 시에 어디서 무엇을 하는지"를 적어 두면
// 여기서 그 말대로 용들을 지도 위에 놓고 옮긴다.
//
//  · 지도에 들어설 때: 지금 그 지도에 있기로 되어 있는 용만 깔린다
//  · 시간이 흘러 칸이 바뀌면: 떠날 용은 포탈 쪽으로 걸어 나가 사라지고,
//    올 용은 포탈에서 걸어 들어온다. 같은 지도 안이면 그냥 그쪽으로 옮겨 간다
//  · 짝·동료는 나를 따라다니므로 일과에서 빼 준다
//  · 비가 오거나 사냥꾼이 오면 하던 일을 내던지고 다른 칸으로 간다

const WALK = 150;          // 들고 나는 걸음 속도
const ARRIVED = 56;        // 목표에 이만큼 가까워지면 다 온 것으로 친다
let tick = 0;

export function hasRoutine(name) { return !!ROUTINES[name]; }
export const ROUTINE_NAMES = Object.keys(ROUTINES);

/** 지금 이 용이 어디서 무엇을 하고 있는가 */
export function planFor(name, hour = state.dayTime * 24) {
    const r = ROUTINES[name];
    if (!r) return null;
    let slot = slotAtHour(r, hour);
    // 길잡이를 마치기 전에는 촌장이 마을을 뜨지 않는다. 처음 온 아이가 헤매지 않게
    if (name === 'Elder' && !(state.tutorial && state.tutorial.finished)) {
        slot = r.day.find(d => d.h === 9) || slot;
    }
    if (state.raid.active && r.raid) slot = r.raid;
    else if (r.rain && (state.weather.type === 'RAIN' || state.weather.type === 'SNOW')) slot = r.rain;
    const spec = MAPS[slot.map];
    if (!spec) return null;
    return {
        job: r.job,
        map: slot.map,
        mapName: mapName(slot.map),
        doing: slot.doing,
        x: coarseCenter(slot.spot[0]),
        y: coarseCenter(slot.spot[1]),
    };
}

/** 나를 따라다니는 중이면 일과를 접어 둔다 */
function tiedToPlayer(npc) {
    return npc === state.partner || npc === state.companion || npc.state !== 'WANDER';
}

/** 지금 이 지도에 있어야 하는 용들의 이름 */
export function whoIsOn(mapId, hour = state.dayTime * 24) {
    return ROUTINE_NAMES.filter(n => {
        const p = planFor(n, hour);
        return p && p.map === mapId;
    });
}

/** 일지에 뿌릴 표: 누가 어디서 무엇을 하는지 */
export function roster() {
    return ROUTINE_NAMES.map(name => {
        const npc = findNpc(name);
        const plan = planFor(name);
        const here = npc && tiedToPlayer(npc);
        return {
            name, label: npcName(name), job: plan ? plan.job : '',
            map: here ? state.mapId : plan.map,
            where: here ? '나와 함께 있다' : plan.mapName,
            doing: here ? '나를 따라다니고 있다' : plan.doing,
            near: (here ? state.mapId : plan.map) === state.mapId,
            relation: npc ? (npc.relation || 0) : 0,
        };
    });
}

function findNpc(name) {
    return state.entities.npcs.find(n => n.config.name === name) || null;
}

/** 지도를 새로 깔 때 world.js 가 부른다. 일과가 있는 용은 여기서만 놓는다 */
export function placeByRoutine(mapId, pools, getNpc) {
    for (const name of whoIsOn(mapId)) {
        const plan = planFor(name);
        const npc = getNpc(name, { x: plan.x, y: plan.y });
        if (pools.npcs.includes(npc)) continue;
        npc.x = plan.x; npc.y = plan.y;
        npc.homeX = plan.x; npc.homeY = plan.y;
        npc.doing = plan.doing;
        npc.job = plan.job;
        npc.walkTo = null;
        pools.npcs.push(npc);
    }
}

/** 지도 가장자리에서 제일 가까운 포탈 (들고 날 문) */
function nearestPortal(x, y) {
    let best = null, bestD = Infinity;
    for (const p of state.entities.props) {
        if (!p.portal) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) { bestD = d; best = p; }
    }
    return best;
}

/**
 * 매 프레임. 1초에 한 번 일과를 다시 읽고, 바뀐 만큼만 움직인다.
 * getNpc 는 world.js 가 넘겨 주는 "이름으로 용 찾기/만들기".
 */
export function updateRoutine(dt, getNpc) {
    // 걷는 중인 용은 매 프레임 옮긴다
    for (const npc of state.entities.npcs) {
        if (!npc.walkTo) continue;
        const dx = npc.walkTo.x - npc.x, dy = npc.walkTo.y - npc.y;
        if (Math.hypot(dx, dy) < ARRIVED) {
            if (npc.walkTo.leave) npc.remove = true;      // 문을 나섰다
            npc.walkTo = null;
            continue;
        }
        npc.moveBy(dx, dy, WALK, dt);
    }

    tick -= dt;
    if (tick > 0) return;
    tick = 1;
    if (state.dungeon) return;

    const here = state.mapId;
    for (const name of ROUTINE_NAMES) {
        const plan = planFor(name);
        if (!plan) continue;
        const npc = findNpc(name);

        if (npc && tiedToPlayer(npc)) { npc.walkTo = null; continue; }   // 나를 따라다니는 중

        if (npc) {
            npc.doing = plan.doing;
            npc.job = plan.job;
            if (plan.map === here) {
                // 같은 지도 안에서 자리만 옮긴다 — 어슬렁대는 중심을 바꿔 주면 알아서 간다
                if (Math.hypot(npc.homeX - plan.x, npc.homeY - plan.y) > 60) {
                    npc.homeX = plan.x; npc.homeY = plan.y;
                    npc.walkTo = { x: plan.x, y: plan.y };
                }
            } else if (!npc.walkTo || !npc.walkTo.leave) {
                const gate = nearestPortal(npc.x, npc.y);                // 문으로 걸어 나간다
                npc.walkTo = gate ? { x: gate.x, y: gate.y, leave: true } : null;
                if (!gate) npc.remove = true;
            }
            continue;
        }

        // 여기 있어야 하는데 없다 — 문으로 걸어 들어온다
        if (plan.map !== here) continue;
        const gate = nearestPortal(plan.x, plan.y);
        const from = gate ? { x: gate.x, y: gate.y } : { x: plan.x, y: plan.y };
        const fresh = getNpc(name, from);
        fresh.x = from.x; fresh.y = from.y;
        fresh.remove = false;
        fresh.homeX = plan.x; fresh.homeY = plan.y;
        fresh.doing = plan.doing;
        fresh.job = plan.job;
        fresh.walkTo = { x: plan.x, y: plan.y };
        state.entities.npcs.push(fresh);
    }
}
