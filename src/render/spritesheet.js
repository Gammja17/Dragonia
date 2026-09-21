// 스프라이트 시트 → { frames[anim][dir] = [ {img,sx,sy,sw,sh}, ... ] } 로 정규화.
// 시트마다 배치가 달라서 descriptor(type)별로 프레임 좌표를 계산한다.

export const DIRS = ['down', 'left', 'right', 'up'];

/**
 * desc.type:
 *  - 'perDir' : 방향별 이미지가 따로 있고, 각 이미지가 (rows=애니메이션, cols=프레임) 격자
 *      anims: { name: { row, count, start?, fps, loop } }
 *  - 'rows'   : 이미지 하나, 행 = 방향(desc.rows[dir]), 열 = 프레임
 *      anims: { name: { cols:[...], fps, loop } }
 *  - 'side'   : 이미지 하나, 행 = 애니메이션, 왼쪽 보는 그림만 있다. 오른쪽은 뒤집어 그리고 위/아래는 마지막 좌우를 따른다
 *      anims: { name: { row, count, fps, loop } }
 *  - 'static' : 한 칸짜리 그림 (desc.cols 열 격자에서 look 번째 칸). 역시 왼쪽을 본다. 움직임은 drawFrame 이 코드로 준다
 * images: perDir → { down, left, right, up }, rows/side/static → { sheet }
 */
export function buildSheet(desc, images, look = 0) {
    const { fw, fh } = desc;
    const frames = {};
    const anims = {};

    for (const [name, a] of Object.entries(desc.anims)) {
        frames[name] = {};
        let count;
        for (const dir of DIRS) {
            const list = [];
            if (desc.type === 'side' || desc.type === 'static') {
                if (dir === 'up' || dir === 'down') continue;   // Animator.frame 이 마지막 좌우 방향으로 대신한다
                const img = images.sheet, flip = dir === 'right';
                if (desc.type === 'static') {
                    const n = a.count || 1;
                    for (let i = 0; i < n; i++) list.push({ img, sx: (look % desc.cols) * fw, sy: Math.floor(look / desc.cols) * fh, sw: fw, sh: fh, flip });
                } else {
                    for (let i = 0; i < a.count; i++) list.push({ img, sx: i * fw, sy: a.row * fh, sw: fw, sh: fh, flip });
                }
            } else if (desc.type === 'perDir') {
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
            if (list.length) { frames[name][dir] = list; count = list.length; }
        }
        anims[name] = { fps: a.fps || 8, loop: a.loop !== false, count };
    }

    return { frames, anims, fw, fh, head: desc.head, box: desc.boxes && desc.boxes[look], procedural: desc.type === 'static', scale: desc.scale || 1, anchor: desc.anchor || { x: 0.5, y: 1 }, flying: !!desc.flying };
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
        if (this.sheet.frames[this.name][dir]) this.lastDir = dir;   // 좌우 그림만 있는 시트: 위/아래로 갈 땐 마지막 좌우를 유지
        const list = this.sheet.frames[this.name][dir] || this.sheet.frames[this.name][this.lastDir || 'left'];
        let i = Math.floor(this.t * a.fps);
        i = a.loop ? i % list.length : Math.min(i, list.length - 1);
        return list[i];
    }
}

/** 정면 대기 프레임을 캔버스에 꽉 차게 그린다 (HUD/대화창 초상화) */
export function drawPortrait(canvas, sheet) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (!sheet) return;
    const f = (sheet.frames.idle.down || sheet.frames.idle.left)[0];
    const k = Math.min(canvas.width / f.sw, canvas.height / f.sh) * 1.15;
    g.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, (canvas.width - f.sw * k) / 2, (canvas.height - f.sh * k) / 2, f.sw * k, f.sh * k);
}

