import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { coarseCenter } from '../world/mapgen.js';
import { playScene } from './chronicle.js';
import { anyNpc } from './world.js';
import { notify } from './quests.js';
import { markTutorial } from './tutorial.js';
import { showToast } from '../ui/toast.js';
import { saveGame } from './save.js';

// 첫날, 포코가 마을을 데리고 돈다.
//
// 눈을 뜨자마자 "알아서 둘러보거라" 하고 놓아 버리면 뭘 해야 할지 모른다.
// 나를 처음 발견한 포코가 앞장서서 네 군데를 들르고, 마지막에 내 굴 앞에서 끝난다.
// 다 돌면 퀘스트 m0 의 '마을을 둘러본다' 대목이 넘어가고, 엘더에게 돌아가면 첫 일거리를 받는다.
//
// state.tour = { i: 몇 번째 자리, phase: 'walk' | 'talk' }

export const GUIDE = 'Poco';

const STOPS = [
    { at: [12, 7], stand: [-90, 50], lines: [
        { who: 'Poco', text: '안녕! 나 포코야! 너 내가 발견했어, 내가! 별인 줄 알았는데 용이더라. 근데 용이 더 좋아, 별은 말을 못 하잖아.' },
        { who: 'Poco', text: '여기가 광장이야. 네가 떨어진 데가 딱 저기. 봐 봐, 돌 깨진 거 보이지? 그론 아저씨가 사흘째 투덜대고 있어.' },
        { who: 'Poco', text: '샘물은 아무나 마셔도 돼. 나 여기서 물장난 치다가 맨날 혼나.' },
    ] },
    { at: [15, 7], stand: [-70, 60], lines: [
        { who: 'Poco', text: '여긴 그론 아저씨 대장간! 숲에서 주운 거 갖다주면 비늘을 단단하게 해 줘.' },
        { who: 'Gron', text: '뭘 봐. 살 거 아니면 가라.' },
        { who: 'Poco', text: '(작게) 무섭게 생겼지? 근데 있잖아, 나 나팔 소리 나면 맨날 여기 와서 숨거든. 아저씨가 나가라고 한 적 한 번도 없어.' },
        { who: 'Gron', text: '다 들린다.' },
    ] },
    { at: [12, 12], stand: [60, 40], lines: [
        { who: 'Poco', text: '이 돌은 옛날 용들이 세운 거래. 손 얹으면 막 빛나. 밖에도 똑같은 돌이 있는데, 깨워 놓으면 돌에서 돌로 슝 하고 갈 수 있대.' },
        { who: 'Poco', text: '난 안 써 봤어. 밖에 안 나가거든. …밖은 좀, 그래. 무서운 거 많아.' },
    ] },
    { at: [5, 10], stand: [90, 60], lines: [
        { who: 'Poco', text: '짜잔! 여기가 네 굴이야! 비어 있던 덴데 엘더 할아버지가 너 주래.' },
        { who: 'Poco', text: '안에 아무것도 없긴 한데… 그래도 네 거잖아. 나도 처음엔 풀 한 줌밖에 없었어.' },
        { who: 'Poco', text: '밤 되면 안에 있는 둥지에서 자면 돼. 애들은 밤에 돌아다니면 안 된대. 티아맷 누나한테 걸리면 진짜 무서워.' },
        { who: 'Poco', text: '다 봤다! 이제 할아버지한테 가 봐. 너 다 나으면 시킬 일 있다고 하셨거든.' },
    ] },
];

const at = ([cx, cy]) => ({ x: coarseCenter(cx), y: coarseCenter(cy) });

export function inTour() { return !!state.tour; }

/** 처음 나눈 말이 끝나면 dialogue.js 가 부른다 */
export function startTour() {
    if (state.tour || state.tutorial.toured) return;
    state.tour = { i: 0, phase: 'walk', nag: 0 };
    showToast('포코를 따라가자.', '👣');
}

function guide() { return anyNpc(GUIDE); }

export function updateTour(dt) {
    const t = state.tour;
    if (!t || state.mapId !== 'VILLAGE') return;
    const e = guide();
    if (!e) return;
    if (!state.entities.npcs.includes(e)) { e.x = state.player.x + 80; e.y = state.player.y; e.remove = false; state.entities.npcs.push(e); }   // 숨어서 보고 있었다
    const stop = STOPS[t.i];
    if (!stop) { endTour(); return; }
    const base = at(stop.at);
    const goal = { x: base.x + (stop.stand ? stop.stand[0] : 40), y: base.y + (stop.stand ? stop.stand[1] : 0) };
    const p = state.player;

    if (t.phase === 'walk') {
        // 포코는 앞서 뛰되, 내가 너무 뒤처지면 기다린다
        const far = dist(p, e) > 380;
        e.walkTo = far ? null : { x: goal.x, y: goal.y };
        e.homeX = goal.x; e.homeY = goal.y;
        t.nag -= dt;
        if (far && t.nag <= 0) { e.say('이쪽이야, 이쪽!'); t.nag = 4; }
        // 소품에 걸려 더 못 가면 그 자리에서 이야기한다 (1.5초 제자리면 다 온 셈)
        const moved = Math.hypot(e.x - (t.lx || 0), e.y - (t.ly || 0));
        t.stuck = moved < 3 ? (t.stuck || 0) + dt : 0;
        t.lx = e.x; t.ly = e.y;
        const arrived = dist(e, goal) < 48 || (t.stuck > 1.5 && dist(e, goal) < 260);
        if (arrived && dist(p, e) < 200) {
            t.phase = 'talk';
            e.walkTo = null;
            playScene(null, stop.lines, () => { t.i++; t.phase = 'walk'; t.stuck = 0; }, { cinematic: false });
        }
    }
}

function endTour() {
    const e = guide();
    if (e) e.walkTo = null;
    state.tour = null;
    markTutorial('toured');
    notify('tour');       // m0: 마을을 둘러본다 → 엘더에게 돌아간다
    saveGame();
}
