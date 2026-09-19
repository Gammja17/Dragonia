// 픽셀아트 그리기 도구: 시트 일부 그리기, 피격용 흰색 실루엣, 빛 번짐 스프라이트, 코드로 찍은 작은 아이콘.

/** r: { sx, sy, sw, sh }. (x,y)는 기준점(ax, ay: 0~1) 위치 */
export function drawPixelSprite(ctx, img, r, x, y, { scale = 3, flip = false, ax = 0.5, ay = 1, angle = 0 } = {}) {
    const w = r.sw * scale, h = r.sh * scale;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (angle) ctx.rotate(angle);
    if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, -w * ax, -h * ay, w, h);
    ctx.restore();
    ctx.imageSmoothingEnabled = true;
}

const whiteCache = new WeakMap();
/** 같은 모양의 흰색 실루엣 시트 (피격 번쩍임용) */
export function whiteCopy(img) {
    if (whiteCache.has(img)) return whiteCache.get(img);
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    whiteCache.set(img, c);
    return c;
}

const glowCache = new Map();
/** 가운데가 밝고 가장자리로 사라지는 원형 빛. 색마다 한 번만 만든다 */
export function getGlow(color) {
    if (glowCache.has(color)) return glowCache.get(color);
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = color;
    g.fillRect(0, 0, S, S);
    // 색은 그대로 두고 알파만 원형으로 깎는다 (color 가 어떤 CSS 색이든 동작)
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.4, 'rgba(0,0,0,0.55)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, S, S);
    glowCache.set(color, c);
    return c;
}

export function drawGlow(ctx, x, y, radius, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(getGlow(color), x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
}

// ---- 코드로 찍은 아이콘 (맞는 무료 에셋이 없는 것들) ----
const ICONS = {
    MEAT: {
        palette: { o: '#3b1d1a', R: '#a8322d', r: '#d9574a', h: '#f39a86', W: '#f2ead8' },
        rows: [
            '...oooooo...',
            '..oRRRRRRo..',
            '.oRRrrrrRRo.',
            '.oRrrhhrrRo.',
            '.oRrhhrrrRo.',
            '.oRrrrrrrRo.',
            '.oRRrrrrRRo.',
            '..oRRRRRRoo.',
            '...ooooooWWo',
            '.......oWWWo',
            '........oWWo',
            '.........oo.',
        ],
    },
    EGG: {
        palette: { o: '#4a3f35', W: '#f4efe1', h: '#ffffff', s: '#cfc4a8' },
        rows: [
            '...oooo...',
            '..oWWWWo..',
            '.oWWhWWWo.',
            '.oWhhWWWo.',
            'oWWhWWWWWo',
            'oWWWWWsWWo',
            'oWWWWWWWWo',
            'oWsWWWWWso',
            'oWWWWWWsso',
            '.oWWWWsso.',
            '..osssso..',
            '...oooo...',
        ],
    },
    LOGS: {
        palette: { o: '#2a1a12', B: '#6b4226', b: '#8a5a34', e: '#c9a06a' },
        rows: [
            '..oo......oo..',
            '.obBo....oBbo.',
            '.oeBBo..oBBeo.',
            '..oBBBooBBBo..',
            '...oBBBBBBo...',
            '..oobBBBBboo..',
            '.oBBBooooBBBo.',
            'oeBBo....oBBeo',
            '.oo........oo.',
        ],
    },
};

const iconCache = {};
export function getIcon(name) {
    if (iconCache[name]) return iconCache[name];
    const { palette, rows } = ICONS[name];
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle = palette[ch];
        g.fillRect(x, y, 1, 1);
    }));
    iconCache[name] = c;
    return c;
}

export function drawIcon(ctx, name, x, y, scale = 3) {
    const c = getIcon(name);
    drawPixelSprite(ctx, c, { sx: 0, sy: 0, sw: c.width, sh: c.height }, x, y, { scale, ay: 0.5 });
}
