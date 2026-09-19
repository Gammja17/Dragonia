import { Entity } from './Entity.js';
import { isOnScreen } from '../core/camera.js';
import { state } from '../core/state.js';
import { PROP_SPRITES, TILE_SCALE } from '../data/tiles.js';
import { getTileImage } from '../world/terrain.js';
import { BIOMES, getBiome } from '../world/biomes.js';
import { drawIcon } from '../render/pixel.js';
import { getVfxImage } from '../render/vfx.js';

export class Prop extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // TREE | STUMP | ROCK | BUSH | FERN | HOUSE | FOUNTAIN | CRATE | BARREL | SIGN | CAMPFIRE
        this.seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1; // 위치로 정해지는 고정 난수
        const variants = PROP_SPRITES[type];
        this.sprite = variants ? variants[Math.floor(this.seed * variants.length)] : null;
        // 숲 소품은 바이옴 색상판에 맞는 시트를 쓴다 (trees → trees2, trees3)
        const palette = BIOMES[getBiome(x, y)].palette;
        this.sheetKey = this.sprite && (this.sprite.sheet === 'trees' || this.sprite.sheet === 'props') && palette ? this.sprite.sheet + (palette + 1) : this.sprite && this.sprite.sheet;
    }
    /** 밤에 주변을 밝히는 빛 (render/lighting.js) */
    get light() {
        switch (this.type) {
            case 'CAMPFIRE': return { r: 340 + Math.sin(state.gameTime * 13 + this.seed * 9) * 22, color: '#ffab5c', dy: -30, emissive: true };
            case 'HOUSE': return { r: 210, color: '#ffd38a', intensity: 0.85, dy: -50 }; // 창문 불빛
            case 'FOUNTAIN': return { r: 170, color: '#9fd8ff', intensity: 0.5, dy: -20 };
            default: return null;
        }
    }
    draw(ctx) {
        if (!isOnScreen(this, 300)) return; // 큰 나무(높이 288px)가 화면 아래에서 툭 튀어나오지 않게
        if (this.sprite) { this.drawSprite(ctx); return; }
        // 모닥불: 장작(코드로 찍은 픽셀) + 불꽃 애니메이션
        drawIcon(ctx, 'LOGS', this.x, this.y, 3);
        const fire = getVfxImage('campfire');
        if (!fire) return;
        const f = Math.floor(state.gameTime * 24 + this.seed * 60) % 60;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(fire, (f % 10) * 64, Math.floor(f / 10) * 64, 64, 64, this.x - 48, this.y - 112, 96, 96);
        ctx.globalCompositeOperation = 'source-over';
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
        let { sx, sy } = sp;
        if (sp.frames) [sx, sy] = sp.frames[Math.floor(state.gameTime * sp.fps) % sp.frames.length];
        ctx.drawImage(getTileImage(this.sheetKey), sx, sy, sp.sw, sp.sh, Math.round(left), Math.round(top), w, h);
        ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = true;
    }
}
