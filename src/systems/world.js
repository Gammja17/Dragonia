import { state, emptyPools } from '../core/state.js';
import { mulberry32, dist, pick, rand } from '../core/utils.js';
import { TILE } from '../data/tiles.js';
import { MAPS, START_MAP, mapName } from '../data/maps.js';
import { buildMap, coarseCenter, COARSE_PX } from '../world/mapgen.js';
import { setActiveMap, activeMap } from '../world/terrain.js';
import { buildPropGrid, solidAt } from '../world/collision.js';
import { BIOME_ENEMIES, BOSSES } from '../data/enemies.js';
import { FIXED_NPCS, WANDER_NAMES, WANDER_PERSONALITIES, WANDER_SPECIES, WANDER_LOOKS, WANDER_ACCESSORIES, SPECIES_COLORS } from '../data/npcs.js';
import { Dragon } from '../entities/Dragon.js';
import { Prop } from '../entities/Prop.js';
import { PROP_SPRITES } from '../data/tiles.js';
import { Nest } from '../entities/Nest.js';
import { Boss } from '../entities/Boss.js';
import { showRegionBanner } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';

// 지역 이름 밑에 한 줄로 붙는 설명
const BIOME_LABEL = {
    VILLAGE: '용들의 마을', FOREST: '푸른 숲', LAKE: '물가', HOLLOW: '달빛이 고인 골짜기',
    JUNGLE: '무성한 밀림', SNOW: '눈과 서리의 땅', DESERT: '메마른 사구',
    AUTUMN: '단풍이 지는 골', VOLCANO: '잿빛 화산 지대',
};
import { play } from './audio.js';
import { placeByRoutine, hasRoutine, ROUTINE_NAMES, planFor } from './routine.js';
import { DENS, densOn } from '../data/dens.js';
import { buildRoom } from '../world/room.js';
import { FURNITURE } from '../data/furniture.js';
import { decorOf, tileToWorld } from './den.js';
import { denIntro } from './denEnter.js';

// 여러 장의 지도를 오가는 살림살이.
//
//  · 지도는 한 번 만들면 캐시해 둔다 (같은 씨앗이라 다시 와도 모양이 같다)
//  · 들어갈 때마다 그 지도의 개체(소품·NPC·적)를 새로 깐다. 기억해야 하는 것만 따로 남긴다
//      NPC      이름으로 캐시해 두고 다시 쓴다 (호감도·데이트 횟수가 살아 있어야 한다)
//      보스     state.bossesDefeated 를 보고 살릴지 정한다
//      보물상자 state.openedChests['지도id:번호'] 로 기억한다
//  · 짝·동료·아이들은 언제나 따라다닌다
//
// state.mapId 가 지금 있는 지도. 굴에 들어가면 systems/delve.js 가 잠시 가로챈다.

const PORTAL_RANGE = 62;
const EDGE_WALL = 2;          // 가장자리 몇 칸을 나무로 막을지 (큰 칸 수)

const mapCache = new Map();   // id → mapgen 인스턴스
const npcCache = new Map();   // 이름 → Dragon (호감도 유지)
let travelling = false;

export function currentMapId() { return state.mapId; }
export function currentMapName() { return mapName(state.mapId); }

/** 지도 인스턴스 (없으면 만들어 캐시) */
function getMap(id) {
    if (!mapCache.has(id)) {
        if (DENS[id]) { mapCache.set(id, buildRoom(DENS[id])); return mapCache.get(id); }
        const spec = MAPS[id];
        if (!spec) throw new Error('알 수 없는 지도: ' + id);
        mapCache.set(id, buildMap({ ...spec, id }));
    }
    return mapCache.get(id);
}

