// 스프라이트 시트 → { frames[anim][dir] = [ {img,sx,sy,sw,sh}, ... ] } 로 정규화.
// 시트마다 배치가 달라서 descriptor(type)별로 프레임 좌표를 계산한다.

export const DIRS = ['down', 'left', 'right', 'up'];

/**
 * desc.type:
 *  - 'perDir' : 방향별 이미지가 따로 있고, 각 이미지가 (rows=애니메이션, cols=프레임) 격자
 *      anims: { name: { row, count, start?, fps, loop } }
 *  - 'rows'   : 이미지 하나, 행 = 방향(desc.rows[dir]), 열 = 프레임
 *      anims: { name: { cols:[...], fps, loop } }
 * images: perDir → { down, left, right, up }, rows → { sheet }
 */
export function buildSheet(desc, images) {
    const { fw, fh } = desc;
    const frames = {};
    const anims = {};

    for (const [name, a] of Object.entries(desc.anims)) {
        frames[name] = {};
        let count;
        for (const dir of DIRS) {
            const list = [];
            if (desc.type === 'perDir') {
                const img = images[dir];
                const start = a.start || 0;
                for (let i = 0; i < a.count; i++) {
                    list.push({ img, sx: (start + i) * fw, sy: a.row * fh, sw: fw, sh: fh });
                }
            } else {
                const img = images.sheet;
                const row = desc.rows[dir];
                for (const col of a.cols) {
                    list.push({ img, sx: col * fw, sy: row * fh, sw: fw, sh: fh });
                }
            }
            frames[name][dir] = list;
            count = list.length;
        }
        anims[name] = { fps: a.fps || 8, loop: a.loop !== false, count };
    }

    return { frames, anims, fw, fh, scale: desc.scale || 1, anchor: desc.anchor || { x: 0.5, y: 1 }, flying: !!desc.flying };
}

/** 애니메이션 재생 상태. 엔티티마다 하나씩 */
export class Animator {
    constructor(sheet) {
        this.sheet = sheet;
        this.name = 'idle';
        this.t = 0;
        this.done = false;
    }
    /** 같은 애니메이션이면 유지, 다르면 처음부터 */
    play(name) {
        if (this.name === name) return;
        if (!this.sheet.anims[name]) return;
        this.name = name; this.t = 0; this.done = false;
    }
    /** 원샷 애니(loop:false)가 끝났으면 base 로 복귀. 아니면 base 를 재생 */
    playBase(base) {
        const a = this.sheet.anims[this.name];
        if (a && !a.loop && !this.done) return;
        this.play(base);
    }
    update(dt) {
        this.t += dt;
        const a = this.sheet.anims[this.name];
        if (a && !a.loop && this.t * a.fps >= a.count) this.done = true;
    }
    frame(dir) {
        const a = this.sheet.anims[this.name];
        const list = this.sheet.frames[this.name][dir];
        let i = Math.floor(this.t * a.fps);
        i = a.loop ? i % list.length : Math.min(i, list.length - 1);
        return list[i];
    }
}

/** anchor 기준점(발 위치)이 (x,y)에 오도록 그린다 */
export function drawFrame(ctx, sheet, f, x, y, scale = 1) {
    const s = sheet.scale * scale;
    const w = f.sw * s, h = f.sh * s;
    ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, x - w * sheet.anchor.x, y - h * sheet.anchor.y, w, h);
}
