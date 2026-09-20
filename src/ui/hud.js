import { state } from '../core/state.js';
import { showToast } from './toast.js';
import { npcName } from '../data/npcs.js';
import { worldToScreen } from '../core/camera.js';

import { BIOMES } from '../world/biomes.js';
import { isAwake } from '../systems/travel.js';
import { inDungeon, dungeonName } from '../systems/delve.js';
import { currentMapName } from '../systems/world.js';
import { tutorialView, updateTutorial } from '../systems/tutorial.js';
import { getMinimapBase, minimapPlace, activeBiome } from '../world/terrain.js';
import { SKILLS } from '../data/skills.js';
import { toggleKidsPanel } from './kidsPanel.js';
import { dayPhaseName } from '../render/lighting.js';
import { drawPortrait } from '../render/spritesheet.js';
import { weatherName } from '../systems/weather.js';
import { trackedLine, setQuestListener, notify } from '../systems/quests.js';
import { refreshJournal, toggleJournal } from './journal.js';
import { points, skillRank } from '../systems/growth.js';
import { raidStatusText } from '../systems/raid.js';
import { eventName } from '../systems/events.js';

const $ = (id) => document.getElementById(id);
const strong = (text) => { const e = document.createElement('b'); e.textContent = text; return e; };
const sub = (text) => { const e = document.createElement('i'); e.textContent = text; return e; };
let el = {};
let minimapBase = null;
let lastBiome = null;

export function initHud() {
    el = {
        layer: $('ui-layer'), customizer: $('customizer'),
        panel: $('hud-panel'), showBtn: $('hud-show-btn'),
        name: $('ui-name'), lvl: $('ui-lvl'), stage: $('ui-stage'), partner: $('ui-partner'),
        xpText: $('ui-xp-text'), hpText: $('ui-hp-text'), meat: $('ui-meat'), gold: $('ui-gold'), raidInfo: $('raid-info'),
        barXp: $('bar-xp'), barHp: $('bar-hp'), barHunger: $('bar-hunger'),
        biome: $('biome-text'), tip: $('interact-tip'), raid: $('raid-warning'),
        minimap: $('minimap'), tracker: $('quest-tracker'), questMore: $('quest-more'), tutorial: $('tutorial-box'),
        bossBar: $('boss-bar'), bossName: $('boss-name'), bossFill: $('boss-fill'),
        elSlots: [...document.querySelectorAll('#skill-bar .slot.el')],
        skillSlots: [...document.querySelectorAll('#skill-bar .slot.skill')],
    };
    $('hud-collapse-btn').addEventListener('click', () => {
        el.panel.classList.add('hud-collapsed');
        el.showBtn.style.display = 'block';
    });
    el.showBtn.addEventListener('click', () => {
        el.panel.classList.remove('hud-collapsed');
        el.showBtn.style.display = 'none';
    });
    $('kids-toggle-btn').addEventListener('click', toggleKidsPanel);
    $('help-close').addEventListener('click', toggleHelp);
    $('points-chip').addEventListener('click', () => toggleJournal('growth'));
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
    el.name.title = state.story.title ? `${p.config.name} · ${state.story.title}` : '';
    el.lvl.textContent = p.level;
    // 의식에서 받은 칭호가 있으면 단계 대신 그것을 보여 준다 (systems/story.js)
    el.stage.textContent = state.story.title || p.stage.name;
    el.partner.textContent = state.partner ? npcName(state.partner.config.name) : '없음';
    el.meat.textContent = p.inventory.meat;
    el.gold.textContent = p.gold;
    $('twig-slot').style.display = state.den.built ? 'none' : '';
    $('ui-twigs').textContent = `${state.den.twigs}/8`;
    const ult = $('ult-slot');
    ult.style.display = p.stageIndex >= 4 ? '' : 'none';
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
}

/** 처음 며칠 동안만 뜨는 '지금 할 일' */
function drawTutorial() {
    updateTutorial(() => showToast('안내가 끝났습니다. 이제 마음대로 돌아다녀 보세요! ([H] 도움말)', '🎓'));
    const view = tutorialView();
    const key = view ? view.index + ':' + view.steps.map(s => s.text).join('|') : '';
    if (el.tutorial.dataset.key === key) return;
    el.tutorial.dataset.key = key;
    el.tutorial.innerHTML = '';
    if (!view) return;
    const head = document.createElement('div');
    head.className = 'tut-head';
    head.textContent = `길잡이 ${view.index} / ${view.total}`;
    el.tutorial.appendChild(head);
    for (const step of view.steps) {
        const d = document.createElement('div');
        d.className = 'tut-step' + (step.now ? ' now' : '');
        d.textContent = step.text;
        el.tutorial.appendChild(d);
    }
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
    const E = state.entities;
    for (const pr of E.props) {
        if (pr.portal) dot(pr.x, pr.y, 3, '#9fe3ff');
        else if (pr.type === 'WAYSTONE') dot(pr.x, pr.y, 3, isAwake(pr.stoneId) ? '#7fd4ff' : 'rgba(127,212,255,0.4)');
        else if (pr.type === 'CAVE') dot(pr.x, pr.y, 3.5, '#c58aff');
        else if (pr.type === 'STAIRS_DOWN') dot(pr.x, pr.y, 3, '#ff8a4a');
        else if (pr.type === 'STAIRS_UP') dot(pr.x, pr.y, 3, '#ffe9b0');
        else if (pr.type === 'CHEST' && !pr.opened) dot(pr.x, pr.y, 2.5, '#ffd84a');
    }
    for (const n of E.nests) dot(n.x, n.y, 3, '#ffd84a');
    for (const npc of E.npcs) if (npc.config.fixed) dot(npc.x, npc.y, 2.5, '#7dd36a');
    for (const e of E.enemies) dot(e.x, e.y, e.elite ? 2.5 : 1.5, e.elite ? '#ffd84a' : 'rgba(255,120,120,0.75)');
    for (const h of E.humans) dot(h.x, h.y, 2, '#ff9a9a');
    for (const b of E.bosses) dot(b.x, b.y, 4.5, '#ff4d4d');
    if (state.partner) dot(state.partner.x, state.partner.y, 2.5, '#ff7aa8');
    if (state.companion) dot(state.companion.x, state.companion.y, 2.5, '#7dd3ff');
    const p = state.player;
    g.strokeStyle = '#000'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(ox + p.x * k, oy + p.y * k, 4, 0, Math.PI * 2); g.stroke();
    dot(p.x, p.y, 3.5, '#fff');
}

/** 추적창에는 추적 중인 퀘스트 하나만. 나머지는 [J] 일지에서 본다 */
function refreshQuestTracker() {
    if (!state.player) return;
    el.tracker.innerHTML = '';
    el.questMore.textContent = '';
    const line = trackedLine();
    if (!line) return;
    const div = document.createElement('div');
    div.className = 'quest-line' + (line.complete ? ' complete' : '');
    const b = document.createElement('b');
    b.textContent = line.title;
    const goal = document.createElement('i');
    goal.textContent = line.goal;
    div.append(b, goal, line.text);
    el.tracker.appendChild(div);
    el.questMore.textContent = line.more > 0 ? `+ 맡은 일 ${line.more}개 · [J] 일지` : '[J] 일지';
    refreshJournal();
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
    return ['journal-panel', 'kids-panel', 'help-panel'].some(id => getComputedStyle($(id)).display !== 'none');
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
