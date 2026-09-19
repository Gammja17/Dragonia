import { state } from '../core/state.js';
import { CHEST_COUNT } from '../core/config.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { RELICS } from '../systems/relics.js';
import { isMuted } from '../systems/audio.js';

const $ = (id) => document.getElementById(id);

export function initJournal() {
    $('journal-close').addEventListener('click', () => { $('journal-panel').style.display = 'none'; });
}

function section(title, rows) {
    const wrap = document.createElement('div');
    const h = document.createElement('div');
    h.className = 'journal-title';
    h.textContent = title;
    wrap.appendChild(h);
    for (const [left, right, dim] of rows) {
        const row = document.createElement('div');
        row.className = 'journal-row' + (dim ? ' dim' : '');
        const a = document.createElement('span'), b = document.createElement('span');
        a.textContent = left; b.textContent = right;
        row.append(a, b);
        wrap.appendChild(row);
    }
    return wrap;
}

/** 모험 일지: 기록, 유물, 도감. 열 때마다 새로 만든다 */
export function toggleJournal() {
    const panel = $('journal-panel');
    if (panel.style.display === 'flex') { panel.style.display = 'none'; return; }
    const body = $('journal-body');
    body.innerHTML = '';
    const kills = state.stats.kills;
    const total = Object.values(kills).reduce((a, b) => a + b, 0);
    const chests = Object.keys(state.openedChests).length;

    body.appendChild(section('기록', [
        ['지낸 날', `${state.day}일째`],
        ['쓰러뜨린 적', `${total}`],
        ['막아낸 습격', `${state.raid.count - (state.raid.active ? 1 : 0)}회`],
        ['연 보물상자', `${chests} / ${CHEST_COUNT}`],
        ['끝낸 퀘스트', `${state.quests.done.length}`],
        ['효과음 (M 키)', isMuted() ? '꺼짐' : '켜짐'],
    ]));

    body.appendChild(section(`유물 ${state.relics.length} / ${Object.keys(RELICS).length}`,
        Object.entries(RELICS).map(([id, r]) => state.relics.includes(id) ? [r.name, r.desc] : ['???', r.boss ? '강대한 용이 지니고 있다' : '상자나 정예 몬스터에게서', true])));

    const names = { ...ENEMIES, HUNTER: { name: '사냥꾼' } };
    body.appendChild(section('도감', [
        ...Object.keys(names).filter(id => !names[id].noLoot).map(id => kills[id] ? [names[id].name, `${kills[id]}마리`] : ['???', '아직 만나지 못함', true]),
        ...Object.entries(BOSSES).map(([id, b]) => state.bossesDefeated[id] ? [b.name, '처치'] : ['???', b.title, true]),
    ]));
    panel.style.display = 'flex';
}
