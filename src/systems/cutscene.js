import { state } from '../core/state.js';
import { cam, worldToScreen } from '../core/camera.js';
import { solidAt } from '../world/collision.js';

// 컷씬 연출.
//
// 사건이 터지면 주변이 그대로 있는 채로 대화창만 뜨던 것이, 적도 날아다니고
// 동료도 뛰어다녀 정신이 없었다. 컷씬이 걸리면:
//
//   · 위아래로 검은 띠가 내려온다 (레터박스)
//   · 화면이 어두워지고, 말하는 용과 나에게만 빛이 남는다
//   · 카메라가 둘 사이로 천천히 옮겨 가고 살짝 당겨진다
//   · HUD·미니맵·길잡이·알림이 숨는다
//   · 장면 제목이 화면 가운데에 한 번 떴다 사라진다
//
// 세계 자체는 대화창이 떠 있는 동안 main.js 가 이미 멈춰 둔다. 여기서는
// "어떻게 보이는가"만 맡는다.

const BAR = 0.11;          // 레터박스 띠 높이 (화면의 몇 할)
const STAGE = 168;         // 말하는 쪽이 내 곁으로 와서 서는 거리
const AIM = 0.42;          // 인물을 화면 위에서 몇 할 지점에 놓을까 (대화창 위)
const DIM = 0.55;          // 얼마나 어둡게
const BOOST = 1.18;        // 카메라를 얼마나 당길까
const EASE = 0.12;

export const scene = {
    on: false,
    bars: 0,               // 0 → 1 로 자라는 띠
    dim: 0,
    boost: 1,
    focus: null,           // 지금 말하는 쪽 (개체)
    title: '',
    titleT: 0,
    snap: true,            // 장면이 막 시작했으면 카메라를 바로 옮긴다
};

// 무대에 세우려고 옮긴 개체들. 끝나면 있던 자리로 돌려놓는다
const moved = [];

/**
 * 말하는 쪽이 지도 저 끝에 있으면 아무도 화면에 안 잡힌다.
 * 연극처럼, 내 곁으로 걸어와 선 셈 치고 옮겨 놓는다 (끝나면 제자리로).
 */
function stage(e) {
    if (!e || e === state.player) return;
    const p = state.player;
    if (Math.hypot(e.x - p.x, e.y - p.y) < STAGE * 1.6) return;   // 이미 곁에 있다
    if (!moved.some(m => m.e === e)) moved.push({ e, x: e.x, y: e.y, facing: e.facing });
    // 둘 다 화면에 들어오게 옆으로만 세운다. 원래 있던 쪽을 그대로 지킨다
    const side = e.x >= p.x ? 1 : -1;
    const spot = clearSpot(p.x + STAGE * side, p.y - 14);
    e.x = spot.x; e.y = spot.y;
    e.facing = side > 0 ? 'left' : 'right';     // 나를 마주 본다
    p.facing = side > 0 ? 'right' : 'left';
    e.vx = 0; e.vy = 0;
}

/** 무대 자리가 물·바위면 조금 비켜 세운다 */
function clearSpot(x, y) {
    for (let r = 0; r <= 180; r += 30) {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
            if (!solidAt(px, py, 18)) return { x: px, y: py };
        }
    }
    return { x, y };
}

/** 컷씬 시작 */
export function beginCutscene(title = '') {
    scene.on = true;
    scene.snap = true;
    scene.title = title || '';
    scene.titleT = title ? 2.6 : 0;
    document.body.classList.add('cutscene');
    const card = document.getElementById('scene-title');
    if (card) { card.textContent = scene.title; card.classList.toggle('show', !!title); }
}

/** 이번 대사를 말하는 쪽을 카메라가 본다 */
export function focusOn(entity) {
    stage(entity);
    scene.focus = entity || null;
}

/** 컷씬 끝 */
export function endCutscene() {
    for (const m of moved) { m.e.x = m.x; m.e.y = m.y; m.e.facing = m.facing; }
    moved.length = 0;
    scene.on = false;
    scene.focus = null;
    scene.titleT = 0;
    document.body.classList.remove('cutscene');
    const card = document.getElementById('scene-title');
    if (card) card.classList.remove('show');
}

