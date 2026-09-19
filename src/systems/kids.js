import { state } from '../core/state.js';
import { clamp, rand, lerpColor } from '../core/utils.js';
import { refreshKidsPanel } from '../ui/kidsPanel.js';

export function registerKid(baby) {
    const id = state.kids.length + 1;
    const kid = { id, name: `Kid ${id}`, stage: 'BABY', affection: 0, mode: 'FOLLOW', entity: baby }; // mode: FOLLOW(따라오기) | STAY(둥지 지키기)
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

/** 부모 둘의 종족·색을 섞어 아이의 유전 정보를 만든다. b 가 없으면(주워 온 알) a 를 닮는다 */
export function mixGenes(a, b) {
    if (!b) return { species: a.species, colors: { ...a.colors } };
    const t = rand(0.25, 0.75);
    return {
        species: Math.random() < 0.5 ? a.species : b.species,
        colors: { body: lerpColor(a.colors.body, b.colors.body, t), wing: lerpColor(a.colors.wing, b.colors.wing, 1 - t) },
    };
}

export function renameKid(kid, name) {
    kid.name = name.trim().slice(0, 12) || kid.name;
    refreshKidsPanel();
}

export function toggleKidMode(kid) {
    kid.mode = kid.mode === 'FOLLOW' ? 'STAY' : 'FOLLOW';
    refreshKidsPanel();
}
