// 후처리. 2D 캔버스에 다 그린 화면을 WebGL 로 한 번 더 통과시킨다.
//
//   번짐(bloom)   밝은 픽셀만 뽑아 흐릿하게 키운 뒤 도로 더한다. 불길·번개·용암이 진짜로 빛난다.
//   일렁임(warp)  맞은 순간 화면이 물결친다. feedback.js 의 번쩍임 세기를 그대로 쓴다.
//   색 어긋남      가장자리로 갈수록 R/B 가 아주 살짝 벌어진다 (렌즈 느낌)
//
// Canvas 2D 로는 이 셋 중 어느 것도 못 한다. 그래서 화면 한 장을 통째로 텍스처로 넘긴다.
// 기존 그리기 코드(ctx.* 579곳)는 하나도 건드리지 않는다 — 다 그린 결과만 받아 간다.
//
// WebGL 을 못 쓰는 환경이면 initPostFx 가 false 를 돌려주고,
// main.js 는 예전처럼 2D 캔버스를 그대로 보여 준다.

const BLOOM = 0.85;        // 번짐 세기. 취향껏 여기만 만지면 된다 (0 이면 꺼진 것과 같다)
const THRESHOLD = 0.62;    // 이 밝기부터 번진다. 낮추면 온 세상이 뿌옇게 빛난다
const KNEE = 0.28;         // 문턱을 부드럽게 넘기는 폭. 없으면 밝기 경계가 칼같이 갈라진다
const BLOOM_DIV = 4;       // 번짐은 1/4 해상도로 계산한다 (어차피 흐릿해질 그림이라 티가 안 난다)

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`;

// 밝은 곳만 남긴다
const BRIGHT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
void main() {
    vec3 c = texture2D(tex, uv).rgb;
    float l = max(c.r, max(c.g, c.b));
    float k = clamp((l - ${THRESHOLD.toFixed(2)}) / ${KNEE.toFixed(2)}, 0.0, 1.0);
    gl_FragColor = vec4(c * k * k, 1.0);
}
`;

// 가로/세로로 한 번씩 흐린다 (한 번에 2차원으로 흐리면 표본이 25배 든다)
const BLUR = `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2 dir;
void main() {
    vec3 s = texture2D(tex, uv).rgb * 0.227;
    s += (texture2D(tex, uv + dir * 1.3846).rgb + texture2D(tex, uv - dir * 1.3846).rgb) * 0.3162;
    s += (texture2D(tex, uv + dir * 3.2308).rgb + texture2D(tex, uv - dir * 3.2308).rgb) * 0.0702;
    gl_FragColor = vec4(s, 1.0);
}
`;

// 원본 + 번짐, 그리고 맞은 순간의 일렁임
const COMPOSITE = `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
uniform sampler2D bloomTex;
uniform float bloom;
uniform float warp;
uniform float time;
void main() {
    vec2 d = uv - 0.5;
    float r = length(d);
    vec2 u = uv;

    // 맞은 순간: 한가운데서 퍼져 나가는 물결. 화면 복판은 건드리지 않아야 조준이 안 흔들린다
    if (warp > 0.002) {
        float w = sin(r * 26.0 - time * 9.0) * warp * 0.012 * smoothstep(0.0, 0.3, r);
        u += d / max(r, 0.001) * w;
    }

    // 가장자리로 갈수록 R 과 B 가 아주 살짝 벌어진다
    float ab = (0.0010 + r * 0.0030) * (1.0 + warp * 2.0);
    vec3 c;
    c.r = texture2D(tex, u + d * ab).r;
    c.g = texture2D(tex, u).g;
    c.b = texture2D(tex, u - d * ab).b;

    c += texture2D(bloomTex, u).rgb * bloom;
    gl_FragColor = vec4(c, 1.0);
}
`;

let gl = null, fxCanvas = null, srcCanvas = null;
let pBright, pBlur, pComp;
let texSrc, targetA, targetB;
let W = 0, H = 0;

function compile(fragSrc) {
    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, fragSrc]]) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
        gl.attachShader(prog, sh);
    }
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    return prog;
}

