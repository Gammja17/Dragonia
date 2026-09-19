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
    KeyH: 'help',
    Digit1: 'num1', Digit2: 'num2', Digit3: 'num3', Digit4: 'num4', Digit5: 'num5', Digit6: 'num6', Digit7: 'num7', Digit8: 'num8', Digit9: 'num9',
    Enter: 'confirm', NumpadEnter: 'confirm',
    KeyV: 'zoom',
    Escape: 'cancel',
};

const held = {};
const prev = {};

export const input = {
    down(action) { return !!held[action]; },
    pressed(action) { return !!held[action] && !prev[action]; },
    /** 매 프레임 끝에 호출해 '이번 프레임에 눌림' 판정을 갱신 */
    endFrame() { for (const k in held) prev[k] = held[k]; },
    /** 이동 벡터 (-1..1, -1..1) */
    axis() {
        const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        const dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
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
}
