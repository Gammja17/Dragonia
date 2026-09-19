import { RAID_FIRST_DELAY } from './config.js';

// 한 판의 모든 런타임 상태. 세이브/로드는 이 객체를 직렬화하는 식으로 확장.
export const state = {
    gameActive: false,
    isDialogueOpen: false,
    gameTime: 0,
    raidTimer: RAID_FIRST_DELAY,
    elderTutorialDone: false,
    player: null,
    partner: null,
    currentNpc: null,
    kids: [],          // { id, name, stage, affection, entity }
    entities: emptyPools(),
};

export function emptyPools() {
    return { bullets: [], items: [], particles: [], nests: [], babies: [], props: [], npcs: [], enemies: [], humans: [] };
}

export function resetState() {
    Object.assign(state, {
        gameActive: false,
        isDialogueOpen: false,
        gameTime: 0,
        raidTimer: RAID_FIRST_DELAY,
        elderTutorialDone: false,
        player: null,
        partner: null,
        currentNpc: null,
        kids: [],
        entities: emptyPools(),
    });
}
