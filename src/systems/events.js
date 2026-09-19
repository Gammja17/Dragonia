import { state } from '../core/state.js';
import { rand } from '../core/utils.js';
import { Item } from '../entities/Item.js';
import { burst } from '../entities/Particle.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';

// 밤 이벤트. 해 질 녘에 주사위를 굴려 그날 밤의 이벤트를 정하고, 새벽에 끝난다.
//  BLOOD_MOON: 적이 훨씬 많이 나오지만 경험치 1.5배. 하늘이 붉어진다 (render/lighting.js)
//  METEOR:     별똥별이 주변에 떨어져 골드를 남긴다
export const EVENT_NAMES = { BLOOD_MOON: '붉은 달', METEOR: '유성우' };
const DUSK = 0.8, DAWN = 0.25;

let meteorTimer = 0;
const falling = []; // 떨어지는 중인 별 { x, y, t }

export function eventName() { return state.event ? EVENT_NAMES[state.event] : null; }
export function enemyCapMult() { return state.event === 'BLOOD_MOON' ? 1.8 : 1; }
export function xpMult() { return state.event === 'BLOOD_MOON' ? 1.5 : 1; }

export function updateEvents(dt, prevDayTime) {
    const t = state.dayTime;
    if (prevDayTime < DUSK && t >= DUSK && !state.event) {
        const r = Math.random();
        if (r < 0.28) { state.event = 'BLOOD_MOON'; showToast('붉은 달이 떠오릅니다… 몬스터가 들끓지만 경험치가 1.5배!', '🌕'); }
        else if (r < 0.56) { state.event = 'METEOR'; showToast('유성우가 쏟아지는 밤입니다. 떨어진 별을 주워 보세요!', '🌠'); }
    }
    if (state.event && t >= DAWN && t < DUSK) {
        showToast(`${EVENT_NAMES[state.event]}의 밤이 지나갔습니다.`, '🌅');
        state.event = null;
    }

    if (state.event === 'METEOR') {
        meteorTimer -= dt;
        if (meteorTimer <= 0) {
            meteorTimer = rand(3, 7);
            const p = state.player;
            falling.push({ x: p.x + rand(-520, 520), y: p.y + rand(-320, 320), t: 0 });
        }
    }
    for (const m of falling) {
        m.t += dt;
        if (m.t >= 1) {
            spawnEffect('STAR', m.x, m.y, { size: 1.4 });
            burst(m.x, m.y, '#fff2b0', 0.9, 14);
            state.entities.items.push(new Item(m.x, m.y, 'GOLD', Math.round(rand(8, 22))));
        }
    }
    for (let i = falling.length - 1; i >= 0; i--) if (falling[i].t >= 1) falling.splice(i, 1);
}

/** 떨어지는 별의 꼬리 (월드 좌표계에서 호출) */
export function drawEvents(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const m of falling) {
        const k = m.t, hx = m.x + (1 - k) * 380, hy = m.y - (1 - k) * 640;
        const grad = ctx.createLinearGradient(hx + 60, hy - 100, hx, hy);
        grad.addColorStop(0, 'rgba(255,242,176,0)');
        grad.addColorStop(1, 'rgba(255,250,220,0.95)');
        ctx.strokeStyle = grad; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(hx + 60, hy - 100); ctx.lineTo(hx, hy); ctx.stroke();
    }
    ctx.restore();
}
