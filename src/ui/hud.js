import { canFuse } from '../data/elements.js';
import { state } from '../core/state.js';
import { showToast } from './toast.js';
import { npcName } from '../data/npcs.js';
import { worldToScreen } from '../core/camera.js';

import { BIOMES } from '../world/biomes.js';
import { isAwake } from '../systems/travel.js';
import { inDungeon, dungeonName } from '../systems/delve.js';
import { currentMapName } from '../systems/world.js';
import { updateTutorial } from '../systems/tutorial.js';
import { getMinimapBase, minimapPlace, activeBiome } from '../world/terrain.js';
import { SKILLS } from '../data/skills.js';
import { toggleKidsPanel } from './kidsPanel.js';
import { dayPhaseName } from '../render/lighting.js';
import { drawPortrait } from '../render/spritesheet.js';
import { weatherName } from '../systems/weather.js';
import { trackedLine, setQuestListener, notify, suggestion, questMarker } from '../systems/quests.js';
import { guideTarget, toggleAutoNav, navActive } from '../systems/guide.js';
import { play } from '../systems/audio.js';
import { refreshJournal, toggleJournal } from './journal.js';
import { points, skillRank } from '../systems/growth.js';
import { raidStatusText } from '../systems/raid.js';
import { eventName } from '../systems/events.js';
import { momentum, momentumTier, momentumName, TIER_COLORS } from '../systems/flow.js';
import { flushQuestBanner } from './questBanner.js';
import { RELICS, KINS, equippedRelics, resonates } from '../systems/relics.js';
import { SKILLS as SKILL_DEFS } from '../data/skills.js';

const $ = (id) => document.getElementById(id);
const strong = (text) => { const e = document.createElement('b'); e.textContent = text; return e; };
const sub = (text) => { const e = document.createElement('i'); e.textContent = text; return e; };
let el = {};
let minimapBase = null;
let lastBiome = null;

/** 왼쪽 판(상태)을 접거나 편다 */
export function collapseHud(on) {
    el.panel.classList.toggle('hud-collapsed', on);
    el.showBtn.style.display = on ? 'block' : 'none';
}
/** 오른쪽 기둥(지도·길잡이·퀘스트)을 접거나 편다 */
export function collapseRight(on) {
    document.querySelector('.right-column').classList.toggle('hud-collapsed', on);
    $('right-show-btn').style.display = on ? 'block' : 'none';
}
/** [U] · 터치 [UI]: 둘 다 켜져 있으면 둘 다 접고, 하나라도 접혀 있으면 둘 다 편다 */
export function toggleUi() {
    const anyHidden = el.panel.classList.contains('hud-collapsed') || document.querySelector('.right-column').classList.contains('hud-collapsed');
    collapseHud(!anyHidden);
    collapseRight(!anyHidden);
}

export function initHud() {
    el = {
        layer: $('ui-layer'), customizer: $('customizer'),
        panel: $('hud-panel'), showBtn: $('hud-show-btn'),
        name: $('ui-name'), lvl: $('ui-lvl'), stage: $('ui-stage'), partner: $('ui-partner'),
        xpText: $('ui-xp-text'), hpText: $('ui-hp-text'), meat: $('ui-meat'), gold: $('ui-gold'), raidInfo: $('raid-info'),
        barXp: $('bar-xp'), barHp: $('bar-hp'), barHunger: $('bar-hunger'),
        biome: $('biome-text'), tip: $('interact-tip'), raid: $('raid-warning'),
        minimap: $('minimap'), tracker: $('quest-tracker'), questMore: $('quest-more'),
        bossBar: $('boss-bar'), bossName: $('boss-name'), bossFill: $('boss-fill'),
        elSlots: [...document.querySelectorAll('#skill-bar .slot.el')],
        skillSlots: [...document.querySelectorAll('#skill-bar .slot.skill')],
    };
    $('hud-collapse-btn').addEventListener('click', () => collapseHud(true));
    el.showBtn.addEventListener('click', () => collapseHud(false));
    $('right-collapse-btn').addEventListener('click', () => collapseRight(true));
    $('right-show-btn').addEventListener('click', () => collapseRight(false));
    $('kids-toggle-btn').addEventListener('click', toggleKidsPanel);
    $('help-close').addEventListener('click', toggleHelp);
    $('points-chip').addEventListener('click', () => toggleJournal('growth'));
    $('chapter-card').addEventListener('click', skipChapterCard);
    setQuestListener(refreshQuestTracker);
}

