export class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.remove = false;
    }

    drawShadow(ctx, r) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}