export function inCutscene() { return scene.on; }

/** 카메라가 볼 자리. 컷씬이면 나와 상대의 가운데 */
export function cutsceneTarget() {
    if (!scene.on) return null;
    const p = state.player;
    const f = scene.focus && scene.focus !== p ? scene.focus : null;
    const x = f ? (p.x + f.x) / 2 : p.x;
    const y = f ? (p.y + f.y) / 2 : p.y;
    // 대화창이 아래를 덮으므로 인물을 화면 위쪽(AIM)에 놓는다.
    // 화면 한가운데(0.5)보다 위로 올리려면 카메라는 그만큼 아래를 봐야 한다
    return { x, y: y + cam.h * (0.5 - AIM) };
}

/** 매 프레임: 띠와 어둠이 스르르 들어오고 나간다 (대화창이 떠 있어도 돌아야 한다) */
export function updateCutscene(dt) {
    const want = scene.on ? 1 : 0;
    scene.bars += (want - scene.bars) * EASE;
    scene.dim += (want - scene.dim) * EASE;
    scene.boost += ((scene.on ? BOOST : 1) - scene.boost) * EASE;
    if (scene.bars < 0.002 && !scene.on) scene.bars = 0;
    if (scene.titleT > 0) {
        scene.titleT -= dt;
        if (scene.titleT <= 0) {
            const card = document.getElementById('scene-title');
            if (card) card.classList.remove('show');
        }
    }
}

let mask = null;
function maskCanvas(w, h) {
    if (!mask) mask = document.createElement('canvas');
    if (mask.width !== w || mask.height !== h) { mask.width = w; mask.height = h; }
    return mask;
}

/** 화면 좌표로 그린다 (render() 맨 끝, 배율 밖에서) */
export function drawCutscene(ctx, w, h) {
    if (scene.bars <= 0.004) return;

    // 1) 어둡게 깔고, 말하는 쪽과 나에게만 구멍을 뚫는다.
    //    구멍은 따로 그린 판에서 뚫어야 한다. 본 화면에 대고 destination-out 을 쓰면
    //    이미 그려 둔 세계가 통째로 지워진다.
    const dim = DIM * scene.dim;
    if (dim > 0.01) {
        const m = maskCanvas(w, h);
        const g2 = m.getContext('2d');
        g2.setTransform(1, 0, 0, 1, 0, 0);
        g2.clearRect(0, 0, w, h);
        g2.fillStyle = `rgba(6,5,12,${dim})`;
        g2.fillRect(0, 0, w, h);
        g2.globalCompositeOperation = 'destination-out';
        for (const e of [state.player, scene.focus]) {
            if (!e) continue;
            const sp = worldToScreen(e.x, e.y - 22);
            const r = 210 * cam.zoom * scene.dim;
            const grad = g2.createRadialGradient(sp.x, sp.y, r * 0.2, sp.x, sp.y, r);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.85)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            g2.fillStyle = grad;
            g2.fillRect(sp.x - r, sp.y - r, r * 2, r * 2);
        }
        g2.globalCompositeOperation = 'source-over';
        ctx.drawImage(m, 0, 0);
    }

    // 2) 말하는 쪽 머리 위에 작은 표시 (이름표를 감췄으니 대신)
    if (scene.focus && scene.dim > 0.4) {
        const sp = worldToScreen(scene.focus.x, scene.focus.y);
        const bob = Math.sin(performance.now() / 260) * 4;
        const ty = sp.y - 104 * cam.zoom + bob;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (scene.dim - 0.4) / 0.4);
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath();
        ctx.moveTo(sp.x, ty + 11);
        ctx.lineTo(sp.x - 9, ty - 4);
        ctx.lineTo(sp.x + 9, ty - 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // 3) 위아래 띠
    const bar = Math.round(h * BAR * scene.bars);
    if (bar > 0) {
        ctx.fillStyle = '#06050c';
        ctx.fillRect(0, 0, w, bar);
        ctx.fillRect(0, h - bar, w, bar);
        ctx.fillStyle = 'rgba(216,178,90,0.28)';
        ctx.fillRect(0, bar - 1, w, 1);
        ctx.fillRect(0, h - bar, w, 1);
    }
}
