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

// 무대에 올린 개체들. 끝나면 있던 자리로 돌려놓는다.
//   guest: 이 지도에 없던 용을 잠깐 불러온 경우 (끝나면 다시 내보낸다)
const cast = [];

/**
 * 무대에 세운다.
 *
 * 말하는 용이 지도 저 끝에 있거나 아예 다른 지도에 있으면 화면에 아무도 안 잡힌다.
 * 연극처럼 불러와 내 곁에 세우되, 툭 나타나면 어색하니 옆에서 걸어 들어오게 한다.
 * 이미 무대에 오른 용은 자리를 지키고, 말할 차례에만 반걸음 앞으로 나선다.
 */
function stage(e) {
    if (!e || e === state.player) return;
    const p = state.player;
    let m = cast.find(c => c.e === e);

    if (!m) {
        const here = state.entities.npcs.includes(e) || state.entities.bosses.includes(e);
        m = { e, x: e.x, y: e.y, facing: e.facing, guest: !here, slot: cast.length };
        cast.push(m);
        if (!here) state.entities.npcs.push(e);     // 이 지도에 없던 용을 잠깐 불러온다
    }

    // 자리: 나를 가운데 두고 좌우로 번갈아 선다
    const side = m.slot % 2 === 0 ? 1 : -1;
    const rank = Math.floor(m.slot / 2);
    const spot = clearSpot(p.x + side * (STAGE + rank * 92), p.y - 14 - rank * 26);
    m.to = spot;
    m.face = side > 0 ? 'left' : 'right';

    // 처음 오를 때는 화면 밖에서 걸어 들어온다
    if (!m.entered) {
        m.entered = true;
        e.x = spot.x + side * 260;
        e.y = spot.y + 30;
    }
    p.facing = side > 0 ? 'right' : 'left';
}

/** 무대에 오른 이들을 제자리로 걸린다. 말하는 쪽은 반걸음 앞으로 */
function walkCast(dt) {
    for (const m of cast) {
        const speaking = scene.focus === m.e;
        const tx = m.to.x, ty = m.to.y + (speaking ? 14 : 0);   // 말할 차례엔 앞으로 나선다
        const dx = tx - m.e.x, dy = ty - m.e.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
            const k = Math.min(1, (dt * 260) / d);
            m.e.x += dx * k;
            m.e.y += dy * k;
            m.e.moving = d > 24;
        } else {
            m.e.moving = false;
        }
        m.e.facing = m.face;
        m.e.vx = 0; m.e.vy = 0;
    }
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

/**
 * 이번 대사가 가리키는 것 (시설이든 용이든). 카메라가 나와 그것 사이를 보고, 그 자리에 빛이 떨어지고, 이름표가 뜬다.
 * target: { x, y } 가 있는 것이면 무엇이든. null 이면 거둔다
 */
export function pointAt(target, label = '') {
    // 용은 말하는 동안 자리를 옮기기도 하므로 좌표를 베끼지 않고 대상을 들고 있는다
    scene.poi = target ? { get x() { return target.x; }, get y() { return target.y; }, label } : null;
}

/** 컷씬 끝 */
export function endCutscene() {
    scene.poi = null;
    for (const m of cast) {
        m.e.x = m.x; m.e.y = m.y; m.e.facing = m.facing; m.e.moving = false;
        // 불러왔던 용은 다시 제 일과로 돌려보낸다
        if (m.guest) state.entities.npcs = state.entities.npcs.filter(n => n !== m.e);
    }
    cast.length = 0;
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
    const f = scene.poi || (scene.focus && scene.focus !== p ? scene.focus : null);
    const x = f ? (p.x + f.x) / 2 : p.x;
    const y = f ? (p.y + f.y) / 2 : p.y;
    // 대화창이 아래를 덮으므로 인물을 화면 위쪽(AIM)에 놓는다.
    // 화면 한가운데(0.5)보다 위로 올리려면 카메라는 그만큼 아래를 봐야 한다
    return { x, y: y + cam.h * (0.5 - AIM) };
}

/** 매 프레임: 띠와 어둠이 스르르 들어오고 나간다 (대화창이 떠 있어도 돌아야 한다) */
export function updateCutscene(dt) {
    if (scene.on) walkCast(dt);        // 세계가 멈춰 있어도 배우는 움직인다
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
        for (const e of [state.player, scene.focus, scene.poi]) {
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

    // 2-1) 가리키는 것: 천천히 뛰는 금빛 테와 이름표
    if (scene.poi && scene.dim > 0.4) {
        const sp = worldToScreen(scene.poi.x, scene.poi.y - 30);
        const beat = (Math.sin(performance.now() / 320) + 1) / 2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (scene.dim - 0.4) / 0.4);
        ctx.strokeStyle = `rgba(255,216,74,${0.55 + beat * 0.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 34 * cam.zoom, (74 + beat * 10) * cam.zoom, (30 + beat * 4) * cam.zoom, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (scene.poi.label) {
            ctx.font = `700 ${cam.zoom >= 1.5 ? 36 : 24}px "Mulmaru", sans-serif`;
            ctx.textAlign = 'center';
            const tw = ctx.measureText(scene.poi.label).width + 22;
            const ty = sp.y - 78 * cam.zoom;
            ctx.fillStyle = 'rgba(14,13,22,0.9)';
            ctx.fillRect(sp.x - tw / 2, ty - 17, tw, 26);
            ctx.strokeStyle = 'rgba(216,178,90,0.9)'; ctx.lineWidth = 1;
            ctx.strokeRect(sp.x - tw / 2 + 0.5, ty - 16.5, tw - 1, 25);
            ctx.fillStyle = '#ffd84a';
            ctx.fillText(scene.poi.label, sp.x, ty + 2);
        }
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
