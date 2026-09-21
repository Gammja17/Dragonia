import { state } from '../core/state.js';
import { pick } from '../core/utils.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { play } from './audio.js';

// 유물: 찾아 두었다고 다 쓰는 게 아니라, 끼운 것만 힘이 된다.
//
//  state.relics      가지고 있는 유물 id (모으는 것)
//  state.relicSlots  실제로 끼운 유물 id (힘이 되는 것). 칸 수는 몸이 자랄수록 는다
//
// 효과를 보는 쪽은 전부 hasRelic(id) = "끼워 두었는가" 를 묻는다.
// 어디서 쓰이는지는 아래 desc 옆 주석 참고.
export const RELICS = {
    // 보스 전리품
    MORGATH_HORN:  { name: '모르가스의 뿔',   desc: '냉기의 둔화가 2배 오래간다',   boss: 'MORGATH' },  // systems/status.js
    ZALGORA_SCALE: { name: '잘고라의 비늘',   desc: '번개가 한 번 더 튄다',         boss: 'ZALGORA' },  // entities/Projectile.js
    GLACIA_TEAR:   { name: '글라시아의 눈물', desc: '스킬 재사용 대기 -25%',       boss: 'GLACIA' },   // systems/skills.js
    BASIL_FANG:    { name: '바실의 독니',     desc: '치명타 피해가 3배가 된다',     boss: 'BASIL' },    // entities/Projectile.js
    IGNAR_HEART:   { name: '이그나르의 심장', desc: '화상 피해가 2배가 된다',       boss: 'IGNAR' },    // systems/status.js
    // 이야기에서 받는 것 (상자에서는 나오지 않는다)
    GRON_PLATE:    { name: '그론의 비늘갑',   desc: '받는 피해 -15%. 이음매가 조금 삐뚤다', gift: true },   // entities/Dragon.js
    // 상자·정예 몬스터·굴에서
    OLD_FANG:      { name: '고대의 송곳니',   desc: '브레스 피해 +15%' },           // entities/Dragon.js
    HUNTER_CHARM:  { name: '사냥꾼의 부적',   desc: '치명타 확률 +10%' },           // entities/Projectile.js
    LUCKY_COIN:    { name: '행운의 동전',     desc: '골드 획득 +30%' },             // entities/Item.js
    WIND_FEATHER:  { name: '바람 깃털',       desc: '이동 속도 +8%' },              // entities/Dragon.js
    LIFE_STONE:    { name: '생명석',          desc: '체력이 천천히 회복된다' },     // entities/Dragon.js
    NEST_CHARM:    { name: '둥지의 부적',     desc: '알이 50% 빨리 부화한다' },     // entities/Nest.js
    IRON_STOMACH:  { name: '먹보의 위장',     desc: '허기가 절반 속도로 준다' },    // entities/Dragon.js
};

// 몸이 자랄수록 유물을 더 걸 수 있다 (data/elements.js 의 STAGES 순서)
const SLOTS_BY_STAGE = [1, 1, 2, 3, 3];   // 해츨링 · 어린 용 · 성체 · 고룡 · 삼원룡

export function slotCount() {
    return SLOTS_BY_STAGE[state.player ? state.player.stageIndex : 0];
}

/** 가지고 있는가 (도감·중복 판정용) */
export function ownsRelic(id) { return state.relics.includes(id); }

/** 지금 끼워 두었는가. 효과를 보는 쪽은 전부 이걸 묻는다 */
export function hasRelic(id) {
    const slots = state.relicSlots;
    if (!slots) return false;
    return slots.slice(0, slotCount()).includes(id);
}

export function equippedRelics() { return slots().slice(0, slotCount()).filter(Boolean); }

const MAX_SLOTS = SLOTS_BY_STAGE[SLOTS_BY_STAGE.length - 1];

/** 칸 배열을 늘 최대 길이로 맞춰 둔다 (앞쪽 slotCount() 칸만 실제로 쓴다) */
function slots() {
    if (!state.relicSlots) state.relicSlots = [];
    while (state.relicSlots.length < MAX_SLOTS) state.relicSlots.push(null);
    return state.relicSlots;
}

/** 끼우기 / 빼기. 칸이 꽉 찼으면 false */
export function toggleRelic(id) {
    if (!ownsRelic(id)) return false;
    const list = slots(), max = slotCount();
    const at = list.indexOf(id);
    if (at >= 0 && at < max) { list[at] = null; play('ui'); return true; }     // 빼기
    for (let i = 0; i < max; i++) if (!list[i]) { list[i] = id; play('relic'); return true; }
    showToast(`유물 칸이 ${max}칸뿐입니다. 끼운 것을 먼저 빼세요. (몸이 자라면 칸이 늘어납니다)`, '💎');
    return false;
}

export function grantRelic(id, x, y) {
    if (ownsRelic(id)) return false;
    state.relics.push(id);
    const r = RELICS[id];
    const list = slots();
    let free = -1;                                   // 빈 칸이 있으면 바로 끼워 준다
    for (let i = 0; i < slotCount(); i++) if (!list[i]) { list[i] = id; free = i; break; }
    showToast(`유물 획득: [${r.name}]. ${r.desc}` + (free >= 0 ? ' (바로 장착)' : ' ([J] 일지 유물 탭에서 끼울 수 있습니다)'), '💎');
    spawnEffect('RING', x, y - 30, { size: 1.6 });
    play('relic');
    return true;
}

/** 아직 없는 일반 유물 중 하나 (다 모았으면 null) */
export function randomRelic() {
    const pool = Object.keys(RELICS).filter(id => !RELICS[id].boss && !RELICS[id].gift && !ownsRelic(id));
    return pool.length ? pick(pool) : null;
}

export function bossRelic(bossId) {
    return Object.keys(RELICS).find(id => RELICS[id].boss === bossId);
}
