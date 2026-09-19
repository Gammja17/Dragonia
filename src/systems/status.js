// 상태 이상: BURN(지속 피해), SLOW(이동 절반), STUN(정지). 적/사냥꾼/보스 공용.
// 대상은 hp, takeDamage(dmg, silent) 를 가진 엔티티.
import { hasRelic } from './relics.js';

const BURN_DPS = 3;

export function applyStatus(e, type, duration) {
    if (e.statusImmune && type === 'STUN') duration *= 0.35; // 보스는 기절이 짧다
    if (type === 'SLOW' && hasRelic('MORGATH_HORN')) duration *= 2;
    e.status = e.status || {};
    e.status[type] = Math.max(e.status[type] || 0, duration);
}

/** 매 프레임 호출. 이동 속도 배율(0~1)을 돌려준다 */
export function updateStatus(e, dt) {
    const s = e.status;
    if (!s) return 1;
    let speed = 1;
    if (s.BURN > 0) { s.BURN -= dt; e.takeDamage(BURN_DPS * (hasRelic('IGNAR_HEART') ? 2 : 1) * dt, true); }
    if (s.SLOW > 0) { s.SLOW -= dt; speed *= 0.5; }
    if (s.STUN > 0) { s.STUN -= dt; speed = 0; }
    return speed;
}

/** 상태에 따른 표시 색 (없으면 null) */
export function statusTint(e) {
    const s = e.status;
    if (!s) return null;
    if (s.STUN > 0) return '#fff2a8';
    if (s.SLOW > 0) return '#7fd4ff';
    if (s.BURN > 0) return '#ff9a3c';
    return null;
}
