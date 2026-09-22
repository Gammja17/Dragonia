import { state } from '../core/state.js';
import { MAX_KIDS } from '../core/config.js';
import { renameKid, toggleKidMode } from '../systems/kids.js';
import { KID_PERSONALITIES } from '../data/npcTalk.js';
import { KID_JOBS } from '../data/family.js';

const STAGE_NAMES = { BABY: '아기', TEEN: '청소년 (전투 가능)', ADULT: '성체' };
// 다음 단계까지의 성장 (entities/BabyDragon.js 의 grow 문턱)
const GROW_NEXT = { BABY: [0, 70, '청소년까지'], TEEN: [70, 140, '성체까지'], ADULT: null };

const $ = (id) => document.getElementById(id);

export function initKidsPanel() {
    $('kids-max').textContent = MAX_KIDS;
    $('kids-close').addEventListener('click', closeKidsPanel);
}

export function refreshKidsPanel() {
    $('kids-count').textContent = state.kids.length;
    const list = $('kids-list');
    list.innerHTML = '';
    if (!state.kids.length) {
        const empty = document.createElement('div');
        empty.className = 'kids-empty';
        empty.textContent = state.partner
            ? '아직 아이가 없다. 짝에게 말을 걸어 [마음] → 아이 이야기를 꺼내 보자.'
            : '아직 아이가 없다. 마음이 통하는 용과 짝이 되면 둥지에 알을 품을 수 있다.';
        list.appendChild(empty);
        return;
    }
    for (const k of state.kids) {
        const row = document.createElement('div');
        row.className = 'kid-row';
        const n = Math.min(5, Math.round(k.affection / 20));
        const hearts = '♥'.repeat(n) + `<i>${'♥'.repeat(5 - n)}</i>`;
        const growth = k.entity ? k.entity.growth : 0;
        const next = GROW_NEXT[k.stage];
        const pct = next ? Math.max(0, Math.min(100, ((growth - next[0]) / (next[1] - next[0])) * 100)) : 100;
        const tags = [`<span class="kid-tag">${KID_PERSONALITIES[k.personality] || ''}</span>`];
        if (k.job) tags.push(`<span class="kid-tag job">${KID_JOBS[k.job].name}</span>`);
        if (k.stage !== 'ADULT') tags.push(`<span class="kid-tag">${k.mode === 'FOLLOW' ? '따라오는 중' : '둥지 지키는 중'}</span>`);
        if (k.scaredDay != null && state.day - k.scaredDay < 2) tags.push('<span class="kid-tag scared">겁먹음</span>');
        row.innerHTML = `<div><strong></strong><div class="kid-stage">${STAGE_NAMES[k.stage]}${next ? ` · ${next[2]} ${Math.round(pct)}%` : ' · 다 자랐다'}</div>` +
                        (next ? `<div class="kid-grow"><i style="width:${pct}%"></i></div>` : '') +
                        `<div class="kid-tags">${tags.join('')}</div></div>` +
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
