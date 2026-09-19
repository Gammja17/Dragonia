import { state } from '../core/state.js';
import { dist } from '../core/utils.js';

const HIT_RADIUS = 30;

/** 총알 충돌. ALLY 총알은 적/인간에게, ENEMY 총알은 플레이어에게만 맞는다. */
export function resolveCombat() {
    const E = state.entities;
    const player = state.player;

    for (const b of E.bullets) {
        if (b.remove) continue;
        if (b.faction === 'ALLY') {
            const targets = [...E.enemies, ...E.humans, ...E.bosses];
            const hit = targets.find(e => !e.remove && dist(b, { x: e.x, y: e.y - (e.def && e.def.scale ? 50 : 0) }) < (e.def && e.def.scale ? 90 : HIT_RADIUS));
            if (hit) b.hit(hit, targets);
        } else if (dist(b, { x: player.x, y: player.y - 30 }) < HIT_RADIUS) {
            b.hit(player);
        }
    }
}

export function pruneEntities() {
    const E = state.entities;
    for (const key of ['bullets', 'effects', 'bosses', 'enemies', 'humans', 'items', 'particles', 'babies']) {
        E[key] = E[key].filter(e => !e.remove);
    }
}
