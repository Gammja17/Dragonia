import { state } from '../core/state.js';
import { FURNITURE, furnitureSheet } from '../data/furniture.js';
import { MY_DEN } from '../data/dens.js';
import { owned, ownedList, craft, canAfford, costText, cozyOf, placed, pickUp } from '../systems/den.js';
import { play } from '../systems/audio.js';
import { showToast } from '../ui/toast.js';

// 굴 꾸미기 판. [E] 로 열고, 줄을 누르면 그 살림살이를 들고 놓는 자리로 간다.
//
//  · [가진 것]  놓을 수 있는 것들. 누르면 들고 나간다
//  · [엮는다]   골드와 소재로 새로 만든다
//  · [놓아 둔 것] 치워서 되돌린다

const $ = (id) => document.getElementById(id);
let tab = 'have';

export function initDenPanel() {
    $('den-close').addEventListener('click', closeDecorPanel);
    for (const b of document.querySelectorAll('#den-tabs .journal-tab')) {
        b.addEventListener('click', () => { tab = b.dataset.tab; play('ui'); render(); });
    }
}

export function isDecorPanelOpen() { return $('den-panel').style.display === 'flex'; }

export function openDecorPanel() {
    if (state.mapId !== MY_DEN) return;
    render();
    $('den-panel').style.display = 'flex';
}

export function closeDecorPanel() { $('den-panel').style.display = 'none'; }

export function toggleDecorPanel() {
    if (isDecorPanelOpen()) closeDecorPanel(); else openDecorPanel();
}

/** 하나를 들고 놓는 자리로 간다 (판은 닫힌다) */
function hold(id) {
    state.holding = id;
    closeDecorPanel();
    showToast('놓을 자리를 고르고 왼쪽 클릭. 오른쪽 클릭이면 그만둔다.', '🪑');
}

function tile(id, extra = '') {
    const f = FURNITURE[id];
    const b = document.createElement('button');
    b.className = 'den-item';
    b.innerHTML = '<canvas class="den-thumb" width="48" height="48"></canvas>' +
                  '<span class="den-info"><b></b><i></i><em></em></span>';
    b.querySelector('b').textContent = f.name;
    b.querySelector('i').textContent = `아늑함 +${f.cozy}${f.wall ? ' · 벽에 건다' : ''}${f.light ? ' · 빛난다' : ''}`;
    b.querySelector('em').textContent = extra || f.note;
    drawThumb(b.querySelector('canvas'), id);
    return b;
}

/** 목록에 쓸 작은 그림. 가구마다 시트가 다르다 (data/furniture.js 의 sheet) */
function drawThumb(canvas, id) {
    const f = FURNITURE[id];
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 48, 48);
    const img = new Image();
    img.onload = () => {
        g.imageSmoothingEnabled = false;
        const [sw, sh] = f.span;
        const k = Math.min(48 / (sw * 16), 48 / (sh * 16));
        const w = sw * 16 * k, h = sh * 16 * k;
        g.drawImage(img, f.tile[0] * 16, f.tile[1] * 16, sw * 16, sh * 16, (48 - w) / 2, (48 - h) / 2, w, h);
    };
    img.src = `assets/tiles/${furnitureSheet(f)}.png`;
}

function render() {
    for (const b of document.querySelectorAll('#den-tabs .journal-tab')) b.classList.toggle('on', b.dataset.tab === tab);
    const cozy = cozyOf(MY_DEN);
    $('den-cozy').textContent = `아늑함 ${cozy.score} · ${cozy.name}`;
    $('den-cozy-note').textContent = cozy.note;

    const body = $('den-body');
    body.innerHTML = '';

    if (tab === 'have') {
        const mine = ownedList();
        if (!mine.length) {
            body.innerHTML = '<div class="q-empty">아직 가진 살림살이가 없다. [엮는다] 에서 만들어 보자.</div>';
            return;
        }
        for (const id of mine) {
            const b = tile(id, `${FURNITURE[id].note} (가진 것 ${owned(id)}개)`);
            b.addEventListener('click', () => { play('ui'); hold(id); });
            body.appendChild(b);
        }
        return;
    }

    if (tab === 'craft') {
        for (const id of Object.keys(FURNITURE)) {
            const ok = canAfford(id);
            const b = tile(id, costText(id));
            b.classList.toggle('poor', !ok);
            b.addEventListener('click', () => {
                if (!craft(id)) { showToast('재료나 골드가 모자랍니다.', '🪵'); return; }
                render();
            });
            body.appendChild(b);
        }
        return;
    }

    const list = placed();
    if (!list.length) {
        body.innerHTML = '<div class="q-empty">굴 안이 아직 휑하다.</div>';
        return;
    }
    list.forEach((d, i) => {
        const b = tile(d.id, '누르면 치워서 되돌린다');
        b.addEventListener('click', () => { pickUp(i); showToast(`${FURNITURE[d.id].name}을(를) 치웠다.`, '🧹'); render(); });
        body.appendChild(b);
    });
}

export { render as refreshDenPanel };