/** 굴 안 한 칸. 바깥 지도와 달리 방 하나뿐이고 살림살이가 놓여 있다 */
function populateDen(id) {
    const map = getMap(id);
    const spec = DENS[id];
    const pools = emptyPools();

    // 나가는 문 — 방 아래쪽 한가운데
    const mouth = new Prop(map.center.x, map.floorRect.y + map.floorRect.h - TILE * 0.4, 'PORTAL');
    mouth.portal = { to: spec.outer, name: mapName(spec.outer), spot: at(spec.at) };
    pools.props.push(mouth);

    // 살림살이
    for (const d of decorOf(id)) {
        const f = FURNITURE[d.id];
        if (!f) continue;
        const w = tileToWorld(d.tx, d.ty);
        const item = new Prop(w.x + (f.span[0] - 1) * TILE / 2, w.y, 'FURNITURE');
        item.fid = d.id;
        pools.props.push(item);
    }

    // 내 굴에는 둥지가 있다. 자고 일어나는 곳이자 알을 품는 곳
    if (spec.mine) {
        const nest = new Nest(map.center.x, map.floorRect.y + TILE * 1.6);
        if (state.denNest) Object.assign(nest, state.denNest);
        pools.nests.push(nest);
    }

    placeByRoutine(id, pools, getNpc);
    return { map, pools };
}

/** 큰 칸 좌표 → 월드 좌표 */
const at = ([cx, cy]) => ({ x: coarseCenter(cx), y: coarseCenter(cy) });

/** 포탈이 놓이는 자리 (가장자리 가운데에서 한 칸 안쪽) */
function portalSpot(map, side) {
    const { cw, ch } = map;
    if (side === 'N') return at([Math.floor(cw / 2), 1]);
    if (side === 'S') return at([Math.floor(cw / 2), ch - 2]);
    if (side === 'W') return at([1, Math.floor(ch / 2)]);
    return at([cw - 2, Math.floor(ch / 2)]);
}
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };

// ---------------- 지도 채우기 ----------------

/** 가장자리를 나무로 둘러 막는다. 포탈 앞은 비워 둔다 */
function edgeWalls(map, props, rng, portals) {
    const { cw, ch } = map;
    const gaps = portals.map(p => portalSpot(map, p.side));
    const openAt = (x, y) => gaps.some(g => Math.abs(g.x - x) < COARSE_PX * 1.6 && Math.abs(g.y - y) < COARSE_PX * 1.6);
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
        const edge = cx < EDGE_WALL || cy < EDGE_WALL || cx >= cw - EDGE_WALL || cy >= ch - EDGE_WALL;
        if (!edge) continue;
        const p = at([cx, cy]);
        if (openAt(p.x, p.y)) continue;
        if (map.groundAt(p.x, p.y) === 'WATER') continue;
        props.push(new Prop(p.x + rand(-20, 20), p.y + rand(-20, 20), 'TREE'));
    }
}

