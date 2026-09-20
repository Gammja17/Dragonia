import { clamp } from './utils.js';
import { currentMapSize } from '../world/terrain.js';

// cam.w/h 는 "월드 기준" 화면 크기 (줌을 당기면 작아진다)
export const cam = { x: 0, y: 0, w: 0, h: 0, zoom: 1, shakeX: 0, shakeY: 0 };

// 픽셀아트가 뭉개지지 않게 타일 배율(3배)이 정수가 되는 줌만 쓴다: 2배 / 3배 / 4배
const ZOOMS = [1, 4 / 3, 2 / 3];
const ZOOM_NAMES = ['보통', '가까이', '멀리'];
const ZOOM_KEY = 'dragonia-zoom';
// 저장된 값이 없으면: 작은 화면(휴대폰)은 '멀리'로 시작
let zoomIndex = localStorage.getItem(ZOOM_KEY) !== null ? Number(localStorage.getItem(ZOOM_KEY)) : (Math.min(window.innerWidth, window.innerHeight) < 600 ? 2 : 0);
let shakePower = 0;

export function resizeCamera(screenW, screenH) {
    cam.zoom = ZOOMS[zoomIndex] || 1;
    cam.w = screenW / cam.zoom;
    cam.h = screenH / cam.zoom;
}

/** 다음 줌 단계로. 단계 이름을 돌려준다 */
export function cycleZoom(screenW, screenH) {
    zoomIndex = (zoomIndex + 1) % ZOOMS.length;
    localStorage.setItem(ZOOM_KEY, zoomIndex);
    const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
    resizeCamera(screenW, screenH);
    cam.x = cx - cam.w / 2; cam.y = cy - cam.h / 2;
    return ZOOM_NAMES[zoomIndex];
}

/** 화면 흔들림 (세게 맞았을 때, 운석 등) */
export function shake(power) { shakePower = Math.max(shakePower, power); }

export function followCamera(target, smooth = 0.1) {
    cam.x += (target.x - cam.w / 2 - cam.x) * smooth;
    cam.y += (target.y - cam.h / 2 - cam.y) * smooth;
    const size = currentMapSize();
    cam.x = clamp(cam.x, -100, Math.max(-100, size - cam.w + 100));
    cam.y = clamp(cam.y, -100, Math.max(-100, size - cam.h + 100));
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
