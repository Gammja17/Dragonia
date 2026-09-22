import { state } from '../core/state.js';
import { pick } from '../core/utils.js';
import { ELEMENTS } from '../data/elements.js';
import { KID_TALK, KID_PERSONALITIES } from '../data/npcTalk.js';
import { burst } from '../entities/Particle.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { addAffection, findKid, renameKid, toggleKidMode } from './kids.js';
import { kidMoodLine } from './family.js';
import { KID_JOBS } from '../data/family.js';
import { WAR_KID_AFTER } from '../data/war.js';

// 자식과의 대화(T). 성격(personality)과 애정도에 따라 말투가 달라지고,
// 놀아 주기·훈련은 하루 한 번, 숨결 가르치기는 청소년부터.

function close() {
    state.isDialogueOpen = false;
    state.currentNpc = null;
    dialogueUI.hide();
}

function show(baby, kid, text, options) {
    state.isDialogueOpen = true;
    const title = `${kid.name} · ${KID_PERSONALITIES[kid.personality]} · ${'♥'.repeat(Math.max(1, Math.round(kid.affection / 20)))}`;
    dialogueUI.show({ name: title, text, sheet: baby.sheet, onClose: close, options });
}

/** 애정 단계(0~2)에 맞는 대사 하나 */
function line(kid, kind) {
    const talk = KID_TALK[kid.personality];
    const tier = kid.affection >= 60 ? 2 : kid.affection >= 25 ? 1 : 0;
    return pick(talk[kind][Math.min(tier, talk[kind].length - 1)]);
}

export function openKidHub(baby) {
    const kid = findKid(baby);
    if (!kid) return;
    const p = state.player;
    const back = () => openKidHub(baby);
    const opts = [
        { label: '이야기를 나눈다', onSelect: () => show(baby, kid, line(kid, 'chat'), [{ label: '그랬구나.', onSelect: back }]) },
        { label: '쓰다듬어 준다', onSelect: () => { show(baby, kid, baby.pet() ? line(kid, 'pet') : '(방금 쓰다듬어 줘서 시큰둥하다.)', [{ label: '귀여워.', onSelect: back }]); } },
    ];
    // 하루에 두 번까지. 배가 부르면 더 안 먹는다 (고기를 연타해서 키우던 것)
    const fed = kid.fedDay === state.day ? (kid.fedCount || 0) : 0;
    if (p.inventory.meat > 0 && fed < 2) opts.push({ label: `고기를 먹인다 (고기 -1, 오늘 ${fed}/2)`, onSelect: () => { p.inventory.meat--; kid.fedDay = state.day; kid.fedCount = fed + 1; baby.feed(); show(baby, kid, line(kid, 'feed'), [{ label: '많이 먹어.', onSelect: back }]); } });
    else if (p.inventory.meat > 0) opts.push({ label: '(오늘은 배가 불러서 더 안 먹는다)', onSelect: back });
    if (kid.lastPlayDay !== state.day) opts.push({ label: '놀아 준다 (하루 한 번)', onSelect: () => play(baby, kid, back) });
    if (kid.lastTrainDay !== state.day && kid.stage !== 'ADULT') opts.push({ label: '훈련시킨다 (하루 한 번)', onSelect: () => train(baby, kid, back) });
    if (kid.stage !== 'BABY' && baby.element !== p.element) {
        opts.push({ label: `${ELEMENTS[p.element].name} 숨결을 가르친다`, onSelect: () => {
            baby.element = p.element;
            burst(baby.x, baby.y - 30, ELEMENTS[p.element].color, 1, 16);
            show(baby, kid, line(kid, 'learn'), [{ label: '잘했어!', onSelect: back }]);
        } });
    }
    if (kid.stage !== 'ADULT') opts.push({ label: kid.mode === 'FOLLOW' ? '둥지를 지키고 있으렴' : '같이 가자', onSelect: () => { toggleKidMode(kid); close(); } });
    opts.push({ label: '이름을 지어 준다', onSelect: () => { const n = prompt('아이의 새 이름 (12자까지)', kid.name); if (n) renameKid(kid, n); back(); } });
    opts.push({ label: '다음에 또 놀자', onSelect: close });
    // 부모 사이에 일이 있으면 그 얘기부터 꺼낸다. 일을 맡은 아이는 무슨 일을 하는지 한 줄
    // 대습격 뒤 며칠은 아이들이 그 밤 얘기를 한 번 꺼낸다 (data/war.js). 숲으로 끌려갔던 아이는 겁을 먹었다
    let greet = kidMoodLine(kid) || line(kid, 'greet');
    if (kid.scaredDay != null && state.day - kid.scaredDay < 2) greet = '(아직 몸을 떨고 있다.) …나 굴에 있을래. 오늘은 안 나갈래.';
    else if (state.story.flags && state.story.flags.gron_dead && !kid.warTalked && state.day - ((state.story.deathDay || {}).Gron || 0) < 5) { kid.warTalked = true; greet = WAR_KID_AFTER[kid.personality]; }
    show(baby, kid, kid.job ? `(요즘은 [${KID_JOBS[kid.job].name}] 일을 한다.)

${greet}` : greet, opts);
}

function play(baby, kid, back) {
    kid.lastPlayDay = state.day;
    addAffection(baby, 12);
    baby.playTime = 4;   // 신나서 빙글빙글 (entities/BabyDragon.js)
    burst(baby.x, baby.y - 30, '#ffd84a', 1, 14);
    show(baby, kid, line(kid, 'play'), [{ label: '하하, 재밌다!', onSelect: back }]);
}

function train(baby, kid, back) {
    kid.lastTrainDay = state.day;
    addAffection(baby, 4);
    baby.grow(15);
    showToast(`${kid.name}의 훈련: 성장 +15`, '💪');
    show(baby, kid, line(kid, 'train'), [{ label: '대견하구나.', onSelect: back }]);
}