// ---------- 실루엣(외곽선) ----------
// 용이 배경 픽셀에 묻히지 않도록, 스프라이트 뒤에 같은 모양을 한 가지 색으로 여러 번 어긋나게 깔아
// 테두리를 만든다. 색을 입힌 실루엣은 이미지마다 한 번만 만들어 두고 계속 쓴다.
const silCache = new WeakMap();
function silhouette(img, color) {
    let byColor = silCache.get(img);
    if (!byColor) silCache.set(img, byColor = new Map());
    let c = byColor.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';   // 그려진 픽셀만 남기고 전부 한 색으로
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    byColor.set(color, c);
    return c;
}

const OUTLINE_STEPS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

// 한 칸을 1x1 로 줄여 그리면 그 그림의 평균색이 한 픽셀에 담긴다. 테두리 색을 그 용이
// 실제로 띠는 색에서 뽑을 때 쓴다 (config 의 colors 는 외형 시트에는 안 먹으므로 믿을 수 없다).
// 외형 시트는 여러 용이 한 장을 나눠 쓰므로 반드시 '그 칸'만 떠야 저마다 제 색이 나온다.
const avgCache = new WeakMap();
export function averageColor(img, sx = 0, sy = 0, sw = img.width, sh = img.height) {
    let byRect = avgCache.get(img);
    if (!byRect) avgCache.set(img, byRect = new Map());
    const key = `${sx},${sy},${sw},${sh}`;
    let rgb = byRect.get(key);
    if (rgb) return rgb;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, sx, sy, sw, sh, 0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    const a = d[3] / 255 || 1;          // 투명한 여백이 섞여 있으니 알파로 되돌린다
    rgb = [Math.min(255, d[0] / a), Math.min(255, d[1] / a), Math.min(255, d[2] / a)];
    byRect.set(key, rgb);
    return rgb;
}

// ---------- 한 장짜리 그림에 생명 넣기 ----------
// 기본 외형(looks.png)은 용 한 마리에 그림이 딱 한 장이다. 넘길 프레임이 없으니
// 그리는 순간에 몸을 주물러서 움직임을 만든다. 전부 캔버스 변형이라 외곽선도 저절로 따라온다.
//
//   숨쉬기·통통 튀기   가만히 있어도 살아 있어 보이게
//   걸을 때 좌우 기울임  한 장짜리 그림이 "걷는 것처럼" 보이는 건 거의 이것 때문이다
//   덤빌 때 앞으로 숙임  공격에 무게가 실린다
//   맞으면 뒤로 젖혀짐   맞았다는 게 몸으로 보인다

const BANDS = 8;   // 성장 단계에 따라 몸을 주무를 때 쓰는 가로 띠 수

// head(머리 쪽) ~ body(꼬리 쪽) 사이를 부드럽게 오가는 띠별 배율.
// 세로는 전체 키가 변하지 않도록 평균으로 정규화한다 — 비율만 바뀌고 덩치는 stage.scale 이 정한다.
const bandCache = new Map();
function shapeBands(shape) {
    const key = `${shape.head}|${shape.body}`;
    let b = bandCache.get(key);
    if (b) return b;
    const k = [];
    for (let i = 0; i < BANDS; i++) {
        const t = i / (BANDS - 1);
        k.push(shape.head + (shape.body - shape.head) * (t * t * (3 - 2 * t)));   // 부드럽게: 띠 경계의 계단이 덜 보인다
    }
    const avg = k.reduce((sum, v) => sum + v, 0) / BANDS;
    b = k.map(v => [v, v / avg]);
    bandCache.set(key, b);
    return b;
}

// 가로 띠로 나눠 그린다. 띠마다 폭이 달라서 자리마다 몸통 굵기가 달라진다.
// (해츨링은 머리 쪽 띠가 넓고 꼬리 쪽이 좁다 — 새끼 짐승의 비율이 그렇다)
function drawBands(ctx, img, f, dx, dy, w, h, bands) {
    const sh = f.sh / BANDS, bandH = h / BANDS;
    let y = dy;
    for (let i = 0; i < BANDS; i++) {
        const [kx, ky] = bands[i];
        const bw = w * kx;
        // 1px 겹쳐 그려야 띠 사이가 실처럼 벌어지지 않는다
        ctx.drawImage(img, f.sx, f.sy + sh * i, f.sw, sh, dx + (w - bw) / 2, y, bw, bandH * ky + 1);
        y += bandH * ky;
    }
}

