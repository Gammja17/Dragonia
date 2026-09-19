import { Entity } from './Entity.js';
import { BabyDragon } from './BabyDragon.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist, rand } from '../core/utils.js';
import { registerKid } from '../systems/kids.js';
import { showToast } from '../ui/toast.js';
import { drawIcon, drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';

const TAU = Math.PI * 2;

export class Nest extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hasEgg = false;
        this.progress = 0; // 0~100, 플레이어가 근처에 있으면 빨리 찬다
    }
    get light() {
        return this.hasEgg ? { r: 150, color: '#fff2c8', intensity: 0.8 } : null;
    }
    update(dt) {
        if (!this.hasEgg) return;
        const near = dist(this, state.player) < 120;
        this.progress += near ? dt * 18 : dt * 3;
        if (this.progress > 100) this.hatch();
    }
    hatch() {
        this.hasEgg = false;
        this.progress = 0;
        const baby = new BabyDragon(this.x + rand(-20, 20), this.y + rand(-20, 20));
        state.entities.babies.push(baby);
        registerKid(baby);
        showToast("아기 용이 태어났습니다!", "🐣");
        burst(this.x, this.y, () => `hsl(${Math.floor(Math.random() * 12) * 30},100%,60%)`, 1, 25); // 색 12가지(빛 스프라이트 캐시)
        spawnEffect('RING', this.x, this.y);
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        // 돌무더기 둥지 자체는 지형에 구워져 있다 (world/terrain.js). 여기선 알과 부화 진행도만
        if (!this.hasEgg) return;
        const wobble = this.progress > 80 ? Math.sin(state.gameTime * 25) * 2 : 0;
        drawGlow(ctx, this.x, this.y - 4, 40, '#fff2c8', 0.35 + this.progress / 250);
        drawIcon(ctx, 'EGG', this.x + wobble, this.y - 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(this.x, this.y, 50, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#ffd866'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(this.x, this.y, 50, -Math.PI / 2, -Math.PI / 2 + TAU * this.progress / 100); ctx.stroke();
        ctx.lineCap = 'butt';
    }
}
