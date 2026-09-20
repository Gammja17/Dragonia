import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { TRAINING, NEST_POS, VILLAGE_CENTER } from '../core/config.js';
import { BOSSES } from '../data/enemies.js';
import { FORDS, fordPos } from '../world/terrain.js';
import { REGIONS, getRegion } from '../world/biomes.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { spawnEffect } from '../render/vfx.js';
import { fadeScreen } from '../ui/hud.js';
import { play } from './audio.js';

// 이동 석비. 옛 용들이 길목마다 세워 둔 돌기둥으로, 한 번 손을 대면 그 뒤로는
// 석비끼리 오갈 수 있다. 월드가 넓고 강이 길을 막는 만큼, 걸어서 한 번 뚫은 길은
// 다시 걷지 않아도 되게 하려는 장치다.
//
//  - 처음 다가가면 그 자리에서 깨어난다 (state.waystones 에 id 가 쌓인다)
//  - 석비 앞에서 [E] 를 누르면 깨워 둔 다른 석비로 건너뛴다
//  - 습격 중·보스와 싸우는 중·놀이 중에는 쓸 수 없다

const FORD_AT = (id) => fordPos(FORDS.find(f => f.id === id));

export const WAYSTONES = [
    { id: 'VILLAGE', name: '마을 광장',     x: VILLAGE_CENTER.x + 60, y: VILLAGE_CENTER.y + 250, start: true },
    { id: 'DEN',     name: '나의 아지트',   x: NEST_POS.x + 210,      y: NEST_POS.y + 40,        start: true },
    { id: 'DOJO',    name: '카이론의 수련장', x: TRAINING.x + 40,     y: TRAINING.y + 330 },
    { id: 'EAST_FORD',  name: '동쪽 여울',  ...FORD_AT('EAST_FORD') },
    { id: 'SOUTH_FORD', name: '남쪽 여울',  ...FORD_AT('SOUTH_FORD') },
    { id: 'LOWER_FORD', name: '아랫 여울',  ...FORD_AT('LOWER_FORD') },
    { id: 'FAR_FORD',   name: '동남 여울',  ...FORD_AT('FAR_FORD') },
    { id: 'HOLLOW',  name: '달빛 골짜기',   x: BOSSES.MORGATH.x - 380, y: BOSSES.MORGATH.y + 300 },
    { id: 'SNOW',    name: '서리 봉우리',   x: BOSSES.GLACIA.x - 400,  y: BOSSES.GLACIA.y + 330 },
    { id: 'JUNGLE',  name: '환영의 밀림',   x: BOSSES.ZALGORA.x + 380, y: BOSSES.ZALGORA.y - 300 },
    { id: 'DESERT',  name: '죽은 사구',     x: BOSSES.BASIL.x + 390,   y: BOSSES.BASIL.y - 320 },
    { id: 'VOLCANO', name: '잿빛 화산',     x: BOSSES.IGNAR.x - 400,   y: BOSSES.IGNAR.y - 330 },
];

const DISCOVER_RANGE = 170;
const USE_RANGE = 150;

export function waystoneById(id) { return WAYSTONES.find(w => w.id === id); }
export function isAwake(id) { return state.waystones.includes(id); }

/** 각 석비에 지역 이름을 붙여 보여 준다 */
export function stoneRegion(w) { return REGIONS[getRegion(w.x, w.y)].name; }

/** 처음 시작할 때 켜 두는 석비들 (마을·아지트) */
export function initWaystones() {
    for (const w of WAYSTONES) if (w.start && !isAwake(w.id)) state.waystones.push(w.id);
}

/** 매 프레임: 가까이 가면 석비가 깨어난다 */
export function updateTravel() {
    const p = state.player;
    if (!p) return;
    for (const w of WAYSTONES) {
        if (isAwake(w.id) || dist(p, w) > DISCOVER_RANGE) continue;
        state.waystones.push(w.id);
        spawnEffect('RING', w.x, w.y - 30, { size: 1.5, color: '#7fd4ff' });
        play('relic');
        showToast(`[${w.name}]의 석비가 깨어났습니다. 이제 이곳으로 건너뛸 수 있습니다.`, '🗿');
    }
}

/** 지금 서 있는 자리에서 쓸 수 있는 석비 (없으면 null) */
export function nearbyWaystone() {
    const p = state.player;
    let best = null, bestD = USE_RANGE;
    for (const w of WAYSTONES) {
        const d = dist(p, w);
        if (d < bestD) { best = w; bestD = d; }
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

export function openTravelMenu(here) {
    state.isDialogueOpen = true;
    const why = blockedReason();
    if (why) {
        dialogueUI.show({ name: here.name, text: why, onClose: close, options: [{ label: '알겠다', onSelect: close }] });
        return;
    }
    const others = WAYSTONES.filter(w => w.id !== here.id && isAwake(w.id));
    const options = others.map(w => ({
        label: `${w.name} — ${stoneRegion(w)}`,
        onSelect: () => travelTo(w),
    }));
    options.push({ label: '그냥 걸어간다', onSelect: close });
    const sleeping = WAYSTONES.length - others.length - 1;
    dialogueUI.show({
        name: `${here.name}의 석비`,
        text: others.length
            ? `돌에 손을 얹자 먼 곳의 돌들이 웅웅 울린다. 어디로 갈까?` + (sleeping > 0 ? `\n(아직 깨우지 못한 석비가 ${sleeping}개 남아 있다.)` : '')
            : '아직 깨운 석비가 여기뿐이다. 발로 뛰어 다른 석비를 찾아보자.',
        onClose: close,
        options,
    });
}

function travelTo(w) {
    close();
    play('evolve');
    fadeScreen(w.name, () => {
        const p = state.player;
        p.x = w.x; p.y = w.y + 60;
        for (const n of [state.partner, state.companion]) if (n) { n.x = p.x + 70; n.y = p.y + 20; }
        for (const k of state.kids) if (k.entity) { k.entity.x = p.x - 60; k.entity.y = p.y + 30; }
        // 따라오던 적은 두고 간다
        for (const e of state.entities.enemies) e.remove = true;
    }, () => {
        spawnEffect('RING', state.player.x, state.player.y - 30, { size: 1.6, color: '#7fd4ff' });
        showToast(`${w.name}에 도착했습니다.`, '🗿');
    });
}
