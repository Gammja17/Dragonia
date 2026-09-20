import { state } from '../core/state.js';
import { MAX_ENEMIES } from '../core/config.js';
import { rand, dist, pick } from '../core/utils.js';
import { BIOMES } from './biomes.js';
import { activeBiome, currentMapBounds } from './terrain.js';
import { solidAt } from './collision.js';
import { Enemy } from '../entities/Enemy.js';
import { mapEnemies, mapHasBoss } from '../systems/world.js';
import { enemyCapMult } from '../systems/events.js';

// 지금 밟고 있는 지도에만 적을 뿌린다.
// 마을·호수처럼 safe 한 곳과 보스 결투장에는 야생 적이 나오지 않는다.

const ELITE_CHANCE = 0.08;
const DESPAWN_RANGE = 1500;

function peaceful() {
    const b = BIOMES[activeBiome()];
    return (b && b.safe) || mapHasBoss() || state.dungeon;
}

/** 화면 밖 빈 땅에 적 하나 */
export function spawnEnemy() {
    const p = state.player, { w, h } = currentMapBounds();
    const types = mapEnemies();
    for (let tries = 0; tries < 10; tries++) {
        const a = rand(0, Math.PI * 2), r = rand(620, 1050);
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        if (x < 120 || y < 120 || x > w - 120 || y > h - 120) continue;
        if (solidAt(x, y, 20)) continue;
        // 포탈 앞은 비워 둔다 (지도를 넘자마자 얻어맞지 않게)
        if (state.entities.props.some(q => q.portal && dist({ x, y }, q) < 260)) continue;
        const type = pick(types);
        state.entities.enemies.push(new Enemy(x, y, type, type !== 'PREY' && Math.random() < ELITE_CHANCE));
        return;
    }
}

/** 매 프레임: 멀어진 적은 치우고, 부족하면 보충 */
export function updateSpawns() {
    const E = state.entities;
    for (const e of E.enemies) if (dist(e, state.player) > DESPAWN_RANGE) e.remove = true;
    if (peaceful()) return;
    if (E.enemies.length < MAX_ENEMIES * enemyCapMult() && Math.random() < 0.06) spawnEnemy();
}
