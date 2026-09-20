import { state } from '../core/state.js';
import { BabyDragon } from '../entities/BabyDragon.js';
import { registerKid, setKidStage } from './kids.js';
import { PROP_SPRITES } from '../data/tiles.js';
import { bossRelic } from './relics.js';
import { BOSS_SKILLS } from '../data/skills.js';
import { NEST_POS } from '../core/config.js';

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
    const nest = state.entities.nests[0];
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
        elderTutorialDone: state.elderTutorialDone,
        weather: state.weather.type,
        quests: state.quests,
        bossesDefeated: state.bossesDefeated,
        raidCount: state.raid.count, upgrades: state.upgrades, openedChests: state.openedChests, blessingDay: state.blessingDay,
        companion: state.companion ? state.companion.config.name : null,
        den: state.den, ult: p.ult,
        relics: state.relics, relicSlots: state.relicSlots, materials: state.materials, waystones: state.waystones, stats: state.stats, event: state.event, story: state.story,
        npcs: Object.fromEntries(state.entities.npcs.filter(n => n.config.fixed)
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

/** buildWorld() 직후에 호출해 저장된 진행 상황을 덮어쓴다 */
export function applySave(data) {
    const p = state.player, s = data.player;
    Object.assign(p, {
        level: s.level, xp: s.xp, maxXp: s.maxXp, hp: s.hp, maxHp: s.maxHp, hunger: s.hunger,
        x: s.x, y: s.y, stageIndex: s.stageIndex, elements: s.elements, element: s.element,
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
    state.relics = data.relics || [];
    state.relicSlots = data.relicSlots || [];
    state.materials = data.materials || {};
    state.waystones = data.waystones || [];
    state.den = data.den || { built: state.kids.length > 0 || !!data.nest.hasEgg, twigs: 0 };   // 옛 세이브: 이미 알·아이가 있으면 지은 걸로 친다
    p.ult = data.ult || 0;
    state.story = data.story || { scenes: [], lessons: [], lessonDay: 0 };
    state.stats = data.stats || { kills: {} };
    state.event = data.event || null;
    // 유물이 생기기 전에 잡은 보스의 전리품도 챙겨 준다
    for (const id of Object.keys(state.bossesDefeated)) { const r = bossRelic(id); if (r && !state.relics.includes(r)) state.relics.push(r); }
    for (const c of state.entities.props) if (c.type === 'CHEST' && state.openedChests[c.chestId]) { c.opened = true; c.sprite = PROP_SPRITES.CHEST_OPEN[0]; }
    state.entities.bosses = state.entities.bosses.filter(b => !data.bossesDefeated[b.id]);

    for (const npc of state.entities.npcs) {
        const saved = data.npcs[npc.config.name];
        if (!saved || !npc.config.fixed) continue; // 떠돌이 NPC는 이름이 겹칠 수 있어서 마을 고정 NPC만 복원
        Object.assign(npc, saved);
        if (data.companion === npc.config.name) { npc.state = 'COMPANION_FOLLOW'; state.companion = npc; npc.x = p.x - 60; npc.y = p.y; npc.homeX = NEST_POS.x + 90; npc.homeY = NEST_POS.y + 70; }
        if (data.partner === npc.config.name) { npc.state = 'PARTNER_FOLLOW'; state.partner = npc; npc.x = p.x + 60; npc.y = p.y; npc.homeX = NEST_POS.x + 90; npc.homeY = NEST_POS.y + 70; }
    }

    const nest = state.entities.nests[0];
    Object.assign(nest, data.nest);

    for (const k of data.kids) {
        const baby = new BabyDragon(k.x, k.y, k.genes);
        baby.growth = k.growth;
        baby.stage = k.stage;
        state.entities.babies.push(baby);
        const kid = registerKid(baby);
        baby.element = k.element || 'FIRE';
        Object.assign(kid, { name: k.name, affection: k.affection, mode: k.mode, personality: k.personality || kid.personality, lastPlayDay: k.lastPlayDay, lastTrainDay: k.lastTrainDay });
        setKidStage(baby, k.stage);
    }
}
