import { state } from '../core/state.js';
import { pick } from '../core/utils.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { play } from './audio.js';

// 유물: 가지고만 있어도 효과가 나는 패시브 장비. state.relics = [id, ...]
// 효과는 각 시스템이 hasRelic(id) 로 확인한다 (어디서 쓰이는지는 desc 옆 주석 참고).
export const RELICS = {
    // 보스 전리품
    MORGATH_HORN:  { name: '모르가스의 뿔',   desc: '냉기의 둔화가 2배 오래간다',   boss: 'MORGATH' },  // systems/status.js
    ZALGORA_SCALE: { name: '잘고라의 비늘',   desc: '번개가 한 번 더 튄다',         boss: 'ZALGORA' },  // entities/Projectile.js
    GLACIA_TEAR:   { name: '글라시아의 눈물', desc: '스킬 재사용 대기 -25%',       boss: 'GLACIA' },   // entities/Dragon.js
    BASIL_FANG:    { name: '바실의 독니',     desc: '치명타 피해가 3배가 된다',     boss: 'BASIL' },    // entities/Projectile.js
    IGNAR_HEART:   { name: '이그나르의 심장', desc: '화상 피해가 2배가 된다',       boss: 'IGNAR' },    // systems/status.js
    // 상자·정예 몬스터에게서
    OLD_FANG:      { name: '고대의 송곳니',   desc: '브레스 피해 +15%' },           // entities/Dragon.js
    HUNTER_CHARM:  { name: '사냥꾼의 부적',   desc: '치명타 확률 +10%' },           // entities/Projectile.js
    LUCKY_COIN:    { name: '행운의 동전',     desc: '골드 획득 +30%' },             // entities/Item.js
    WIND_FEATHER:  { name: '바람 깃털',       desc: '이동 속도 +8%' },              // entities/Dragon.js
    LIFE_STONE:    { name: '생명석',          desc: '체력이 천천히 회복된다' },     // entities/Dragon.js
    NEST_CHARM:    { name: '둥지의 부적',     desc: '알이 50% 빨리 부화한다' },     // entities/Nest.js
    IRON_STOMACH:  { name: '먹보의 위장',     desc: '허기가 절반 속도로 준다' },    // entities/Dragon.js
};

export function hasRelic(id) { return state.relics.includes(id); }

export function grantRelic(id, x, y) {
    if (hasRelic(id)) return false;
    state.relics.push(id);
    const r = RELICS[id];
    showToast(`유물 획득: [${r.name}] — ${r.desc}`, '💎');
    spawnEffect('RING', x, y - 30, { size: 1.6 });
    play('relic');
    return true;
}

/** 아직 없는 일반 유물 중 하나 (다 모았으면 null) */
export function randomRelic() {
    const pool = Object.keys(RELICS).filter(id => !RELICS[id].boss && !hasRelic(id));
    return pool.length ? pick(pool) : null;
}

export function bossRelic(bossId) {
    return Object.keys(RELICS).find(id => RELICS[id].boss === bossId);
}
