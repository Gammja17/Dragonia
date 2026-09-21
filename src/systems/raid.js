import { state } from '../core/state.js';
import { RAID_INTERVAL } from '../core/config.js';
import { currentMapBounds } from '../world/terrain.js';
import { rand, pick } from '../core/utils.js';
import { Human } from '../entities/Human.js';
import { showToast } from '../ui/toast.js';
import { showRaidWarning } from '../ui/hud.js';
import { notify, activeQuests, curStep } from './quests.js';
import { CHAPTERS, currentChapter } from '../data/chapters.js';
import { npcName } from '../data/npcs.js';
import { isDead } from './routine.js';
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
        if (raid.captainFell) { raid.captainFell = false; captainDown(); }
        // 지켜야 하는 용이 쓰러졌는지 본다
        const ob = raid.objective;
        if (ob && !ob.failed) { const n = state.entities.npcs.find(x => x.config.name === ob.name); if (n && n.downTimer > 0) { ob.failed = true; showToast(`${npcName(ob.name)}가 쓰러졌다…`, '💫'); } }
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

/**
 * 장마다 달라지는 습격.
 *   2장  정찰대: 기사와 궁수 몇
 *   3~4장 그물꾼이 섞인다. 맞으면 발이 묶인다
 *   5장  마법사가 늘고, 두 방향에서 든다
 *   6장 뒤 중갑이 앞장서고, 대장이 자주 온다
 * 회차(count)는 여전히 인원을 조금씩 늘린다.
 */
function chapterNo() { return CHAPTERS.indexOf(currentChapter(state)) + 1; }   // 1장=1 … (c3b 때문에 뒤쪽은 하나씩 밀리지만 순서만 본다)

function roster(count) {
    const ch = chapterNo();
    const n = Math.min(3 + ch + Math.floor(count * 0.7), 16);
    const pool = ['KNIGHT', 'KNIGHT', 'ARCHER', 'ARCHER'];
    if (ch >= 3) pool.push('TRAPPER', 'TRAPPER');
    if (ch >= 5) pool.push('MAGE', 'MAGE');
    if (ch >= 6) pool.push('MAGE', 'HEAVY');
    if (ch >= 7) pool.push('HEAVY', 'HEAVY', 'TRAPPER');
    const list = Array.from({ length: n }, () => pick(pool));
    if (ch >= 6 && count % 2 === 0) list.push('CAPTAIN', 'HEAVY');       // 전쟁 뒤로는 대장이 자주 온다
    else if (ch >= 4 && count % 3 === 0) list.push('CAPTAIN', 'HEAVY');  // 대장은 호위를 데리고 온다
    return list;
}

/**
 * 습격마다 목표가 하나 붙기도 한다 (3장부터, 절반쯤).
 *   RESCUE  사냥꾼 몇이 싸우지 못하는 용 하나를 노린다. 그 용이 쓰러지지 않게 지켜 내면 덤이 붙는다
 * 대장이 낀 습격에서는 대장을 먼저 쓰러뜨리면 남은 사냥꾼 절반이 달아난다 (entities/Human.js 가 깃발을 세운다)
 */
function pickObjective(list) {
    if (chapterNo() < 3 || Math.random() < 0.5) return null;
    const weak = ['Poco', 'Mira', 'Ember'].filter(n => !isDead(n));
    const npc = state.entities.npcs.find(n => weak.includes(n.config.name) && !(n.downTimer > 0));
    if (!npc) return null;
    return { type: 'RESCUE', name: npc.config.name, failed: false };
}

/** 대장이 쓰러졌다: 남은 사냥꾼의 절반이 도망친다 */
function captainDown() {
    const raid = state.raid;
    if (!raid.active) return;
    const rest = state.entities.humans.filter(h => !h.remove && h.type !== 'CAPTAIN');
    const flee = rest.slice(0, Math.floor(rest.length / 2));
    for (const h of flee) h.remove = true;
    if (flee.length) showToast(`대장이 쓰러지자 사냥꾼 ${flee.length}명이 달아났다!`, '🏃');
}

/** 5장부터는 두 방향에서 한꺼번에 든다 */
function raidSides() {
    const keys = Object.keys(SIDES);
    const first = pick(keys);
    if (chapterNo() < 6) return [SIDES[first]];
    const second = pick(keys.filter(k => k !== first));
    return [SIDES[first], SIDES[second]];
}

/** 6장의 대습격. 싸울 수 있는 용들이 폭포에 가 있는 틈을 알고 온다. 두 방향에서, 대장까지 */
const WAR_ROSTER = ['KNIGHT', 'KNIGHT', 'KNIGHT', 'ARCHER', 'ARCHER', 'ARCHER', 'MAGE', 'MAGE', 'HEAVY', 'HEAVY', 'CAPTAIN'];

