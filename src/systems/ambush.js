import { state } from '../core/state.js';
import { dist, rand, pick } from '../core/utils.js';
import { Human } from '../entities/Human.js';
import { setBossBar } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';
import { spawnEffect, spawnText } from '../render/vfx.js';
import { shake } from '../core/camera.js';
import { playScene, addClue } from './chronicle.js';
import { grantRelic, ownsRelic } from './relics.js';
import { offerRelics } from './relicOffer.js';
import { play } from './audio.js';
import { saveGame } from './save.js';

// 사냥꾼 대장 베르단의 포위. 마을 밖 길에서 혼자(혹은 짝과) 둘러싸인다.
//
// 사냥꾼 습격은 늘 마을에서 벌어져서 인간 쪽에는 얼굴이 없었다. 베르단은 사냥꾼들의 대장이고,
// 잿마루가 흘린 지도를 들고 다니는 자다 (text/story-bible.md 의 "지도는 위에서 본 자가 그렸다").
//
//   1페  둘러싼 궁수와 기사. 대장은 뒤에서 지휘한다
//   2페  (대장 60%) 그물꾼이 합류하고 대장이 앞으로 나선다
//   3페  (대장 30%) 대장이 부하를 물리고 혼자 돌진한다. 돌진은 간발로 피하면 비틀거리고, 그동안 두 배로 맞는다
//
// state.ambush = { phase, captain, t, waveT, done } · 없으면 없는 것

const CAPTAIN_NAME = '사냥꾼 대장 베르단';
const RING = 400;

export function inAmbush() { return !!state.ambush; }

/** 포위가 시작된다. first: 이야기로 처음 만나는 날 (chronicle.js 의 ev_ambush) */
export function startAmbush(first = false) {
    const p = state.player;
    const n = (state.story.ambushes || 0);
    const cap = new Human(p.x + Math.cos(-Math.PI / 2) * RING, p.y + Math.sin(-Math.PI / 2) * RING, 'CAPTAIN');
    cap.title = CAPTAIN_NAME;
    cap.maxHp = cap.hp = Math.round((700 + p.level * 45) * (1 + n * 0.25));
    cap.power = 1 + n * 0.15;
    cap.holdBack = true;   // 1페: 뒤에서 지휘만 한다
    state.entities.humans.push(cap);
    ring(['ARCHER', 'KNIGHT', 'ARCHER', 'KNIGHT', 'ARCHER', 'KNIGHT'], cap.power);
    state.ambush = { phase: 1, captain: cap, t: 0, waveT: 0, first };
    setBossBar(CAPTAIN_NAME, 1);
    showToast(first ? '둘러싸였다! 사냥꾼 대장이 직접 나왔다.' : '베르단이 또 길을 막았다. 둘러싸였다!', '⚠️');
    play('warn'); shake(8);
    saveGame();
}

function ring(types, power) {
    const p = state.player;
    types.forEach((t, i) => {
        const a = (i / types.length) * Math.PI * 2 + Math.PI / 6;
        const h = new Human(p.x + Math.cos(a) * RING, p.y + Math.sin(a) * RING, t);
        h.power = power;
        state.entities.humans.push(h);
        spawnEffect('PUFF', h.x, h.y - 10);
    });
}

