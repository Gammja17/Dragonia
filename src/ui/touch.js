import { input } from '../core/input.js';

// 모바일(터치) 조작: 왼쪽 아래 가상 스틱 + 오른쪽 아래 버튼 무리. 터치 기기에서만 나타난다.
// 버튼은 키보드와 같은 동작 이름(core/input.js)을 누른 것처럼 처리한다.
//
// 버튼 자리는 px 가 아니라 한 단위 u(짧은 변의 11%, 38~60px)로 잡는다.
// 폰 세로 화면(390px)에서도 무리 전체가 스틱과 겹치지 않게 하려면 화면에 따라 줄어야 한다.

const BUTTONS = [
    // [동작, 글자, 오른쪽에서(u), 아래에서(u), 크기(u)]
    ['attack',   '불',   0.25, 0.45, 1.5],
    ['sprint',   '대시', 1.9,  0.25, 1.0],
    ['confirm',  '말',   3.05, 0.25, 1.0],   // 말 걸기 · 상자 · 줍기 · 둥지 (Space 와 같다)
    ['skillQ',   'Q',    0.45, 2.15, 0.85],
    ['skillF',   'F',    1.5,  1.55, 0.85],
    ['skillR',   'R',    2.6,  1.45, 0.85],
    ['ultimate', 'X',    1.75, 2.55, 0.8],
];
const TOP_BUTTONS = [
    ['skillbook', '스킬'], ['journal', '일지'], ['kids', '가족'], ['eat', '먹기'], ['fly', '비행'], ['cancel', '설정'],
    ['num1', '1'], ['num2', '2'], ['num3', '3'],
];

export function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }

export function initTouch() {
    if (!isTouchDevice()) return;
    document.body.classList.add('touch');
    const layer = document.createElement('div');
    layer.id = 'touch-layer';
    document.body.appendChild(layer);

    // ---- 가상 스틱 ----
    // 왼쪽 아래 어디를 짚든 그 자리에 스틱이 생긴다. 고정된 원을 눈으로 찾아 엄지를 얹는 건
    // 폰에서 늘 한 박자 늦었다. 손을 떼면 다시 제자리(왼쪽 아래)로 돌아가 어디를 짚을지 알려 준다.
    // 밀지 않고 툭 친 거라면 스틱이 아니라 '그 자리를 탭' 으로 넘긴다 — 용에게 말 걸기가 살아 있어야 한다
    const zone = document.createElement('div');
    zone.id = 'stick-zone';
    layer.appendChild(zone);
    const base = document.createElement('div'), knob = document.createElement('div');
    base.id = 'stick-base'; knob.id = 'stick-knob';
    base.appendChild(knob);
    layer.appendChild(base);
    let stickId = null, origin = null, startedAt = 0, moved = false;
    const place = (t) => {
        const size = base.offsetWidth;
        origin = { x: t.clientX, y: t.clientY };
        base.style.left = `${t.clientX - size / 2}px`;
        base.style.top = `${t.clientY - size / 2}px`;
        base.style.right = base.style.bottom = 'auto';
        base.classList.add('on');
    };
    const rest = () => {
        base.classList.remove('on');
        base.style.left = base.style.top = base.style.right = base.style.bottom = '';
        knob.style.transform = '';
        input.setAxis(0, 0);
    };
    const move = (t) => {
        const R = base.offsetWidth * 0.38;
        let dx = t.clientX - origin.x, dy = t.clientY - origin.y;
        const len = Math.hypot(dx, dy) || 1;
        if (len > 10) moved = true;
        const k = Math.min(1, len / R);
        dx = dx / len * k; dy = dy / len * k;
        knob.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
        input.setAxis(Math.abs(dx) > 0.2 ? dx : 0, Math.abs(dy) > 0.2 ? dy : 0);
    };
    zone.addEventListener('touchstart', (e) => {
        if (stickId !== null) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        stickId = t.identifier; startedAt = performance.now(); moved = false;
        place(t); move(t);
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === stickId) move(t); }, { passive: false });
    const end = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier !== stickId) continue;
            stickId = null;
            rest();
            if (!moved && performance.now() - startedAt < 250) input.tapAt(t.clientX, t.clientY);
        }
    };
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);

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
        b.style.right = `calc(10px + ${right} * var(--u))`;
        b.style.bottom = `calc(10px + ${bottom} * var(--u))`;
        b.style.width = b.style.height = b.style.lineHeight = `calc(${size} * var(--u))`;
        if (size >= 1.4) b.classList.add('big');
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
