import { state } from '../core/state.js';
import { MAX_ENEMIES } from '../core/config.js';
import { rand, dist, pick } from '../core/utils.js';
import { BIOMES } from './biomes.js';
import { activeBiome, currentMapBounds } from './terrain.js';
import { solidAt } from './collision.js';
import { Enemy } from '../entities/Enemy.js';
import { mapEnemies, mapHasBoss } from '../systems/world.js';
import { enemyCapMult } from '../systems/events.js';
import { pickPack } from '../data/packs.js';
import { MAPS } from '../data/maps.js';
import { activeQuests, curStep } from '../systems/quests.js';

// 지금 밟고 있는 지도에만 적을 뿌린다.
// 마을·호수처럼 safe 한 곳과 보스 결투장에는 야생 적이 나오지 않는다.

const ELITE_CHANCE = 0.08;
const DESPAWN_RANGE = 1500;

function peaceful() {
    const b = BIOMES[activeBiome()];
    const spec = MAPS[state.mapId];
    return (b && b.safe) || (spec && spec.safe) || mapHasBoss() || state.dungeon;
}
/** 이 지도에 한 번에 있을 수 있는 적 수 */
function cap() {
    const spec = MAPS[state.mapId];
    return Math.min(MAX_ENEMIES, (spec && spec.enemyCap) || 10) * enemyCapMult();
}
let nextPack = 2;     // 다음 무리까지 남은 시간(초)
let lastMap = null;   // 지도를 옮기면 시계를 되돌린다

/** 화면 밖 빈 땅 한 점 (없으면 null) */
function openSpot() {
    const p = state.player, { w, h } = currentMapBounds();
    for (let tries = 0; tries < 12; tries++) {
        const a = rand(0, Math.PI * 2), r = rand(620, 1050);
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        if (x < 120 || y < 120 || x > w - 120 || y > h - 120) continue;
        if (solidAt(x, y, 20)) continue;
        // 포탈 앞은 비워 둔다 (지도를 넘자마자 얻어맞지 않게)
        if (state.entities.props.some(q => q.portal && dist({ x, y }, q) < 260)) continue;
        return { x, y };
    }
    return null;
}

/**
 * 무리 하나를 내보낸다 (data/packs.js). 대장 자리엔 정예가 선다.
 * 편성표가 없는 바이옴은 예전처럼 낱개로.
 */
export function spawnPack(forceType = null) {
    const spot = openSpot();
    if (!spot) return;
    const pack = forceType ? { units: [{ t: forceType, n: 3 }] } : pickPack(activeBiome());
    if (!pack) {
        const type = pick(mapEnemies());
        state.entities.enemies.push(new Enemy(spot.x, spot.y, type, type !== 'PREY' && Math.random() < ELITE_CHANCE));
        return;
    }
    let i = 0;
    for (const u of pack.units) {
        for (let k = 0; k < u.n; k++, i++) {
            const a = (i / 7) * Math.PI * 2, r = i === 0 ? 0 : 40 + i * 14;
            const x = spot.x + Math.cos(a) * r, y = spot.y + Math.sin(a) * r;
            const elite = !!u.lead || (u.t !== 'PREY' && Math.random() < ELITE_CHANCE * 0.4);
            state.entities.enemies.push(new Enemy(solidAt(x, y, 14) ? spot.x : x, solidAt(x, y, 14) ? spot.y : y, u.t, elite));
        }
    }
}

/** 예전 이름을 쓰는 곳을 위해 */
export const spawnEnemy = spawnPack;

/**
 * 매 프레임: 멀어진 적은 치우고, 부족하면 보충.
 * 예전엔 프레임마다 2.5% 라 1초에 한 무리꼴로 쏟아졌다. 이제 12~20초에 하나, 상한은 지도마다
 */
export function updateSpawns(dt = 1 / 60) {
    const E = state.entities;
    for (const e of E.enemies) if (dist(e, state.player) > DESPAWN_RANGE) e.remove = true;
    if (peaceful()) return;
    const alive = () => E.enemies.filter(e => e.def.move !== 'none' && !e.remove).length;
    // 새 지도에 들어서면 빈 땅이 아니라 이미 무리가 돌아다니고 있어야 한다 (예전엔 첫 무리까지 1.5초, 다음은 12~20초라 늘 비어 보였다)
    if (state.mapId !== lastMap) { lastMap = state.mapId; nextPack = 4; for (let i = 0; i < 3 && alive() < cap(); i++) spawnPack(); }
    // 퀘스트가 잡으라는 놈은 이 지도에 나오는 놈이면 늘 두어 마리는 있어야 한다 ('첫 사냥'인데 슬라임이 안 보이던 것)
    for (const q of activeQuests()) {
        const st = curStep(q), g = st && st.goal;
        if (!g || g.type !== 'kill' || !mapEnemies().includes(g.target)) continue;
        if (E.enemies.filter(e => e.type === g.target && !e.remove).length < 2) { spawnPack(g.target); break; }
    }
    nextPack -= dt;
    if (nextPack > 0) return;
    nextPack = rand(8, 14);
    if (alive() < cap()) spawnPack();
}
