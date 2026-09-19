import { Entity } from './Entity.js';
import { isOnScreen } from '../core/camera.js';
import { state } from '../core/state.js';
import { PROP_SPRITES, TILE_SCALE } from '../data/tiles.js';
import { getTileImage } from '../world/terrain.js';

const TAU = Math.PI * 2;

export class Prop extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // TREE | STUMP | ROCK | BUSH | FERN | HOUSE | FOUNTAIN | CAMPFIRE
        this.seed = Math.random();
        const variants = PROP_SPRITES[type];
        this.sprite = variants ? variants[Math.floor(this.seed * variants.length)] : null;
    }
    draw(ctx) {
        if (!isOnScreen(this, 300)) return; // 큰 나무(높이 288px)가 화면 아래에서 툭 튀어나오지 않게
        if (this.sprite) { this.drawSprite(ctx); return; }
        ctx.save();
        ctx.translate(this.x, this.y);
        const big = this.type === 'HOUSE';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, big ? 50 : 20, big ? 20 : 8, 0, 0, TAU);
        ctx.fill();

        switch (this.type) {
            case 'HOUSE':
                ctx.fillStyle = '#2c3e50'; ctx.fillRect(-30, -30, 60, 35);
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath(); ctx.moveTo(-35, -30); ctx.lineTo(0, -60); ctx.lineTo(35, -30); ctx.fill();
                ctx.fillStyle = '#f1c40f'; ctx.fillRect(-6, -15, 12, 16);
                break;
            case 'FOUNTAIN':
                ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 20, 0, 0, TAU); ctx.fill();
                ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 14, 0, 0, TAU); ctx.fill();
                break;
            case 'CAMPFIRE':
                ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, 5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(-10, 5); ctx.stroke();
                ctx.fillStyle = `rgba(231,76,60,${0.7 + Math.sin(state.gameTime * 10) * 0.3})`;
                ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-6, 0); ctx.lineTo(6, 0); ctx.fill();
                break;
        }
        ctx.restore();
    }

    /** 타일셋 소품. 그림자는 스프라이트에 포함돼 있다 */
    drawSprite(ctx) {
        const sp = this.sprite;
        const w = sp.sw * TILE_SCALE, h = sp.sh * TILE_SCALE;
        const left = this.x - w * sp.ax, top = this.y - h * sp.ay;
        // 플레이어가 나무 뒤에 가려지면 반투명하게
        const p = state.player;
        const hides = this.type === 'TREE' && p && p.y < this.y && p.y > top && Math.abs(p.x - this.x) < w * 0.45;
        ctx.imageSmoothingEnabled = false;
        if (hides) ctx.globalAlpha = 0.45;
        ctx.drawImage(getTileImage(sp.sheet), sp.sx, sp.sy, sp.sw, sp.sh, left, top, w, h);
        ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = true;
    }
}
