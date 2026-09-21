import { state } from '../core/state.js';
import { BabyDragon } from '../entities/BabyDragon.js';
import { registerKid, setKidStage } from './kids.js';
import { bossRelic } from './relics.js';
import { BOSS_SKILLS } from '../data/skills.js';
import { fixedNpcs, enterMap } from './world.js';
import { START_MAP, MAPS } from '../data/maps.js';
import { reconcilePoints } from './growth.js';


// localStorage 세이브. 월드(지형·소품)는 시드 고정이라 저장하지 않는다. 떠돌이 NPC·적·아이템도 저장 안 함.
const KEY = 'dragonia-save-v1';

export function hasSave() { return !!readSave(); }

export function readSave() {
    try {
        const data = JSON.parse(localStorage.getItem(KEY));
        return data && data.v === 1 ? data : null;
    } catch { return null; }
}

export function deleteSave() { localStorage.removeItem(KEY); }

export function saveGame() {
    const p = state.player;
    if (!p || !state.gameActive) return;
    if (state.dungeon) return;   // 굴은 한 판짜리다. 나온 뒤에 저장한다
    // 둥지는 아지트 지도에만 있다. 딴 데 있을 땐 마지막으로 본 값을 그대로 저장한다
    const nest = state.entities.nests[0] || state.denNest || { hasEgg: false, progress: 0, genes: null };
    const data = {
        v: 1,
        savedAt: Date.now(),
        player: {
            config: { name: p.config.name, species: p.species, colors: p.colors, accessory: p.config.accessory || null, look: p.look },
            level: p.level, xp: p.xp, maxXp: p.maxXp, hp: p.hp, maxHp: p.maxHp, hunger: p.hunger,
            meat: p.inventory.meat, gold: p.gold, x: p.x, y: p.y,
            stageIndex: p.stageIndex, elements: p.elements, element: p.element, skills: p.skills, slots: p.slots,
        },
        gameTime: state.gameTime, dayTime: state.dayTime, day: state.day, raidTimer: state.raidTimer,
        mapId: state.mapId, visited: state.visited,
        elderTutorialDone: state.elderTutorialDone, tutorial: state.tutorial,
        weather: state.weather.type,
        quests: state.quests,
        bossesDefeated: state.bossesDefeated,
        raidCount: state.raid.count, upgrades: state.upgrades, openedChests: state.openedChests, blessingDay: state.blessingDay,
        companion: state.companion ? state.companion.config.name : null,
        den: state.den, ult: p.ult,
        relics: state.relics, relicSlots: state.relicSlots, materials: state.materials, waystones: state.waystones,
        furniture: state.furniture, denDecor: state.denDecor, densSeen: state.densSeen, stats: state.stats, event: state.event, story: state.story,
        growth: state.growth, revivedDay: state.revivedDay,
        npcs: Object.fromEntries(fixedNpcs()
            .map(n => [n.config.name, { relation: n.relation, lastGiftDay: n.lastGiftDay ?? null, lastTalkDay: n.lastTalkDay ?? null, lastPresentDay: n.lastPresentDay ?? null, lastPlayDay: n.lastPlayDay ?? null, dates: n.dates || 0, lastDateDay: n.lastDateDay ?? null, lastEggDay: n.lastEggDay ?? null, lastMeditateDay: n.lastMeditateDay ?? null }])),
        partner: state.partner ? state.partner.config.name : null,
        nest: { hasEgg: nest.hasEgg, progress: nest.progress, genes: nest.genes },
        kids: state.kids.map(k => ({
            name: k.name, stage: k.stage, affection: k.affection, mode: k.mode, personality: k.personality,
            lastPlayDay: k.lastPlayDay ?? null, lastTrainDay: k.lastTrainDay ?? null, element: k.entity.element,
            growth: k.entity.growth, genes: k.entity.genes, x: k.entity.x, y: k.entity.y,
        })),
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 저장 공간이 막혀 있으면 조용히 포기 */ }
}

