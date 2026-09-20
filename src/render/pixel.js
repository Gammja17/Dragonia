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
    COIN: {
        palette: { o: '#5a3a10', G: '#f2c230', g: '#c8921a', h: '#fff2a8' },
        rows: [
            '..oooo..',
            '.oGGGGo.',
            'oGhGGgGo',
            'oGhGGgGo',
            'oGhGGgGo',
            'oGGGGgGo',
            '.oGgggo.',
            '..oooo..',
        ],
    },
    // ---- 머리 장신구 (용마다 개성을 주는 작은 표식) ----
    CROWN:  { palette: { o: '#5a3a10', G: '#f2c230', g: '#c8921a', r: '#e0453a' }, rows: ['o.o.o.o', 'GoGoGoG', 'GGrGrGG', 'gGGGGGg', '.ooooo.'] },
    PLUME:  { palette: { o: '#5a1210', R: '#e0453a', r: '#ff8a70' }, rows: ['...oo.', '..oRro', '.oRRo.', 'oRRo..', 'oRo...', '.o....'] },
    FLOWER: { palette: { o: '#7a2a4a', P: '#ff8ab5', Y: '#ffd84a' }, rows: ['.oPo.', 'oPPPo', 'PPYPP', 'oPPPo', '.oPo.'] },
    HELM:   { palette: { o: '#2a2f3a', S: '#aeb6c2', s: '#7d8694', h: '#e8eef5' }, rows: ['..ooo..', '.oShSo.', 'oSSSSSo', 'osssSso', 'o.o.o.o'] },
    HAT:    { palette: { o: '#4a3418', Y: '#d8b25a', y: '#b08a3a' }, rows: ['....oo....', '...oYYo...', '..oYYYYo..', '.oyYYYYyo.', 'oyyyyyyyyo', '.oooooooo.'] },
    LEAF:   { palette: { o: '#1f4a1a', G: '#5ac24a', g: '#3a8a2f' }, rows: ['...oo', '.oGGo', 'oGgGo', 'oGGo.', '.oo..'] },
    SHELL:  { palette: { o: '#4a3f35', W: '#f4efe1', s: '#cfc4a8' }, rows: ['.o.o.o.', 'oWoWoWo', 'oWWWWWo', 'osWWWso', '.ooooo.'] },
    HIDE: {
        palette: { o: '#3b2a1a', L: '#a9784a', l: '#c99a66', h: '#e0bd90' },
        rows: [
            '..oooooo..',
            '.oLLllLLo.',
            'oLllhhllLo',
            'oLlhhhhlLo',
            'oLllhhllLo',
            'oLLllllLLo',
            '.oLLllLLo.',
            '..oooooo..',
        ],
    },
    FANG: {
        palette: { o: '#2a2418', W: '#f2ead8', h: '#ffffff', s: '#c8bfa8' },
        rows: [
            '..oooo..',
            '.oWhhWo.',
            'oWWhhWWo',
            'oWWWWWWo',
            'oWWWWWWo',
            '.oWWWWo.',
            '.oWssWo.',
            '..oWWo..',
            '..oWo...',
            '...o....',
        ],
    },
    ORE: {
        palette: { o: '#1e2228', S: '#7f8896', s: '#5b6472', h: '#b8c2cf' },
        rows: [
            '...oooo...',
            '..oShhSo..',
            '.oSShhSSo.',
            'oSShhhhSSo',
            'oSsShhSsSo',
            'oSssSSssSo',
            '.oSssssSo.',
            '..oooooo..',
        ],
    },
    CAVE: {
        palette: { o: '#181410', R: '#6b6153', r: '#8d8474', d: '#0a0a10', g: '#2a2a3a' },
        rows: [
            '...RRRRRR...',
            '..RrrrrrrR..',
            '.RrrRRRRrrR.',
            'RrrRddddRrrR',
            'RrRddddddRrR',
            'RrRdddgddRrR',
            'RrRddddddRrR',
            'RrRddddddRrR',
            'RrRddddddRrR',
            'RRRddddddRRR',
            '.oRddddddRo.',
            '..oooooooo..',
        ],
    },
    STAIRS_DOWN: {
        palette: { o: '#181410', S: '#6b6153', s: '#4a453a', d: '#05050a' },
        rows: [
            'oooooooooo',
            'oSSSSSSSSo',
            'osssssssso',
            'oSddddddSo',
            'osdddddd so',
            'oSddddddSo',
            'osdddddd so',
            'oSddddddSo',
            'oSSSSSSSSo',
            'oooooooooo',
        ],
    },
    STAIRS_UP: {
        palette: { o: '#181410', S: '#8d8474', s: '#6b6153', L: '#ffe9b0', l: '#ffd07a' },
        rows: [
            'oooooooooo',
            'oSSSSSSSSo',
            'osssssssso',
            'oSLLLLLLSo',
            'osLllllLso',
            'oSLllllLSo',
            'osLllllLso',
            'oSLLLLLLSo',
            'oSSSSSSSSo',
            'oooooooooo',
        ],
    },
    WAYSTONE: {
        palette: { o: '#241f18', S: '#8d8474', s: '#67604f', h: '#bab2a0', R: '#4fb8ff', r: '#bfe9ff' },
        rows: [
            '..oooo..',
            '.oShhSo.',
            'oSShhSSo',
            'oSShhSSo',
            'oSSRRSSo',
            'oSSrrSSo',
            'oSSRRSSo',
            'oSShhSSo',
            'oSSshSSo',
            'oSSssSSo',
            '.oSssSo.',
            '.oSsSSo.',
            '..oooo..',
            '.ooSSoo.',
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
