import { state } from '../core/state.js';
import { mouse } from '../core/input.js';
import { screenToWorld } from '../core/camera.js';
import { ELEMENTS } from '../data/elements.js';
import { isTouchDevice } from '../ui/touch.js';

// 마우스 조준 표시. 월드 좌표계 안에서 그린다 (main.js 의 render 가 호출).
// 커서가 적에게 붙었을 때는 그 적을 네 귀퉁이로 감싸 "여기를 맞힌다"를 분명히 보여 준다.

export function drawCrosshair(ctx) {
    const p = state.player;
    if (!p || state.isDialogueOpen) return;
    // 터치에는 커서가 없다. 대신 자동 조준이 붙잡은 적을 괄호로 감싸 "여기로 나간다"를 보여 준다
    if (!mouse.inside && !isTouchDevice()) return;

    const color = ELEMENTS[p.element].color;
    const { target } = p.aimAngle();
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;

    if (target) {
        // 붙잡은 적: 네 귀퉁이 괄호
        const r = 26 + (target.def && target.def.scale ? target.def.scale * 16 : 0);
        const cx = Math.round(target.x), cy = Math.round(target.y - 20);
        const arm = r * 0.45;
        ctx.globalAlpha = 0.95;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            ctx.beginPath();
            ctx.moveTo(cx + sx * r, cy + sy * r - sy * arm);
            ctx.lineTo(cx + sx * r, cy + sy * r);
            ctx.lineTo(cx + sx * r - sx * arm, cy + sy * r);
            ctx.stroke();
        }
    } else if (mouse.inside) {
        const c = screenToWorld(mouse.x, mouse.y);
        const cx = Math.round(c.x), cy = Math.round(c.y);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            ctx.beginPath();
            ctx.moveTo(cx + dx * 13, cy + dy * 13);
            ctx.lineTo(cx + dx * 19, cy + dy * 19);
            ctx.stroke();
        }
    }
    ctx.restore();
}
