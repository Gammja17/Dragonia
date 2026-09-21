import { state } from '../core/state.js';
import { MAPS, MAP_POS } from '../data/maps.js';
import { CLUES } from '../data/chronicle.js';

// 지도마다 놓이는 상자 수의 합 (systems/world.js 의 spec.chests ?? 3)
const CHEST_COUNT = Object.values(MAPS).reduce((n, m) => n + (m.chests ?? 3), 0);
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { RELICS, ownsRelic, hasRelic, toggleRelic, slotCount } from '../systems/relics.js';
import { MATERIALS } from '../data/materials.js';
import { FURNITURE } from '../data/furniture.js';
import { matCount } from '../systems/smithing.js';
import { isMuted, sfxVolume, setSfxVolume } from '../systems/audio.js';
import { musicVolume, setMusicVolume } from '../systems/music.js';
import { questLog, setTracked } from '../systems/quests.js';
import { BRANCHES, GROWTH_NODES, NODES_BY_ID } from '../data/growth.js';
import { SKILLS, SKILL_BRANCHES, SKILL_SLOTS, MAX_SKILL_RANK } from '../data/skills.js';
import { LESSONS } from '../data/story.js';
import { points, nodeRank, nodeStatus, investNode, skillRank, skillUpgradeCost, upgradeSkill } from '../systems/growth.js';
import { skillCooldown } from '../systems/skills.js';
import { play } from '../systems/audio.js';
import { markTutorial } from '../systems/tutorial.js';
import { roster } from '../systems/routine.js';
import { dayPhaseName } from '../render/lighting.js';
import { isGatherNow, isGatherDay, daysToGather, knowsCloudtop } from '../systems/gathering.js';

// 모험 일지: [성장] [스킬] [퀘스트] [기록] [유물] [도감] 탭. J 키로 연다 ([G] 성장 · [B] 스킬).
// 퀘스트 탭은 줄을 누르면 펼쳐져 배경·목표·힌트·보상을 읽을 수 있고,
// [추적] 을 누르면 화면 오른쪽 추적창에 그 퀘스트가 걸린다.
// 성장·스킬 탭은 뿌리 하나에서 세 갈래가 뻗는 나무로 그린다 (systems/growth.js 가 값을 갖고 있다).

const $ = (id) => document.getElementById(id);
const TABS = [['quests', '퀘스트'], ['map', '지도'], ['bag', '소지품'], ['folk', '마을 용들'], ['skills', '스킬'], ['growth', '성장'], ['relics', '유물'], ['codex', '도감'], ['record', '기록'], ['sound', '소리']];
let tab = 'quests';
let openRow = null;   // 펼쳐 놓은 퀘스트 id
let picked = null;    // 나무에서 고른 마디 { kind: 'node' | 'skill', id }

export function initJournal() {
    $('journal-close').addEventListener('click', () => { $('journal-panel').style.display = 'none'; });
    const bar = $('journal-tabs');
    for (const [id, label] of TABS) {
        const b = document.createElement('button');
        b.className = 'journal-tab';
        b.dataset.tab = id;
        b.textContent = label;
        b.addEventListener('click', () => { tab = id; picked = null; play('ui'); render(); });
        bar.appendChild(b);
    }
    // 창 크기가 바뀌면 나무의 줄기를 다시 그어야 한다
    window.addEventListener('resize', () => { if ($('journal-panel').style.display === 'flex') render(); });
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
    ]));
    // 정체의 단서. 승급 의식과 사건에서 모인다 (data/chronicle.js 의 CLUES)
    const clues = (state.story.clues || []).filter(id => CLUES[id]);
    if (clues.length) body.appendChild(section('비늘 아래의 무늬', clues.map((id, i) => [`${i + 1}`, CLUES[id]])));
}

