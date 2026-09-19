import { state } from '../core/state.js';
import { RAID_INTERVAL, VILLAGE_CENTER } from '../core/config.js';
import { rand, pick } from '../core/utils.js';
import { Human } from '../entities/Human.js';
import { showToast } from '../ui/toast.js';
import { showRaidWarning } from '../ui/hud.js';
import { notify } from './quests.js';
import { play } from './audio.js';

// 습격은 회차(state.raid.count)가 오를수록 인원이 늘고 새 병종이 섞인다. 3회차마다 대장이 온다.
const SIDES = {
    W: { name: '서쪽', dx: -1, dy: 0 }, E: { name: '동쪽', dx: 1, dy: 0 },
    N: { name: '북쪽', dx: 0, dy: -1 }, S: { name: '남쪽', dx: 0, dy: 1 },
};

export function updateRaid(dt) {
    const raid = state.raid;
    if (raid.active) {
        if (state.entities.humans.length === 0) endRaid();
        return;
    }
    state.raidTimer -= dt;
    if (state.raidTimer <= 0) triggerRaid();
}

function roster(count) {
    const n = Math.min(3 + count, 10);
    const pool = ['KNIGHT', 'KNIGHT', 'ARCHER'];
    if (count >= 2) pool.push('MAGE');
    if (count >= 4) pool.push('HEAVY', 'MAGE');
    const list = Array.from({ length: n }, () => pick(pool));
    if (count > 0 && count % 3 === 0) list.push('CAPTAIN');
    return list;
}

export function triggerRaid() {
    const raid = state.raid;
    raid.count++;
    raid.active = true;
    const side = SIDES[pick(Object.keys(SIDES))];
    showRaidWarning(`${side.name}에서 습격! (${raid.count}차)`);
    play('raid');
    showToast(`사냥꾼 습격 ${raid.count}차! ${side.name}에서 몰려옵니다. 마을 용들과 함께 막아내세요!`, '⚔️');
    for (const type of roster(raid.count)) {
        // 마을 가장자리 바깥, 그 변을 따라 흩어져서 등장
        const spread = rand(-260, 260);
        const x = VILLAGE_CENTER.x + side.dx * 640 + (side.dx ? rand(-60, 60) : spread);
        const y = VILLAGE_CENTER.y + side.dy * 640 + (side.dy ? rand(-60, 60) : spread);
        state.entities.humans.push(new Human(x, y, type));
    }
}

function endRaid() {
    const raid = state.raid, p = state.player;
    raid.active = false;
    state.raidTimer = RAID_INTERVAL;
    const gold = 20 + raid.count * 10;
    p.gold += gold;
    for (const npc of state.entities.npcs) if (npc.config.fixed) npc.relation = Math.min(100, npc.relation + 2);
    showToast(`습격 ${raid.count}차 격퇴! (${gold}G, 마을 용들의 호감 ↑)`, '🛡️');
    p.gainXp(60 + raid.count * 30);
    notify('raid');
}

/** HUD용: 다음 습격까지 남은 시간 또는 남은 사냥꾼 수 */
export function raidStatusText() {
    if (state.raid.active) return `습격 중! 남은 사냥꾼 ${state.entities.humans.length}`;
    const t = Math.max(0, Math.ceil(state.raidTimer));
    return `다음 습격 ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
