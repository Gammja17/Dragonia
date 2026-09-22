import { state } from '../core/state.js';
import { npcName } from '../data/npcs.js';
import { MY_DEN } from '../data/dens.js';
import { findKid } from './kids.js';
import { showToast } from '../ui/toast.js';
import { spawnEffect, spawnText } from '../render/vfx.js';
import { burst } from '../entities/Particle.js';
import { play } from './audio.js';

// 습격의 목표. "다 잡기" 말고도 그 밤에 지켜야 할 것이 하나 붙는다 (text/story-bible.md 10절).
//
//   RESCUE  싸우지 못하는 용 하나를 노린다. 쓰러지지 않게 지킨다
//   EGG     알 도둑이 내 굴 입구로 뛴다. 입구에서 파고들면 알이 상한다
//   KID     아기 용을 잡아채 숲으로 끌고 간다. 끌고 가는 놈을 쓰러뜨리면 풀려난다
//   TOWER   궁수들이 망루에 오르려 한다. 셋이 올라서면 망루를 빼앗기고 원군이 든다
//
// state.raid.objective = { type, name?, kidId?, failed, perched, dug, lost, freed }
// 사냥꾼 쪽 갈고리(entities/Human.js): hunts(용 이름) · huntsKid(아기 개체) · raids('DEN' | 'TOWER')

const DIG_TIME = 4;         // 도둑이 굴 입구를 파는 데 걸리는 시간(초)
const EGG_HURT = 35;        // 한 번 파고들면 알의 부화 진행도가 이만큼 깎인다
const PERCH_LIMIT = 3;      // 망루에 이만큼 오르면 빼앗긴다

export const DIG_TIME_SEC = DIG_TIME;

export function objective() { return state.raid.active ? state.raid.objective : null; }

/** 도둑이 노리는 내 굴 입구 (마을 지도 위) */
export function myDenMouth() {
    return state.entities.props.find(p => p.type === 'DEN_MOUTH' && p.denId === MY_DEN) || null;
}
/** 망루 */
export function towerProp() {
    return state.entities.props.find(p => p.type === 'TOWER') || null;
}

/** 지금 목표가 가리키는 자리와 이름표. 없으면 null (render/markers.js) */
export function objectiveTarget() {
    const ob = objective();
    if (!ob || ob.failed) return null;
    if (ob.type === 'RESCUE') {
        const n = state.entities.npcs.find(x => x.config.name === ob.name);
        return n ? { x: n.x, y: n.y - 40, label: `${npcName(ob.name)}를 지켜라`, color: '#7dd36a' } : null;
    }
    if (ob.type === 'EGG') {
        const m = myDenMouth();
        return m ? { x: m.x, y: m.y - 50, label: '굴 입구 · 알', color: '#ffd84a' } : null;
    }
    if (ob.type === 'KID') {
        const kid = state.kids.find(k => k.id === ob.kidId);
        if (!kid || !kid.entity) return null;
        const e = kid.entity, cap = e.grabbedBy;
        if (cap && !cap.remove) return { x: cap.x, y: cap.y - 60, label: `${kid.name}를 끌고 간다!`, color: '#ff6b5e' };
        if (ob.lost) return null;
        return { x: e.x, y: e.y - 30, label: `${kid.name}를 지켜라`, color: '#ff9ab4' };
    }
    if (ob.type === 'TOWER') {
        const t = towerProp();
        return t ? { x: t.x, y: t.y - 120, label: `망루 · 오른 궁수 ${ob.perched || 0}/${PERCH_LIMIT}`, color: '#9fe3ff' } : null;
    }
    return null;
}

/** 목표를 한 줄로 (HUD) */
export function objectiveText() {
    const ob = objective();
    if (!ob) return '';
    if (ob.failed) return ob.type === 'TOWER' ? '망루를 빼앗겼다' : ob.type === 'EGG' ? '알이 상했다' : ob.type === 'KID' ? '아이를 놓쳤다' : '';
    switch (ob.type) {
        case 'RESCUE': return `${npcName(ob.name)}를 지켜라`;
        case 'EGG': return '굴 입구의 알 도둑을 막아라';
        case 'KID': { const kid = state.kids.find(k => k.id === ob.kidId); return kid ? `${kid.name}를 지켜라` : ''; }
        case 'TOWER': return `망루를 지켜라 (${ob.perched || 0}/${PERCH_LIMIT})`;
        default: return '';
    }
}

// ---------- 알 도둑 ----------

