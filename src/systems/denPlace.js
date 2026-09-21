import { state } from '../core/state.js';
import { mouse } from '../core/input.js';
import { screenToWorld } from '../core/camera.js';
import { FURNITURE } from '../data/furniture.js';
import { TILE, TILE_SRC } from '../data/tiles.js';
import { getTileImage } from '../world/terrain.js';
import { canPlace, place, indexAt, pickUp, worldToTile, tileToWorld, inMyDen } from './den.js';
import { ROOM_PAD } from '../world/room.js';
import { activeMap } from '../world/terrain.js';
import { showToast } from '../ui/toast.js';
import { play } from '../systems/audio.js';
import { openDecorPanel } from '../ui/denPanel.js';

// 놓는 자리 고르기. state.holding 에 가구 id 가 들어 있으면 커서를 따라 반투명하게
// 그려지고, 왼쪽 클릭으로 놓는다. 아무것도 들고 있지 않을 때 놓여 있는 것을 누르면
// 집어 들어 다시 옮길 수 있다.

const $ = (id) => document.getElementById(id);
let lastValid = false;
let lastTile = null;

export function isPlacing() { return !!state.holding; }

export function cancelPlacing() {
    state.holding = null;
    hint('');
}

function hint(text) {
    const el = $('den-hint');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('show', !!text);
}

/** 커서가 가리키는 칸 */
function cursorTile() {
    if (!mouse.inside) return null;
    const w = screenToWorld(mouse.x, mouse.y);
    return worldToTile(w.x, w.y);
}

export function updateDenPlace() {
    if (!inMyDen()) { cancelPlacing(); return; }
    const map = activeMap();

    if (state.holding) {
        const t = cursorTile();
        lastTile = t;
        lastValid = !!t && canPlace(state.holding, t.tx, t.ty, map);
        const f = FURNITURE[state.holding];
        hint(lastValid
            ? `${f.name}: 왼쪽 클릭으로 놓는다 (오른쪽 클릭: 그만)`
            : `${f.name}: ${f.wall ? '벽에 거는 것은 맨 윗줄에만 걸 수 있다' : '여기에는 놓을 수 없다'}`);

        if (mouse.right) { cancelPlacing(); play('ui'); openDecorPanel(); return; }
        if (mouse.clicked && lastValid) {
            const id = state.holding;
            place(id, t.tx, t.ty);
            showToast(`${f.name}을(를) 놓았다.`, '🪑');
            state.holding = null;
            hint('');
            rebuild();
        }
        return;
    }

    // 아무것도 안 들고 있을 때: 놓여 있는 것을 누르면 집어 든다
    hint('');
    if (!mouse.clicked) return;
    const t = cursorTile();
    if (!t) return;
    const i = indexAt(t.tx, t.ty);
    if (i < 0) return;
    const d = pickUp(i);
    if (!d) return;
    state.holding = d.id;
    showToast(`${FURNITURE[d.id].name}을(를) 집어 들었다.`, '✋');
    rebuild();
}

/** 놓인 것이 바뀌면 소품을 다시 깐다 (systems/world.js 가 채워 준다) */
let rebuilder = null;
export function setDenRebuilder(fn) { rebuilder = fn; }
function rebuild() { if (rebuilder) rebuilder(); }

/** 들고 있는 것을 커서 자리에 반투명하게 그린다 (카메라 배율 안에서) */
export function drawDenGhost(ctx) {
    if (!state.holding || !lastTile) return;
    const f = FURNITURE[state.holding];
    const sheet = getTileImage('dungeon');
    if (!f || !sheet) return;
    const [sw, sh] = f.span;
    const w0 = tileToWorld(lastTile.tx, lastTile.ty);
    const x = w0.x + (sw - 1) * TILE / 2, y = w0.y;

    ctx.save();
    // 놓을 칸을 네모로 표시
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = lastValid ? '#8ef08e' : '#f08e8e';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x - sw * TILE / 2), Math.round(y - sh * TILE), sw * TILE, sh * TILE);
    ctx.globalAlpha = lastValid ? 0.75 : 0.35;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, f.tile[0] * TILE_SRC, f.tile[1] * TILE_SRC, sw * TILE_SRC, sh * TILE_SRC,
                  Math.round(x - sw * TILE / 2), Math.round(y - sh * TILE), sw * TILE, sh * TILE);
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
}

export { ROOM_PAD };
