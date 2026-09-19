import { state } from '../core/state.js';
import { rand } from '../core/utils.js';
import { getBiome } from '../world/biomes.js';
import { showToast } from '../ui/toast.js';

// 날씨: CLEAR | RAIN | STORM. state.weather = { type, timer, intensity(0~1, 부드럽게 변함), flash }
const NAMES = { CLEAR: '맑음', RAIN: '비', STORM: '폭풍' };
const TARGET = { CLEAR: 0, RAIN: 0.6, STORM: 1 };

export function weatherName() { return NAMES[state.weather.type]; }

/** 비가 오면 화염은 약해지고 번개는 강해진다 */
export function weatherDamageMult(element) {
    if (state.weather.type === 'CLEAR') return 1;
    if (element === 'FIRE') return 0.8;
    if (element === 'THUNDER') return 1.25;
    return 1;
}

export function updateWeather(dt) {
    const w = state.weather;
    w.timer -= dt;
    if (w.timer <= 0) {
        // 밀림은 비가 잦다
        const rainy = getBiome(state.player.x, state.player.y) === 'JUNGLE' ? 0.7 : 0.4;
        const r = Math.random();
        const next = w.type !== 'CLEAR' ? 'CLEAR' : r < rainy * 0.3 ? 'STORM' : r < rainy ? 'RAIN' : 'CLEAR';
        if (next !== w.type) {
            w.type = next;
            if (next === 'RAIN') showToast('비가 내리기 시작합니다. (화염 ↓ 번개 ↑)', '🌧️');
            if (next === 'STORM') showToast('폭풍이 몰려옵니다! (화염 ↓ 번개 ↑)', '⛈️');
        }
        w.timer = next === 'CLEAR' ? rand(70, 130) : rand(40, 70);
    }
    w.intensity += (TARGET[w.type] - w.intensity) * Math.min(1, dt * 0.5);
    if (w.flash > 0) w.flash -= dt * 2.5;
    if (w.type === 'STORM' && Math.random() < dt * 0.18) w.flash = 1;
}

/** 조명 위에 그린다 (화면 좌표계) */
export function drawWeather(ctx, cam) {
    const w = state.weather;
    if (w.intensity > 0.02) {
        const n = Math.floor(160 * w.intensity);
        const t = state.gameTime;
        ctx.save();
        ctx.strokeStyle = 'rgba(190,215,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            // 빗줄기마다 고정된 난수로 위치를 정하고, 시간에 따라 아래로 흐르게 한다 (카메라가 움직이면 같이 밀린다)
            const seed = i * 9973;
            const speed = 900 + (seed % 400);
            const x = (((seed * 7 % 2000) - cam.x * 1.0 - t * 160) % cam.w + cam.w) % cam.w;
            const y = (((seed * 13 % 2000) - cam.y + t * speed) % cam.h + cam.h) % cam.h;
            ctx.moveTo(x, y);
            ctx.lineTo(x - 5, y + 26);
        }
        ctx.stroke();
        ctx.restore();
    }
    if (w.flash > 0) {
        ctx.fillStyle = `rgba(235,240,255,${Math.max(0, w.flash) * 0.45})`;
        ctx.fillRect(0, 0, cam.w, cam.h);
    }
}
