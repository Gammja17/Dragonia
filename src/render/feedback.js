import { state } from '../core/state.js';

// 타격감.
//
// 맞고 때릴 때 화면이 아무 반응을 하지 않으면, 숫자만 줄어드는 표 같아진다.
// 여기서 화면 전체가 하는 반응을 맡는다:
//
//   hitStop(t)   맞은 순간 세상이 아주 잠깐 멈춘다 (때린 맛의 팔 할이 이것이다)
//   flash(a, c)  화면이 한 번 번쩍한다 (내가 맞았을 때는 붉게)
//   drawFeedback 위험할 때 화면 가장자리가 붉게 맥박친다
//
// 개체 하나하나의 반짝임(hitFlash)·넉백은 각 entity 가 맡는다.

let stop = 0;          // 남은 멈춤 시간(실시간 초)
let flashA = 0;        // 번쩍임 세기
let flashColor = '255,90,80';

/** 맞은 순간 아주 잠깐 멈춘다. 0.04~0.12초면 충분하다 */
export function hitStop(t = 0.06) { stop = Math.max(stop, t); }

/** 화면이 한 번 번쩍한다 */
export function flash(a = 0.3, color = '255,90,80') {
    flashA = Math.max(flashA, a);
    flashColor = color;
}

/**
 * main.js 가 매 프레임 부른다. 멈춰 있는 동안에는 dt 를 거의 0 으로 만들어 돌려준다.
 * (완전히 0 으로 만들면 애니메이션이 얼어붙어 어색하다)
 */
export function applyHitStop(dt) {
    if (stop <= 0) return dt;
    stop -= dt;
    return dt * 0.12;
}

export function updateFeedback(dt) {
    flashA = Math.max(0, flashA - dt * 3.4);
}

/** 화면 좌표로 그린다 (render() 맨 끝, 배율 밖에서) */
export function drawFeedback(ctx, w, h) {
    const p = state.player;

    // 1) 위험할 때 가장자리가 붉게 맥박친다
    if (p && state.gameActive && p.hp > 0) {
        const danger = 1 - Math.min(1, p.hp / (p.maxHp * 0.4));
        if (danger > 0.02) {
            const pulse = 0.55 + Math.sin(state.gameTime * 6) * 0.45;
            const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
            g.addColorStop(0, 'rgba(180,20,20,0)');
            g.addColorStop(1, `rgba(190,18,18,${(0.72 * danger * pulse).toFixed(3)})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }
    }

    // 2) 맞은 순간의 번쩍임
    if (flashA > 0.004) {
        ctx.fillStyle = `rgba(${flashColor},${(flashA * 0.42).toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
    }
}
