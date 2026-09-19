import { state } from '../core/state.js';
import { dist } from '../core/utils.js';

const HIT_RADIUS = 30;

/** 플레이어 편에서 싸우는 용들: 쓰러지지 않은 마을 고정 NPC, 짝, 동료 */
export function allies() {
    return state.entities.npcs.filter(n => n.downTimer <= 0 && (n.config.fixed || n.state !== 'WANDER'));
}

/** 총알 충돌. ALLY 총알은 적/인간에게, ENEMY 총알은 플레이어에게만 맞는다. */
export function resolveCombat() {
    const E = state.entities;
    const player = state.player;

    for (const b of E.bullets) {
        if (b.remove) continue;
        if (b.faction === 'ALLY') {
            const targets = [...E.enemies, ...E.humans, ...E.bosses];
            if (state.activity && state.activity.type === 'SPAR') targets.push(state.activity.npc); // 대련 상대
            const hit = targets.find(e => !e.remove && dist(b, { x: e.x, y: e.y - (e.def && e.def.scale ? 50 : 0) }) < (e.def && e.def.scale ? 90 : HIT_RADIUS));
            if (hit) b.hit(hit, targets);
        } else if (dist(b, { x: player.x, y: player.y - 30 }) < HIT_RADIUS) {
            b.hit(player);
        } else if (!state.activity) {   // 적의 화살·마법은 마을 용들도 맞는다 (대련 중 탄은 플레이어만)
            const ally = allies().find(n => dist(b, { x: n.x, y: n.y - 30 }) < HIT_RADIUS);
            if (ally) b.hit(ally);
        }
    }
}

export function pruneEntities() {
    const E = state.entities;
    for (const key of ['bullets', 'effects', 'bosses', 'enemies', 'humans', 'items', 'particles', 'babies']) {
        E[key] = E[key].filter(e => !e.remove);
    }
}