export function showGameUI() {
    el.customizer.style.display = 'none';
    el.layer.style.display = 'block';
    $('help-chip').style.display = 'block';
    drawPortrait($('ui-portrait'), state.player.sheet);
    minimapBase = getMinimapBase(el.minimap.width);
    refreshQuestTracker();
}

/** 지도가 바뀌었을 때 (굴에 들어가거나 나올 때) 미니맵 바탕을 다시 만든다 */
export function refreshMinimap() {
    if (el.minimap) minimapBase = getMinimapBase(el.minimap.width);
}

export function updateHud() {
    const p = state.player;
    if (!p) return;
    el.biome.innerHTML = '';
    if (inDungeon()) {
        el.biome.append(strong(dungeonName()));
    } else {
        if (state.mapId !== lastBiome) { lastBiome = state.mapId; notify('visit', state.mapId); refreshMinimap(); }
        el.biome.append(strong(currentMapName()), sub(`${eventName() || dayPhaseName()} · ${weatherName()}`));
    }
    el.name.textContent = p.config.name || 'Player';
    el.lvl.textContent = p.level;
    el.stage.textContent = p.stage.name;
    el.partner.textContent = state.partner ? npcName(state.partner.config.name) : '없음';
    el.meat.textContent = p.inventory.meat;
    el.gold.textContent = p.gold;
    $('twig-slot').style.display = state.den.built ? 'none' : '';
    $('ui-twigs').textContent = `${state.den.twigs}/8`;
    flushQuestBanner();
    refreshRelicChips();
    const m = momentum(), tier = momentumTier();
    $('flow-bar').classList.toggle('on', m > 1);
    $('flow-fill').style.width = m + '%';
    $('flow-fill').style.background = TIER_COLORS[tier];
    $('flow-label').textContent = momentumName();
    const ult = $('ult-slot');
    ult.style.display = canFuse(p) ? '' : 'none';
    ult.classList.toggle('ready', p.ult >= 100);
    ult.lastElementChild.style.height = (100 - p.ult) + '%';
    el.raidInfo.textContent = raidStatusText();
    el.raidInfo.classList.toggle('active', state.raid.active);
    el.hpText.textContent = p.hp.toFixed(0);
    const xpPct = (p.xp / p.maxXp) * 100;
    el.xpText.textContent = Math.floor(xpPct) + '%';
    el.barXp.style.width = xpPct + '%';
    el.barHp.style.width = (p.hp / p.maxHp) * 100 + '%';
    const hungerPct = Math.max(0, Math.min(100, p.hunger));
    el.barHunger.style.width = hungerPct + '%';
    $('ui-hunger-text').textContent = Math.round(hungerPct) + '%';

    for (const slot of el.elSlots) {
        const id = slot.dataset.el;
        slot.classList.toggle('locked', !p.elements.includes(id));
        slot.classList.toggle('active', p.element === id);
    }
    for (const slot of el.skillSlots) {
        const id = p.slots[slot.dataset.skill];   // 그 칸에 장착한 스킬
        const rank = id ? skillRank(id) : 0;
        slot.classList.toggle('locked', !id);
        slot.querySelector('.slot-name').textContent = id ? SKILLS[id].name : '비어 있음';
        slot.querySelector('.slot-rank').textContent = rank > 1 ? '★'.repeat(rank - 1) : '';
        // 대기 표시는 그때 실제로 걸린 시간(강화·성장으로 줄어든 값) 기준
        slot.lastElementChild.style.height = id ? Math.min(100, ((p.cooldowns[id] || 0) / (p.cdMax[id] || SKILLS[id].cooldown)) * 100) + '%' : '0';
    }
    const pts = points();
    $('points-chip').style.display = pts > 0 ? 'block' : 'none';
    if (pts > 0) $('points-num').textContent = pts;
    // 걸려 있는 효과들
    const buffs = [];
    if (p.fury > 0) buffs.push(['분노', false]);
    if (p.guard > 0) buffs.push(['강철 비늘', false]);
    if (state.rally > 0) buffs.push(['용의 함성', false]);
    if (state.blessingDay === state.day) buffs.push(['엘더의 축복', false]);
    if (p.slowTimer > 0) buffs.push(['둔화', true]);
    if (p.hungerLevel === 2) buffs.push(['굶주림 (이속·공속 저하)', true]);
    else if (p.hungerLevel === 1) buffs.push(['출출함 (조금 느려짐)', true]);
    const row = $('buff-row'), key = buffs.map(b => b[0]).join();
    if (row.dataset.key !== key) {
        row.dataset.key = key;
        row.innerHTML = '';
        for (const [name, bad] of buffs) { const s = document.createElement('span'); s.className = 'buff' + (bad ? ' bad' : ''); s.textContent = name; row.appendChild(s); }
    }
    drawTutorial();
    drawMinimap();
    refreshNavHint();
}

