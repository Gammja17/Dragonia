import { state } from '../core/state.js';
import { MAX_KIDS } from '../core/config.js';

const $ = (id) => document.getElementById(id);

export function initKidsPanel() {
    $('kids-max').textContent = MAX_KIDS;
    $('kids-close').addEventListener('click', closeKidsPanel);
}

export function refreshKidsPanel() {
    $('kids-count').textContent = state.kids.length;
    const list = $('kids-list');
    list.innerHTML = '';
    for (const k of state.kids) {
        const row = document.createElement('div');
        row.className = 'kid-row';
        const hearts = '♥'.repeat(Math.min(3, Math.round(k.affection / 20)));
        row.innerHTML = `<div><strong>${k.name}</strong><div class="kid-stage">${k.stage}</div></div>` +
                        `<div><span class="kid-heart">${hearts}</span></div>`;
        list.appendChild(row);
    }
}

export function toggleKidsPanel() {
    const panel = $('kids-panel');
    if (panel.style.display === 'flex') { panel.style.display = 'none'; return; }
    refreshKidsPanel();
    panel.style.display = 'flex';
}

export function closeKidsPanel() {
    $('kids-panel').style.display = 'none';
}
