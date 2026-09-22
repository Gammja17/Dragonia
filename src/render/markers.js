import { state } from '../core/state.js';
import { cam } from '../core/camera.js';
import { crisp } from './overlay.js';
import { objectiveTarget } from '../systems/objectives.js';
import { inCutscene } from '../systems/cutscene.js';

// 화면 위의 길잡이 표시. 글로만 "아무개를 지켜라" 하고 말면 어디 있는지 몰라 헤맨다.
//
//   습격의 목표   화면 안이면 머리 위에 튀는 화살표와 이름표, 화면 밖이면 가장자리에 그쪽을 가리키는 화살표
//   남은 사냥꾼   셋 이하로 줄면 어디 숨었는지 작은 붉은 표시 (마지막 하나를 찾아 헤매던 것)
//
// 또렷한 층(render/overlay.js)에 세계 좌표로 그린다. render() 가 세계를 다 그린 뒤 부른다.

const EDGE = 44;   // 가장자리 화살표가 화면 끝에서 이만큼 안쪽에 선다 (화면 px)

function chevron(g, x, y, size, color, down = true) {
    g.beginPath();
    if (down) { g.moveTo(x - size, y - size); g.lineTo(x, y); g.lineTo(x + size, y - size); }
    else { g.moveTo(x - size, y + size); g.lineTo(x, y); g.lineTo(x + size, y + size); }
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineJoin = 'round'; g.stroke();
    g.lineWidth = 2.5; g.strokeStyle = color; g.stroke();
}

function label(g, x, y, text, color) {
    g.font = '600 12px "Noto Sans KR", sans-serif';
    g.textAlign = 'center';
    const w = Math.ceil(g.measureText(text).width) + 16;
    g.fillStyle = 'rgba(10, 9, 16, 0.86)';
    g.fillRect(x - w / 2, y - 14, w, 19);
    g.strokeStyle = color; g.lineWidth = 1; g.globalAlpha = 0.7;
    g.strokeRect(x - w / 2 + 0.5, y - 13.5, w - 1, 18);
    g.globalAlpha = 1;
    g.fillStyle = color;
    g.fillText(text, x, y);
}

/** 월드 좌표의 한 점을 표시한다. 화면 밖이면 가장자리 화살표 */
function mark(g, t, tick) {
    const k = 1 / cam.zoom;
    const inside = t.x > cam.x + 30 && t.x < cam.x + cam.w - 30 && t.y > cam.y + 30 && t.y < cam.y + cam.h - 30;
    g.save();
    if (inside) {
        const bob = Math.sin(tick * 5) * 5;
        g.translate(Math.round(t.x), Math.round(t.y) + bob);
        g.scale(k, k);
        chevron(g, 0, -6, 9, t.color, true);
        if (t.label) label(g, 0, -30, t.label, t.color);
    } else {
        // 화면 가운데에서 목표로 가는 선이 화면 테두리와 만나는 곳
        const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        const dx = t.x - cx, dy = t.y - cy;
        const e = EDGE * k;
        const hx = cam.w / 2 - e, hy = cam.h / 2 - e;
        const s = Math.min(hx / Math.abs(dx || 1e-6), hy / Math.abs(dy || 1e-6));
        const ex = cx + dx * s, ey = cy + dy * s;
        const a = Math.atan2(dy, dx);
        g.translate(Math.round(ex), Math.round(ey));
        g.scale(k, k);
        g.save();
        g.rotate(a);
        g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -10); g.lineTo(-3, 0); g.lineTo(-8, 10); g.closePath();
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fill();
        g.fillStyle = t.color; g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -8); g.lineTo(-2, 0); g.lineTo(-6, 8); g.closePath(); g.fill();
        g.restore();
        if (t.label) {
            const dist = Math.round(Math.hypot(dx, dy) / 48);   // 걸음(타일)으로
            label(g, 0, dy > 0 ? -22 : 30, `${t.label} · ${dist}걸음`, t.color);
        }
    }
    g.restore();
}

/** render() 가 세계를 다 그린 뒤 부른다 (세계 좌표 변환이 걸린 채로) */
export function drawMarkers(ctx) {
    if (!state.gameActive || !state.player || inCutscene() || state.prologue) return;
    const g = crisp(ctx);
    const tick = state.gameTime;
    const t = objectiveTarget();
    if (t) mark(g, t, tick);
    // 남은 사냥꾼이 몇 안 되면 어디 있는지 알려 준다
    if (state.raid.active) {
        const left = state.entities.humans.filter(h => !h.remove);
        if (left.length > 0 && left.length <= 3) for (const h of left) if (!t || h !== t) mark(g, { x: h.x, y: h.y - 56, color: '#ff8a7a', label: left.length === 1 ? '마지막 사냥꾼' : '' }, tick);
    }
}
