import { state } from '../core/state.js';
import { cam, shake } from '../core/camera.js';
import { rand } from '../core/utils.js';
import { flash, hitStop } from '../render/feedback.js';
import { spawnEffect } from '../render/vfx.js';
import { burst } from '../entities/Particle.js';
import { beginCutscene, focusOn, endCutscene } from './cutscene.js';
import { playScene } from './chronicle.js';
import { anyNpc, fixedNpcs } from './world.js';
import { play } from './audio.js';
import { fadeScreen } from '../ui/hud.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { PROLOGUE } from '../data/story.js';

// 프롤로그: 하늘에서 떨어지던 그 밤.
//
// 엘더의 첫 대화가 이 장면을 말로만 설명하고 있었다 — "떨어졌다. 하늘에서.
// 광장 한복판에 불덩이처럼. 포코가 별이 떨어졌다고 울면서 나를 깨우러 왔지."
// 그걸 그대로 보여 준다.
//
//   하늘  깊은 밤의 광장. 아직 아무도 없다
//   낙하  빛 하나가 비스듬히 꼬리를 끌며 내려온다 (아직 용으로 안 보인다)
//   충돌  섬광·흔들림·충격파. 연기가 걷히면 빛이 아니라 쓰러진 용이다
//   포코  포코가 걸어 들어와 발견한다
//   엘더  포코가 데려온 엘더가 알아본다
//   끝    「사흘 뒤」 로 넘기고 기존 첫 대화("깼구나. 사흘 잤다.")에 잇는다
//
// 새 게임에서만 돌고(이어하기는 건너뛴다), 아무 때나 Esc 로 건너뛸 수 있다.
// 진행 상태는 state.tour 와 같은 결로 state.prologue 에 둔다 —
// entities/Dragon.js 가 이걸 보고 조작을 막고, 낙하 중에는 용을 감춘다.

const NIGHT = 0.04;      // 프롤로그 동안의 시각 (깊은 밤)
const SKY = 1.4;         // 떨어지기 전의 정적
const FALL = 1.6;        // 떨어지는 데 걸리는 시간
// 어디서부터 그어 내려올까 (화면 높이의 몇 할 위). 너무 높이 잡으면 마지막 한순간에야
// 화면에 들어와서, 긋고 내려오는 게 아니라 코앞에서 툭 튀어나온 것처럼 보인다
const SETTLE = 2.4;      // 연기가 걷힐 때까지
const START_H = 0.5;     // (위 주석 참고)
const SLANT = 220;       // 얼마나 비스듬히 그어 내려올까 (px)

export function inPrologue() { return !!state.prologue; }

/** 새 게임 시작 직후. done: 프롤로그가 끝나면 부를 것 (보통 엘더와의 첫 대화) */
export function startPrologue(done) {
    const p = state.player;
    state.prologue = { step: 'sky', t: 0, dayTime: state.dayTime, puff: 0, trail: 0, done };
    state.dayTime = NIGHT;
    p.hidden = true;          // 떨어지는 동안에는 빛으로만 보인다
    hideVillage(true);        // 한밤중이다. 불려 나온 이 말고는 아무도 없어야 한다
    beginCutscene('');        // 제목 없이 위아래 띠만
}

/**
 * 마을 용들을 감춘다.
 * 감추지 않으면 다들 제 일과대로 광장을 돌아다녀서, 포코가 혼자 발견하는 장면이
 * 되지 않는다. 자리는 그대로 두고 그리지만 않는다 (render 가 hidden 을 거른다).
 */
function hideVillage(hide) {
    // 풀 때는 지도에 있는 용만이 아니라 캐시된 용 전부를 푼다. 감춰진 사이에 일과대로 문을 나선 용(23시의 그론)이 영영 투명인간으로 남았다
    for (const n of hide ? state.entities.npcs : fixedNpcs()) n.hidden = hide;
}

