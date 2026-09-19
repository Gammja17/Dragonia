import { Entity } from './Entity.js';
import { isOnScreen } from '../core/camera.js';
import { drawIcon, drawGlow } from '../render/pixel.js';

export class Item extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // 'MEAT' | 'EGG'
        this.t = 0;
    }
    update(dt) { this.t += dt * 3; }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        const bob = Math.sin(this.t) * 5;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y + 20, 14 - bob * 0.4, 5, 0, 0, Math.PI * 2); ctx.fill();
        drawGlow(ctx, this.x, this.y + bob, 30, '#fff4c2', 0.35 + Math.sin(this.t * 1.3) * 0.15); // 주울 수 있다는 표시
        drawIcon(ctx, this.type, this.x, this.y + bob);
    }
}
