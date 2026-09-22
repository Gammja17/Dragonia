import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { showToast } from '../ui/toast.js';
import { Enemy } from '../entities/Enemy.js';

// 처음 며칠의 조작 안내.
//
// 예전엔 화면 오른쪽에 "길잡이 3/9" 하는 목록이 따로 떠 있었다. 이야기와 따로 노는 숙제장이라
// 걷어냈다. 지금 뭘 해야 하는지는 1장의 퀘스트(m0 → m1 → 오늘의 수련)가 추적창에서 알려 주고,
// 키는 그 일이 닥친 순간에 한 번씩만 알려 준다.
//
// state.tutorial = { moved, ate, journal, toured, finished, hints: { id: true } }

const HINTS = [
    {
        id: 'fight', icon: '🔥',
        when: s => s.mapId !== 'VILLAGE' && s.entities.enemies.some(e => e.type !== 'PREY' && dist(e, s.player) < 420),
        text: '마우스로 겨누고 클릭하면 숨결이 나간다. 꾹 누르면 계속 나가고, [Shift]로 피한다.',
    },
    {
        id: 'dummy', icon: '🎯',
        when: s => s.mapId === 'VILLAGE' && s.entities.enemies.some(e => e.type === 'DUMMY'),
        text: '허수아비를 마우스로 겨누고 클릭. 꾹 누르면 계속 나간다. [Shift]를 탁 누르면 대시로 피한다.',
    },
    {
        id: 'eat', icon: '🍖',
        when: s => !s.tutorial.ate && s.player.hunger < 60 && s.player.inventory.meat > 0,
        text: '배가 고프다. [C]로 고기를 먹는다.',
    },
    {
        id: 'dusk', icon: '🌙',
        when: s => s.day === 1 && s.dayTime > 0.78 && s.dayTime < 0.9,
        text: '해가 진다. 마을 서쪽 내 굴에 들어가, 둥지에서 [Space]로 잔다.',
    },
];

/** 매 프레임 (ui/hud.js). 첫 일거리를 끝내면 안내는 끝난다 */
export function updateTutorial() {
    const t = state.tutorial;
    if (!t || t.finished || state.isDialogueOpen || state.prologue) return;
    if (state.quests.done.includes('m1')) { t.finished = true; return; }
    // 첫 퀘스트의 허수아비 대목: 광장에 허수아비 둘이 서 있어야 한다 (지도를 오가도 다시 선다)
    const m0 = state.quests.active.m0;
    if (m0 && m0.step === 2 && state.mapId === 'VILLAGE' && !state.entities.enemies.some(e => e.type === 'DUMMY')) {
        for (const [tx, ty] of [[10, 9], [13, 9]]) { const d = new Enemy(tx * 96 + 48, ty * 96 + 48, 'DUMMY'); d.maxHp = d.hp = 30; state.entities.enemies.push(d); }
    }
    t.hints = t.hints || {};
    const hint = HINTS.find(h => !t.hints[h.id] && h.when(state));
    if (!hint) return;
    t.hints[hint.id] = true;
    showToast(hint.text, hint.icon);
}

/** 상태값만으로는 알 수 없는 것들 (게임 곳곳에서 한 줄로 부른다) */
export function markTutorial(flag) {
    if (state.tutorial && !state.tutorial[flag]) state.tutorial[flag] = true;
}
