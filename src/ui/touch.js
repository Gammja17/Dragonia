import { input } from '../core/input.js';

// 모바일(터치) 조작: 왼쪽 아래 가상 스틱 + 오른쪽 아래 버튼들. 터치 기기에서만 나타난다.
// 버튼은 키보드와 같은 동작 이름(core/input.js)을 누른 것처럼 처리한다.

const BUTTONS = [
    // [동작, 글자, 오른쪽에서(px), 아래에서(px), 크기]
    ['attack', '불', 28, 36, 92],
    ['sprint', '대시', 132, 28, 64],
    ['skillQ', 'Q', 40, 142, 58], ['skillF', 'F', 108, 118, 58], ['skillR', 'R', 172, 98, 58],
    ['interact', 'E', 206, 28, 58],
    ['talk', 'T', 274, 28, 58],
    ['ultimate', 'X', 236, 110, 52],
];
const TOP_BUTTONS = [['skillbook', '스킬'], ['journal', '일지'], ['kids', '가족'], ['zoom', '시점'], ['num1', '1'], ['num2', '2'], ['num3', '3']];

export function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }

export function initTouch() {
    if (!isTouchDevice()) return;
    document.body.classList.add('touch');
    const layer = document.createElement('div');
    layer.id = 'touch-layer';
    document.body.appendChild(layer);

    // ---- 가상 스틱 ----
    const base = document.createElement('div'), knob = document.createElement('div');
    base.id = 'stick-base'; knob.id = 'stick-knob';
    base.appendChild(knob);
    layer.appendChild(base);
    let stickId = null;
    const R = 56;
    const move = (t) => {
        const r = base.getBoundingClientRect();
        let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / R);
        dx = dx / len * k; dy = dy / len * k;
        knob.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
        input.setAxis(Math.abs(dx) > 0.25 ? dx : 0, Math.abs(dy) > 0.25 ? dy : 0);
    };
    base.addEventListener('touchstart', (e) => { e.preventDefault(); stickId = e.changedTouches[0].identifier; move(e.changedTouches[0]); }, { passive: false });
    base.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === stickId) move(t); }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; knob.style.transform = ''; input.setAxis(0, 0); } };
    base.addEventListener('touchend', end);
    base.addEventListener('touchcancel', end);

    // ---- 버튼 ----
    const bind = (el, action) => {
        el.addEventListener('touchstart', (e) => { e.preventDefault(); input.setVirtual(action, true); el.classList.add('down'); }, { passive: false });
        const up = (e) => { e.preventDefault(); input.setVirtual(action, false); el.classList.remove('down'); };
        el.addEventListener('touchend', up, { passive: false });
        el.addEventListener('touchcancel', up, { passive: false });
    };
    for (const [action, label, right, bottom, size] of BUTTONS) {
        const b = document.createElement('div');
        b.className = 'touch-btn';
        b.textContent = label;
        Object.assign(b.style, { right: right + 'px', bottom: bottom + 'px', width: size + 'px', height: size + 'px', lineHeight: size + 'px' });
        bind(b, action);
        layer.appendChild(b);
    }
    const top = document.createElement('div');
    top.id = 'touch-top';
    for (const [action, label] of TOP_BUTTONS) {
        const b = document.createElement('div');
        b.className = 'touch-chip';
        b.textContent = label;
        bind(b, action);
        top.appendChild(b);
    }
    layer.appendChild(top);
}
