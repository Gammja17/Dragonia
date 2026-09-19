export class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.remove = false;
    }

    /** 머리 위 작은 체력바. 다친 적만 보여준다. up: 발에서 위로 몇 px */
    drawHpBar(ctx, ratio, up, width = 34) {
        if (ratio >= 1 || ratio <= 0) return;
        const x = Math.round(this.x - width / 2), y = Math.round(this.y - up);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 1, y - 1, width + 2, 6);
        ctx.fillStyle = ratio > 0.5 ? '#7ddc5a' : ratio > 0.25 ? '#ffc93c' : '#ff5a4d';
        ctx.fillRect(x, y, width * ratio, 4);
    }

    drawShadow(ctx, r) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}