export function updateAmbush(dt) {
    const a = state.ambush;
    if (!a) return;
    const cap = a.captain, p = state.player;
    a.t += dt;

    // 다른 지도로 달아났다: 이번에는 놓아 준다. 며칠 뒤 또 온다
    if (!state.entities.humans.includes(cap)) {
        if (cap.remove && cap.hp <= 0) return;   // die 가 처리했다
        endAmbush(false);
        return;
    }

    setBossBar(CAPTAIN_NAME + (a.phase === 3 ? ' · 최후의 돌진' : a.phase === 2 ? ' · 그물' : ''), Math.max(0, cap.hp / cap.maxHp));

    if (a.phase === 1 && cap.hp <= cap.maxHp * 0.6) {
        a.phase = 2;
        cap.holdBack = false;
        cap.say('그물을 쳐라! 날개부터 묶어!');
        ring(['TRAPPER', 'TRAPPER', 'ARCHER'], cap.power);
        clearArrows();
        play('warn'); shake(6);
    } else if (a.phase === 2 && cap.hp <= cap.maxHp * 0.3) {
        a.phase = 3;
        cap.say('다들 물러서라. 이건 내가 직접 끝낸다.');
        for (const h of state.entities.humans) if (h !== cap) { h.fleeing = true; }
        clearArrows();
        cap.hp = Math.max(cap.hp, cap.maxHp * 0.3);
        play('warn'); shake(10);
    }

    // 3페: 돌진을 되풀이한다. 간발로 피하면 비틀거린다 (entities/Human.js 의 charge)
    if (a.phase === 3 && !cap.charge && !(cap.stagger > 0)) {
        a.waveT -= dt;
        if (a.waveT <= 0) {
            a.waveT = 2.2;
            cap.charge = { windup: 0.75, dir: Math.atan2(p.y - cap.y, p.x - cap.x), t: 0.55, speed: 820, hit: false };
            spawnText(cap.x, cap.y - 90, '돌진!', '#ff6b5e', 16);
        }
    }
    // 1~2페: 부하가 다 죽으면 대장이 새로 부른다
    if (a.phase < 3) {
        a.waveT -= dt;
        const alive = state.entities.humans.filter(h => h !== cap && !h.remove).length;
        if (alive === 0 && a.waveT <= 0) { a.waveT = 6; cap.say('다음 조, 앞으로!'); ring(a.phase === 1 ? ['KNIGHT', 'ARCHER', 'KNIGHT'] : ['TRAPPER', 'KNIGHT', 'ARCHER'], cap.power); }
    }
}

function clearArrows() { for (const b of state.entities.bullets) if (b.faction === 'ENEMY') b.remove = true; }

/** 대장이 쓰러졌다 (entities/Human.js 의 die) */
export function onCaptainDown(cap) {
    const a = state.ambush;
    if (!a || a.captain !== cap) return;
    for (const h of state.entities.humans) if (h !== cap) h.fleeing = true;
    state.story.ambushes = (state.story.ambushes || 0) + 1;
    state.story.lastAmbushDay = state.day;
    setBossBar(null);
    const first = a.first;
    state.ambush = null;
    const lines = first ? [
        { who: '나', text: '(베르단이 무릎을 꿇었다. 부하들이 그를 끌고 물러난다. 떨어뜨리고 간 가죽 두루마리를 펼쳐 보니 우리 마을이 그려져 있다.)' },
        { who: '나', text: '(집 하나하나, 망루, 굴 입구까지 다 맞다. 그런데 이 지도는 길에서 본 모양이 아니라 하늘에서 내려다본 모양으로 그려져 있다.)' },
        { who: '나', text: '(구석에 인간의 글자가 아닌 것이 적혀 있다. 발톱으로 긁은 자국 같은데, 무슨 뜻인지는 모르겠다.)' },
    ] : [
        { who: '나', text: `(베르단이 또 물러났다. 부하들이 끌고 가면서 이쪽을 노려본다. 저 자는 포기하는 법을 모르는 것 같다.)` },
    ];
    playScene('사냥꾼 대장', lines, () => {
        if (first) { addClue('map'); showToast('일지 [기록]에 단서가 적혔다: 하늘에서 본 지도', '📖'); }
        if (!ownsRelic('CAPTAIN_HORN')) grantRelic('CAPTAIN_HORN', state.player.x, state.player.y);
        else offerRelics('베르단이 떨어뜨리고 간 것');
        state.raidTimer = Math.max(state.raidTimer, 180);   // 대장이 다쳤으니 한동안 습격이 뜸하다
        saveGame();
    });
}

function endAmbush(win) {
    setBossBar(null);
    state.ambush = null;
    for (const h of state.entities.humans) h.fleeing = true;
    state.story.lastAmbushDay = state.day;
    if (!win) showToast('사냥꾼들을 따돌렸다. 베르단은 다시 올 것이다.', '💨');
}

/** 지도에 들어설 때 (systems/world.js). 처음 만난 뒤로는 닷새마다 한 번쯤 길에서 다시 마주친다 */
export function maybeAmbush(mapId) {
    if (state.ambush || !(state.story.ambushes > 0)) return;
    if (!['EAST_ROAD', 'SOUTH_ROAD', 'LAKE', 'HOLLOW', 'DESERT'].includes(mapId)) return;
    if (state.dayTime < 0.25 || state.dayTime > 0.8 || state.raid.active || state.activity) return;
    if (state.day - (state.story.lastAmbushDay || 0) < 5) return;
    if (Math.random() < 0.35) setTimeout(() => { if (state.mapId === mapId && !state.isDialogueOpen) startAmbush(false); }, 1500);
}
