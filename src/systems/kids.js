import { state } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { refreshKidsPanel } from '../ui/kidsPanel.js';

export function registerKid(baby) {
    const id = state.kids.length + 1;
    const kid = { id, name: `Kid ${id}`, stage: 'BABY', affection: 0, entity: baby };
    state.kids.push(kid);
    refreshKidsPanel();
    return kid;
}

export function findKid(baby) {
    return state.kids.find(k => k.entity === baby);
}

export function setKidStage(baby, stage) {
    const kid = findKid(baby);
    if (kid) kid.stage = stage;
    refreshKidsPanel();
}

// 예전엔 affection을 올리는 코드가 없어서 하트가 항상 0이었다.
export function addAffection(baby, amount) {
    const kid = findKid(baby);
    if (!kid) return;
    kid.affection = clamp(kid.affection + amount, 0, 100);
    refreshKidsPanel();
}
