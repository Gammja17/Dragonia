import { Entity } from './Entity.js';
import { isOnScreen, cam } from '../core/camera.js';
import { state } from '../core/state.js';
import { inCutscene } from '../systems/cutscene.js';
import { PROP_SPRITES, TILE_SCALE, TILE, TILE_SRC, WATERFALL_SHEET } from '../data/tiles.js';
import { FURNITURE, furnitureSheet } from '../data/furniture.js';
import { DUNGEONS } from '../data/dungeons.js';
import { getTileImage, activeBiome } from '../world/terrain.js';
import { BIOMES } from '../world/biomes.js';
import { drawIcon, drawGlow } from '../render/pixel.js';
import { getVfxImage, spawnEffect } from '../render/vfx.js';
import { Item } from './Item.js';
import { showToast } from '../ui/toast.js';
import { notify } from '../systems/quests.js';
import { grantRelic, randomRelic } from '../systems/relics.js';
import { giveFurniture } from '../systems/den.js';
import { play } from '../systems/audio.js';

const BERRY_REGROW = 100; // 초

/** 스스로 빛나는 살림살이 (화로·구슬) */
function furnitureLight(prop) {
    const f = FURNITURE[prop.fid];
    if (!f || !f.light) return null;
    return { r: 240 + Math.sin(state.gameTime * 9 + prop.seed * 7) * 16, color: f.light, dy: -28, emissive: true };
}

// 코드로 찍은 픽셀 아이콘으로 그리는 소품: [배율, 발에서 위로 올릴 px]
const ICON_PROPS = { CAVE: [8, 48], DEN_MOUTH: [8, 48], STAIRS_DOWN: [5, 24], STAIRS_UP: [5, 24], ARENA: [4, 26] };

