import { state } from '../core/state.js';
import { worldToScreen } from '../core/camera.js';
import { BIOMES, getBiome } from '../world/biomes.js';
import { toggleKidsPanel } from './kidsPanel.js';
import { dayPhaseName } from '../render/lighting.js';
import { drawPortrait } from '../render/spritesheet.js';

const $ = (id) => document.getElementById(id);
let el = {};

export function initHud() {
    el = {
        layer: $('ui-layer'), customizer: $('customizer'),
        panel: $('hud-panel'), showBtn: $('hud-show-btn'),
        name: $('ui-name'), lvl: $('ui-lvl'), partner: $('ui-partner'),
        xpText: $('ui-xp-text'), hpText: $('ui-hp-text'), meat: $('ui-meat'),
        barXp: $('bar-xp'), barHp: $('bar-hp'), barHunger: $('bar-hunger'),
        biome: $('biome-text'), tip: $('interact-tip'), raid: $('raid-warning'),
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
}

export function showGameUI() {
    el.customizer.style.display = 'none';
    el.layer.style.display = 'block';
    drawPortrait($('ui-portrait'), state.player.sheet);
}

export function updateHud() {
    const p = state.player;
    if (!p) return;
    el.biome.textContent = `${BIOMES[getBiome(p.x, p.y)].name} · ${dayPhaseName()}`;
    el.name.textContent = p.config.name || 'Player';
    el.lvl.textContent = p.level;
    el.partner.textContent = state.partner ? state.partner.config.name : '없음';
    el.meat.textContent = p.inventory.meat;
    el.hpText.textContent = p.hp.toFixed(0);
    const xpPct = (p.xp / p.maxXp) * 100;
    el.xpText.textContent = Math.floor(xpPct) + '%';
    el.barXp.style.width = xpPct + '%';
    el.barHp.style.width = (p.hp / p.maxHp) * 100 + '%';
    el.barHunger.style.width = Math.max(0, Math.min(100, p.hunger)) + '%';
}

/** 근처 NPC 머리 위에 '말 걸기' 안내를 띄운다. 예전엔 화면 절반만큼 어긋난 위치에 떴다. */
export function setInteractTarget(npc) {
    if (!npc) { el.tip.style.display = 'none'; return; }
    const s = worldToScreen(npc.x, npc.y);
    el.tip.style.left = s.x + 'px';
    el.tip.style.top = (s.y - 60) + 'px';
    el.tip.style.display = 'block';
}

export function showRaidWarning() {
    el.raid.style.display = 'block';
    setTimeout(() => { el.raid.style.display = 'none'; }, 3500);
}