/** 처음 며칠의 조작 안내. 목록은 없앴고, 닥친 순간에 한 줄씩만 뜬다 (systems/tutorial.js) */
function drawTutorial() {
    updateTutorial();
}

export function toggleHelp() {
    const panel = $('help-panel');
    const open = panel.style.display === 'flex';
    panel.style.display = open ? 'none' : 'flex';
    $('help-chip').style.display = open ? 'block' : 'none';   // 열려 있는 동안엔 안내 칩을 감춘다
}

/**
 * 미니맵: 지금 밟고 있는 지도 한 장만 보여 준다.
 * 지도가 작아져서 통째로 담아도 읽을 만하다. 포탈·석비·굴·보스·상자를 점으로 찍는다.
 */
function drawMinimap() {
    if (!minimapBase) return;
    const c = el.minimap, g = c.getContext('2d');
    const { k, ox, oy } = minimapPlace(c.width);
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(minimapBase, 0, 0);
    const dot = (x, y, r, color) => {
        g.fillStyle = color;
        g.beginPath(); g.arc(ox + x * k, oy + y * k, r, 0, Math.PI * 2); g.fill();
    };
    // 점마다 검은 테를 둘러 바탕과 떨어져 보이게 한다 (초록 바탕 위의 초록 점은 안 보였다)
    const ring = (x, y, r, color, edge = 'rgba(0,0,0,0.85)') => {
        g.fillStyle = edge; g.beginPath(); g.arc(ox + x * k, oy + y * k, r + 1.2, 0, Math.PI * 2); g.fill();
        dot(x, y, r, color);
    };
    const diamond = (x, y, r, color) => {
        const cx = ox + x * k, cy = oy + y * k;
        g.fillStyle = 'rgba(0,0,0,0.85)';
        g.beginPath(); g.moveTo(cx, cy - r - 1.2); g.lineTo(cx + r + 1.2, cy); g.lineTo(cx, cy + r + 1.2); g.lineTo(cx - r - 1.2, cy); g.closePath(); g.fill();
        g.fillStyle = color;
        g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.fill();
    };
    const glyph = (x, y, text, color, size = 11) => {
        g.font = `700 ${size}px "Mulmaru", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.strokeText(text, ox + x * k, oy + y * k);
        g.fillStyle = color; g.fillText(text, ox + x * k, oy + y * k);
    };
    const E = state.entities;
    // 문은 마름모, 그 옆에 어느 쪽인지 첫 글자
    for (const pr of E.props) {
        if (pr.portal) diamond(pr.x, pr.y, 4, '#9fe3ff');
        else if (pr.type === 'WAYSTONE') ring(pr.x, pr.y, 3, isAwake(pr.stoneId) ? '#7fd4ff' : 'rgba(127,212,255,0.45)');
        else if (pr.type === 'CAVE') ring(pr.x, pr.y, 3.5, '#c58aff');
        else if (pr.type === 'DEN_MOUTH') ring(pr.x, pr.y, 3.5, pr.denId === 'DEN_MINE' ? '#ffd84a' : '#d8a86a');
        else if (pr.type === 'TOWER') ring(pr.x, pr.y, 3.5, '#e8d7a8');
        else if (pr.type === 'STAIRS_DOWN') ring(pr.x, pr.y, 3, '#ff8a4a');
        else if (pr.type === 'STAIRS_UP') ring(pr.x, pr.y, 3, '#ffe9b0');
        else if (pr.type === 'CHEST' && !pr.opened) ring(pr.x, pr.y, 2.5, '#ffd84a');
    }
    for (const n of E.nests) ring(n.x, n.y, 3, '#ffd84a');
    for (const e of E.enemies) if (e.type !== 'PREY') dot(e.x, e.y, e.elite ? 2.5 : 1.5, e.elite ? '#ffd84a' : 'rgba(255,110,110,0.7)');
    for (const h of E.humans) ring(h.x, h.y, 2, '#ff9a9a');
    for (const b of E.bosses) ring(b.x, b.y, 4.5, '#ff4d4d');
    // 마을 용은 초록 점. 부탁이 있거나 찾아가야 할 용은 점 대신 ! ? 글자
    for (const npc of E.npcs) {
        if (!npc.config.fixed || npc.remove || npc.hidden) continue;
        const mark = questMarker(npc);
        if (mark) glyph(npc.x, npc.y, mark, mark === '?' ? '#7dd36a' : '#ffd84a', 13);
        else ring(npc.x, npc.y, 2.5, '#7dd36a');
    }
    if (state.partner) ring(state.partner.x, state.partner.y, 2.5, '#ff7aa8');
    if (state.companion) ring(state.companion.x, state.companion.y, 2.5, '#7dd3ff');
    // 길잡이 목표: 천천히 뛰는 금빛 테
    const t = guideTarget();
    if (t) {
        const beat = (Math.sin(state.gameTime * 5) + 1) / 2;
        g.strokeStyle = `rgba(255,216,74,${0.6 + beat * 0.4})`; g.lineWidth = 2;
        g.beginPath(); g.arc(ox + t.x * k, oy + t.y * k, 6 + beat * 3, 0, Math.PI * 2); g.stroke();
    }
    // 나: 흰 화살촉이 보는 쪽을 가리킨다
    const p = state.player;
    const ang = { right: 0, left: Math.PI, down: Math.PI / 2, up: -Math.PI / 2 }[p.facing] ?? 0;
    const px = ox + p.x * k, py = oy + p.y * k;
    g.save();
    g.translate(px, py); g.rotate(ang);
    g.fillStyle = '#000';
    g.beginPath(); g.moveTo(8, 0); g.lineTo(-6, -6.5); g.lineTo(-3, 0); g.lineTo(-6, 6.5); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4.5); g.lineTo(-2, 0); g.lineTo(-4, 4.5); g.closePath(); g.fill();
    g.restore();
}

/**
 * 추적창에는 추적 중인 퀘스트 하나만. 나머지는 [J] 일지에서 본다.
 * 맡은 일이 없으면 "다음에 할 만한 일"을 대신 띄운다.
 * 줄을 누르면 그곳까지 알아서 걸어간다 (systems/guide.js).
 */
let lastTrackerKey = '';
function refreshQuestTracker() {
    if (!state.player) return;
    el.tracker.innerHTML = '';
    el.questMore.textContent = '';
    let line = trackedLine();
    let suggest = false;
    if (!line) {
        const s = suggestion();
        if (!s) { lastTrackerKey = ''; return; }
        line = { title: s.title, goal: s.goal, complete: false, more: 0 };
        suggest = true;
    }
    const div = document.createElement('div');
    div.className = 'quest-line' + (line.complete ? ' complete' : '') + (suggest ? ' suggest' : '');
    const kind = document.createElement('span');
    kind.className = 'ql-kind';
    kind.textContent = suggest ? '다음에 할 만한 일' : line.complete ? '보고하러 간다' : line.training ? '오늘의 수련' : '지금 할 일';
    const b = document.createElement('b');
    b.textContent = line.title;
    const goal = document.createElement('i');
    goal.textContent = line.goal;
    div.append(kind, b, goal);
    if (line.where) { const w = document.createElement('span'); w.className = 'ql-where'; w.textContent = line.where; div.appendChild(w); }
    if (line.text) { const pr = document.createElement('span'); pr.className = 'ql-prog'; pr.textContent = line.text; div.appendChild(pr); }
    const go = document.createElement('span');
    go.className = 'ql-go';
    go.id = 'ql-go';
    div.appendChild(go);
    div.addEventListener('click', () => { play('ui'); toggleAutoNav(); refreshNavHint(); });
    // 할 일이 바뀌면 한 번 번쩍여서 눈길을 끈다
    const key = line.title + '|' + line.goal;
    if (lastTrackerKey && key !== lastTrackerKey) div.classList.add('flash');
    lastTrackerKey = key;
    el.tracker.appendChild(div);
    refreshNavHint();
    el.questMore.textContent = line.more > 0 ? `+ 맡은 일 ${line.more}개 · [J] 일지` : suggest ? '' : '[J] 일지';
    refreshJournal();
}

/** 추적창 맨 아래 줄: 누르면 가는지, 가는 중인지 */
let lastNavKey = '';
function refreshNavHint() {
    const go = $('ql-go');
    if (!go) return;
    const t = guideTarget();
    const text = navActive() ? '🧭 걸어가는 중… (누르거나 방향키로 멈춤)' : t ? `🧭 누르면 ${t.label || '그곳'}까지 알아서 간다` : '';
    const key = text + (navActive() ? '1' : '0');
    if (key === lastNavKey) return;
    lastNavKey = key;
    go.textContent = text;
    go.parentElement.classList.toggle('nav', navActive());
}

let lastChips = '';
function refreshRelicChips() {
    const ids = equippedRelics();
    const key = ids.join(',') + '|' + Object.keys(KINS).filter(resonates).join(',');
    if (key === lastChips) return;
    lastChips = key;
    const box = $('relic-chips');
    box.innerHTML = '';
    for (const id of ids) {
        const r = RELICS[id];
        if (!r) continue;
        const d = document.createElement('div');
        d.className = 'relic-chip' + (r.kin ? ` kin-${r.kin}` : '');
        d.textContent = r.name;
        if (r.skill && SKILL_DEFS[r.skill]) { const s = document.createElement('small'); s.textContent = SKILL_DEFS[r.skill].name; d.appendChild(s); }
        else if (r.kin && resonates(r.kin)) { const s = document.createElement('small'); s.textContent = `${KINS[r.kin].name} 공명`; d.appendChild(s); }
        box.appendChild(d);
    }
}

/** 보스 체력 바. name 이 null 이면 숨긴다 */
export function setBossBar(name, ratio = 0) {
    if (!name) { el.bossBar.style.display = 'none'; return; }
    el.bossBar.style.display = 'block';
    el.bossName.textContent = name;
    el.bossFill.style.width = Math.max(0, ratio) * 100 + '%';
}

/** 일지·가족·도움말 창이 떠 있으면 머리 위 안내는 가린다 (창 위에 겹쳐 보이던 문제) */
function panelOpen() {
    return ['journal-panel', 'kids-panel', 'help-panel', 'settings-panel'].some(id => getComputedStyle($(id)).display !== 'none');
}

/** 근처 NPC 머리 위에 '말 걸기' 안내를 띄운다. 예전엔 화면 절반만큼 어긋난 위치에 떴다. */
export function setInteractTarget(npc, text = 'T 대화') {
    if (!npc || panelOpen()) { el.tip.style.display = 'none'; return; }
    el.tip.textContent = text;
    const s = worldToScreen(npc.x, npc.y);
    el.tip.style.left = s.x + 'px';
    el.tip.style.top = (s.y - 60) + 'px';
    el.tip.style.display = 'block';
}

/**
 * 지역 이름을 화면 위쪽에 잠깐 띄웠다 지운다 (지도를 옮길 때).
 * 게임을 멈추지도, 화면을 덮지도 않는다 — 걸어가면서 그대로 읽힌다.
 */
let regionTimer = null;
export function showRegionBanner(name, sub = '') {
    const el0 = $('region-banner');
    $('region-name').textContent = name;
    $('region-sub').textContent = sub;
    // 연달아 옮길 때도 처음부터 다시 재생되도록 애니메이션을 끊었다 건다
    el0.classList.remove('on');
    void el0.offsetWidth;
    el0.classList.add('on');
    state.bannerUntil = state.gameTime + 3;   // 이 동안은 사건 컷씬을 띄우지 않는다 (systems/chronicle.js)
    clearTimeout(regionTimer);
    regionTimer = setTimeout(() => el0.classList.remove('on'), 2800);
}

/**
 * 장이 넘어갈 때 까만 화면에 "제 1 장 · 웨스턴 마을" 을 띄운다. 그동안 세상은 멈춘다.
 * done: 다시 밝아진 뒤
 */
let chapterTimers = [], chapterDone = null;
export function showChapterCard(no, name, done) {
    const card = $('chapter-card');
    $('ch-no').textContent = no;
    $('ch-name').textContent = name;
    card.classList.add('on');
    state.isDialogueOpen = true;
    state.bannerUntil = state.gameTime + 6;   // 장 이름이 떠 있는 동안은 사건 컷씬을 띄우지 않는다
    chapterDone = done || null;
    play('quest');
    chapterTimers = [setTimeout(() => {
        card.classList.remove('on');
        chapterTimers = [setTimeout(endChapterCard, 900)];
    }, 3400)];
}
export function chapterCardOn() { return chapterTimers.length > 0; }
/** [Esc]·클릭으로 건너뛴다 (main.js) */
export function skipChapterCard() {
    if (!chapterTimers.length) return;
    $('chapter-card').classList.remove('on');
    endChapterCard();
}
function endChapterCard() {
    for (const t of chapterTimers) clearTimeout(t);
    chapterTimers = [];
    state.isDialogueOpen = false;
    const done = chapterDone; chapterDone = null;
    if (done) done();
}

export function showRaidWarning(text) {
    el.raid.textContent = text;
    el.raid.style.display = 'block';
    setTimeout(() => { el.raid.style.display = 'none'; }, 3500);
}

/** 화면을 어둡게 했다가(가운데 글자) 다시 밝힌다. mid: 완전히 어두워졌을 때, done: 다시 밝아진 뒤 */
export function fadeScreen(text, mid, done) {
    const el2 = $('fade-screen');
    $('fade-text').textContent = text;
    el2.classList.add('on');
    state.isDialogueOpen = true;   // 자는 동안 게임을 멈춘다
    setTimeout(() => {
        mid();
        setTimeout(() => {
            el2.classList.remove('on');
            state.isDialogueOpen = false;
            setTimeout(done, 900);
        }, 1300);
    }, 1000);
}