// 화면 크기와 다른 해상도로 그려 둘 자리 (번짐 계산용)
function makeTarget(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    // 2의 거듭제곱이 아닌 크기라 밉맵·반복을 못 쓴다. 가장자리를 물고 늘어지게 둔다
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
}

/**
 * WebGL 캔버스를 만들어 화면에 끼운다.
 *   worldCanvas    세계를 그려 둘 화면 밖 캔버스 (이걸 텍스처로 올린다)
 *   displayCanvas  화면에 있는 원래 캔버스. 입력을 받고, 또렷해야 하는 글자를 얹는 층이 된다
 * 되면 true. WebGL 이 없거나 셰이더가 안 되면 false 를 돌려주고 아무것도 바꾸지 않는다.
 */
export function initPostFx(worldCanvas, displayCanvas) {
    try {
        srcCanvas = worldCanvas;
        fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'fxCanvas';
        fxCanvas.style.cssText = 'position:absolute; left:0; top:0; width:100%; height:100%; display:block; z-index:0;';
        gl = fxCanvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
        if (!gl) return false;

        pBright = compile(BRIGHT);
        pBlur = compile(BLUR);
        pComp = compile(COMPOSITE);

        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        texSrc = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texSrc);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // 캔버스는 위아래가 뒤집혀 들어온다

        // 보이는 캔버스 바로 앞에 끼운다 — 후처리 결과가 뒤, 또렷한 글자 층이 앞.
        // ui-layer 는 DOM 에서 더 뒤라 계속 맨 위에 뜬다.
        //
        // 보이는 캔버스를 display:none 으로 감췄더니 마우스 입력이 몽땅 죽은 적이 있다.
        // 조준·발사·휠 줌·터치가 전부 이 캔버스에 묶여 있어서(core/input.js) 숨기면 안 된다.
        displayCanvas.before(fxCanvas);
        displayCanvas.style.position = 'absolute';
        displayCanvas.style.left = '0';
        displayCanvas.style.top = '0';
        displayCanvas.style.zIndex = '1';
        return true;
    } catch (e) {
        console.warn('후처리를 못 켰다. 원래 화면으로 간다:', e);
        if (fxCanvas) fxCanvas.remove();
        return false;
    }
}

export function resizePostFx(w, h) {
    W = w; H = h;
    fxCanvas.width = w; fxCanvas.height = h;
    const bw = Math.max(1, Math.floor(w / BLOOM_DIV)), bh = Math.max(1, Math.floor(h / BLOOM_DIV));
    if (targetA) { gl.deleteTexture(targetA.tex); gl.deleteFramebuffer(targetA.fb); }
    if (targetB) { gl.deleteTexture(targetB.tex); gl.deleteFramebuffer(targetB.fb); }
    targetA = makeTarget(bw, bh);
    targetB = makeTarget(bw, bh);
}

function pass(prog, target, texture) {
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : W, target ? target.h : H);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(prog, 'tex'), 0);
}

/**
 * render() 맨 끝에서 부른다.
 *   warp  0~1. 맞은 순간의 일렁임 세기 (feedback.js 의 flashAmount)
 *   time  물결이 흐르는 기준 시각 (state.gameTime)
 */
export function renderPostFx(warp, time) {
    // 1) 이번 프레임 화면을 텍스처로 올린다
    gl.bindTexture(gl.TEXTURE_2D, texSrc);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);

    // 2) 밝은 곳만 뽑아 1/4 크기로
    pass(pBright, targetA, texSrc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3) 가로로 흐리고, 세로로 흐린다
    pass(pBlur, targetB, targetA.tex);
    gl.uniform2f(gl.getUniformLocation(pBlur, 'dir'), 1 / targetA.w, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    pass(pBlur, targetA, targetB.tex);
    gl.uniform2f(gl.getUniformLocation(pBlur, 'dir'), 0, 1 / targetB.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 4) 원본 + 번짐을 화면에
    pass(pComp, null, texSrc);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, targetA.tex);
    gl.uniform1i(gl.getUniformLocation(pComp, 'bloomTex'), 1);
    gl.uniform1f(gl.getUniformLocation(pComp, 'bloom'), BLOOM);
    gl.uniform1f(gl.getUniformLocation(pComp, 'warp'), warp);
    gl.uniform1f(gl.getUniformLocation(pComp, 'time'), time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}