/** 지도 하나의 개체를 전부 만든다 */
function populate(id) {
    if (DENS[id]) return populateDen(id);
    const map = getMap(id);
    const spec = MAPS[id];
    const rng = mulberry32((spec.seed || 1) * 31 + 7);
    const pools = emptyPools();
    const portals = spec.portals || [];

    // 1) 나무·덤불·열매·상자
    // 나무 한 그루는 240x288px 이나 차지한다. 예전 값(큰 칸당 0.5그루)이면 캐노피 넓이의 합이
    // 지도 넓이를 넘어서서(단풍 골 기준 156%) 화면이 통째로 초록 덩어리가 됐다. 그루 수를 줄이고
    // 서로 최소 간격을 두어 빈터와 길이 저절로 나게 한다.
    // 밑동 충돌 상자는 17x11 뿐이라(world/collision.js) 길이 막히고 뚫리는 구조는 그대로다.
    const trees = spec.trees ?? 0.4;
    const area = map.cw * map.ch;
    /** minGap: 같은 종류끼리 이만큼(px)은 떨어뜨린다 */
    const scatter = (n, make, minGap = 0) => {
        const placed = [];
        for (let i = 0, tries = 0; i < n && tries < n * 24; tries++) {
            const x = rng() * map.w, y = rng() * map.h;
            if (map.groundAt(x, y) !== 'GRASS') continue;
            if (portals.some(p => dist({ x, y }, portalSpot(map, p.side)) < 150)) continue;
            if (minGap && placed.some(q => Math.hypot(q.x - x, q.y - y) < minGap)) continue;
            make(x, y);
            placed.push({ x, y });
            i++;
        }
    };
    scatter(Math.round(area * trees * 0.18), (x, y) => pools.props.push(new Prop(x, y, 'TREE')), 165);
    scatter(Math.round(area * 0.22), (x, y) => pools.props.push(new Prop(x, y, pick(['BUSH', 'BUSH', 'FERN', 'ROCK', 'STUMP']))), 70);
    scatter(Math.round(area * 0.06), (x, y) => pools.props.push(new Prop(x, y, 'BERRY')), 90);

    let chestNo = 0;
    scatter(spec.chests ?? 3, (x, y) => {
        const chest = new Prop(x, y, 'CHEST');
        chest.chestId = `${id}:${chestNo++}`;
        if (state.openedChests[chest.chestId]) { chest.opened = true; chest.sprite = PROP_SPRITES.CHEST_OPEN[0]; }
        pools.props.push(chest);
    });

    edgeWalls(map, pools.props, rng, portals);

    // 2) 포탈
    for (const p of portals) {
        const s = portalSpot(map, p.side);
        const gate = new Prop(s.x, s.y, 'PORTAL');
        gate.portal = { side: p.side, to: p.to, name: p.name || mapName(p.to) };
        pools.props.push(gate);
    }

    // 3) 지도마다의 것들
    for (const f of spec.fixtures || []) {
        const pos = f.at ? at(f.at) : { x: map.w / 2, y: map.h / 2 };
        if (f.t === 'PROP') { pools.props.push(new Prop(pos.x, pos.y, f.type)); continue; }
        if (f.t === 'WAYSTONE') {
            const stone = new Prop(pos.x, pos.y, 'WAYSTONE');
            stone.stoneId = id;
            pools.props.push(stone);
            continue;
        }
        if (f.t === 'CAVE') {
            const cave = new Prop(pos.x, pos.y, 'CAVE');
            cave.caveId = f.id;
            pools.props.push(cave);
            continue;
        }
        if (f.t === 'NEST') {
            const nest = new Nest(pos.x, pos.y);
            if (state.denNest) Object.assign(nest, state.denNest);   // 알을 품던 상태를 이어 간다
            pools.nests.push(nest);
            continue;
        }
        if (f.t === 'DUMMY_SPOT') { state.dojoSpot = pos; continue; }
        if (f.t === 'BOSS') {
            if (state.bossesDefeated[f.id]) continue;
            const boss = new Boss(f.id);
            boss.x = pos.x; boss.y = pos.y;
            boss.home = { x: pos.x, y: pos.y };
            pools.bosses.push(boss);
            continue;
        }
        if (f.t === 'NPC') {
            if (hasRoutine(f.name)) continue;    // 일과가 있는 용은 routine.js 가 놓는다
            const npc = getNpc(f.name, pos);
            npc.x = pos.x; npc.y = pos.y;
            npc.homeX = pos.x; npc.homeY = pos.y;
            pools.npcs.push(npc);
        }
    }

    // 3-2) 이 지도에 입구가 있는 굴들
    for (const denId of densOn(id)) {
        const spec = DENS[denId];
        const pos = at(spec.at);
        const mouth = new Prop(pos.x, pos.y, 'DEN_MOUTH');
        mouth.denId = denId;
        pools.props.push(mouth);
    }

    // 4) 일과대로 지금 이 지도에 있어야 하는 용들
    placeByRoutine(id, pools, getNpc);

    // 5) 떠돌이 용 (마을과 숲길에만 한둘)
    if (!spec.clearings && rng() < 0.7) {
        const species = rng() < 0.8 ? 'LOOK' : pick(WANDER_SPECIES);
        const x = map.w * (0.3 + rng() * 0.4), y = map.h * (0.3 + rng() * 0.4);
        pools.npcs.push(new Dragon(x, y, {
            name: pick(WANDER_NAMES), personality: pick(WANDER_PERSONALITIES), species,
            colors: SPECIES_COLORS[species] || SPECIES_COLORS.WESTERN,
            look: pick(WANDER_LOOKS), accessory: pick(WANDER_ACCESSORIES), scale: rand(0.85, 1.1), canPartner: false,
        }));
    }

    return { map, pools };
}