export class Prop extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // TREE | STUMP | ROCK | BUSH | FERN | HOUSE | FOUNTAIN | CRATE | BARREL | SIGN | CAMPFIRE | WAYSTONE
        this.seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1; // 위치로 정해지는 고정 난수
        const variants = PROP_SPRITES[type];
        this.sprite = variants ? variants[Math.floor(this.seed * variants.length)] : null;
        // 숲 소품은 바이옴 색상판에 맞는 시트를 쓴다 (trees → trees2, trees3)
        const palette = (BIOMES[activeBiome()] || BIOMES.FOREST).palette;
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
            case 'WAYSTONE': return { r: 130, color: '#7fd4ff', intensity: this.awake ? 0.85 : 0.35, dy: -40 };
            case 'STAIRS_UP': return { r: 200, color: '#ffe9b0', intensity: 0.9, dy: -20, emissive: true };
            case 'CAVE': return { r: 170, color: '#c58aff', intensity: 0.6, dy: -34, emissive: true };
            case 'DEN_MOUTH': return { r: 190, color: '#ffc87a', intensity: 0.75, dy: -34, emissive: true };
            case 'FURNITURE': return furnitureLight(this);
            case 'PORTAL': return { r: 150, color: '#9fe3ff', intensity: 0.7, dy: -40, emissive: true };
            case 'WATERFALL': return { r: 260, color: '#bfe9ff', intensity: 0.45, dy: -160 };
            default: return null;
        }
    }
    /** 그루터기(type 'STUMP')에서 나뭇가지를 줍는다. 열매처럼 시간이 지나면 다시 생긴다 */
    gather() {
        this.ripeAt = state.gameTime + BERRY_REGROW;
        const n = Math.random() < 0.4 ? 2 : 1;
        state.den.twigs += n;
        play('pickup');
        showToast(`나뭇가지 +${n} (${state.den.twigs} / 8)`, '🪵');
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
        if (this.chestId != null) state.openedChests[this.chestId] = true;   // 굴의 상자는 한 판짜리라 기록하지 않는다
        const far = Math.hypot(this.x - 1200, this.y - 1200) / 1000;   // 마을에서 멀수록 두둑하다
        const gold = Math.round(20 + far * 25 + Math.random() * 20);
        const items = state.entities.items;
        items.push(new Item(this.x, this.y + 30, 'GOLD', gold));
        if (Math.random() < 0.6) items.push(new Item(this.x - 30, this.y + 20, 'MEAT'));
        for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) items.push(new Item(this.x - 50 - i * 24, this.y + 26, 'MAT', 'ORE'));
        if (Math.random() < 0.12) { items.push(new Item(this.x + 30, this.y + 20, 'EGG')); showToast('상자 안에 용의 알이 있습니다!', '🥚'); }
        spawnEffect('STAR', this.x, this.y - 20);
        play('pickup');
        if (Math.random() < 0.22) { const id = randomRelic(); if (id) grantRelic(id, this.x, this.y); }
        // 가끔 굴에 들여놓을 살림살이가 들어 있다 (systems/den.js)
        if (Math.random() < 0.3) {
            const pool = Object.keys(FURNITURE).filter(k => (FURNITURE[k].cost.gold || 0) <= 120);
            giveFurniture(pool[Math.floor(Math.random() * pool.length)]);
        }
        showToast('보물상자를 열었습니다!', '🎁');
        notify('chest');
    }
    /** 이동 석비가 깨어 있는가 (systems/travel.js) */
    get awake() { return this.stoneId ? state.waystones.includes(this.stoneId) : false; }

    draw(ctx) {
        if (!isOnScreen(this, 300)) return; // 큰 나무(높이 288px)가 화면 아래에서 툭 튀어나오지 않게
        if (this.type === 'WATERFALL') { this.drawWaterfall(ctx); return; }
        if (this.type === 'FURNITURE') { this.drawFurniture(ctx); return; }
        if (this.type === 'PORTAL') { this.drawPortal(ctx); return; }
        if (this.type === 'WAYSTONE') { this.drawWaystone(ctx); return; }
        if (this.type === 'CAVE') { this.drawCave(ctx); return; }
        if (ICON_PROPS[this.type]) { drawIcon(ctx, this.type, this.x, this.y - ICON_PROPS[this.type][1], ICON_PROPS[this.type][0]); return; }
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

    /**
     * 폭포. Gentle Forest 의 폭포 애니메이션 시트로 그린다.
     * 예전엔 사각형과 타원을 코드로 찍어 흉내 냈는데, 시트가 이미 있는데도 안 쓰고 있었다.
     *
     * 세 부분을 쌓는다: 맨 윗칸 → 떨어지는 물(두 행을 번갈아) → 바닥 물보라.
     * 물보라는 마지막 낙수 칸을 덮어야 물줄기가 허공에서 뚝 끊기지 않는다.
     */
    drawWaterfall(ctx) {
        const sheet = getTileImage('waterfall');
        if (!sheet) return;
        const W = WATERFALL_SHEET;
        const f = (Math.floor(state.gameTime * W.fps + this.seed * W.frames) % W.frames) * TILE_SRC;
        const cols = 3, rows = 7;
        const left = Math.round(this.x) - cols * TILE / 2;
        const top = Math.round(this.y) - rows * TILE;

        const put = (row, gx, gy, flip = false) => {
            const dx = left + gx * TILE, dy = top + gy * TILE;
            if (!flip) { ctx.drawImage(sheet, f, row * TILE_SRC, TILE_SRC, TILE_SRC, dx, dy, TILE, TILE); return; }
            ctx.save();
            ctx.translate(dx + TILE, dy); ctx.scale(-1, 1);
            ctx.drawImage(sheet, f, row * TILE_SRC, TILE_SRC, TILE_SRC, 0, 0, TILE, TILE);
            ctx.restore();
        };

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        // 뒤쪽 어두운 바위 틈. 없으면 폭포가 허공에 뜬 것처럼 보인다
        ctx.fillStyle = '#10202e';
        ctx.fillRect(left - 6, top - 10, cols * TILE + 12, rows * TILE - TILE);

        for (let gx = 0; gx < cols; gx++) {
            put(W.TOP, gx, 0);
            for (let gy = 1; gy < rows; gy++) put(W.FALL[(gy - 1) % 2], gx, gy);
        }
        for (let gx = 0; gx < cols; gx++) { put(W.SPLASH[0], gx, rows - 2); put(W.SPLASH[1], gx, rows - 1); }
        put(W.CAP[0], -1, rows - 2); put(W.CAP[1], -1, rows - 1);
        put(W.CAP[0], cols, rows - 2, true); put(W.CAP[1], cols, rows - 1, true);
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
    }

    /** 굴에 놓은 살림살이. assets/tiles/dungeon.png 에서 칸 하나를 떠 온다 */
    drawFurniture(ctx, alpha = 1) {
        const f = FURNITURE[this.fid];
        const sheet = getTileImage(furnitureSheet(f));
        if (!f || !sheet) return;
        const [sx, sy] = f.tile, [sw, sh] = f.span;
        const w = sw * TILE, h = sh * TILE;
        if (alpha !== 1) { ctx.save(); ctx.globalAlpha = alpha; }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, sx * TILE_SRC, sy * TILE_SRC, sw * TILE_SRC, sh * TILE_SRC,
                      Math.round(this.x - w / 2), Math.round(this.y - h), w, h);
        ctx.imageSmoothingEnabled = true;
        if (alpha !== 1) ctx.restore();
    }

    /** 다른 지도로 넘어가는 문. 어디로 가는지 이름을 붙여 둔다 */
    drawPortal(ctx) {
        const t = state.gameTime * 2 + this.seed * 6;
        const glow = 0.55 + Math.sin(t) * 0.18;
        drawGlow(ctx, this.x, this.y - 44, 52, '#9fe3ff', glow);
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        const k = 1 / cam.zoom;
        // 문틀 (월드 크기 그대로)
        ctx.fillStyle = 'rgba(12, 20, 34, 0.85)';
        ctx.fillRect(-34, -96, 68, 96);
        ctx.fillStyle = '#7fd4ff';
        ctx.fillRect(-36, -100, 72, 5);
        ctx.fillRect(-36, -100, 5, 100);
        ctx.fillRect(31, -100, 5, 100);
        if (inCutscene()) { ctx.restore(); return; }   // 컷씬에서는 안내 글자를 비운다
        // 이름표는 줌과 무관하게
        ctx.scale(k, k);           // 여기부터는 화면 픽셀 단위
        ctx.textAlign = 'center';
        ctx.font = '600 12px "Bookk Myungjo", serif';
        const label = this.portal ? this.portal.name : '';
        const w = Math.ceil(ctx.measureText(label).width) + 16;
        ctx.fillStyle = 'rgba(10, 9, 16, 0.85)';
        ctx.fillRect(-w / 2, -146, w, 19);
        ctx.fillStyle = '#9fe3ff';
        ctx.fillText(label, 0, -132);
        ctx.restore();
    }

    /**
     * 굴 입구. 잿빛 바위가 초록 바닥에 묻혀 안 보인다는 말이 많아서,
     * 밤낮 없이 안쪽에서 보랏빛이 새어 나오고 위에 이름표를 단다 (포탈과 같은 방식).
     */
    drawCave(ctx) {
        const t = state.gameTime * 1.6 + this.seed * 6;
        drawGlow(ctx, this.x, this.y - 30, 70 + Math.sin(t) * 6, '#c58aff', 0.42 + Math.sin(t) * 0.08);
        drawIcon(ctx, 'CAVE', this.x, this.y - 48, 8);
        // 어두운 입 안쪽에 불빛 한 점
        ctx.fillStyle = `rgba(210, 160, 255, ${0.55 + Math.sin(t * 2) * 0.2})`;
        ctx.fillRect(Math.round(this.x) - 3, Math.round(this.y) - 34, 6, 6);
        if (inCutscene()) return;
        const label = (DUNGEONS[this.caveId] || {}).name || '굴';
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        const k = 1 / cam.zoom;
        ctx.scale(k, k);
        ctx.textAlign = 'center';
        ctx.font = '600 12px "Bookk Myungjo", serif';
        const w = Math.ceil(ctx.measureText(label).width) + 16;
        ctx.fillStyle = 'rgba(10, 9, 16, 0.85)';
        ctx.fillRect(-w / 2, -126, w, 19);
        ctx.fillStyle = '#d9b8ff';
        ctx.fillText(label, 0, -112);
        ctx.restore();
    }

    /** 이동 석비: 깨우기 전엔 흐릿하고, 깨우면 룬이 푸르게 돈다 */
    drawWaystone(ctx) {
        const awake = this.awake;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 20);
        ctx.restore();
        if (awake) drawGlow(ctx, this.x, this.y - 46, 46 + Math.sin(state.gameTime * 2 + this.seed * 6) * 6, '#7fd4ff', 0.5);
        ctx.globalAlpha = awake ? 1 : 0.72;
        drawIcon(ctx, 'WAYSTONE', this.x, this.y - 42, 5);
        ctx.globalAlpha = 1;
    }

    /** 타일셋 소품. 그림자는 스프라이트에 포함돼 있다 */
    drawSprite(ctx) {
        const sp = this.sprite;
        const w = sp.sw * TILE_SCALE, h = sp.sh * TILE_SCALE;
        const left = this.x - w * sp.ax, top = this.y - h * sp.ay;
        // 플레이어·적·아이템·상자 등이 나무 뒤에 가려지면 반투명하게
        const hides = this.type === 'TREE' && (state.fadeTargets || []).some(e => e.y < this.y + 10 && e.y > top - 20 && Math.abs(e.x - this.x) < w * 0.5);
        ctx.imageSmoothingEnabled = false;
        if (hides) ctx.globalAlpha = 0.32;
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
