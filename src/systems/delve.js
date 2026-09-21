import { state, emptyPools } from '../core/state.js';
import { dist, pick, mulberry32 } from '../core/utils.js';
import { setActiveMap } from '../world/terrain.js';
import { generateFloor, bakeFloor, makeMapAdapter, spotInRoom, tileCenter, DUNGEON_SIZE } from '../world/dungeon.js';
import { buildPropGrid } from '../world/collision.js';
import { enterMap } from './world.js';
import { Enemy } from '../entities/Enemy.js';
import { Prop } from '../entities/Prop.js';
import { Item } from '../entities/Item.js';
import { grantPoints } from './growth.js';
import { BIOME_ENEMIES } from '../data/enemies.js';
import { DUNGEONS } from '../data/dungeons.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { fadeScreen, refreshMinimap } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';
import { spawnEffect } from '../render/vfx.js';
import { grantRelic, randomRelic } from './relics.js';
import { play } from './audio.js';
import { saveGame } from './save.js';
import { notify } from './quests.js';

// 굴 탐험. 바깥 세상은 늘 같아서 이야기를 심을 수 있고, 굴은 들어갈 때마다 새로 그려진다.
//
//  들어간다 → 층을 하나 만든다 → 방마다 적과 상자 → 가장 먼 방에 내려가는 구멍
//  내려갈수록 적이 늘고 세지며, 나올 때 깊이만큼 보상을 받는다.
//  아무 때나 들어온 자리로 되돌아 나올 수 있다 (욕심과 안전 사이에서 고르게).
//
// state.dungeon = { id, depth, seed, adapter, floor, entryPos, best } · 굴 밖이면 null

const EXIT_RANGE = 90;

// 굴마다 처음 그 깊이에 닿았을 때 한 번만 받는 것. 나올 때 받는다
//   state.story.delve = { [굴 id]: { best: 가장 깊이 내려간 층, claimed: [받은 깊이] } }
const MILESTONES = [
    { depth: 3, relic: true, text: '유물 하나' },
    { depth: 5, points: 2, text: '성장 포인트 2' },
    { depth: 8, points: 3, relic: true, text: '성장 포인트 3과 유물 하나' },
];
function record(id) {
    const all = state.story.delve || (state.story.delve = {});
    return all[id] || (all[id] = { best: 0, claimed: [] });
}
const nextMilestone = (id) => MILESTONES.find(m => !record(id).claimed.includes(m.depth));

let saved = null;   // 굴에 들어가 있는 동안 치워 둔 바깥 세상

export function inDungeon() { return !!state.dungeon; }

/** 굴 안에서만 쓰는 좌표 표시용 */
export function dungeonName() {
    const d = state.dungeon;
    return d ? `${DUNGEONS[d.id].name} 지하 ${d.depth}층` : null;
}

// ---------- 들어가기 ----------
export function enterDungeon(id) {
    const def = DUNGEONS[id];
    const p = state.player;
    state.isDialogueOpen = false;
    dialogueUI.hide();
    saved = { mapId: state.mapId, x: p.x, y: p.y };
    state.dungeon = { id, depth: 1, seed: (Math.random() * 1e9) | 0, entryPos: { x: p.x, y: p.y }, best: 0 };
    play('evolve');
    fadeScreen(`${def.name} 지하 1층`, () => buildFloor(1), () => {
        showToast(`${def.name}에 들어섰다. 더 깊이 내려갈수록 보상이 커진다. [E] 구멍으로 오르내린다.`, '🕯️');
    });
}

