// 또렷한 층. 후처리(번짐)를 타지 않는 캔버스다.
//
// 이름표와 말풍선은 흰 바탕에 흰 글씨라 밝기가 1.0 이다. 번짐의 문턱을 아무리 올려도
// 흰색은 늘 문턱을 넘기 때문에, 세계와 같은 캔버스에 그리면 반드시 뿌옇게 번진다.
// (번짐 세기를 낮추면 이번엔 불길·번개가 안 빛난다)
//
// 그래서 세계는 화면 밖 캔버스에 그려 셰이더로 넘기고, 글자는 그 위 캔버스에 따로 얹는다.
// 후처리를 못 켠 환경에서는 crisp() 가 원래 캔버스를 그대로 돌려주므로 예전과 똑같이 동작한다.

let ui = null;

/** main.js 가 후처리를 켤 때 한 번 알려 준다 */
export function setCrispLayer(ctx) { ui = ctx; }

/** 또렷하게 그려야 하는 것들이 쓸 캔버스. 후처리가 꺼져 있으면 세계 캔버스 그대로 */
export function crisp(worldCtx) { return ui || worldCtx; }

/** 세계와 같은 시점(배율·카메라)으로 맞춘다. render() 가 세계를 그리기 직전에 부른다 */
export function beginCrispWorld(cam, w, h) {
    if (!ui) return;
    ui.setTransform(1, 0, 0, 1, 0, 0);
    ui.clearRect(0, 0, w, h);
    ui.save();
    ui.scale(cam.zoom, cam.zoom);
    ui.translate(-Math.round(cam.x + cam.shakeX), -Math.round(cam.y + cam.shakeY));
}

export function endCrispWorld() {
    if (ui) ui.restore();
}
