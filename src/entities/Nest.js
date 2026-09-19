import { Entity } from './Entity.js';
import { BabyDragon } from './BabyDragon.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist, rand } from '../core/utils.js';
import { registerKid } from '../systems/kids.js';
import { showToast } from '../ui/toast.js';

const TAU = Math.PI * 2;

export class Nest extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hasEgg = false;
        this.progress = 0; // 0~100, 플레이어가 근처에 있으면 빨리 찬다
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
        burst(this.x, this.y, () => `hsl(${Math.random() * 360},100%,60%)`, 1, 25);
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.fill();
        if (this.hasEgg) {
            ctx.shadowBlur = 15; ctx.shadowColor = '#fff';
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath(); ctx.ellipse(0, -4, 12, 16, 0, 0, TAU); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 45, -Math.PI / 2, -Math.PI / 2 + TAU * this.progress / 100); ctx.stroke();
        }
        ctx.restore();
    }
}