/** main.js 루프에서 매 프레임. 대화창이 떠 있어도 돌아야 한다 */
export function updatePrologue(dt) {
    const s = state.prologue;
    if (!s) return;
    s.t += dt;
    const p = state.player;

    if (s.step === 'sky') {
        if (s.t >= SKY) { s.step = 'fall'; s.t = 0; }

    } else if (s.step === 'fall') {
        // 뒤로 갈수록 빨라진다. 빛덩이 하나가 화면 위에서 비스듬히 그어 내려온다
        const k = Math.min(1, s.t / FALL);
        const x = p.x + (1 - k) * SLANT;
        const y = p.y - (1 - k * k) * cam.h * START_H;
        s.trail -= dt;
        if (s.trail <= 0) { spawnEffect('METEOR', x, y); s.trail = 0.04; }
        burst(x, y, '#ffe9a0', 0.45, 1);
        if (k >= 1) land(p, s);

    } else if (s.step === 'settle') {
        s.puff -= dt;
        if (s.t < SETTLE * 0.7 && s.puff <= 0) {
            spawnEffect('SMOKE', p.x + rand(-34, 34), p.y - rand(0, 14));
            s.puff = 0.4;
        }
        if (s.t >= SETTLE) { s.step = 'poco'; talk('Poco', PROLOGUE.poco, () => meetElder(s)); }
    }
}

/** 광장 한복판에 꽂힌다 */
function land(p, s) {
    p.hidden = false;
    p.downTimer = 999;        // 쓰러져 누운 모습으로 그려진다 (Dragon.draw)
    flash(0.85, '255,236,176');
    shake(17);
    hitStop(0.12);
    play('boom');
    spawnEffect('SHOCKWAVE', p.x, p.y);
    spawnEffect('SCORCH', p.x, p.y);
    spawnEffect('SMOKE', p.x, p.y - 10, { size: 2 });
    burst(p.x, p.y, '#ffd98a', 1.1, 30);
    s.step = 'settle'; s.t = 0; s.puff = 0;
}

/** 포코가 엘더를 데려온다 */
function meetElder(s) {
    s.step = 'elder';
    talk('Elder', PROLOGUE.elder, () => finish(s));
}

/**
 * 한 사람이 죽 말한다.
 * cinematic:false 로 두고 무대는 여기서 직접 세운다 — playScene 에 맡기면
 * 장면이 끝날 때 endCutscene 까지 해 버려서 우리 띠가 먼저 걷힌다.
 */
function talk(who, lines, then) {
    const npc = anyNpc(who);
    if (!npc) { then(); return; }     // 그 용이 마을에 없으면 조용히 건너뛴다
    npc.hidden = false;               // 이 사람만 밤 속에서 걸어 나온다
    focusOn(npc);                     // 화면 밖에서 걸어 들어온다 (systems/cutscene.js)
    playScene('', lines, then, { cinematic: false });
}

/** 「사흘 뒤」 로 넘기고 첫 대화에 잇는다 */
function finish(s) {
    fadeScreen('사흘 뒤', () => {
        state.dayTime = s.dayTime;
        state.player.downTimer = 0;
        hideVillage(false);
        endCutscene();
    }, () => {
        const done = s.done;
        state.prologue = null;
        if (done) done();
    });
}

/** Esc: 어느 대목이든 건너뛰고 첫 대화로 */
export function skipPrologue() {
    const s = state.prologue;
    if (!s) return;
    const p = state.player;
    dialogueUI.hide();
    state.isDialogueOpen = false;
    state.dayTime = s.dayTime;
    p.hidden = false;
    p.downTimer = 0;
    hideVillage(false);
    endCutscene();
    const done = s.done;
    state.prologue = null;
    // 같은 프레임에 대화를 열면 건너뛴 그 Esc 가 그 대화까지 그대로 닫는다. 한 박자 둔다
    if (done) setTimeout(done, 400);
}
