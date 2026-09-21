import { state } from '../core/state.js';

// F3 밸런스 오버레이.
//
// 수치를 손볼 때 "느낌"만으로는 안 된다. 지난 10초 동안 준/받은 피해,
// 적 수와 상태, 스폰 상황을 화면 왼쪽 아래에 띄운다. 개발용이라 평소엔 꺼져 있다.

let on = false;
const WINDOW = 10;                 // 초
const dealt = [];                  // [{ t, v }]
const taken = [];
let frames = 0, fpsT = 0, fps = 0;

export function toggleDebug() { on = !on; return on; }
export function debugOn() { return on; }

export function noteDealt(v) { if (on) dealt.push({ t: state.gameTime, v }); }
export function noteTaken(v) { if (on) taken.push({ t: state.gameTime, v }); }

function sum(list) {
    const cut = state.gameTime - WINDOW;
    while (list.length && list[0].t < cut) list.shift();
    return list.reduce((s, e) => s + e.v, 0);
}

export function updateDebug(realDt) {
    frames++; fpsT += realDt;
    if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
}

export function drawDebug(ctx, w, h) {
    if (!on || !state.player) return;
    const p = state.player, E = state.entities;
    const d = sum(dealt), t = sum(taken);
    const byState = {};
    for (const e of E.enemies) { const k = (e.def.move || '?') + ':' + (e.ai ? e.ai.s : '-'); byState[k] = (byState[k] || 0) + 1; }
    const lines = [
        `FPS ${fps}   지도 ${state.mapId}   ${Math.floor(state.dayTime * 24)}시`,
        `준 피해 ${Math.round(d)} (${(d / WINDOW).toFixed(1)}/s)   받은 피해 ${Math.round(t)} (${(t / WINDOW).toFixed(1)}/s)`,
        `HP ${Math.round(p.hp)}/${p.maxHp}   Lv ${p.level}   단계 ${p.stageIndex}   기세 ${Math.round(p.momentum || 0)}`,
        `적 ${E.enemies.length}   정예 ${E.enemies.filter(e => e.elite).length}   탄 ${E.bullets.length}   효과 ${E.effects.length}   입자 ${E.particles.length}`,
        ...Object.entries(byState).sort().map(([k, n]) => `  ${k} ×${n}`),
    ];
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    const lh = 15, pad = 8;
    const width = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2;
    const height = lines.length * lh + pad * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(10, h - height - 10, width, height);
    ctx.fillStyle = '#9fe08a';
    lines.forEach((l, i) => ctx.fillText(l, 10 + pad, h - height - 10 + pad + lh * (i + 1) - 4));
    ctx.restore();
}
