import { state } from '../core/state.js';
import { RAID_INTERVAL } from '../core/config.js';
import { currentMapBounds } from '../world/terrain.js';
import { rand, pick } from '../core/utils.js';
import { Human } from '../entities/Human.js';
import { showToast } from '../ui/toast.js';
import { showRaidWarning } from '../ui/hud.js';
import { notify, activeQuests, curStep } from './quests.js';
import { play } from './audio.js';

// 습격은 회차(state.raid.count)가 오를수록 인원이 늘고 새 병종이 섞인다. 3회차마다 대장이 온다.
const SIDES = {
    W: { name: '서쪽', dx: -1, dy: 0 }, E: { name: '동쪽', dx: 1, dy: 0 },
    N: { name: '북쪽', dx: 0, dy: -1 }, S: { name: '남쪽', dx: 0, dy: 1 },
};

/**
 * 이야기가 습격을 기다리고 있나. 지금 대목이 "사냥꾼을 쓰러뜨려라" 거나 "습격을 막아라" 인 퀘스트가 있으면 참.
 * 그런 날은 시계를 기다리게 하지 않는다 — 그날 밤에 온다 (잠을 청해도 나팔이 깨운다, systems/story.js).
 */
export function raidWanted() {
    return activeQuests().some(q => {
        const g = (curStep(q) || {}).goal;
        return g && (g.type === 'raid' || (g.type === 'kill' && g.target === 'HUNTER'));
    });
}

const isNight = () => state.dayTime < 0.22 || state.dayTime > 0.82;

export function updateRaid(dt) {
    const raid = state.raid;
    if (raid.active) {
        // 지도를 옮기면 사냥꾼도 같이 사라진다. 그걸 "격퇴"로 쳐 주면 굴에 들어갔다 나오는 것만으로 이긴다
        if (state.mapId !== 'VILLAGE') abandonRaid();
        else if (state.entities.humans.length === 0) endRaid();
        return;
    }
    // 습격은 마을에 있을 때만 벌어진다. 딴 데 있으면 시계가 멈춘다
    if (state.mapId !== 'VILLAGE') return;
    if (raidWanted() && isNight()) return triggerRaid();
    // 첫 습격은 이야기가 부른다. 그 전에는 시계가 돌지 않는다 (새 게임 2분 만에 쳐들어오던 것)
    if (raid.count === 0) return;
    state.raidTimer -= dt;
    if (state.raidTimer <= 0) triggerRaid();
}

function roster(count) {
    const n = Math.min(4 + Math.floor(count * 1.5), 16);
    const pool = ['KNIGHT', 'KNIGHT', 'ARCHER', 'ARCHER'];
    if (count >= 2) pool.push('MAGE');
    if (count >= 3) pool.push('HEAVY', 'MAGE');
    if (count >= 6) pool.push('HEAVY', 'HEAVY');
    const list = Array.from({ length: n }, () => pick(pool));
    if (count % 3 === 0) list.push('CAPTAIN', 'HEAVY', 'HEAVY');   // 대장은 호위를 데리고 온다
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
        const b = currentMapBounds();
        const cx = b.w / 2, cy = b.h / 2;
        const x = cx + side.dx * (b.w * 0.38) + (side.dx ? rand(-60, 60) : spread);
        const y = cy + side.dy * (b.h * 0.36) + (side.dy ? rand(-60, 60) : spread);
        const h = new Human(x, y, type);
        h.maxHp = h.hp = Math.round(h.hp * (1 + 0.12 * (raid.count - 1)));   // 회차가 오를수록 단단해진다
        h.power = 1 + 0.08 * (raid.count - 1);
        state.entities.humans.push(h);
    }
}

function endRaid() {
    const raid = state.raid, p = state.player;
    raid.active = false;
    state.raidTimer = RAID_INTERVAL;
    const gold = 30 + raid.count * 15;
    p.gold += gold;
    for (const npc of state.entities.npcs) if (npc.config.fixed) npc.relation = Math.min(100, npc.relation + 2);
    showToast(`습격 ${raid.count}차 격퇴! (${gold}G, 마을 용들의 호감 ↑)`, '🛡️');
    p.gainXp(60 + raid.count * 30);
    state.story.today.raid = true;   // 내일 아침 "어제 습격" 이야기가 나올 수 있다
    notify('raid');
}

/** 싸우다 말고 마을을 떠났다. 보상도, 막아 냈다는 기록도 없다 */
function abandonRaid() {
    state.raid.active = false;
    state.raidTimer = RAID_INTERVAL;
    showToast('마을을 비운 사이 습격이 지나갔다. 남은 용들이 겨우 막아 냈다.', '🛡️');
}

/** HUD용: 다음 습격까지 남은 시간 또는 남은 사냥꾼 수 */
export function raidStatusText() {
    if (state.dungeon) return '';   // 굴 속에서는 습격 시계가 멈춘다
    if (!state.raid.active && state.raid.count === 0) return '';   // 아직 습격을 겪기 전
    if (state.raid.active) return `습격 중! 남은 사냥꾼 ${state.entities.humans.length}`;
    const t = Math.max(0, Math.ceil(state.raidTimer));
    return `다음 습격 ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