/** kind: 'war' 면 각본 있는 대습격 (data/chronicle.js 의 ev_border 가 부른다) */
export function triggerRaid(kind = null) {
    const raid = state.raid;
    raid.count++;
    raid.active = true;
    raid.kind = kind;
    if (kind === 'war') return spawnWar();
    const sides = raidSides();
    const where = sides.map(s => s.name).join('과 ');
    showRaidWarning(`${where}에서 습격! (${raid.count}차)`);
    play('raid');
    showToast(`사냥꾼 습격 ${raid.count}차! ${where}에서 몰려옵니다. 마을 용들과 함께 막아내세요!`, '⚔️');
    const list = roster(raid.count);
    if (list.includes('TRAPPER') && !state.story.flags?.sawTrapper) { (state.story.flags = state.story.flags || {}).sawTrapper = true; showToast('그물꾼이 섞여 있다. 느리게 날아오는 그물은 보고 피하자.', '🕸️'); }
    raid.objective = pickObjective(list);
    if (raid.objective) showToast(`사냥꾼 몇이 ${npcName(raid.objective.name)} 쪽으로 몰려간다. 쓰러지지 않게 지켜 주자!`, '🛡️');
    if (list.includes('CAPTAIN')) showToast('대장이 섞여 있다. 대장을 먼저 쓰러뜨리면 나머지가 흔들린다.', '⚔️');
    list.forEach((type, i) => {
        const side = sides[i % sides.length];
        // 마을 가장자리 바깥, 그 변을 따라 흩어져서 등장
        const spread = rand(-260, 260);
        const b = currentMapBounds();
        const cx = b.w / 2, cy = b.h / 2;
        const x = cx + side.dx * (b.w * 0.38) + (side.dx ? rand(-60, 60) : spread);
        const y = cy + side.dy * (b.h * 0.36) + (side.dy ? rand(-60, 60) : spread);
        const h = new Human(x, y, type);
        h.maxHp = h.hp = Math.round(h.hp * (1 + 0.12 * (raid.count - 1)));   // 회차가 오를수록 단단해진다
        h.power = 1 + 0.08 * (raid.count - 1);
        if (raid.objective && i % 3 === 0 && type !== 'CAPTAIN') h.hunts = raid.objective.name;   // 셋 중 하나는 그 용만 노린다
        state.entities.humans.push(h);
    });
}

function spawnWar() {
    showRaidWarning('마을이 습격당하고 있다!');
    play('raid');
    showToast('사냥꾼들이 두 방향에서 몰려온다. 싸울 수 있는 용들은 전부 폭포에 가 있다!', '⚔️');
    const b = currentMapBounds(), cx = b.w / 2, cy = b.h / 2;
    const two = [SIDES.E, SIDES.S];
    WAR_ROSTER.forEach((type, i) => {
        const side = two[i % 2], spread = rand(-260, 260);
        const x = cx + side.dx * (b.w * 0.38) + (side.dx ? rand(-60, 60) : spread);
        const y = cy + side.dy * (b.h * 0.36) + (side.dy ? rand(-60, 60) : spread);
        state.entities.humans.push(new Human(x, y, type));
    });
}

function endRaid() {
    const raid = state.raid, p = state.player;
    raid.active = false;
    raid.kind = null;
    state.raidTimer = RAID_INTERVAL;
    const gold = 30 + raid.count * 15;
    p.gold += gold;
    for (const npc of state.entities.npcs) if (npc.config.fixed) npc.relation = Math.min(100, npc.relation + 2);
    showToast(`습격 ${raid.count}차 격퇴! (${gold}G, 마을 용들의 호감 ↑)`, '🛡️');
    p.gainXp(60 + raid.count * 30);
    state.story.today.raid = true;   // 내일 아침 "어제 습격" 이야기가 나올 수 있다
    const ob = raid.objective;
    if (ob) {
        const npc = state.entities.npcs.find(n => n.config.name === ob.name);
        if (npc && !ob.failed) {
            npc.relation = Math.min(100, (npc.relation || 0) + 8);
            p.gold += 40; p.gainXp(80);
            showToast(`${npcName(ob.name)}를 끝까지 지켜 냈다! (40G, 호감 ↑)`, '🛡️');
            npc.say(ob.name === 'Poco' ? '고, 고마워… 나 진짜 무서웠어.' : '덕분에 살았어. 고마워.');
        }
        raid.objective = null;
    }
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
    if (state.raid.active) return `습격 중! 남은 사냥꾼 ${state.entities.humans.length}` + (state.raid.objective && !state.raid.objective.failed ? ` · ${npcName(state.raid.objective.name)}를 지켜라` : '');
    const t = Math.max(0, Math.ceil(state.raidTimer));
    return `다음 습격 ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
