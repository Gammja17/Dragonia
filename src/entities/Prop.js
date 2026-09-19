import { Entity } from './Entity.js';
import { isOnScreen } from '../core/camera.js';
import { state } from '../core/state.js';
import { PROP_SPRITES, TILE_SCALE } from '../data/tiles.js';
import { getTileImage } from '../world/terrain.js';
import { BIOMES, getBiome } from '../world/biomes.js';
import { drawIcon } from '../render/pixel.js';
import { getVfxImage, spawnEffect } from '../render/vfx.js';
import { Item } from './Item.js';
import { showToast } from '../ui/toast.js';
import { notify } from '../systems/quests.js';

const BERRY_REGROW = 100; // 초

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
            case 'BERRY': return this.ripe ? { r: 70, color: '#ff7a9a', intensity: 0.4, dy: -20 } : null;
            case 'CHEST': return this.opened ? null : { r: 110, color: '#ffd84a', intensity: 0.7, dy: -16 };
            default: return null;
        }
    }
    /** 열매 덤불(type 'BERRY')은 따고 나면 BERRY_REGROW 초 뒤에 다시 열린다 */
    get ripe() { return state.gameTime >= (this.ripeAt || 0); }
    harvest() {
        this.ripeAt = state.gameTime + BERRY_REGROW;
        const p = state.player;
        p.hunger = Math.min(100, p.hunger + 30);
        p.hp = Math.min(p.maxHp, p.hp + 15);
        showToast('달콤한 열매를 먹었습니다. (허기 +30, 체력 +15)', '🍒');
    }

    /** 보물상자 열기 (type 'CHEST'). chestId 로 열린 상자를 기억한다 */
    open() {
        this.opened = true;
        this.sprite = PROP_SPRITES.CHEST_OPEN[0];
        state.openedChests[this.chestId] = true;
        const far = Math.hypot(this.x - 1200, this.y - 1200) / 1000;   // 마을에서 멀수록 두둑하다
        const gold = Math.round(20 + far * 25 + Math.random() * 20);
        const items = state.entities.items;
        items.push(new Item(this.x, this.y + 30, 'GOLD', gold));
        if (Math.random() < 0.6) items.push(new Item(this.x - 30, this.y + 20, 'MEAT'));
        if (Math.random() < 0.12) { items.push(new Item(this.x + 30, this.y + 20, 'EGG')); showToast('상자 안에 용의 알이 있습니다!', '🥚'); }
        spawnEffect('STAR', this.x, this.y - 20);
        showToast('보물상자를 열었습니다!', '🎁');
        notify('chest');
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
        if (this.type === 'BERRY' && this.ripe) {        // 익은 열매 알갱이
            for (const [bx, by] of [[-18, -52], [6, -62], [20, -40], [-6, -34], [-26, -30]]) {
                ctx.fillStyle = '#7a1230'; ctx.fillRect(Math.round(this.x + bx) - 1, Math.round(this.y + by) - 1, 8, 8);
                ctx.fillStyle = '#ff4d78'; ctx.fillRect(Math.round(this.x + bx), Math.round(this.y + by), 6, 6);
                ctx.fillStyle = '#ffc2d2'; ctx.fillRect(Math.round(this.x + bx) + 1, Math.round(this.y + by) + 1, 2, 2);
            }
        }
        ctx.imageSmoothingEnabled = true;
    }
}