/** 소리 탭: 배경음·효과음 음량과, 빌려 쓴 음원의 만든 이 */
function renderSound(body) {
    const head = document.createElement('div');
    head.className = 'journal-title';
    head.textContent = '음량';
    body.appendChild(head);
    body.appendChild(volumeRow('배경음', musicVolume, setMusicVolume));
    body.appendChild(volumeRow('효과음', sfxVolume, setSfxVolume));
    body.appendChild(section('전체', [['소리 끄기 (M 키)', isMuted() ? '꺼짐' : '켜짐']]));
    body.appendChild(section('빌려 쓴 소리', [
        ['배경음 15곡', 'Music by Eric Matyas · www.soundimage.org'],
        ['효과음 일부', 'Kenney (CC0)'],
        ['나머지 효과음', '코드로 그때그때 만든다'],
    ]));
}

function volumeRow(label, get, set) {
    const row = document.createElement('div');
    row.className = 'journal-row';
    const name = document.createElement('span');
    name.textContent = label;
    const knob = document.createElement('span');
    knob.className = 'journal-slider';
    const bar = document.createElement('input');
    bar.type = 'range'; bar.min = 0; bar.max = 100; bar.value = Math.round(get() * 100);
    const num = document.createElement('i');
    num.textContent = bar.value;
    bar.addEventListener('input', () => { set(bar.value / 100); num.textContent = bar.value; });
    knob.append(bar, num);
    row.append(name, knob);
    return row;
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
        Object.entries(MATERIALS).map(([k, m]) => [m.name, `${matCount(k)}개. ${m.desc}`])));
}

// ---------- 성장 · 스킬 나무 ----------
const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
};
const BRANCH_GLYPH = { FANG: '▲', SCALE: '⬢', WING: '✦', BODY: '▲', BREATH: '⬢', SOUL: '✦' };

/**
 * 갈래 셋이 뿌리 하나에서 뻗어 올라가는 나무를 그린다.
 * branches: [{ key, title, sub, color, tiers: [[항목,...] 아래줄부터] }]
 * makeNode(항목, 색) 은 '.tnode' 하나를 돌려준다.
 * 이어 주는 줄기는 DOM 을 붙인 뒤 실제 위치를 재서 SVG 로 긋는다 (줄마다 마디 수가 달라도 맞는다).
 */
function buildTree(body, branches, rootLabel, makeNode) {
    const wrap = el('div', 'tree-wrap');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tree-links');
    wrap.appendChild(svg);

    const canopy = el('div', 'tree-canopy');
    for (const b of branches) {
        const col = el('div', 'tree-branch');
        col.style.setProperty('--c', b.color);
        const head = el('div', 'branch-head');
        head.append(el('span', 'branch-glyph', BRANCH_GLYPH[b.key]), el('span', 'branch-name', b.title),
                    ...(b.sub ? [el('span', 'branch-sub', b.sub)] : []));
        // 위가 높은 단계라서 아래줄(기초)부터 만들고 뒤집어 쌓는다 (CSS column-reverse)
        const rows = el('div', 'branch-rows');
        for (const tier of b.tiers) {
            const row = el('div', 'branch-row');
            for (const item of tier) row.appendChild(makeNode(item, b.color));
            rows.appendChild(row);
        }
        col.append(head, rows);
        canopy.appendChild(col);
    }
    wrap.appendChild(canopy);

    const root = el('div', 'tree-root');
    root.append(el('span', 'root-glyph', '❖'), el('span', 'root-label', rootLabel));
    wrap.appendChild(root);
    body.appendChild(wrap);
    drawLinks(wrap, svg, root);
}