function buildFloor(depth) {
    const d = state.dungeon;
    const def = DUNGEONS[d.id];
    d.depth = depth;
    d.best = Math.max(d.best, depth);
    const floor = generateFloor(d.seed + depth * 7919, depth);
    const adapter = makeMapAdapter(floor, bakeFloor(floor));
    d.floor = floor;
    d.adapter = adapter;
    adapter.biome = def.biome;   // 소품·몬스터 색상판
    state.indoors = true;
    setActiveMap(adapter);
    refreshMinimap();

    // 개체 풀을 굴 전용으로 갈아 끼운다. 짝·동료·아이들은 따라 들어온다
    const before = state.entities;
    const pools = emptyPools();
    const follower = (n) => n && n.state !== 'WANDER' && (n === state.partner || n === state.companion);
    pools.npcs = before.npcs.filter(follower);
    pools.babies = before.babies.filter(b => state.kids.some(k => k.entity === b));
    if (!saved) saved = { mapId: state.mapId, x: state.player.x, y: state.player.y };
    state.entities = pools;

    const rng = mulberry32(floor.seed + 1);
    const start = tileCenter(floor.entry.cx, floor.entry.cy);
    state.player.x = start.x; state.player.y = start.y;
    for (const n of pools.npcs) { n.x = start.x + 70; n.y = start.y + 30; }
    for (const b of pools.babies) { b.x = start.x - 60; b.y = start.y + 30; }

    // 올라가는 구멍 / 내려가는 구멍
    const up = new Prop(start.x, start.y - 30, 'STAIRS_UP');
    const downPos = tileCenter(floor.exit.cx, floor.exit.cy);
    const down = new Prop(downPos.x, downPos.y, 'STAIRS_DOWN');
    pools.props.push(up, down);

    // 방마다 적. 들어온 방은 비워 둔다
    const types = BIOME_ENEMIES[def.biome] || BIOME_ENEMIES.FOREST;
    const perRoom = 2 + Math.min(5, Math.floor(depth / 2));
    for (const room of floor.rooms) {
        if (room === floor.entry) continue;
        const n = 1 + Math.floor(rng() * perRoom);
        for (let i = 0; i < n; i++) {
            const s = spotInRoom(room, rng);
            const elite = rng() < 0.05 + depth * 0.02;
            const e = new Enemy(s.x, s.y, pick(types.filter(t => t !== 'PREY')) || 'SLIME', elite);
            e.maxHp = e.hp = e.maxHp * (1 + depth * 0.18);
            pools.enemies.push(e);
        }
        // 상자: 방 네 개 중 하나꼴
        if (rng() < 0.3) {
            const s = spotInRoom(room, rng);
            const chest = new Prop(s.x, s.y, 'CHEST');
            chest.chestId = null;          // 굴의 상자는 한 판에만 있는 것이라 기록하지 않는다
            pools.props.push(chest);
        }
    }
    // 세 층마다 파수꾼이 지키는 방에 상자가 꼭 하나 있다
    if (depth % 3 === 0) {
        const s = spotInRoom(floor.exit, rng);
        const chest = new Prop(s.x, s.y, 'CHEST');
        chest.chestId = null;
        pools.props.push(chest);
    }
    // 마지막 방의 파수꾼
    const guardSpot = spotInRoom(floor.exit, rng);
    const guard = new Enemy(guardSpot.x, guardSpot.y, pick(types.filter(t => t !== 'PREY')) || 'SLIME', true);
    guard.maxHp = guard.hp = guard.maxHp * (1.4 + depth * 0.3);
    guard.isGuardian = true;
    pools.enemies.push(guard);

    buildPropGrid(pools.props);
    notify('delve', depth);   // 나라의 부탁처럼 '몇 층까지 내려갔나'를 보는 퀘스트용
}

// ---------- 오르내리기 ----------
export function descend() {
    const d = state.dungeon;
    const def = DUNGEONS[d.id];
    const next = d.depth + 1;
    play('warn');
    fadeScreen(`${def.name} 지하 ${next}층`, () => buildFloor(next), () => {
        showToast(`지하 ${next}층. 공기가 더 무거워졌다.`, '🕯️');
    });
}

export function leaveDungeon() {
    const d = state.dungeon;
    const def = DUNGEONS[d.id];
    const depth = d.best;
    play('sleep');
    fadeScreen('바깥 공기', () => {
        const back = saved;
        state.dungeon = null;
        saved = null;
        enterMap(back.mapId, { spot: { x: back.x, y: back.y + 80 } });
    }, () => {
        // 깊이 내려갔던 만큼 보상
        const p = state.player;
        const gold = depth * 45, xp = depth * 90;
        p.gold += gold;
        p.gainXp(xp);
        showToast(`${def.name}에서 지하 ${depth}층까지 내려갔다. (${gold}G, 경험치 ${xp})`, '🕯️');
        if (depth >= 3 && Math.random() < 0.45) { const id = randomRelic(); if (id) grantRelic(id, p.x, p.y); }
        // 이 굴에서 처음 닿은 깊이의 보상
        const rec = record(d.id);
        rec.best = Math.max(rec.best, depth);
        for (const m of MILESTONES) {
            if (depth < m.depth || rec.claimed.includes(m.depth)) continue;
            rec.claimed.push(m.depth);
            if (m.points) grantPoints(m.points, `${def.name} 지하 ${m.depth}층`);
            if (m.relic) { const id = randomRelic(); if (id) grantRelic(id, p.x, p.y); }
            showToast(`${def.name} 지하 ${m.depth}층에 처음 닿았다: ${m.text}`, '🏅');
        }
        spawnEffect('RING', p.x, p.y - 30, { size: 1.6, color: '#ffd84a' });
        saveGame();
    });
}

