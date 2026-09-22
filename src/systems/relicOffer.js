import { state } from '../core/state.js';
import { pick } from '../core/utils.js';
import { RELICS, KINS, grantRelic, ownsRelic } from './relics.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { play } from './audio.js';

// 유물 고르기. 보스를 잡거나, 굴의 깊은 층에 처음 닿거나, 베르단을 물리치면 셋 중 하나를 고른다.
// 상자에서 아무거나 하나 굴러 나오던 것보다 "내가 고른 것"이 훨씬 기억에 남는다.
// 싸움 한복판일 수 있으니 대기줄에 넣고, 대화가 없는 틈에 연다 (updateRelicOffer — main.js).

const queue = [];

export function offerRelics(where) {
    const pool = Object.keys(RELICS).filter(id => !RELICS[id].boss && !RELICS[id].gift && !ownsRelic(id));
    if (!pool.length) return;
    const picks = [];
    while (picks.length < 3 && pool.length) { const id = pick(pool); pool.splice(pool.indexOf(id), 1); picks.push(id); }
    queue.push({ where, picks });
}

export function updateRelicOffer() {
    if (!queue.length || state.isDialogueOpen || state.prologue || document.body.classList.contains('cutscene')) return;
    if (state.raid.active || state.ambush || state.entities.bosses.some(b => b.awake && !b.remove)) return;
    const { where, picks } = queue.shift();
    const close = () => { state.isDialogueOpen = false; dialogueUI.hide(); };
    state.isDialogueOpen = true;
    play('relic');
    dialogueUI.show({
        name: '유물',
        text: `${where} 빛나는 것 셋을 찾았다. 하나만 가져갈 수 있다.`,
        onClose: close,
        options: picks.map(id => {
            const r = RELICS[id];
            const tag = r.kin ? ` · ${KINS[r.kin].name}` : '';
            return { label: `💎 ${r.name}${tag} — ${r.desc}`, onSelect: () => { close(); grantRelic(id, state.player.x, state.player.y); } };
        }),
    });
}
