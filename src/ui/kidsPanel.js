import { state } from '../core/state.js';
import { MAX_KIDS } from '../core/config.js';
import { renameKid, toggleKidMode } from '../systems/kids.js';

const STAGE_NAMES = { BABY: '아기', TEEN: '청소년 (전투 가능)', ADULT: '성체 (둥지 수호)' };

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
        const hearts = '♥'.repeat(Math.min(5, Math.round(k.affection / 20)));
        row.innerHTML = `<div><strong></strong><div class="kid-stage">${STAGE_NAMES[k.stage]}</div></div>` +
                        `<div class="kid-actions"><span class="kid-heart">${hearts}</span></div>`;
        row.querySelector('strong').textContent = k.name;
        const actions = row.querySelector('.kid-actions');
        const rename = document.createElement('button');
        rename.className = 'kid-btn'; rename.textContent = '이름';
        rename.onclick = () => { const n = prompt('아이의 새 이름 (12자까지)', k.name); if (n) renameKid(k, n); };
        actions.appendChild(rename);
        if (k.stage !== 'ADULT') {
            const mode = document.createElement('button');
            mode.className = 'kid-btn'; mode.textContent = k.mode === 'FOLLOW' ? '따라오는 중' : '둥지 지키는 중';
            mode.onclick = () => toggleKidMode(k);
            actions.appendChild(mode);
        }
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
