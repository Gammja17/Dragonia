import { RAID_FIRST_DELAY } from './config.js';

// 한 판의 모든 런타임 상태. 세이브/로드는 이 객체를 직렬화하는 식으로 확장.
export const state = {
    gameActive: false,
    isDialogueOpen: false,
    gameTime: 0,
    dayTime: 0.27,     // 0~1, 하루 중 시각 (조명용). 새벽에서 시작
    day: 1,
    weather: { type: 'CLEAR', timer: 70, intensity: 0, flash: 0 },
    quests: { active: {}, done: [] },
    bossesDefeated: {},
    raid: { count: 0, active: false },
    upgrades: {},        // 그론 상점 강화 횟수 { hp, dmg, spd }
    openedChests: {},
    blessingDay: 0,
    activity: null,      // 진행 중인 대련/술래잡기 (systems/npcActions.js)
    companion: null,
    relics: [],          // 가진 유물 id (systems/relics.js)
    event: null,         // 밤 이벤트 'BLOOD_MOON' | 'METEOR' (systems/events.js)
    stats: { kills: {} },
    raidTimer: RAID_FIRST_DELAY,
    elderTutorialDone: false,
    player: null,
    partner: null,
    currentNpc: null,
    kids: [],          // { id, name, stage, affection, entity }
    entities: emptyPools(),
};

export function emptyPools() {
    return { bullets: [], effects: [], items: [], particles: [], nests: [], babies: [], props: [], npcs: [], enemies: [], humans: [], bosses: [] };
}

export function resetState() {
    Object.assign(state, {
        gameActive: false,
        isDialogueOpen: false,
        gameTime: 0,
        dayTime: 0.27,
        day: 1,
        weather: { type: 'CLEAR', timer: 70, intensity: 0, flash: 0 },
        quests: { active: {}, done: [] },
        bossesDefeated: {},
        raid: { count: 0, active: false },
        upgrades: {},        // 그론 상점 강화 횟수 { hp, dmg, spd }
        openedChests: {},
        blessingDay: 0,
        activity: null,      // 진행 중인 대련/술래잡기 (systems/npcActions.js)
        companion: null,
        relics: [],          // 가진 유물 id (systems/relics.js)
        event: null,         // 밤 이벤트 'BLOOD_MOON' | 'METEOR' (systems/events.js)
        stats: { kills: {} },
        raidTimer: RAID_FIRST_DELAY,
        elderTutorialDone: false,
        player: null,
        partner: null,
        currentNpc: null,
        kids: [],
        entities: emptyPools(),
    });
}