/**
 * anchor 기준점(발 위치)이 (x,y)에 오도록 그린다.
 * motion:  { t, moving, attacking, hurt, shape } — 한 장짜리(procedural) 시트는 이 값으로 움직임과 몸 비율을 만든다.
 *           hurt 0~1 (맞은 직후), shape { head, body, tempo } (성장 단계별 몸 비율. 없으면 원래 비율)
 * outline: { color, width } — 스프라이트 둘레에 두를 테두리 (배경과 섞여 보이지 않게)
 */
export function drawFrame(ctx, sheet, f, x, y, scale = 1, motion = null, outline = null) {
    const s = sheet.scale * scale;
    let w = f.sw * s, h = f.sh * s;
    let rot = 0, lunge = 0;
    const shape = motion && motion.shape;

    if (sheet.procedural && motion) {
        const t = motion.t * (shape ? shape.tempo : 1);   // 작은 몸은 빨리, 큰 몸은 느리게 숨 쉰다
        const breathe = Math.sin(t * 2.4) * 0.02;
        const hop = motion.moving ? Math.abs(Math.sin(t * 9)) : 0;
        y -= hop * 10 * scale;
        h *= 1 + breathe + hop * 0.05 + (motion.attacking ? 0.08 : 0);
        w *= 1 - breathe + (motion.attacking ? 0.06 : 0);
        rot += Math.sin(t * 4.5) * (motion.moving ? 0.055 : 0.014);   // 걸을 때 몸이 좌우로 흔들린다
        if (motion.attacking) { lunge += 7 * scale; rot -= 0.16; }    // 덤빌 때 앞으로 튀어나가며 숙인다
        if (motion.hurt > 0) { lunge -= 11 * scale * motion.hurt; rot += 0.3 * motion.hurt; }   // 맞으면 뒤로 젖혀진다
    }

    const dx = -w * sheet.anchor.x, dy = -h * sheet.anchor.y;
    ctx.save();
    // 픽셀아트를 키워 그릴 땐 보간을 끈다. 켜 두면 64px 그림을 2.5배로 늘리면서 죄다 뭉개졌다.
    // 반대로 줄여 그리는 시트(WESTERN 205px 등)는 켜 둬야 획이 듬성듬성 빠지지 않는다.
    // imageSmoothingEnabled 는 캔버스 상태라 아래 restore() 가 알아서 되돌린다.
    ctx.imageSmoothingEnabled = s < 1;
    ctx.translate(x, y);
    // 기울임·돌진은 뒤집기 다음에 건다. 그래야 오른쪽을 볼 때 저절로 반대로 적용된다
    // (원본 그림은 모두 왼쪽을 본다 — 그림 기준의 "앞"은 -x 쪽이다)
    if (f.flip) ctx.scale(-1, 1);
    if (rot) ctx.rotate(rot);          // 축은 발밑이라 몸이 발을 딛고 흔들린다
    if (lunge) ctx.translate(-lunge, 0);

    const bands = shape ? shapeBands(shape) : null;
    if (outline) {
        const sil = silhouette(f.img, outline.color);
        const r = outline.width;
        for (const [ox, oy] of OUTLINE_STEPS) {
            if (bands) drawBands(ctx, sil, f, dx + ox * r, dy + oy * r, w, h, bands);
            else ctx.drawImage(sil, f.sx, f.sy, f.sw, f.sh, dx + ox * r, dy + oy * r, w, h);
        }
    }
    if (bands) drawBands(ctx, f.img, f, dx, dy, w, h, bands);
    else ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, dx, dy, w, h);
    ctx.restore();
}
