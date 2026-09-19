// 키보드 입력. e.code 기준이라 한글 IME 상태에서도 WASD가 동작한다.
const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    Space: 'attack',
    KeyE: 'interact',
    KeyT: 'talk',
    KeyL: 'flirt',
    KeyK: 'kids',
    KeyJ: 'journal',
    KeyM: 'mute',
    KeyQ: 'skillQ', KeyF: 'skillF', KeyR: 'skillR',
    KeyB: 'skillbook',
    KeyX: 'ultimate',
    KeyH: 'help',
    Digit1: 'num1', Digit2: 'num2', Digit3: 'num3', Digit4: 'num4', Digit5: 'num5', Digit6: 'num6', Digit7: 'num7', Digit8: 'num8', Digit9: 'num9',
    Enter: 'confirm', NumpadEnter: 'confirm',
    KeyV: 'zoom',
    Escape: 'cancel',
};

const held = {};
const prev = {};
let virtualAxis = { dx: 0, dy: 0 };   // 터치 스틱

// 마우스: 화면 좌표와 이번 프레임의 클릭 여부. 월드 좌표는 camera 로 바꿔 쓴다 (entities/Dragon.js)
export const mouse = { x: 0, y: 0, clicked: false, inside: false };

export const input = {
    down(action) { return !!held[action]; },
    pressed(action) { return !!held[action] && !prev[action]; },
    /** 매 프레임 끝에 호출해 '이번 프레임에 눌림' 판정을 갱신 */
    endFrame() { for (const k in held) prev[k] = held[k]; mouse.clicked = false; },
    /** 터치 버튼이 키보드처럼 동작을 누르고 뗀다 */
    setVirtual(action, down) { held[action] = down; },
    setAxis(dx, dy) { virtualAxis = { dx, dy }; },
    /** 이동 벡터 (-1..1, -1..1) */
    axis() {
        const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        const dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
        if (!dx && !dy) return virtualAxis;
        return { dx, dy };
    },
};

export function initInput() {
    window.addEventListener('keydown', (e) => {
        const action = KEYMAP[e.code];
        if (!action) return;
        if (e.code === 'Space') e.preventDefault();
        if (e.target.tagName === 'INPUT') return; // 이름 입력 중엔 무시
        held[action] = true;
    });
    window.addEventListener('keyup', (e) => {
        const action = KEYMAP[e.code];
        if (action) held[action] = false;
    });
    window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true; });
    canvas.addEventListener('mouseleave', () => { mouse.inside = false; });
    canvas.addEventListener('mousedown', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.clicked = true; });
    canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; mouse.x = t.clientX; mouse.y = t.clientY; mouse.clicked = true; mouse.inside = false; }, { passive: true });
}
