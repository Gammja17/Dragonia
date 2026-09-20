import { RAID_FIRST_DELAY } from './config.js';

// 한 판의 모든 런타임 상태. 세이브/로드는 이 객체를 직렬화하는 식으로 확장.
export const state = {
    gameActive: false,
    isDialogueOpen: false,
    gameTime: 0,
    dayTime: 0.27,     // 0~1, 하루 중 시각 (조명용). 새벽에서 시작
    day: 1,
    weather: { type: 'CLEAR', timer: 70, intensity: 0, flash: 0 },
    quests: { active: {}, done: [], tracked: null },
    bossesDefeated: {},
    raid: { count: 0, active: false },
    upgrades: {},        // 그론 상점 강화 횟수 { hp, dmg, spd }
    openedChests: {},
    blessingDay: 0,
    activity: null,      // 진행 중인 대련/술래잡기 (systems/npcActions.js)
    companion: null,
    den: { built: false, twigs: 0 },   // 아지트 둥지: 나뭇가지를 모아 지어야 알을 품을 수 있다
    rally: 0,             // 용의 함성: 남은 시간 동안 아군 공격력 +50%
    story: { scenes: [], lessons: [], lessonDay: 0 },   // systems/story.js
    talkTarget: null,    // 지금 T·클릭으로 말을 걸 수 있는 상대
    fadeTargets: [],     // 이번 프레임에 나무 뒤로 숨으면 안 되는 것들
    relics: [],          // 가진 유물 id (systems/relics.js)
    waystones: [],       // 깨운 이동 석비 id (systems/travel.js)
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
    return { bullets: [], effects: [], items: [], particles: [], nests: [], babies: [], props: [], npcs: [], enemies: [], humans: [], bosses: [], hazards: [] };
}

export function resetState() {
    Object.assign(state, {
        gameActive: false,
        isDialogueOpen: false,
        gameTime: 0,
        dayTime: 0.27,
        day: 1,
        weather: { type: 'CLEAR', timer: 70, intensity: 0, flash: 0 },
        quests: { active: {}, done: [], tracked: null },
        bossesDefeated: {},
        raid: { count: 0, active: false },
        upgrades: {},        // 그론 상점 강화 횟수 { hp, dmg, spd }
        openedChests: {},
        blessingDay: 0,
        activity: null,      // 진행 중인 대련/술래잡기 (systems/npcActions.js)
        companion: null,
        den: { built: false, twigs: 0 },
        rally: 0,             // 용의 함성: 남은 시간 동안 아군 공격력 +50%
        story: { scenes: [], lessons: [], lessonDay: 0 },   // systems/story.js
        relics: [],          // 가진 유물 id (systems/relics.js)
        waystones: [],       // 깨운 이동 석비 id (systems/travel.js)
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
