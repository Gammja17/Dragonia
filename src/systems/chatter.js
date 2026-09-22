import { state } from '../core/state.js';
import { dist, pick, rand } from '../core/utils.js';
import { CHATTER } from '../data/chatter.js';
import { isDead } from './routine.js';

// 마을 용들끼리의 잡담. 일과대로 서 있기만 하던 용들이 가까이 있으면 몇 마디 주고받는다.
// 마을이 배경이 아니라 동네로 보이게 하는 것이 목적이라, 이야기와는 무관한 말만 한다.

let timer = 12;
let running = null;   // { lines, i, t, npcs }

export function updateChatter(dt) {
    if (running) {
        running.t -= dt;
        if (running.t <= 0) {
            const line = running.lines[running.i++];
            if (!line) { running = null; return; }
            const who = running.npcs[line[0]];
            if (who && !who.remove) who.say(line[1]);
            running.t = 2.6;
        }
        return;
    }
    if (state.mapId !== 'VILLAGE' || state.raid.active || state.isDialogueOpen || state.tour || state.prologue) return;
    timer -= dt;
    if (timer > 0) return;
    timer = rand(18, 32);
    // 가까이 서 있는 두 용의 잡담 하나
    const here = {};
    for (const n of state.entities.npcs) if (n.config.fixed && !n.remove && !(n.downTimer > 0) && n.state === 'WANDER') here[n.config.name] = n;
    const options = CHATTER.filter(c => {
        const [a, b] = c.pair;
        return here[a] && here[b] && !isDead(a) && !isDead(b) && dist(here[a], here[b]) < 320 && dist(here[a], state.player) < 900;
    });
    if (!options.length) return;
    const c = pick(options);
    running = { lines: c.lines, i: 0, t: 0, npcs: { [c.pair[0]]: here[c.pair[0]], [c.pair[1]]: here[c.pair[1]] } };
}
