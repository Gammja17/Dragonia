import { state, resetState } from './core/state.js';
import { input, initInput } from './core/input.js';
import { cam, followCamera } from './core/camera.js';
import { clamp } from './core/utils.js';
import { preloadTerrain, drawTerrain } from './world/terrain.js';
import { buildWorld, updateSpawns } from './world/spawn.js';
import { resolveCombat, pruneEntities } from './systems/combat.js';
import { updateRaid } from './systems/raid.js';
import { startDialogue, closeDialogue } from './systems/dialogue.js';
import { initHud, showGameUI, updateHud } from './ui/hud.js';
import { initKidsPanel, refreshKidsPanel } from './ui/kidsPanel.js';
import { initCustomizer } from './ui/customizer.js';
import { preloadDragonSprites } from './render/dragonSprites.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cam.w = canvas.width;
    cam.h = canvas.height;
}
window.addEventListener('resize', resize);
resize();

initInput();
initHud();
initKidsPanel();
initCustomizer(startGame);

// 드래곤 시트와 타일셋은 페이지 로드 직후부터 받기 시작한다
const assetsReady = Promise.all([preloadDragonSprites(), preloadTerrain()]).catch(err => { console.error(err); });

let lastTime = 0;
let hudAccumulator = 0;

// 디버그/테스트용 훅 (콘솔에서 __dragonia.step(dt) 로 한 프레임 진행)
window.__dragonia = { state, step(dt) { update(dt); followCamera(state.player); render(); } };

async function startGame(config) {
    await assetsReady;
    resetState();
    const elder = buildWorld(config);
    state.gameActive = true;
    showGameUI();
    refreshKidsPanel();
    updateHud();
    setTimeout(() => startDialogue(elder, 'TALK'), 500);
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(now) {
    if (!state.gameActive) return;
    const dt = clamp((now - lastTime) / 1000, 0, 0.1);
    lastTime = now;

    if (state.isDialogueOpen) {
        if (input.pressed('cancel')) closeDialogue();
    } else {
        update(dt);
    }

    followCamera(state.player);
    render();

    hudAccumulator += dt;
    if (hudAccumulator > 0.1) { updateHud(); hudAccumulator = 0; }

    input.endFrame();
    requestAnimationFrame(loop);
}

function update(dt) {
    const E = state.entities;
    state.gameTime += dt;
    updateRaid(dt);

    state.player.update(dt);
    for (const group of [E.nests, E.babies, E.items, E.npcs, E.enemies, E.humans, E.bullets, E.particles]) {
        for (const e of group) e.update(dt);
    }

    resolveCombat();
    pruneEntities();
    updateSpawns();
}

function render() {
    const E = state.entities;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y)); // 정수 좌표: 픽셀아트가 떨리지 않게
    drawTerrain(ctx, cam);

    // 3/4 뷰 대비: y 좌표 순으로 그려서 아래쪽 개체가 앞에 오도록
    const drawables = [...E.props, ...E.nests, ...E.items, ...E.babies, ...E.npcs, ...E.enemies, ...E.humans, state.player];
    drawables.sort((a, b) => a.y - b.y);
    for (const e of drawables) e.draw(ctx);

    for (const b of E.bullets) b.draw(ctx);
    for (const p of E.particles) p.draw(ctx);
    ctx.restore();
}
