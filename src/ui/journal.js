import { state } from '../core/state.js';
import { CHEST_COUNT } from '../core/config.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { RELICS } from '../systems/relics.js';
import { isMuted } from '../systems/audio.js';
import { questLog, setTracked } from '../systems/quests.js';
import { play } from '../systems/audio.js';

// 모험 일지: [퀘스트] [기록] [유물] [도감] 탭. J 키로 연다.
// 퀘스트 탭이 첫 화면이다. 줄을 누르면 펼쳐져 배경·목표·힌트·보상을 읽을 수 있고,
// [추적] 을 누르면 화면 오른쪽 추적창에 그 퀘스트가 걸린다.

const $ = (id) => document.getElementById(id);
const TABS = [['quests', '퀘스트'], ['record', '기록'], ['relics', '유물'], ['codex', '도감']];
let tab = 'quests';
let openRow = null;   // 펼쳐 놓은 퀘스트 id

export function initJournal() {
    $('journal-close').addEventListener('click', () => { $('journal-panel').style.display = 'none'; });
    const bar = $('journal-tabs');
    for (const [id, label] of TABS) {
        const b = document.createElement('button');
        b.className = 'journal-tab';
        b.dataset.tab = id;
        b.textContent = label;
        b.addEventListener('click', () => { tab = id; play('ui'); render(); });
        bar.appendChild(b);
    }
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

/** 퀘스트 한 줄. 누르면 펼쳐진다 */
function questRow(r) {
    const wrap = document.createElement('div');
    wrap.className = 'q-item' + (r.done ? ' done' : '') + (r.complete ? ' ready' : '') + (r.upcoming ? ' upcoming' : '');

    const head = document.createElement('button');
    head.className = 'q-head';
    const mark = r.upcoming ? '·' : r.done ? '✔' : r.complete ? '!' : '▸';
    head.innerHTML = `<span class="q-mark">${mark}</span><span class="q-title"></span><span class="q-prog"></span>`;
    head.querySelector('.q-title').textContent = r.title;
    head.querySelector('.q-prog').textContent = r.upcoming ? '' : r.progress;
    wrap.appendChild(head);

    if (r.upcoming) {
        const hint = document.createElement('div');
        hint.className = 'q-body';
        hint.textContent = r.hint;
        wrap.appendChild(hint);
        return wrap;
    }

    head.addEventListener('click', () => { openRow = openRow === r.id ? null : r.id; play('ui'); render(); });
    if (openRow !== r.id) return wrap;

    const body = document.createElement('div');
    body.className = 'q-body open';
    const line = (label, text) => {
        if (!text) return;
        const d = document.createElement('div');
        d.className = 'q-line';
        d.innerHTML = `<b></b><span></span>`;
        d.querySelector('b').textContent = label;
        d.querySelector('span').textContent = text;
        body.appendChild(d);
    };
    line('의뢰', r.giver);
    if (r.summary) {
        const s = document.createElement('div');
        s.className = 'q-summary';
        s.textContent = r.summary;
        body.appendChild(s);
    }
    line('목표', r.goal);
    if (!r.done) line('해야 할 일', r.hint);
    line('보상', r.reward);
    if (!r.done) {
        const btn = document.createElement('button');
        btn.className = 'q-track' + (r.tracked ? ' on' : '');
        btn.textContent = r.tracked ? '★ 추적 중 (누르면 해제)' : '☆ 이 퀘스트를 추적';
        btn.addEventListener('click', () => { setTracked(r.id); play('ui'); render(); });
        body.appendChild(btn);
    }
    wrap.appendChild(body);
    return wrap;
}

function renderQuests(body) {
    const groups = questLog();
    if (!groups.length) {
        const empty = document.createElement('div');
        empty.className = 'q-empty';
        empty.textContent = '아직 맡은 일이 없다. 마을 용들에게 말을 걸어 보자.';
        body.appendChild(empty);
        return;
    }
    for (const g of groups) {
        const h = document.createElement('div');
        h.className = 'journal-title';
        h.textContent = g.name;
        body.appendChild(h);
        for (const r of g.rows) body.appendChild(questRow(r));
    }
}

function renderRecord(body) {
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
}

function renderRelics(body) {
    body.appendChild(section(`유물 ${state.relics.length} / ${Object.keys(RELICS).length}`,
        Object.entries(RELICS).map(([id, r]) => state.relics.includes(id) ? [r.name, r.desc]
            : ['???', r.boss ? '강대한 용이 지니고 있다' : '상자나 정예 몬스터에게서', true])));
}

function renderCodex(body) {
    const kills = state.stats.kills;
    const names = { ...ENEMIES, HUNTER: { name: '사냥꾼' } };
    body.appendChild(section('도감', [
        ...Object.keys(names).filter(id => !names[id].noLoot).map(id => kills[id] ? [names[id].name, `${kills[id]}마리`] : ['???', '아직 만나지 못함', true]),
        ...Object.entries(BOSSES).map(([id, b]) => state.bossesDefeated[id] ? [b.name, '처치'] : ['???', b.title, true]),
    ]));
}

function render() {
    for (const b of document.querySelectorAll('.journal-tab')) b.classList.toggle('on', b.dataset.tab === tab);
    const body = $('journal-body');
    body.innerHTML = '';
    if (tab === 'quests') renderQuests(body);
    else if (tab === 'record') renderRecord(body);
    else if (tab === 'relics') renderRelics(body);
    else renderCodex(body);
}

/** 일지를 열거나 닫는다. tabId 를 주면 그 탭으로 연다 */
export function toggleJournal(tabId) {
    const panel = $('journal-panel');
    if (panel.style.display === 'flex' && (!tabId || tabId === tab)) { panel.style.display = 'none'; return; }
    if (tabId) tab = tabId;
    render();
    panel.style.display = 'flex';
}

/** 열려 있으면 내용만 새로 그린다 (퀘스트 진행도가 바뀔 때) */
export function refreshJournal() {
    if ($('journal-panel').style.display === 'flex') render();
}
