import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { coarseCenter } from '../world/mapgen.js';
import { playScene } from './chronicle.js';
import { anyNpc } from './world.js';
import { acceptQuest } from './quests.js';
import { QUESTS } from '../data/quests.js';
import { markTutorial } from './tutorial.js';
import { showToast } from '../ui/toast.js';
import { saveGame } from './save.js';

// 첫날, 촌장이 마을을 데리고 돈다.
//
// 눈을 뜨자마자 "알아서 둘러보거라" 하고 놓아 버리면 뭘 해야 할지 모른다.
// 엘더가 앞장서서 네 군데를 들르고, 마지막에 네 굴 앞에서 오늘 밤은 여기서
// 자라고 한다. 둘째 날 아침에 스승을 소개받는 장면(story.js 의 ch1)으로 이어진다.
//
// state.tour = { i: 몇 번째 자리, phase: 'walk' | 'talk' }

const STOPS = [
    { at: [12, 7], stand: [-90, 50], lines: [
        { who: 'Elder', text: '따라와라. 천천히 걷는다. 무릎 때문이다.' },
        { who: 'Elder', text: '여기가 한가운데다. 샘물은 아무나 마셔도 된다. 포코가 물장난만 안 치면.' },
    ] },
    { at: [15, 7], stand: [-70, 60], lines: [
        { who: 'Elder', text: '그론의 대장간이다. 숲에서 주워 온 것들로 비늘을 단단하게 해 준다.' },
        { who: 'Gron', text: '뭘 봐. 살 거 아니면 가.' },
        { who: 'Elder', text: '성격은 저래도 손은 마을에서 제일 좋다. 익숙해진다.' },
    ] },
    { at: [12, 12], stand: [60, 40], lines: [
        { who: 'Elder', text: '옛 용들이 길목마다 세워 둔 돌이다. 손을 얹으면 깨어난다.' },
        { who: 'Elder', text: '깨운 돌끼리는 서로 울린다. 먼 길을 두 번 안 걸어도 돼. 바깥에서 보거든 꼭 손을 얹어 둬라.' },
    ] },
    { at: [5, 10], stand: [90, 60], lines: [
        { who: 'Elder', text: '그리고 여기가 네 굴이다.' },
        { who: 'Elder', text: '비어 있다. 돌바닥뿐이다. 그래도 네 거다. 다들 굴 하나씩 갖고 산다. 너도 이제 그렇다.' },
        { who: 'Elder', text: '오늘은 여기서 자라. 내일 아침에 할 얘기가 있다.' },
        { who: 'Elder', text: '아, 그 전에. 동쪽 숲에 슬라임이 늘었다더라. 몸 풀 겸 셋만 잡아 와라. 해 지기 전에 돌아오고.' },
    ] },
];

const at = ([cx, cy]) => ({ x: coarseCenter(cx), y: coarseCenter(cy) });

export function inTour() { return !!state.tour; }

/** 처음 나눈 말이 끝나면 dialogue.js 가 부른다 */
export function startTour() {
    if (state.tour || state.tutorial.toured) return;
    state.tour = { i: 0, phase: 'walk', nag: 0 };
    showToast('엘더를 따라가자.', '👣');
}

function elder() { return anyNpc('Elder'); }

export function updateTour(dt) {
    const t = state.tour;
    if (!t || state.mapId !== 'VILLAGE') return;
    const e = elder();
    if (!e) return;
    const stop = STOPS[t.i];
    if (!stop) { endTour(); return; }
    const base = at(stop.at);
    const goal = { x: base.x + (stop.stand ? stop.stand[0] : 40), y: base.y + (stop.stand ? stop.stand[1] : 0) };
    const p = state.player;

    if (t.phase === 'walk') {
        // 촌장은 앞서 걷되, 내가 너무 뒤처지면 기다린다
        const far = dist(p, e) > 380;
        e.walkTo = far ? null : { x: goal.x, y: goal.y };
        e.homeX = goal.x; e.homeY = goal.y;
        t.nag -= dt;
        if (far && t.nag <= 0) { e.say('이쪽이다.'); t.nag = 4; }
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
    const e = elder();
    if (e) e.walkTo = null;
    state.tour = null;
    markTutorial('toured');
    const m1 = QUESTS.find(q => q.id === 'm1');
    if (m1 && !(m1.id in state.quests.active) && !state.quests.done.includes('m1')) acceptQuest(m1);
    saveGame();
}
