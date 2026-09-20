import { state, resetState } from './core/state.js';
import { input, initInput, mouse } from './core/input.js';
import { cam, followCamera, isOnScreen, resizeCamera, cycleZoom, stepZoom } from './core/camera.js';
import { clamp } from './core/utils.js';
import { preloadTerrain, drawTerrain } from './world/terrain.js';
import { updateSpawns } from './world/spawn.js';
import { initWorld, updatePortals, getNpc, refreshDen } from './systems/world.js';
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
import { drawCrosshair } from './render/cursor.js';
import { applyHitStop, updateFeedback, drawFeedback } from './render/feedback.js';
import { initWaystones, updateTravel } from './systems/travel.js';
import { inDungeon } from './systems/delve.js';
import { updateChronicle } from './systems/chronicle.js';
import { updateCutscene, drawCutscene } from './systems/cutscene.js';
import { updateRoutine } from './systems/routine.js';
import { updateDenPlace, drawDenGhost, isPlacing, cancelPlacing, setDenRebuilder } from './systems/denPlace.js';
import { initDenPanel, isDecorPanelOpen, closeDecorPanel } from './ui/denPanel.js';
import { inMyDen } from './systems/den.js';
import { updateEvents, drawEvents } from './systems/events.js';
import { initAudio } from './systems/audio.js';
import { initMusic, updateMusic } from './systems/music.js';
import { initJournal } from './ui/journal.js';
import { initTouch } from './ui/touch.js';
import { dialogueUI } from './ui/dialogueUI.js';
import { showToast } from './ui/toast.js';

const AUTOSAVE_INTERVAL = 20; // 초

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    resizeCamera(canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

initInput();
initHud();
initKidsPanel();
initJournal();
initDenPanel();
setDenRebuilder(refreshDen);
initTouch();
initCustomizer(startGame);
initMusic();
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
    initAudio(); // 시작 버튼 클릭 = 첫 사용자 입력이라 여기서 소리를 켤 수 있다
    await assetsReady;
    const save = loadSave ? readSave() : null;
    resetState();
    const elder = initWorld(save ? save.player.config : config);
    if (save) applySave(save);
    initWaystones();
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
    const real = clamp((now - lastTime) / 1000, 0, 0.1);
    lastTime = now;
    const dt = applyHitStop(real);   // 맞은 순간 세상이 아주 잠깐 멈춘다
    updateFeedback(real);

    if (input.pressed('zoom')) showToast(`시점: ${cycleZoom(canvas.width, canvas.height)}`, '🔍');
    if (mouse.wheel) showToast(`시점: ${stepZoom(mouse.wheel, canvas.width, canvas.height)}`, '🔍');
    if (input.pressed('cancel')) {
        if (isPlacing()) cancelPlacing();
        else if (isDecorPanelOpen()) closeDecorPanel();
    }
    if (state.isDialogueOpen) {
        if (input.pressed('cancel')) closeDialogue();
        else dialogueUI.handleKeys(input);   // 방향키 + Space 로 선택
    } else {
        update(dt);
    }
    updateCutscene(dt);   // 세계가 멈춰 있어도 띠와 어둠은 계속 움직여야 한다

    followCamera(state.player);
    render();

    hudAccumulator += dt;
    if (hudAccumulator > 0.1) { updateHud(); updateMusic(); hudAccumulator = 0; }
    saveAccumulator += dt;
    if (saveAccumulator > AUTOSAVE_INTERVAL) { saveGame(); saveAccumulator = 0; }

    input.endFrame();
    requestAnimationFrame(loop);
}

function update(dt) {
    const E = state.entities;
    state.gameTime += dt;
    const outside = !inDungeon();
    if (outside) updateRaid(dt);   // 굴 속에서는 마을 습격도, 야생 적의 보충도 없다
    const prevDayTime = state.dayTime;
    updateLighting(dt);
    updateEvents(dt, prevDayTime);
    updateWeather(dt);
    if (state.rally > 0) state.rally -= dt;

    state.player.update(dt);
    for (const group of [E.nests, E.babies, E.items, E.npcs, E.enemies, E.humans, E.bosses, E.hazards, E.bullets, E.effects, E.particles]) {
        for (const e of group) e.update(dt);
    }

    resolveCombat();
    pruneEntities();
    if (outside) {
        if (inMyDen()) updateDenPlace();                      // 굴 안: 살림살이 놓기
        else updateSpawns();
        updateTravel(); updatePortals(); updateRoutine(dt, getNpc); updateChronicle(dt);
    }
}

function render() {
    const E = state.entities;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.save();
    ctx.translate(-Math.round(cam.x + cam.shakeX), -Math.round(cam.y + cam.shakeY)); // 정수 좌표: 픽셀아트가 떨리지 않게
    drawTerrain(ctx, cam);
    for (const h of E.hazards) h.draw(ctx);   // 바닥 장판은 개체들 밑에

    // 화면 근처 것만 골라 y 좌표 순으로 그린다 (아래쪽 개체가 앞에 오도록)
    const drawables = [...E.props, ...E.nests, ...E.items, ...E.babies, ...E.npcs, ...E.enemies, ...E.humans, ...E.bosses, state.player]
        .filter(e => isOnScreen(e, 420));
    // 나무 뒤에 가려지면 안 되는 것들 (entities/Prop.js 가 이 목록을 보고 나무를 투명하게 한다)
    state.fadeTargets = drawables.filter(e => !e.sprite || (e.type === 'CHEST' && !e.opened) || (e.type === 'BERRY' && e.ripe));
    drawables.sort((a, b) => a.y - b.y);
    for (const e of drawables) e.draw(ctx);

    drawDenGhost(ctx);                         // 놓을 자리에 반투명하게
    for (const b of E.bullets) b.draw(ctx);
    for (const fx of E.effects) fx.draw(ctx);
    drawEvents(ctx);
    ctx.globalCompositeOperation = 'lighter'; // 파티클은 빛 알갱이
    for (const p of E.particles) p.draw(ctx);
    ctx.globalCompositeOperation = 'source-over';
    drawCrosshair(ctx);                        // 조준점은 파티클 위에
    ctx.restore();

    // 조명·날씨도 같은 배율 안에서 (cam.w/h 가 곧 화면 크기)
    drawLighting(ctx, cam);
    drawWeather(ctx, cam);
    ctx.restore();

    drawFeedback(ctx, canvas.width, canvas.height);   // 피격 번쩍임·위기 비네트
    drawCutscene(ctx, canvas.width, canvas.height);   // 레터박스·스포트라이트는 배율 밖에서
}
