import { state } from '../core/state.js';
import { clamp, rand, pick, lerpColor } from '../core/utils.js';
import { KID_PERSONALITIES } from '../data/npcTalk.js';
import { KID_NAMES, NPC_NAMES_KO } from '../data/npcs.js';
import { refreshKidsPanel } from '../ui/kidsPanel.js';

/** 아직 아무도 쓰지 않은 이름 하나 (마을 용 이름과도 겹치지 않게) */
function freshKidName() {
    const taken = new Set([...state.kids.map(k => k.name), ...Object.values(NPC_NAMES_KO)]);
    const pool = KID_NAMES.filter(n => !taken.has(n));
    return pool.length ? pick(pool) : `${pick(KID_NAMES)} ${state.kids.length + 1}세`;   // 이름이 다 떨어지면(거의 없다) 대를 잇는 식으로
}

export function registerKid(baby) {
    const id = state.kids.length + 1;
    const kid = { id, name: freshKidName(), stage: 'BABY', affection: 0, mode: 'FOLLOW', personality: pick(Object.keys(KID_PERSONALITIES)), entity: baby }; // mode: FOLLOW(따라오기) | STAY(둥지 지키기)
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
    if (!b) return { species: a.species, colors: { ...a.colors }, look: a.look };
    // 한 장짜리 외형(LOOK)은 섞을 수 없으니 부모 한쪽을 그대로 닮는다
    if (a.species === 'LOOK' || b.species === 'LOOK') { const p = Math.random() < 0.5 ? a : b; return { species: p.species, colors: { ...p.colors }, look: p.look }; }
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
