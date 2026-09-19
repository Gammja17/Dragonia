import { state } from '../core/state.js';
import { worldToScreen } from '../core/camera.js';
import { WORLD_SIZE, NEST_POS } from '../core/config.js';
import { BIOMES, getBiome } from '../world/biomes.js';
import { getMinimapBase } from '../world/terrain.js';
import { SKILLS } from '../data/skills.js';
import { toggleKidsPanel } from './kidsPanel.js';
import { dayPhaseName } from '../render/lighting.js';
import { drawPortrait } from '../render/spritesheet.js';
import { weatherName } from '../systems/weather.js';
import { questLines, setQuestListener, notify } from '../systems/quests.js';
import { raidStatusText } from '../systems/raid.js';
import { eventName } from '../systems/events.js';

const $ = (id) => document.getElementById(id);
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
        minimap: $('minimap'), tracker: $('quest-tracker'),
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

export function updateHud() {
    const p = state.player;
    if (!p) return;
    const biome = getBiome(p.x, p.y);
    if (biome !== lastBiome) { lastBiome = biome; notify('visit', biome); }
    el.biome.textContent = `${BIOMES[biome].name} · ${eventName() || dayPhaseName()} · ${weatherName()}`;
    el.name.textContent = p.config.name || 'Player';
    el.lvl.textContent = p.level;
    el.stage.textContent = p.stage.name;
    el.partner.textContent = state.partner ? state.partner.config.name : '없음';
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
    el.barHunger.style.width = Math.max(0, Math.min(100, p.hunger)) + '%';

    for (const slot of el.elSlots) {
        const id = slot.dataset.el;
        slot.classList.toggle('locked', !p.elements.includes(id));
        slot.classList.toggle('active', p.element === id);
    }
    for (const slot of el.skillSlots) {
        const id = p.slots[slot.dataset.skill];   // 그 칸에 장착한 스킬
        slot.classList.toggle('locked', !id);
        slot.querySelector('.slot-name').textContent = id ? SKILLS[id].name : '비어 있음';
        slot.lastElementChild.style.height = id ? Math.min(100, ((p.cooldowns[id] || 0) / SKILLS[id].cooldown) * 100) + '%' : '0';
    }
    // 걸려 있는 효과들
    const buffs = [];
    if (p.fury > 0) buffs.push(['분노', false]);
    if (p.guard > 0) buffs.push(['강철 비늘', false]);
    if (state.rally > 0) buffs.push(['용의 함성', false]);
    if (state.blessingDay === state.day) buffs.push(['엘더의 축복', false]);
    if (p.slowTimer > 0) buffs.push(['둔화', true]);
    if (p.hunger < 10) buffs.push(['굶주림', true]);
    const row = $('buff-row'), key = buffs.map(b => b[0]).join();
    if (row.dataset.key !== key) {
        row.dataset.key = key;
        row.innerHTML = '';
        for (const [name, bad] of buffs) { const s = document.createElement('span'); s.className = 'buff' + (bad ? ' bad' : ''); s.textContent = name; row.appendChild(s); }
    }
    drawMinimap();
}

export function toggleHelp() {
    const panel = $('help-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function drawMinimap() {
    if (!minimapBase) return;
    const c = el.minimap, g = c.getContext('2d'), k = c.width / WORLD_SIZE;
    g.drawImage(minimapBase, 0, 0);
    const dot = (x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x * k, y * k, r, 0, Math.PI * 2); g.fill(); };
    dot(NEST_POS.x, NEST_POS.y, 3, '#ffd84a');
    for (const b of state.entities.bosses) dot(b.x, b.y, 4, '#ff4d4d');
    for (const h of state.entities.humans) dot(h.x, h.y, 2, '#ff9a9a');
    if (state.partner) dot(state.partner.x, state.partner.y, 2.5, '#ff7aa8');
    if (state.companion) dot(state.companion.x, state.companion.y, 2.5, '#7dd3ff');
    const p = state.player;
    g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.arc(p.x * k, p.y * k, 4, 0, Math.PI * 2); g.stroke();
    dot(p.x, p.y, 3.5, '#fff');
}

function refreshQuestTracker() {
    if (!state.player) return;
    el.tracker.innerHTML = '';
    for (const line of questLines()) {
        const div = document.createElement('div');
        div.className = 'quest-line' + (line.complete ? ' complete' : '');
        const b = document.createElement('b');
        b.textContent = line.title;
        div.append(b, line.text);
        el.tracker.appendChild(div);
    }
}

/** 보스 체력 바. name 이 null 이면 숨긴다 */
export function setBossBar(name, ratio = 0) {
    if (!name) { el.bossBar.style.display = 'none'; return; }
    el.bossBar.style.display = 'block';
    el.bossName.textContent = name;
    el.bossFill.style.width = Math.max(0, ratio) * 100 + '%';
}

/** 근처 NPC 머리 위에 '말 걸기' 안내를 띄운다. 예전엔 화면 절반만큼 어긋난 위치에 떴다. */
export function setInteractTarget(npc, text = 'T 대화') {
    if (!npc) { el.tip.style.display = 'none'; return; }
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