/** 마디들의 실제 위치를 재서 줄기를 긋는다 */
function drawLinks(wrap, svg, root) {
    const box = wrap.getBoundingClientRect();
    if (!box.width) return;
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    svg.innerHTML = '';
    const center = (e, atTop) => {
        const r = e.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: (atTop ? r.top : r.bottom) - box.top };
    };
    const line = (a, b, color, lit) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midY = (a.y + b.y) / 2;
        p.setAttribute('d', `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`);
        p.setAttribute('class', 'tree-link' + (lit ? ' lit' : ''));
        if (lit) p.setAttribute('stroke', color);
        svg.appendChild(p);
    };
    const rootTop = center(root, true);
    for (const branch of wrap.querySelectorAll('.tree-branch')) {
        const color = branch.style.getPropertyValue('--c');
        const rows = [...branch.querySelectorAll('.branch-row')];
        rows.forEach((row, i) => {
            const below = i === 0 ? null : [...rows[i - 1].querySelectorAll('.tnode')];
            for (const n of row.querySelectorAll('.tnode')) {
                const lit = n.classList.contains('on');
                if (!below) { line(center(n, false), rootTop, color, lit); continue; }
                // 아래줄에서 이미 딴 마디가 있으면 거기서, 없으면 첫 칸에서 뻗어 올린다
                const from = below.find(x => x.classList.contains('on')) || below[0];
                line(center(n, false), center(from, true), color, lit && from.classList.contains('on'));
            }
        });
    }
}

function pickNode(kind, id) { picked = { kind, id }; play('ui'); render(); }

function renderGrowth(body) {
    const p = state.player;
    body.appendChild(treeNote(`레벨 ${p.level} · ${p.stage.name}`,
        '레벨업마다 포인트 2, 승급 시험마다 3. 위로 갈수록 자란 몸이라야 버틴다. 마디를 눌러 조건과 효과를 본다.'));
    const branches = Object.entries(BRANCHES).map(([key, b]) => ({
        key, title: b.name, sub: b.sub, color: b.color,
        tiers: [0, 1, 2, 3].map(t => GROWTH_NODES.filter(n => n.branch === key && n.tier === t)),
    }));
    buildTree(body, branches, `${p.stage.name} · 레벨 ${p.level}`, growthNode);
}

function growthNode(node, color) {
    const st = nodeStatus(node), rank = st.rank;
    const n = el('div', 'tnode' + (rank > 0 ? ' on' : '') + (rank >= node.max ? ' full' : '')
        + (st.can ? ' can' : '') + (rank === 0 && !st.can ? ' locked' : '')
        + (picked && picked.kind === 'node' && picked.id === node.id ? ' sel' : ''));
    n.style.setProperty('--c', color);
    const gem = el('div', 'tnode-gem');
    gem.appendChild(el('span', 'tnode-rank', `${rank}/${node.max}`));
    n.append(gem, el('div', 'tnode-name', node.name));
    n.addEventListener('click', () => pickNode('node', node.id));
    return n;
}

/** 아직 못 배운 스킬을 어디서 얻는지 */
function sourceText(id) {
    const s = SKILLS[id].source;
    if (s.type === 'MASTER') {
        const lesson = LESSONS.find(l => l.skill === id);
        return lesson ? `스승 카이론: ${lesson.title} (레벨 ${lesson.level})` : '스승 카이론의 수련';
    }
    if (s.type === 'BOSS') return `${(BOSSES[s.id] || {}).name || s.id}를 쓰러뜨리면`;
    if (s.type === 'AWAKEN') return `${s.hint}: ${s.need.map(([i, r]) => `${SKILLS[i].name} ${r}단`).join(' + ')}`;
    return s.hint;
}

function renderSkills(body) {
    const p = state.player, total = Object.keys(SKILLS).length;
    body.appendChild(treeNote(`배운 스킬 ${p.skills.length} / ${total}`,
        `장착 ${SKILL_SLOTS.map(s => `[${s}] ${p.slots[s] ? SKILLS[p.slots[s]].name : '─'}`).join('  ')}. 마디를 눌러 장착하고 강화한다.`));
    const branches = Object.entries(SKILL_BRANCHES).map(([key, b]) => ({
        key, title: b.name, sub: '', color: b.color,
        tiers: [0, 1, 2, 3].map(t => Object.keys(SKILLS).filter(id => SKILLS[id].branch === key && SKILLS[id].tier === t)).filter(r => r.length),
    }));
    buildTree(body, branches, `${p.skills.length} / ${total} 습득`, skillNode);
}

