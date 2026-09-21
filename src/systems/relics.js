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
    BASIL_FANG:    { name: '바실의 독니',     desc: '치명타 피해가 3배가 된다',     boss: 'BASIL', kin: 'fang' },    // entities/Projectile.js
    IGNAR_HEART:   { name: '이그나르의 심장', desc: '화상 피해가 2배가 된다',       boss: 'IGNAR', kin: 'flame' },    // systems/status.js
    // 이야기에서 받는 것 (상자에서는 나오지 않는다)
    GRON_PLATE:    { name: '그론의 비늘갑',   desc: '받는 피해 -15%. 이음매가 조금 삐뚤다', gift: true, kin: 'scale' },   // entities/Dragon.js
    // 상자·정예 몬스터·굴에서
    OLD_FANG:      { name: '고대의 송곳니',   desc: '브레스 피해 +15%', kin: 'fang' },           // entities/Dragon.js
    HUNTER_CHARM:  { name: '사냥꾼의 부적',   desc: '치명타 확률 +10%', kin: 'fang' },           // entities/Projectile.js
    LUCKY_COIN:    { name: '행운의 동전',     desc: '골드 획득 +30%' },             // entities/Item.js
    WIND_FEATHER:  { name: '바람 깃털',       desc: '이동 속도 +8%', kin: 'wing' },              // entities/Dragon.js
    LIFE_STONE:    { name: '생명석',          desc: '체력이 천천히 회복된다', kin: 'scale' },     // entities/Dragon.js
    NEST_CHARM:    { name: '둥지의 부적',     desc: '알이 50% 빨리 부화한다' },     // entities/Nest.js
    IRON_STOMACH:  { name: '먹보의 위장',     desc: '허기가 절반 속도로 준다', kin: 'scale' },    // entities/Dragon.js
    // ---- 싸우는 법을 바꾸는 것들 (systems/flow.js 의 기세 · 간발 · 물어뜯기와 물린다) ----
    SPLIT_SCALE:   { name: '갈라진 비늘',     desc: '숨결이 맞은 자리에서 작은 조각 둘로 갈라져 나간다', kin: 'fang' },          // entities/Projectile.js
    GLASS_FANG:    { name: '유리 송곳니',     desc: '주는 피해 +40%. 대신 받는 피해도 +30%', kin: 'fang' },                       // entities/Dragon.js
    RED_MOON_TOOTH:{ name: '붉은 달의 이빨',  desc: '체력이 45% 남은 적까지 물어뜯을 수 있고, 물어뜯어 되찾는 체력이 3배', kin: 'fang' },   // systems/flow.js
    THORN_SHELL:   { name: '가시 등껍질',     desc: '맞으면 둘레의 적에게 되돌려 준다', kin: 'scale' },                           // entities/Dragon.js
    LAST_EMBER:    { name: '마지막 불씨',     desc: '하루 한 번, 쓰러질 일격을 체력 1로 버티고 둘레를 불태운다', kin: 'scale' },   // entities/Dragon.js
    EMBER_TRAIL:   { name: '불씨 발자국',     desc: '대시가 지나간 자리에 불길이 남는다', kin: 'wing' },                          // entities/Dragon.js
    STORM_EYE:     { name: '폭풍의 눈',       desc: '간발로 피하면 둘레의 적에게 번개가 떨어진다', kin: 'wing' },                 // systems/flow.js
    FROZEN_CLOCK:  { name: '얼어붙은 모래시계', desc: '간발 뒤에 세상이 느려지는 시간이 2배', kin: 'wing' },                     // systems/flow.js
    HUNGRY_FLAME:  { name: '굶주린 불꽃',     desc: '적을 쓰러뜨릴 때마다 3초 동안 숨결이 빨라진다 (세 번까지 겹친다)', kin: 'flame' },   // systems/flow.js
    BOILING_BLOOD: { name: '끓는 피',         desc: '맞아도 기세가 반이 아니라 오분의 일만 꺾인다', kin: 'flame' },               // systems/flow.js
    GREEDY_MAW:    { name: '탐식의 턱',       desc: '고기를 먹으면 12초 동안 주는 피해 +25%', kin: 'flame' },                     // entities/Dragon.js
    ECHO_SHELL:    { name: '메아리 소라',     desc: '기술을 쓰면 넷에 한 번은 재사용 대기 없이 바로 돌아온다', kin: 'flame' },     // systems/skills.js
    TWIN_SOUL:     { name: '쌍둥이 혼',       desc: '곁에서 싸우는 짝과 동료의 숨결이 +50% 세진다' },                             // entities/Dragon.js
};

// 공명: 같은 갈래(kin)의 유물을 둘 이상 끼우면 덤이 붙는다. 무엇을 끼울지가 곧 어떻게 싸울지가 된다
export const KINS = {
    fang:  { name: '송곳니', bonus: '치명타 확률 +8%' },        // entities/Projectile.js
    scale: { name: '비늘',   bonus: '받는 피해 -8%' },          // entities/Dragon.js
    wing:  { name: '날개',   bonus: '대시가 25% 빨리 돌아온다' }, // entities/Dragon.js
    flame: { name: '불꽃',   bonus: '기세가 30% 빨리 찬다' },    // systems/flow.js
};
/** 이 갈래가 지금 공명하고 있는가 (같은 갈래를 둘 이상 끼웠는가) */
export function resonates(kin) {
    return equippedRelics().filter(id => RELICS[id] && RELICS[id].kin === kin).length >= 2;
}

// 몸이 자랄수록 유물을 더 걸 수 있다 (data/elements.js 의 STAGES 순서)
const SLOTS_BY_STAGE = [1, 2, 3, 4, 4];   // 해츨링 · 어린 용 · 성체 · 고룡 · 삼원룡

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