/** 고정 NPC 는 한 번 만들고 계속 쓴다 (호감도·데이트가 그 안에 들어 있다) */
export function getNpc(name, pos) {
    if (!npcCache.has(name)) {
        const def = FIXED_NPCS.find(d => d.name === name);
        npcCache.set(name, new Dragon(pos.x, pos.y, { ...def, fixed: true }));
    }
    return npcCache.get(name);
}

/** 고정 NPC 를 모두 미리 만들어 둔다. 세이브 복원이 이름으로 찾을 수 있어야 한다 */
function primeNpcs() {
    // 일과가 있는 용은 어느 지도의 fixtures 에도 없을 수 있다. 먼저 만들어 둔다
    for (const name of ROUTINE_NAMES) {
        const plan = planFor(name, 12);
        if (plan) { const npc = getNpc(name, plan); npc.homeMap = plan.map; }
    }
    for (const [id, spec] of Object.entries(MAPS)) {
        for (const f of spec.fixtures || []) {
            if (f.t !== 'NPC') continue;
            const npc = getNpc(f.name, at(f.at));
            npc.homeMap = id;
        }
    }
}

/** 세이브를 불러올 때 NPC 상태를 찾아 쓰도록 */
export function fixedNpcs() { return [...npcCache.values()]; }

/** 짝·동료·아이들을 지금 지도로 데려온다 */
function bringFamily(pools, x, y) {
    for (const n of [state.partner, state.companion]) {
        if (!n) continue;
        if (!pools.npcs.includes(n)) pools.npcs.push(n);
        n.x = x + rand(50, 90); n.y = y + rand(-30, 40);
    }
    for (const k of state.kids) {
        if (!k.entity) continue;
        if (!pools.babies.includes(k.entity)) pools.babies.push(k.entity);
        k.entity.x = x - rand(50, 90); k.entity.y = y + rand(-30, 40);
    }
}

// ---------------- 드나들기 ----------------

/**
 * 지도를 바꾼다.
 *   from  어느 쪽에서 들어왔는지 ('N'|'S'|'E'|'W'). 그 반대편 포탈 앞에 선다
 *   spot  자리를 콕 집을 때 { x, y }
 */
/** 물·바위 위로 떨어지지 않게, 가까운 설 수 있는 자리로 밀어 준다 */
function clearSpot(x, y, map) {
    const inside = (px, py) => px > 40 && py > 40 && px < map.w - 40 && py < map.h - 40;
    if (inside(x, y) && !solidAt(x, y, 20)) return { x, y };
    for (let r = 48; r <= 900; r += 48) {
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
            if (inside(px, py) && !solidAt(px, py, 20)) return { x: px, y: py };
        }
    }
    return { x, y };   // 온통 막혀 있으면 어쩔 수 없다
}

export function enterMap(id, { from = null, spot = null } = {}) {
    // 떠나기 전에 둥지 상태를 갈무리한다 (아지트 지도에만 있다)
    const leaving = state.entities && state.entities.nests && state.entities.nests[0];
    if (leaving) state.denNest = { hasEgg: leaving.hasEgg, progress: leaving.progress, genes: leaving.genes };

    const { map, pools } = populate(id);
    state.mapId = id;
    state.indoors = !!DENS[id];
    setActiveMap(map);

    // 설 자리를 고르기 전에 소품 격자를 먼저 깔아야 solidAt() 이 제대로 답한다
    buildPropGrid(pools.props);

    let x, y;
    if (spot) ({ x, y } = spot);
    else if (from) {
        const s = portalSpot(map, from);
        // 포탈 바로 위에 서면 곧장 되돌아가 버린다. 안쪽으로 한 칸 밀어 놓는다
        const push = { N: [0, 1], S: [0, -1], E: [-1, 0], W: [1, 0] }[from];
        x = s.x + push[0] * COARSE_PX * 1.3;
        y = s.y + push[1] * COARSE_PX * 1.3;
    } else {
        // 석비를 타고 왔거나 그냥 떨어뜨릴 때. 석비 옆 → 없으면 한복판
        const stone = pools.props.find(pr => pr.type === 'WAYSTONE');
        ({ x, y } = stone ? { x: stone.x, y: stone.y + 70 } : { x: map.w / 2, y: map.h / 2 });
    }
    ({ x, y } = clearSpot(x, y, map));
    state.player.x = x; state.player.y = y;
    bringFamily(pools, x, y);

    state.entities = pools;
    if (!state.visited.includes(id)) state.visited.push(id);
    if (DENS[id]) denIntro(id);
    return map;
}

