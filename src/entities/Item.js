import { Entity } from './Entity.js';
import { isOnScreen } from '../core/camera.js';

export class Item extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // 'MEAT' | 'EGG'
        this.t = 0;
    }
    update(dt) { this.t += dt * 3; }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.type === 'MEAT' ? '🍖' : '🥚', this.x, this.y + Math.sin(this.t) * 5);
    }
}