// ---------- 안내 ----------
function ask(title, text, options) {
    state.isDialogueOpen = true;
    dialogueUI.show({ name: title, text, onClose: () => { state.isDialogueOpen = false; dialogueUI.hide(); }, options });
}

const close = () => { state.isDialogueOpen = false; dialogueUI.hide(); };

/** 굴 입구·계단 앞에서 [E] 를 눌렀을 때. 처리했으면 true */
export function tryDelveInteract() {
    const p = state.player;
    const E = state.entities;

    if (!inDungeon()) {
        const mouth = E.props.find(x => x.type === 'CAVE' && dist(p, x) < 120);
        if (!mouth) return false;
        const def = DUNGEONS[mouth.caveId];
        const rec = record(mouth.caveId), goal = nextMilestone(mouth.caveId);
        const note = (rec.best ? `\n\n(지금까지 지하 ${rec.best}층까지 내려가 봤다.` : '\n\n(아직 들어가 본 적이 없다.')
            + (goal ? ` 지하 ${goal.depth}층에 처음 닿으면 ${goal.text}.)` : ' 이 굴에서 처음으로 얻을 것은 다 얻었다.)')
            + '\n(층마다 파수꾼이 [옛 비늘돌]을 품고 있다. 대장간에서 쓴다.)';
        ask(def.name, def.intro + note, [
            { label: '🕯️ 들어간다', onSelect: () => enterDungeon(mouth.caveId) },
            { label: '다음에', onSelect: close },
        ]);
        return true;
    }

    const d = state.dungeon;
    const up = E.props.find(x => x.type === 'STAIRS_UP' && dist(p, x) < EXIT_RANGE);
    if (up) {
        ask('올라가는 구멍', `여기서 바깥으로 나갈 수 있다. 지금까지 지하 ${d.best}층까지 내려갔다.`, [
            { label: '↑ 바깥으로 나간다', onSelect: () => { close(); leaveDungeon(); } },
            { label: '더 둘러본다', onSelect: close },
        ]);
        return true;
    }
    const down = E.props.find(x => x.type === 'STAIRS_DOWN' && dist(p, x) < EXIT_RANGE);
    if (down) {
        const left = E.enemies.filter(e => e.isGuardian && !e.remove).length;
        if (left) {
            ask('내려가는 구멍', '구멍이 검은 기운으로 막혀 있다. 이 층의 파수꾼을 쓰러뜨려야 열린다.', [{ label: '파수꾼을 찾는다', onSelect: close }]);
            return true;
        }
        ask('내려가는 구멍', `지하 ${d.depth + 1}층으로 내려간다. 더 깊을수록 적이 세지고, 나올 때 받는 것도 커진다.`, [
            { label: '↓ 더 깊이 내려간다', onSelect: () => { close(); descend(); } },
            { label: '여기서 멈춘다', onSelect: close },
        ]);
        return true;
    }
    return false;
}

/** 파수꾼을 잡으면 알려 준다 (Enemy.die 에서 호출). 파수꾼은 굴에서만 나오는 옛 비늘돌을 떨군다 — 깊을수록 많이 */
export function onGuardianDown(e) {
    const n = 1 + Math.floor(state.dungeon.depth / 3);
    for (let i = 0; i < n; i++) state.entities.items.push(new Item(e.x - 24 + i * 26, e.y + 30, 'MAT', 'CORE'));
    showToast('파수꾼이 쓰러졌다. 내려가는 구멍이 열렸다.', '🕳️');
    play('quest');
}

export { DUNGEON_SIZE };
