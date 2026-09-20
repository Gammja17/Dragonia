import { state } from '../core/state.js';
import { MATERIALS, RECIPES, GOODS } from '../data/materials.js';
import { showToast } from '../ui/toast.js';
import { spawnEffect } from '../render/vfx.js';
import { shake } from '../core/camera.js';
import { notify } from './quests.js';
import { play } from './audio.js';

// 그론의 모루. 잡은 것에서 나온 소재를 두드려 몸을 손본다.
// state.materials = { HIDE: n, FANG: n, ORE: n } · state.upgrades = { hp, dmg, spd } (두드린 횟수)

export function matCount(id) { return state.materials[id] || 0; }

export function addMaterial(id, n = 1) {
    state.materials[id] = matCount(id) + n;
}

/** 이 조리법을 다음번에 두드릴 때 드는 재료 */
export function costOf(recipe) {
    const times = state.upgrades[recipe.id] || 0;
    const out = {};
    for (const k of Object.keys(recipe.base)) out[k] = recipe.base[k] + (recipe.step[k] || 0) * times;
    for (const k of Object.keys(recipe.step)) if (!(k in out)) out[k] = recipe.step[k] * times;
    return out;
}

export function canAfford(cost) {
    return Object.entries(cost).every(([k, n]) => matCount(k) >= n);
}

/** 재료를 사람이 읽는 줄로 ("질긴 가죽 4/2 · 쇳조각 1/0") */
export function costText(cost) {
    return Object.entries(cost)
        .map(([k, n]) => `${MATERIALS[k].name} ${matCount(k)}/${n}`)
        .join(' · ');
}

/** 두드린다. 성공하면 true */
export function forge(recipe) {
    const cost = costOf(recipe);
    if (!canAfford(cost)) {
        showToast(`재료가 모자랍니다 — ${costText(cost)}`, '🔨');
        return false;
    }
    for (const [k, n] of Object.entries(cost)) state.materials[k] = matCount(k) - n;
    state.upgrades[recipe.id] = (state.upgrades[recipe.id] || 0) + 1;
    const p = state.player;
    if (recipe.id === 'hp') { p.maxHp += 25; p.hp += 25; }
    spawnEffect('SPARK', p.x, p.y - 40, { size: 1.4, color: '#ffd07a' });
    shake(5);
    play('relic');
    showToast(`${recipe.name} 완료! ${recipe.effect} (${state.upgrades[recipe.id]}단)`, '🔨');
    notify('upgrade');
    return true;
}

/** 골드로 사는 것들 */
export function buy(item) {
    const p = state.player;
    if (p.gold < item.cost) { showToast('골드가 모자랍니다.', '💰'); return false; }
    p.gold -= item.cost;
    if (item.material) addMaterial(item.id, 1);
    else if (item.id === 'meat') p.inventory.meat++;
    play('coin');
    showToast(`${item.name} 구입!`, '🛒');
    return true;
}

export { RECIPES, GOODS, MATERIALS };