/** 도둑이 입구를 다 팠다 (entities/Human.js). 알이 상한다. 바닥나면 빼앗긴다 */
export function onThiefDug(h) {
    const ob = objective();
    const nest = state.denNest || (state.denNest = { hasEgg: false, progress: 0, genes: null });
    if (!nest.hasEgg) return;
    nest.progress -= EGG_HURT;
    if (ob && ob.type === 'EGG') ob.dug = (ob.dug || 0) + 1;
    burst(h.x, h.y - 10, '#ff5a4d', 0.8, 8);
    play('hurt');
    if (nest.progress < 0) {
        nest.hasEgg = false; nest.progress = 0; nest.genes = null;
        if (ob && ob.type === 'EGG') ob.failed = true;
        showToast('사냥꾼에게 알을 빼앗겼다…', '💔');
        return;
    }
    showToast(`도둑이 굴 입구를 파헤쳤다! 알이 식었다 (부화 -${EGG_HURT})`, '🥚');
}

// ---------- 아기 용 ----------

/** 사냥꾼이 아기를 잡아챘다 (entities/Human.js) */
export function onKidGrabbed(baby, h) {
    const kid = findKid(baby);
    baby.grabbedBy = h;
    h.carrying = baby;
    h.fleeing = true;
    if (kid) { baby.say('으앙!'); showToast(`${kid.name}이(가) 붙잡혔다! 끌고 가는 놈을 쓰러뜨리자!`, '⚠️'); }
    spawnText(baby.x, baby.y - 60, '!', '#ff6b5e', 24);
    play('warn');
}

/** 끌고 가던 놈이 쓰러졌다 (entities/Human.js 의 die) */
export function onKidFreed(baby) {
    const kid = findKid(baby), ob = objective();
    baby.grabbedBy = null;
    if (kid) {
        kid.affection = Math.min(100, kid.affection + 6);
        baby.say('…무서웠어.');
        if (ob && ob.type === 'KID' && ob.kidId === kid.id) ob.freed = (ob.freed || 0) + 1;
    }
    spawnEffect('RING', baby.x, baby.y, { size: 1.2, color: '#ff9ab4' });
}

/** 끌고 가던 놈이 화면 밖으로 사라졌다. 아이는 그날 밤 제 발로 도망쳐 돌아오지만 겁을 먹는다 */
export function onKidLost(baby, h) {
    const kid = findKid(baby), ob = objective();
    baby.grabbedBy = null;
    h.carrying = null;
    if (kid) {
        kid.affection = Math.max(0, kid.affection - 20);
        kid.scaredDay = state.day;
        kid.mode = 'STAY';
        if (ob && ob.type === 'KID' && ob.kidId === kid.id) { ob.failed = true; ob.lost = true; }
        showToast(`${kid.name}이(가) 숲으로 끌려갔다… 밤새 제 발로 도망쳐 돌아왔지만 한동안 굴 밖에 나오지 않으려 한다.`, '💔');
    }
    // 아이는 굴로 돌아가 있다 (마을에서 사라졌다가 습격이 끝나면 둥지 곁에 다시 놓인다)
    baby.hidden = true;
    baby.x = -9999; baby.y = -9999;
}

/** 습격이 끝났다: 숨었던 아이를 곁으로 데려온다 */
export function returnLostKids() {
    const p = state.player;
    for (const k of state.kids) {
        const e = k.entity;
        if (!e || !e.hidden) continue;
        e.hidden = false;
        e.grabbedBy = null;
        e.x = p.x - 60; e.y = p.y + 20;
    }
}

// ---------- 망루 ----------

/** 궁수가 망루에 올랐다 (entities/Human.js). 셋이면 빼앗긴다 */
export function onPerched(h) {
    const ob = objective();
    if (!ob || ob.type !== 'TOWER' || ob.failed) return;
    ob.perched = (ob.perched || 0) + 1;
    spawnText(h.x, h.y - 90, '망루에 올랐다!', '#9fe3ff', 15);
    if (ob.perched >= PERCH_LIMIT) {
        ob.failed = true;
        showToast('망루를 빼앗겼다! 신호를 보고 사냥꾼 원군이 든다.', '⚠️');
        play('raid');
        return true;   // raid.js 가 원군을 부른다
    }
    showToast(`궁수가 망루에 올랐다 (${ob.perched}/${PERCH_LIMIT}). 끌어내리자!`, '🏹');
    return false;
}
/** 망루에 올랐던 궁수가 떨어졌다 */
export function onUnperched() {
    const ob = objective();
    if (ob && ob.type === 'TOWER' && ob.perched > 0) ob.perched--;
}
