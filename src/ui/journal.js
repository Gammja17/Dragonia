import { state } from '../core/state.js';
import { MAPS } from '../data/maps.js';

// 지도마다 놓이는 상자 수의 합 (systems/world.js 의 spec.chests ?? 3)
const CHEST_COUNT = Object.values(MAPS).reduce((n, m) => n + (m.chests ?? 3), 0);
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { RELICS, ownsRelic, hasRelic, toggleRelic, slotCount } from '../systems/relics.js';
import { MATERIALS } from '../data/materials.js';
import { matCount } from '../systems/smithing.js';
import { isMuted } from '../systems/audio.js';
import { questLog, setTracked } from '../systems/quests.js';
import { play } from '../systems/audio.js';
import { markTutorial } from '../systems/tutorial.js';
import { roster } from '../systems/routine.js';
import { dayPhaseName } from '../render/lighting.js';

// 모험 일지: [퀘스트] [기록] [유물] [도감] 탭. J 키로 연다.
// 퀘스트 탭이 첫 화면이다. 줄을 누르면 펼쳐져 배경·목표·힌트·보상을 읽을 수 있고,
// [추적] 을 누르면 화면 오른쪽 추적창에 그 퀘스트가 걸린다.

const $ = (id) => document.getElementById(id);
const TABS = [['quests', '퀘스트'], ['folk', '마을 용들'], ['record', '기록'], ['relics', '유물'], ['codex', '도감']];
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

/** 유물 탭: 가진 것 중 골라 끼운다. 칸 수는 몸이 자랄수록 는다 */
function renderRelics(body) {
    const max = slotCount(), worn = Object.keys(RELICS).filter(hasRelic);

    const head = document.createElement('div');
    head.className = 'journal-title';
    head.textContent = `장착 ${worn.length} / ${max}칸`;
    body.appendChild(head);

    const note = document.createElement('div');
    note.className = 'relic-note';
    note.textContent = max < 3
        ? '가진 유물을 눌러 끼우고 뺀다. 몸이 자라면 끼울 수 있는 칸이 늘어난다 (성체 2칸 · 고룡 3칸).'
        : '가진 유물을 눌러 끼우고 뺀다. 끼운 것만 힘이 된다.';
    body.appendChild(note);

    const row = document.createElement('div');
    row.className = 'relic-slots';
    for (let i = 0; i < max; i++) {
        const id = (state.relicSlots || [])[i];
        const cell = document.createElement('div');
        cell.className = 'relic-slot' + (id ? ' filled' : '');
        cell.textContent = id ? RELICS[id].name : '빈 칸';
        if (id) cell.addEventListener('click', () => { toggleRelic(id); render(); });
        row.appendChild(cell);
    }
    body.appendChild(row);

    const owned = Object.keys(RELICS).filter(ownsRelic);
    const list = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'journal-title';
    title.textContent = `모은 유물 ${owned.length} / ${Object.keys(RELICS).length}`;
    list.appendChild(title);
    // 가진 것을 위로, 아직 못 찾은 것을 아래로
    const sorted = Object.entries(RELICS).sort((a, b) => (ownsRelic(b[0]) ? 1 : 0) - (ownsRelic(a[0]) ? 1 : 0));
    for (const [id, r] of sorted) {
        if (!ownsRelic(id)) {
            const dim = document.createElement('div');
            dim.className = 'journal-row dim';
            dim.innerHTML = '<span>???</span><span></span>';
            dim.lastElementChild.textContent = r.boss ? '강대한 용이 지니고 있다' : '상자·정예 몬스터·굴 깊은 곳에서';
            list.appendChild(dim);
            continue;
        }
        const on = hasRelic(id);
        const btn = document.createElement('button');
        btn.className = 'relic-row' + (on ? ' on' : '');
        btn.innerHTML = '<b></b><i></i><em></em>';
        btn.querySelector('b').textContent = r.name;
        btn.querySelector('i').textContent = r.desc;
        btn.querySelector('em').textContent = on ? '장착 중' : '끼우기';
        btn.addEventListener('click', () => { toggleRelic(id); render(); });
        list.appendChild(btn);
    }
    body.appendChild(list);

    body.appendChild(section('대장간 소재',
        Object.entries(MATERIALS).map(([k, m]) => [m.name, `${matCount(k)}개 — ${m.desc}`])));
}

function renderCodex(body) {
    const kills = state.stats.kills;
    const names = { ...ENEMIES, HUNTER: { name: '사냥꾼' } };
    body.appendChild(section('도감', [
        ...Object.keys(names).filter(id => !names[id].noLoot).map(id => kills[id] ? [names[id].name, `${kills[id]}마리`] : ['???', '아직 만나지 못함', true]),
        ...Object.entries(BOSSES).map(([id, b]) => state.bossesDefeated[id] ? [b.name, '처치'] : ['???', b.title, true]),
    ]));
}

/** 마을 용들: 지금 누가 어디서 무엇을 하는지 */
function renderFolk(body) {
    const hour = Math.floor(state.dayTime * 24);
    const min = Math.floor((state.dayTime * 24 % 1) * 60 / 10) * 10;
    const head = document.createElement('div');
    head.className = 'journal-title';
    head.textContent = `${state.day}일째 ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} · ${dayPhaseName()}`;
    body.appendChild(head);

    const TIERS = [[75, '연인'], [50, '절친'], [25, '친구'], [10, '아는 사이'], [0, '낯선 사이']];
    for (const r of roster()) {
        const card = document.createElement('div');
        card.className = 'folk-card' + (r.near ? ' here' : '');
        const tier = TIERS.find(t => r.relation >= t[0])[1];
        card.innerHTML = '<div class="folk-head"><b class="folk-name"></b><span class="folk-job"></span></div>' +
                         '<div class="folk-where"></div><div class="folk-doing"></div>';
        card.querySelector('.folk-name').textContent = r.label;
        card.querySelector('.folk-job').textContent = `${r.job} · ${tier}`;
        card.querySelector('.folk-where').textContent = (r.near ? '📍 ' : '') + r.where;
        card.querySelector('.folk-doing').textContent = r.doing;
        body.appendChild(card);
    }

    const note = document.createElement('div');
    note.className = 'q-empty';
    note.textContent = '용마다 하루 일과가 있다. 시간과 날씨에 따라 있는 곳이 달라진다.';
    body.appendChild(note);
}

function render() {
    for (const b of document.querySelectorAll('.journal-tab')) b.classList.toggle('on', b.dataset.tab === tab);
    const body = $('journal-body');
    body.innerHTML = '';
    if (tab === 'quests') renderQuests(body);
    else if (tab === 'folk') renderFolk(body);
    else if (tab === 'record') renderRecord(body);
    else if (tab === 'relics') renderRelics(body);
    else renderCodex(body);
}

/** 일지를 열거나 닫는다. tabId 를 주면 그 탭으로 연다 */
export function toggleJournal(tabId) {
    const panel = $('journal-panel');
    if (panel.style.display === 'flex' && (!tabId || tabId === tab)) { panel.style.display = 'none'; return; }
    if (tabId) tab = tabId;
    markTutorial('journal');
    render();
    panel.style.display = 'flex';
}

/** 열려 있으면 내용만 새로 그린다 (퀘스트 진행도가 바뀔 때) */
export function refreshJournal() {
    if ($('journal-panel').style.display === 'flex') render();
}