function skillNode(id, color) {
    const def = SKILLS[id], rank = skillRank(id), known = rank > 0;
    const slot = SKILL_SLOTS.find(s => state.player.slots[s] === id);
    const n = el('div', 'tnode' + (known ? ' on' : ' locked') + (known && skillUpgradeCost(id) === null ? ' full' : '')
        + (picked && picked.kind === 'skill' && picked.id === id ? ' sel' : ''));
    n.style.setProperty('--c', color);
    const gem = el('div', 'tnode-gem');
    gem.appendChild(el('span', 'tnode-rank', known ? '★'.repeat(rank) : '?'));
    if (slot) gem.appendChild(el('span', 'tnode-slot', slot));
    n.append(gem, el('div', 'tnode-name', known ? def.name : '???'));
    n.addEventListener('click', () => pickNode('skill', id));
    return n;
}

function treeNote(title, text) {
    const b = el('div', 'tree-note');
    b.append(el('div', 'tree-note-title', title), el('div', 'tree-note-text', text));
    return b;
}

/** 나무 아래 자세히 보기 줄: 고른 마디의 설명과 버튼 */
function renderPicked() {
    const bar = $('journal-detail');
    bar.innerHTML = '';
    const onTree = tab === 'growth' || tab === 'skills';
    bar.style.display = onTree ? 'flex' : 'none';
    if (!onTree) return;
    if (!picked || (picked.kind === 'node') !== (tab === 'growth')) {
        bar.appendChild(el('div', 'detail-hint', '마디를 눌러 자세히 보고 성장 포인트를 쓴다.'));
        return;
    }
    const info = el('div', 'detail-info'), actions = el('div', 'detail-actions');

    if (picked.kind === 'node') {
        const node = NODES_BY_ID[picked.id], st = nodeStatus(node), rank = nodeRank(node.id);
        info.append(el('div', 'detail-name', `${node.name}  ${rank} / ${node.max}단`),
            el('div', 'detail-text', rank >= node.max ? node.desc(rank)
                : `지금 ${rank ? node.desc(rank) : '아직 찍지 않았다'} → 다음 단계 ${node.desc(rank + 1)}`));
        if (rank < node.max) {
            const btn = el('button', 'detail-btn' + (st.can ? '' : ' off'), st.can ? `한 단 올리기 (포인트 ${node.cost})` : st.reason);
            btn.addEventListener('click', () => { if (investNode(node.id)) render(); });
            actions.appendChild(btn);
        }
    } else {
        const def = SKILLS[picked.id], rank = skillRank(picked.id), cost = skillUpgradeCost(picked.id);
        info.append(el('div', 'detail-name', rank ? `${def.name}  ${rank} / ${MAX_SKILL_RANK}단` : `${def.name} (아직 못 배움)`),
            el('div', 'detail-text', rank ? `${def.desc} · 대기 ${skillCooldown(picked.id).toFixed(1)}초` : sourceText(picked.id)));
        if (rank) {
            for (const s of SKILL_SLOTS) {
                const on = state.player.slots[s] === picked.id;
                const btn = el('button', 'detail-btn slot-btn' + (on ? ' on' : ''), on ? `[${s}] 해제` : `[${s}] 에 장착`);
                btn.addEventListener('click', () => { equip(picked.id, s, on); render(); });
                actions.appendChild(btn);
            }
            if (cost !== null) {
                const btn = el('button', 'detail-btn', `강화 ${rank + 1}단 (포인트 ${cost})`);
                btn.addEventListener('click', () => { if (upgradeSkill(picked.id)) render(); });
                actions.appendChild(btn);
            } else actions.appendChild(el('div', 'detail-hint', '끝까지 익힌 기술이다'));
        }
    }
    bar.append(info, actions);
}

