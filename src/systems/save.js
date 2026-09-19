import { state } from '../core/state.js';
import { BabyDragon } from '../entities/BabyDragon.js';
import { registerKid, setKidStage } from './kids.js';

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
    const nest = state.entities.nests[0];
    const data = {
        v: 1,
        savedAt: Date.now(),
        player: {
            config: { name: p.config.name, species: p.species, colors: p.colors },
            level: p.level, xp: p.xp, maxXp: p.maxXp, hp: p.hp, maxHp: p.maxHp, hunger: p.hunger,
            meat: p.inventory.meat, x: p.x, y: p.y,
            stageIndex: p.stageIndex, elements: p.elements, element: p.element,
        },
        gameTime: state.gameTime, dayTime: state.dayTime, day: state.day, raidTimer: state.raidTimer,
        elderTutorialDone: state.elderTutorialDone,
        weather: state.weather.type,
        quests: state.quests,
        bossesDefeated: state.bossesDefeated,
        npcs: Object.fromEntries(state.entities.npcs.filter(n => n.config.fixed)
            .map(n => [n.config.name, { relation: n.relation, lastGiftDay: n.lastGiftDay ?? null }])),
        partner: state.partner ? state.partner.config.name : null,
        nest: { hasEgg: nest.hasEgg, progress: nest.progress, genes: nest.genes },
        kids: state.kids.map(k => ({
            name: k.name, stage: k.stage, affection: k.affection, mode: k.mode,
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

    Object.assign(state, {
        gameTime: data.gameTime, dayTime: data.dayTime, day: data.day, raidTimer: data.raidTimer,
        elderTutorialDone: data.elderTutorialDone, quests: data.quests, bossesDefeated: data.bossesDefeated,
    });
    state.weather.type = data.weather;
    state.entities.bosses = state.entities.bosses.filter(b => !data.bossesDefeated[b.id]);

    for (const npc of state.entities.npcs) {
        const saved = data.npcs[npc.config.name];
        if (!saved || !npc.config.fixed) continue; // 떠돌이 NPC는 이름이 겹칠 수 있어서 마을 고정 NPC만 복원
        npc.relation = saved.relation;
        npc.lastGiftDay = saved.lastGiftDay;
        if (data.partner === npc.config.name) { npc.state = 'PARTNER_FOLLOW'; state.partner = npc; npc.x = p.x + 60; npc.y = p.y; }
    }

    const nest = state.entities.nests[0];
    Object.assign(nest, data.nest);

    for (const k of data.kids) {
        const baby = new BabyDragon(k.x, k.y, k.genes);
        baby.growth = k.growth;
        baby.stage = k.stage;
        state.entities.babies.push(baby);
        const kid = registerKid(baby);
        Object.assign(kid, { name: k.name, affection: k.affection, mode: k.mode });
        setKidStage(baby, k.stage);
    }
}
