import { Entity } from './Entity.js';
import { isOnScreen } from '../core/camera.js';
import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { spawnText } from '../render/vfx.js';
import { drawIcon, drawGlow } from '../render/pixel.js';

export class Item extends Entity {
    constructor(x, y, type, value = 0) {
        super(x, y);
        this.type = type; // 'MEAT' | 'EGG' | 'GOLD'
        this.value = value; // GOLD 의 액수
        this.t = 0;
    }
    update(dt) {
        this.t += dt * 3;
        if (this.type !== 'GOLD') return;
        // 골드는 가까이 가면 빨려 들어온다 (E 안 눌러도 됨)
        const p = state.player, d = dist(this, p);
        if (d < 40) {
            p.gold += this.value;
            spawnText(p.x, p.y - 90, `+${this.value}G`, '#ffd84a', 15);
            this.remove = true;
        } else if (d < 170) {
            this.x += ((p.x - this.x) / d) * 420 * dt;
            this.y += ((p.y - this.y) / d) * 420 * dt;
        }
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        const bob = Math.sin(this.t) * 5;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y + 20, 14 - bob * 0.4, 5, 0, 0, Math.PI * 2); ctx.fill();
        drawGlow(ctx, this.x, this.y + bob, 30, '#fff4c2', 0.35 + Math.sin(this.t * 1.3) * 0.15); // 주울 수 있다는 표시
        drawIcon(ctx, this.type === 'GOLD' ? 'COIN' : this.type, this.x, this.y + bob);
    }
}
