import { WORLD_SIZE } from './config.js';
import { clamp } from './utils.js';

export const cam = { x: 0, y: 0, w: 0, h: 0 };

export function followCamera(target, smooth = 0.1) {
    cam.x += (target.x - cam.w / 2 - cam.x) * smooth;
    cam.y += (target.y - cam.h / 2 - cam.y) * smooth;
    cam.x = clamp(cam.x, -100, WORLD_SIZE - cam.w + 100);
    cam.y = clamp(cam.y, -100, WORLD_SIZE - cam.h + 100);
}

export function isOnScreen(e, margin = 200) {
    return e.x + margin > cam.x && e.x - margin < cam.x + cam.w &&
           e.y + margin > cam.y && e.y - margin < cam.y + cam.h;
}

export function worldToScreen(x, y) {
    return { x: x - cam.x, y: y - cam.y };
}
