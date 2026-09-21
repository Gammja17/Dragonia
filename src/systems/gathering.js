import { state } from '../core/state.js';

// 모임과 경계.
//
// 고양이전사들의 '모임'에서 가져온 것. 폭포는 두 마을의 경계다. 평소에는 서로
// 넘지 않지만, 달이 가장 밝은 밤에는 폭포 아래에 모여 이빨을 드러내지 않기로 했다.
//
//  · GATHER_EVERY 일마다 밤(20시~)에 모임이 선다
//  · 모임 날 밤에는 두 마을 용들이 모두 구름 폭포로 내려온다 (systems/routine.js 가 본다)
//  · 모임에 한 번 나가 봐야 폭포 위로 올라갈 수 있다. 그 전에는 유안이 막는다

export const GATHER_EVERY = 8;        // 며칠마다
export const GATHER_FROM = 20;        // 몇 시부터
export const GATHER_MAP = 'FALLS';

/** 오늘이 모임 날인가 */
export function isGatherDay(day = state.day) { return firstGathering() || (day > 0 && day % GATHER_EVERY === 0); }

/** 스무 해 만에 다시 서는 첫 모임. 달이 기울 때까지 밤마다 불을 피운다 — 주인공이 와서 볼 때까지 (퀘스트 m5g) */
function firstGathering() {
    return !!state.quests && 'm5g' in state.quests.active && !(state.story.events || []).includes('ev_gathering');
}

/** 지금 모임이 서 있는가 */
export function isGatherNow() {
    return isGatherDay() && state.dayTime * 24 >= GATHER_FROM;
}

/** 다음 모임까지 며칠 */
export function daysToGather() {
    const left = GATHER_EVERY - (state.day % GATHER_EVERY);
    return left === GATHER_EVERY ? (state.dayTime * 24 >= GATHER_FROM ? GATHER_EVERY : 0) : left;
}

/** 모임 때 각자 서는 자리 (구름 폭포의 큰 칸 좌표) */
export const GATHER_SPOTS = {
    Riun:   [12, 9], Seiran: [13, 10], Haru: [11, 11], Yuan: [14, 9],
    Elder:  [8, 9],  Kairon: [7, 10],  Nara: [9, 11],  Tiamat: [6, 9], Gron: [8, 12], Poco: [10, 12],
};

/** 폭포 위로 올라가 본 적이 있는가 (모임에 한 번 나가면 열린다) */
export function invitedUp() { return (state.story.events || []).includes('ev_gathering'); }

/** 구름마루 마을의 존재를 알고 있는가 (폭포에 한 번 가 보면 안다) */
export function knowsCloudtop() { return (state.story.events || []).includes('ev_falls'); }
