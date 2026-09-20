import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { MAPS, MAP_ORDER, mapName } from '../data/maps.js';
import { travelTo } from './world.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { spawnEffect } from '../render/vfx.js';
import { play } from './audio.js';

// 이동 석비. 옛 용들이 길목마다 세워 둔 돌기둥으로, 한 번 손을 대면 그 뒤로는
// 석비끼리 건너뛸 수 있다. 지도가 여러 장이 된 뒤로는 "걸어서 한 번 뚫은 길을
// 다시 걷지 않게" 해 주는 장치다. 석비가 선 지도의 id 를 그대로 쓴다.

const USE_RANGE = 150;
const DISCOVER_RANGE = 170;

/** 석비가 서 있는 지도들 (data/maps.js 의 fixtures 에서 모은다) */
export const STONE_MAPS = MAP_ORDER.filter(id => (MAPS[id].fixtures || []).some(f => f.t === 'WAYSTONE'));

export function isAwake(id) { return state.waystones.includes(id); }

/** 처음부터 켜 두는 석비 (마을과 아지트) */
export function initWaystones() {
    for (const id of ['VILLAGE', 'DEN']) {
        if (STONE_MAPS.includes(id) && !isAwake(id)) state.waystones.push(id);
    }
}

/** 매 프레임: 석비 가까이 가면 깨어난다 */
export function updateTravel() {
    const p = state.player;
    if (!p || state.dungeon) return;
    for (const stone of state.entities.props) {
        if (stone.type !== 'WAYSTONE' || isAwake(stone.stoneId) || dist(p, stone) > DISCOVER_RANGE) continue;
        state.waystones.push(stone.stoneId);
        spawnEffect('RING', stone.x, stone.y - 30, { size: 1.5, color: '#7fd4ff' });
        play('relic');
        showToast(`[${mapName(stone.stoneId)}]의 석비가 깨어났습니다. 이제 이곳으로 건너뛸 수 있습니다.`, '🗿');
    }
}

/** 지금 자리에서 쓸 수 있는 석비 */
export function nearbyWaystone() {
    const p = state.player;
    let best = null, bestD = USE_RANGE;
    for (const stone of state.entities.props) {
        if (stone.type !== 'WAYSTONE') continue;
        const d = dist(p, stone);
        if (d < bestD) { best = stone; bestD = d; }
    }
    return best;
}

function close() {
    state.isDialogueOpen = false;
    dialogueUI.hide();
}

/** 왜 지금은 못 쓰는가 (쓸 수 있으면 null) */
function blockedReason() {
    if (state.raid.active) return '사냥꾼이 마을을 치고 있다. 지금 떠날 수는 없다.';
    if (state.activity) return '지금은 다른 일에 매여 있다.';
    if (state.entities.bosses.some(b => b.awake)) return '눈앞의 용에게서 등을 돌릴 수는 없다.';
    return null;
}

export function openTravelMenu(stone) {
    const here = stone.stoneId;
    state.isDialogueOpen = true;
    const why = blockedReason();
    if (why) {
        dialogueUI.show({ name: mapName(here), text: why, onClose: close, options: [{ label: '알겠다', onSelect: close }] });
        return;
    }
    const others = STONE_MAPS.filter(id => id !== here && isAwake(id));
    const options = others.map(id => ({ label: mapName(id), onSelect: () => { close(); travelTo(id); } }));
    options.push({ label: '그냥 걸어간다', onSelect: close });
    const sleeping = STONE_MAPS.length - others.length - 1;
    dialogueUI.show({
        name: `${mapName(here)}의 석비`,
        text: others.length
            ? '돌에 손을 얹자 먼 곳의 돌들이 웅웅 울린다. 어디로 갈까?' + (sleeping > 0 ? `\n(아직 깨우지 못한 석비가 ${sleeping}개 남아 있다.)` : '')
            : '아직 깨운 석비가 여기뿐이다. 발로 뛰어 다른 석비를 찾아보자.',
        onClose: close,
        options,
    });
}