/** initWorld() 직후에 호출해 저장된 진행 상황을 덮어쓴다 */
export function applySave(data) {
    const p = state.player, s = data.player;
    Object.assign(p, {
        level: s.level, xp: s.xp, maxXp: s.maxXp, hp: s.hp, maxHp: s.maxHp, hunger: s.hunger,
        stageIndex: s.stageIndex, elements: s.elements, element: s.element,
    });
    p.inventory.meat = s.meat;
    p.skills = s.skills || [];
    p.slots = s.slots || { Q: null, F: null, R: null };
    p.gold = s.gold || 0;

    Object.assign(state, {
        gameTime: data.gameTime, dayTime: data.dayTime, day: data.day, raidTimer: data.raidTimer,
        elderTutorialDone: data.elderTutorialDone, quests: data.quests, bossesDefeated: data.bossesDefeated,
    });
    state.weather.type = data.weather;
    state.raid.count = data.raidCount || 0;
    state.upgrades = data.upgrades || {};
    state.openedChests = data.openedChests || {};
    state.blessingDay = data.blessingDay || 0;
    state.tutorial = data.tutorial || { moved: true, journal: true, ate: true, toured: true, finished: true };   // 예전 세이브는 안내를 건너뛴다
    if (state.tutorial.toured === undefined) state.tutorial.toured = true;   // 마을 돌기가 생기기 전 세이브
    state.tour = null;
    state.relics = data.relics || [];
    // 예전 세이브에는 장착 칸이 없다. 가진 유물 앞쪽 몇 개를 자동으로 끼워 준다
    state.relicSlots = data.relicSlots || state.relics.slice(0, 3);
    state.materials = data.materials || {};
    state.waystones = data.waystones || [];
    state.furniture = data.furniture || {};
    state.denDecor = data.denDecor || [];
    state.densSeen = data.densSeen || [];
    state.growth = data.growth || { points: 0, nodes: {}, ranks: {} };
    state.revivedDay = data.revivedDay || 0;
    reconcilePoints();
    state.visited = data.visited || [];
    state.den = data.den || { built: !!(data.nest && data.nest.hasEgg), twigs: 0 };
    state.denNest = data.nest || { hasEgg: false, progress: 0, genes: null };
    p.ult = data.ult || 0;
    state.story = data.story || { scenes: [], lessons: [], lessonDay: 0 };
    state.story.rites = state.story.rites || [];
    state.story.clues = state.story.clues || [];
    state.stats = data.stats || { kills: {} };
    if (state.stats.brinks === undefined) state.stats.brinks = 0;
    state.event = data.event || null;
    // 성장 트리: 찍어 둔 것을 되살리고, 남은 포인트는 레벨·단계에서 다시 계산한다
    // (성장 트리가 없던 옛 세이브도 그동안 쌓였어야 할 포인트를 그대로 받는다)
    state.growth = data.growth || { points: 0, nodes: {}, ranks: {} };
    state.revivedDay = data.revivedDay || 0;
    reconcilePoints();
    // 유물이 생기기 전에 잡은 보스의 전리품도 챙겨 준다
    for (const id of Object.keys(state.bossesDefeated)) { const r = bossRelic(id); if (r && !state.relics.includes(r)) state.relics.push(r); }

    // NPC 상태는 이름으로 되살린다 (지도마다 따로 깔리므로 개체 목록으로는 찾을 수 없다)
    for (const npc of fixedNpcs()) {
        const saved = data.npcs ? data.npcs[npc.config.name] : null;
        if (!saved) continue;
        Object.assign(npc, saved);
        if (data.companion === npc.config.name) { npc.state = 'COMPANION_FOLLOW'; state.companion = npc; }
        if (data.partner === npc.config.name) { npc.state = 'PARTNER_FOLLOW'; state.partner = npc; }
    }

    // 아이들. 지도를 옮길 때 따라오므로 개체만 만들어 두면 된다
    for (const k of data.kids || []) {
        const baby = new BabyDragon(k.x, k.y, k.genes);
        baby.growth = k.growth;
        baby.stage = k.stage;
        const kid = registerKid(baby);
        baby.element = k.element || 'FIRE';
        Object.assign(kid, { name: k.name, affection: k.affection, mode: k.mode, personality: k.personality || kid.personality, lastPlayDay: k.lastPlayDay, lastTrainDay: k.lastTrainDay });
        setKidStage(baby, k.stage);
    }

    // 마지막으로 있던 지도로 (여기서 소품·NPC·보스·가족이 전부 새로 깔린다)
    enterMap(MAPS[data.mapId] ? data.mapId : START_MAP, { spot: { x: s.x, y: s.y } });
}
