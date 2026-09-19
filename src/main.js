import { state, resetState } from './core/state.js';
import { input, initInput } from './core/input.js';
import { cam, followCamera, isOnScreen } from './core/camera.js';
import { clamp } from './core/utils.js';
import { preloadTerrain, drawTerrain } from './world/terrain.js';
import { buildWorld, updateSpawns } from './world/spawn.js';
import { resolveCombat, pruneEntities } from './systems/combat.js';
import { updateRaid } from './systems/raid.js';
import { updateWeather, drawWeather } from './systems/weather.js';
import { saveGame, readSave, applySave } from './systems/save.js';
import { startDialogue, closeDialogue } from './systems/dialogue.js';
import { initHud, showGameUI, updateHud } from './ui/hud.js';
import { initKidsPanel, refreshKidsPanel } from './ui/kidsPanel.js';
import { initCustomizer } from './ui/customizer.js';
import { preloadDragonSprites } from './render/dragonSprites.js';
import { preloadVfx } from './render/vfx.js';
import { updateLighting, drawLighting } from './render/lighting.js';

const AUTOSAVE_INTERVAL = 20; // 초

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
window.addEventListener('beforeunload', saveGame);

// 드래곤 시트와 타일셋은 페이지 로드 직후부터 받기 시작한다
const assetsReady = Promise.all([preloadDragonSprites(), preloadTerrain(), preloadVfx()]).catch(err => { console.error(err); });

let lastTime = 0;
let hudAccumulator = 0;
let saveAccumulator = 0;

// 디버그/테스트용 훅 (콘솔에서 __dragonia.step(dt) 로 한 프레임 진행)
window.__dragonia = { state, step(dt) { update(dt); followCamera(state.player); render(); updateHud(); } };

/** config: 새 게임 설정. loadSave 가 true 면 저장된 진행 상황을 이어서 한다 */
async function startGame(config, loadSave = false) {
    await assetsReady;
    const save = loadSave ? readSave() : null;
    resetState();
    const elder = buildWorld(save ? save.player.config : config);
    if (save) applySave(save);
    state.gameActive = true;
    cam.x = state.player.x - cam.w / 2;
    cam.y = state.player.y - cam.h / 2;
    showGameUI();
    refreshKidsPanel();
    updateHud();
    if (!save) setTimeout(() => startDialogue(elder, 'TALK'), 500);
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
    saveAccumulator += dt;
    if (saveAccumulator > AUTOSAVE_INTERVAL) { saveGame(); saveAccumulator = 0; }

    input.endFrame();
    requestAnimationFrame(loop);
}

function update(dt) {
    const E = state.entities;
    state.gameTime += dt;
    updateRaid(dt);
    updateLighting(dt);
    updateWeather(dt);

    state.player.update(dt);
    for (const group of [E.nests, E.babies, E.items, E.npcs, E.enemies, E.humans, E.bosses, E.bullets, E.effects, E.particles]) {
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

    // 화면 근처 것만 골라 y 좌표 순으로 그린다 (아래쪽 개체가 앞에 오도록)
    const drawables = [...E.props, ...E.nests, ...E.items, ...E.babies, ...E.npcs, ...E.enemies, ...E.humans, ...E.bosses, state.player]
        .filter(e => isOnScreen(e, 420));
    drawables.sort((a, b) => a.y - b.y);
    for (const e of drawables) e.draw(ctx);

    for (const b of E.bullets) b.draw(ctx);
    for (const fx of E.effects) fx.draw(ctx);
    ctx.globalCompositeOperation = 'lighter'; // 파티클은 빛 알갱이
    for (const p of E.particles) p.draw(ctx);
    ctx.restore();

    drawLighting(ctx, cam);
    drawWeather(ctx, cam);
}
