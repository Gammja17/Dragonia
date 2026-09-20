import { clamp } from './utils.js';
import { currentMapBounds } from '../world/terrain.js';
import { cutsceneTarget, scene } from '../systems/cutscene.js';

// cam.w/h 는 "월드 기준" 화면 크기 (줌을 당기면 작아진다)
export const cam = { x: 0, y: 0, w: 0, h: 0, zoom: 1, shakeX: 0, shakeY: 0, screenW: 0, screenH: 0 };

// 픽셀아트가 뭉개지지 않게, 타일 배율(3배 × 줌)이 정수가 되는 값만 쓴다.
// 멀리(2배) → 보통(3배) → 가까이(4배) → 아주 가까이(5배) 순으로 늘어놓는다.
const ZOOMS = [2 / 3, 1, 4 / 3, 5 / 3];
const ZOOM_NAMES = ['멀리', '보통', '가까이', '아주 가까이'];
const ZOOM_KEY = 'dragonia-zoom2';
// 저장된 값이 없으면: 작은 화면(휴대폰)은 '멀리', 아니면 '보통'
const DEFAULT_ZOOM = Math.min(window.innerWidth, window.innerHeight) < 600 ? 0 : 1;
// Number(null) 은 0 이라, 저장된 값이 없는 것과 '멀리'(0)를 구별하려면 먼저 null 을 본다
const savedRaw = localStorage.getItem(ZOOM_KEY);
const savedZoom = savedRaw === null ? NaN : Number(savedRaw);
let zoomIndex = Number.isInteger(savedZoom) && savedZoom >= 0 && savedZoom < ZOOMS.length ? savedZoom : DEFAULT_ZOOM;
let shakePower = 0;

export function zoomName() { return ZOOM_NAMES[zoomIndex]; }

export function resizeCamera(screenW, screenH) {
    cam.screenW = screenW; cam.screenH = screenH;
    applyBoost(1);
}

// 컷씬은 시점을 잠깐 더 당긴다. 줌 단계를 건드리지 않고 배율만 덧씌운다
let boost = 1;
function applyBoost(b) {
    boost = b;
    cam.zoom = (ZOOMS[zoomIndex] || 1) * boost;
    cam.w = cam.screenW / cam.zoom;
    cam.h = cam.screenH / cam.zoom;
}

/** 줌 단계를 바꾼다. 화면 가운데를 붙잡아 두어 시점이 튀지 않게 한다 */
function applyZoom(index, screenW, screenH) {
    const next = clamp(index, 0, ZOOMS.length - 1);
    if (next === zoomIndex) return ZOOM_NAMES[zoomIndex];
    zoomIndex = next;
    try { localStorage.setItem(ZOOM_KEY, zoomIndex); } catch { /* 사생활 보호 모드 */ }
    const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
    resizeCamera(screenW, screenH);
    cam.x = cx - cam.w / 2; cam.y = cy - cam.h / 2;
    return ZOOM_NAMES[zoomIndex];
}

/** [V] 다음 줌 단계로 (끝에 닿으면 처음으로) */
export function cycleZoom(screenW, screenH) {
    return applyZoom((zoomIndex + 1) % ZOOMS.length, screenW, screenH);
}

/** 휠을 굴려 한 단계씩. dir > 0 이면 당겨 본다(확대) */
export function stepZoom(dir, screenW, screenH) {
    return applyZoom(zoomIndex + Math.sign(dir), screenW, screenH);
}

/** 화면 흔들림 (세게 맞았을 때, 운석 등) */
export function shake(power) { shakePower = Math.max(shakePower, power); }

export function followCamera(target, smooth = 0.1) {
    // 컷씬이면 둘 사이를 천천히 본다
    const shot = cutsceneTarget();
    if (shot) { target = shot; smooth = scene.snap ? 1 : 0.055; scene.snap = false; }
    if (Math.abs(boost - scene.boost) > 0.0015) applyBoost(scene.boost);
    cam.x += (target.x - cam.w / 2 - cam.x) * smooth;
    cam.y += (target.y - cam.h / 2 - cam.y) * smooth;
    // 지도가 화면보다 작으면 가운데에 둔다.
    // 컷씬일 때는 경계를 조금 넘어가도 둔다 — 인물을 대화창 위로 올려야 하는데
    // 작은 지도에서는 경계에 걸려 화면 아래쪽에 박혀 버린다 (어차피 띠가 가린다)
    const b = currentMapBounds();
    const slack = shot ? cam.h * 0.34 : 0;
    cam.x = b.w <= cam.w ? (b.w - cam.w) / 2 : clamp(cam.x, -slack, b.w - cam.w + slack);
    cam.y = b.h <= cam.h && !shot ? (b.h - cam.h) / 2 : clamp(cam.y, -slack, Math.max(-slack, b.h - cam.h + slack));
    shakePower *= 0.86;
    cam.shakeX = (Math.random() - 0.5) * shakePower * 2;
    cam.shakeY = (Math.random() - 0.5) * shakePower * 2;
}

export function isOnScreen(e, margin = 200) {
    return e.x + margin > cam.x && e.x - margin < cam.x + cam.w &&
           e.y + margin > cam.y && e.y - margin < cam.y + cam.h;
}

/** 브라우저 화면 px → 월드 좌표 (마우스가 가리키는 곳) */
export function screenToWorld(x, y) {
    return { x: x / cam.zoom + cam.x, y: y / cam.zoom + cam.y };
}

/** 월드 좌표 → 브라우저 화면 px (DOM 요소 배치용) */
export function worldToScreen(x, y) {
    return { x: (x - cam.x) * cam.zoom, y: (y - cam.y) * cam.zoom };
}
