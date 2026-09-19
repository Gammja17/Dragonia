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
            const hit = E.enemies.find(e => !e.remove && dist(b, e) < HIT_RADIUS)
                     || E.humans.find(h => !h.remove && dist(b, h) < HIT_RADIUS);
            if (hit) { b.explode(); hit.takeDamage(10); }
        } else if (dist(b, player) < HIT_RADIUS) {
            b.explode();
            player.takeDamage(8);
        }
    }
}

export function pruneEntities() {
    const E = state.entities;
    for (const key of ['bullets', 'effects', 'enemies', 'humans', 'items', 'particles', 'babies']) {
        E[key] = E[key].filter(e => !e.remove);
    }
}