/** 새 게임: 플레이어를 만들고 첫 지도에 놓는다. 튜토리얼용 엘더를 돌려준다 */
export function initWorld(config) {
    mapCache.clear();
    npcCache.clear();
    state.player = new Dragon(0, 0, {
        name: config.name, species: config.species, colors: config.colors,
        accessory: config.accessory || null, look: config.look || 0,
    }, true);
    primeNpcs();
    state.furniture = { STRAW: 1 };   // 첫 잠자리 한 벌은 마을에서 챙겨 준다
    enterMap(START_MAP, {});
    const v = getMap(START_MAP);
    state.player.x = v.w / 2; state.player.y = v.h * 0.62;
    return state.entities.npcs.find(n => n.config.role === 'ELDER');
}

/** 매 프레임: 포탈을 밟았으면 넘어간다 */
export function updatePortals() {
    if (travelling || state.isDialogueOpen || state.activity || state.dungeon) return;
    const p = state.player;
    const gate = state.entities.props.find(x => x.portal && dist(p, x) < PORTAL_RANGE);
    if (!gate) return;
    if (state.raid.active) { showToast('사냥꾼이 마을을 치고 있다. 지금 떠날 수는 없다.', '⚔️'); return; }
    // 굴에서 나올 때는 들어갔던 입구 앞에 선다 (side 가 없다)
    const spot = gate.portal.spot ? { x: gate.portal.spot.x, y: gate.portal.spot.y + 84 } : null;
    travelTo(gate.portal.to, gate.portal.side ? OPPOSITE[gate.portal.side] : null, spot);
}

/** 살림살이를 놓거나 치웠을 때, 굴 안 소품만 다시 깐다 */
export function refreshDen() {
    if (!DENS[state.mapId]) return;
    const { pools } = populateDen(state.mapId);
    // 지금 서 있는 나와 따라다니는 식구는 그대로 두고 소품만 바꾼다
    state.entities.props = pools.props;
    buildPropGrid(state.entities.props);
}

/** 굴 입구 가까이 있으면 그 굴 id */
export function nearbyDenMouth() {
    const p = state.player;
    let best = null, bestD = 120;
    for (const m of state.entities.props) {
        if (m.type !== 'DEN_MOUTH') continue;
        const d = dist(p, m);
        if (d < bestD) { best = m; bestD = d; }
    }
    return best;
}

/**
 * 포탈·이동 석비로 지도를 옮긴다.
 * 화면을 까맣게 덮지 않는다 — 곧바로 옮기고, 지역 이름만 위쪽에 잠깐 띄웠다 지운다.
 * (예전엔 3초 넘게 암전돼서 오갈 때마다 흐름이 끊겼다)
 */
export function travelTo(id, from = null, spot = null) {
    if (travelling) return;
    travelling = true;
    play('dash');
    enterMap(id, { from, spot });
    showRegionBanner(mapName(id), MAPS[id] ? BIOME_LABEL[MAPS[id].biome] || '' : '');
    // 도착하자마자 뒤돌아 다시 포탈을 밟는 일이 없게 아주 짧게만 잠근다
    setTimeout(() => { travelling = false; }, 350);
}

/** 지금 지도에 어울리는 적 종류 */
export function mapEnemies() {
    const spec = MAPS[state.mapId];
    return BIOME_ENEMIES[spec ? spec.biome : 'FOREST'] || BIOME_ENEMIES.FOREST;
}

/** 이 지도에 보스가 살아 있나 (살아 있으면 야생 적을 뿌리지 않는다) */
export function mapHasBoss() {
    return state.entities.bosses.length > 0;
}

/** 쓰러졌을 때: 마을 광장에서 눈을 뜬다 */
export function reviveInVillage() {
    if (state.dungeon) return;                 // 굴에서는 그 자리에서 일어난다
    if (state.mapId === START_MAP) return;
    travelTo(START_MAP, null, null);
}

export { getMap, portalSpot, at as coarsePos };
