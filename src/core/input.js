// 키보드 입력. e.code 기준이라 한글 IME 상태에서도 WASD가 동작한다.
const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    Space: 'confirm',      // 말 걸기 · 대화창 넘기기 (공격은 마우스 왼쪽 버튼)
    KeyE: 'interact',
    KeyC: 'eat',           // 고기 먹기. 상호작용과 섞이면 상자를 열려다 고기를 먹는다
    KeyT: 'talk',
    KeyL: 'flirt',
    KeyJ: 'journal',       // 일지 (퀘스트)
    KeyM: 'worldmap',      // 지도
    KeyK: 'skillbook',     // 스킬
    KeyI: 'inventory',     // 소지품
    KeyG: 'growthTab',     // 성장
    KeyP: 'kids',          // 가족
    KeyO: 'mute',          // 소리
    KeyQ: 'skillQ', KeyF: 'skillF', KeyR: 'skillR',
    KeyB: 'skillbook',     // K 와 같다 (손에 익은 사람용)
    KeyX: 'ultimate',
    KeyH: 'help',
    Digit1: 'num1', Digit2: 'num2', Digit3: 'num3', Digit4: 'num4', Digit5: 'num5', Digit6: 'num6', Digit7: 'num7', Digit8: 'num8', Digit9: 'num9',
    Enter: 'confirm', NumpadEnter: 'confirm',
    KeyV: 'zoom',
    F3: 'debug',           // 밸런스 오버레이 (render/debugOverlay.js)
    Escape: 'cancel',
};

const held = {};
const prev = {};
let virtualAxis = { dx: 0, dy: 0 };   // 터치 스틱

// 마우스: 화면 좌표, 이번 프레임의 클릭 여부, 버튼을 누르고 있는지. 월드 좌표는 camera 로 바꿔 쓴다 (entities/Dragon.js)
//  inside  진짜 마우스를 쓰는 중인가 (터치로 누르면 false). 조준 방식을 여기서 가른다
//  down    왼쪽 버튼을 누르고 있다 → 브레스 연사
//  clicked 이번 프레임에 눌렀다 (터치 탭 포함)
//  right   이번 프레임에 오른쪽 버튼을 눌렀다
export const mouse = { x: 0, y: 0, clicked: false, down: false, right: false, inside: false, wheel: 0 };

export const input = {
    down(action) { return !!held[action]; },
    pressed(action) { return !!held[action] && !prev[action]; },
    /** 매 프레임 끝에 호출해 '이번 프레임에 눌림' 판정을 갱신 */
    endFrame() { for (const k in held) prev[k] = held[k]; mouse.clicked = false; mouse.right = false; mouse.wheel = 0; },
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
    canvas.addEventListener('mousedown', (e) => {
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true;
        if (e.button === 0) { mouse.clicked = true; mouse.down = true; }
        if (e.button === 2) mouse.right = true;
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());   // 오른쪽 버튼을 게임에 쓴다
    // 휠: 위로 굴리면 확대, 아래로 굴리면 축소 (main.js 가 읽어 카메라에 넘긴다)
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); mouse.wheel += e.deltaY < 0 ? 1 : -1; }, { passive: false });
    // 터치는 inside 를 false 로 둔다. 조준은 자동으로, 공격은 화면 버튼으로 한다 (ui/touch.js)
    canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; mouse.x = t.clientX; mouse.y = t.clientY; mouse.clicked = true; mouse.inside = false; }, { passive: true });
}