function equip(id, slot, unequip) {
    const p = state.player;
    if (unequip) { p.slots[slot] = null; return; }
    for (const s of SKILL_SLOTS) if (p.slots[s] === id) p.slots[s] = p.slots[slot];   // 이미 장착된 스킬이면 자리를 맞바꾼다
    p.slots[slot] = id;
    play('ui');
}

function renderCodex(body) {
    const kills = state.stats.kills;
    const names = { ...ENEMIES, HUNTER: { name: '사냥꾼' } };
    body.appendChild(section('도감', [
        ...Object.keys(names).filter(id => !names[id].noLoot).map(id => kills[id] ? [names[id].name, `${kills[id]}마리`] : ['???', '아직 만나지 못함', true]),
        ...Object.entries(BOSSES).map(([id, b]) => state.bossesDefeated[id] ? [b.name, '처치'] : ['???', b.title, true]),
    ]));
}

/**
 * 지도. 지도 19장을 이어진 대로 그린다 — 가 본 곳은 밝게, 석비를 깨운 곳은 표시,
 * 지금 있는 곳은 테두리. 자리는 data/maps.js 의 MAP_POS 를 쓴다.
 */
function renderMap(body) {
    const c = document.createElement('canvas');
    const W = 900, H = 470;
    c.width = W; c.height = H;
    c.className = 'world-map';
    const g = c.getContext('2d');
    g.fillStyle = '#100f18'; g.fillRect(0, 0, W, H);
    const pos = (id) => { const p = MAP_POS[id] || [0.5, 0.5]; return { x: 60 + p[0] * (W - 120), y: 40 + p[1] * (H - 80) }; };
    // 길
    g.strokeStyle = 'rgba(216,178,90,0.35)'; g.lineWidth = 3;
    for (const [id, spec] of Object.entries(MAPS)) for (const pt of spec.portals || []) {
        if (!MAPS[pt.to] || id > pt.to) continue;
        const a = pos(id), b = pos(pt.to);
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    // 마디
    g.font = '600 12px "Noto Sans KR"'; g.textAlign = 'center';
    for (const [id, spec] of Object.entries(MAPS)) {
        const { x, y } = pos(id);
        const seen = state.visited.includes(id), here = state.mapId === id;
        const stone = state.waystones.includes(id);
        const boss = (spec.fixtures || []).some(f => f.t === 'BOSS');
        g.beginPath(); g.arc(x, y, here ? 13 : 10, 0, Math.PI * 2);
        g.fillStyle = !seen ? '#2a2836' : boss ? '#7a2f2f' : spec.biome === 'VILLAGE' || spec.biome === 'CLOUDTOP' ? '#d8b25a' : '#4f6b45';
        g.fill();
        if (here) { g.strokeStyle = '#ffd84a'; g.lineWidth = 3; g.stroke(); }
        if (stone) { g.fillStyle = '#7fd4ff'; g.beginPath(); g.arc(x + 9, y - 9, 4, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = seen ? '#ece3cf' : '#6a6478';
        g.fillText(seen ? spec.name : '???', x, y + 26);
    }
    body.appendChild(c);
    const note = document.createElement('div');
    note.className = 'q-empty';
    note.textContent = '● 가 본 곳   ● 보스의 둥지   ● 마을   ◦ 석비를 깨운 곳 (석비에서 건너뛸 수 있다)';
    body.appendChild(note);
}

/** 소지품. 흩어져 있던 것들을 한 곳에 */
function renderBag(body) {
    const p = state.player;
    body.appendChild(section('가진 것', [
        ['고기', `${p.inventory.meat}개`],
        ['골드', `${p.gold}G`],
        ...(state.den.built ? [] : [['나뭇가지', `${state.den.twigs} / 8 (둥지 재료)`]]),
        ...(p.carrying === 'EGG' ? [['용의 알', '들고 있다 (내 굴 둥지에 [E], 또는 엘더에게 맡긴다)']] : []),
        ...(state.eggSitting ? [['맡긴 알', `엘더가 품는 중 (${Math.max(0, 3 - (state.day - state.eggSitting.day))}일 남음)`]] : []),
    ]));
    const mats = Object.entries(MATERIALS).map(([id, m]) => [m.name, `${matCount(id)}개`, matCount(id) === 0]);
    body.appendChild(section('대장간 소재', mats));
    const furn = Object.keys(FURNITURE).filter(id => (state.furniture || {})[id] > 0).map(id => [FURNITURE[id].name, `${state.furniture[id]}개`]);
    body.appendChild(section('굴 살림살이 (안 놓은 것)', furn.length ? furn : [['', '없다', true]]));
    const worn = Object.keys(RELICS).filter(hasRelic).map(id => [RELICS[id].name, '끼움']);
    body.appendChild(section('끼운 유물', worn.length ? worn : [['', '없다 (유물 탭에서 끼운다)', true]]));
}

/** 마을 용들: 지금 누가 어디서 무엇을 하는지 */
function renderFolk(body) {
    const hour = Math.floor(state.dayTime * 24);
    const min = Math.floor((state.dayTime * 24 % 1) * 60 / 10) * 10;
    const head = document.createElement('div');
    head.className = 'journal-title';
    head.textContent = `${state.day}일째 ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} · ${dayPhaseName()}`;
    body.appendChild(head);

    // 달 밝은 밤의 모임 (systems/gathering.js)
    const moon = document.createElement('div');
    moon.className = 'folk-moon' + (isGatherNow() ? ' now' : '');
    const left = daysToGather();
    moon.textContent = isGatherNow()
        ? '🌕 지금 구름 폭포에서 모임이 서 있다. 두 마을이 모두 내려와 있다.'
        : isGatherDay()
            ? '🌕 오늘 밤이 모임이다. 해가 지면 구름 폭포로.'
            : `🌘 다음 모임까지 ${left}일. 달이 가장 밝은 밤, 구름 폭포에서.`;
    body.appendChild(moon);

    const TIERS = [[75, '연인'], [50, '절친'], [25, '친구'], [10, '아는 사이'], [0, '낯선 사이']];
    for (const r of roster()) {
        if (r.east && !knowsCloudtop()) continue;   // 아직 만나지 않은 마을의 용은 적지 않는다
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
    // 나무는 세 갈래를 나란히 놓아야 해서 창을 넓게 쓴다
    $('journal-panel').classList.toggle('wide', tab === 'growth' || tab === 'skills' || tab === 'map');
    $('journal-points').textContent = points() > 0 ? `성장 포인트 ${points()}` : '';
    const body = $('journal-body');
    body.innerHTML = '';
    if (tab === 'map') renderMap(body);
    else if (tab === 'bag') renderBag(body);
    else if (tab === 'growth') renderGrowth(body);
    else if (tab === 'skills') renderSkills(body);
    else if (tab === 'quests') renderQuests(body);
    else if (tab === 'folk') renderFolk(body);
    else if (tab === 'record') renderRecord(body);
    else if (tab === 'relics') renderRelics(body);
    else if (tab === 'sound') renderSound(body);
    else renderCodex(body);
    renderPicked();
}

/** 일지를 열거나 닫는다. tabId 를 주면 그 탭으로 연다 */
export function toggleJournal(tabId) {
    const panel = $('journal-panel');
    if (panel.style.display === 'flex' && (!tabId || tabId === tab)) { panel.style.display = 'none'; return; }
    if (tabId && tabId !== tab) { tab = tabId; picked = null; }
    markTutorial('journal');
    render();
    panel.style.display = 'flex';
}

/** 열려 있으면 내용만 새로 그린다 (퀘스트 진행도가 바뀔 때) */
export function refreshJournal() {
    if ($('journal-panel').style.display === 'flex') render();
}
