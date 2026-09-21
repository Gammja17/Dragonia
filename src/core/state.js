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
    story: { scenes: [], lessons: [], lessonDay: 0, events: [], bonds: [], rites: [], clues: [] },   // systems/story.js · clues: 정체의 단서
    talkTarget: null,    // 지금 T·클릭으로 말을 걸 수 있는 상대
    fadeTargets: [],     // 이번 프레임에 나무 뒤로 숨으면 안 되는 것들
    relics: [],          // 가진 유물 id (systems/relics.js)
    relicSlots: [],      // 실제로 끼운 유물. 앞쪽 몇 칸을 쓸 수 있는지는 성장 단계가 정한다
    materials: {},       // 대장간 소재 (systems/smithing.js)
    waystones: [],       // 깨운 이동 석비 id (systems/travel.js)
    dungeon: null,       // 굴에 들어가 있으면 { id, depth, ... } (systems/delve.js)
    mapId: 'VILLAGE',    // 지금 밟고 있는 지도 (data/maps.js · systems/world.js)
    visited: [],         // 발을 들여 본 지도들
    dojoSpot: null,      // 수련장 허수아비가 설 자리 (지도가 깔릴 때 정해진다)
    denNest: null,       // 둥지 상태 (딴 지도에 있을 때도 알이 자라도록 들고 있는다)
    eggSitting: null,    // 촌장에게 맡긴 알 { day, genes } — 사흘 뒤 아침에 깨어난다
    indoors: false,      // 굴 안(보금자리·미궁)인가 — 조명·날씨가 달라진다
    event: null,         // 밤 이벤트 'BLOOD_MOON' | 'METEOR' (systems/events.js)
    stats: { kills: {}, brinks: 0 },   // brinks: 체력 20% 아래까지 몰렸다 살아난 횟수 (스킬 해금 조건)
    growth: { points: 0, nodes: {}, ranks: {} },   // 성장 트리와 스킬 강화 (systems/growth.js)
    revivedDay: 0,       // '불사의 심장'으로 버틴 날 (하루 한 번)
    raidTimer: RAID_FIRST_DELAY,
    elderTutorialDone: false,
    tutorial: { moved: false, journal: false, ate: false, toured: false, finished: false },   // systems/tutorial.js
    furniture: {},          // 가진 살림살이 { 가구id: 개수 }   systems/den.js
    denDecor: [],           // 내 굴에 놓아 둔 것 [{ id, tx, ty }]
    densSeen: [],           // 들어가 본 굴
    holding: null,          // 지금 들고 놓으려는 살림살이 id
    player: null,
    partner: null,
    currentNpc: null,
    pendingBond: null,   // 대화가 끝나면 재생할 관계 장면 (systems/chronicle.js)
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
        story: { scenes: [], lessons: [], lessonDay: 0, events: [], bonds: [], rites: [], clues: [] },   // systems/story.js
        relics: [],          // 가진 유물 id (systems/relics.js)
        relicSlots: [],
        materials: {},
        waystones: [],       // 깨운 이동 석비 id (systems/travel.js)
        dungeon: null,
        mapId: 'VILLAGE',
        visited: [],
        dojoSpot: null,
        denNest: null,
        eggSitting: null,
        indoors: false,
        furniture: {},
        denDecor: [],
        densSeen: [],
        holding: null,
        event: null,         // 밤 이벤트 'BLOOD_MOON' | 'METEOR' (systems/events.js)
        stats: { kills: {}, brinks: 0 },
        growth: { points: 0, nodes: {}, ranks: {} },
        revivedDay: 0,
        raidTimer: RAID_FIRST_DELAY,
        elderTutorialDone: false,
        tutorial: { moved: false, journal: false, ate: false, toured: false, finished: false },
        tour: null,
        prologue: null,   // 떨어지던 밤 (systems/prologue.js). 새 게임에서만
        player: null,
        partner: null,
        currentNpc: null,
        pendingBond: null,
        kids: [],
        entities: emptyPools(),
    });
}
