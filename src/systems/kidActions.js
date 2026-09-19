import { state } from '../core/state.js';
import { pick } from '../core/utils.js';
import { ELEMENTS } from '../data/elements.js';
import { KID_TALK, KID_PERSONALITIES } from '../data/npcTalk.js';
import { burst } from '../entities/Particle.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { addAffection, findKid, renameKid, toggleKidMode } from './kids.js';

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
    if (p.inventory.meat > 0) opts.push({ label: '고기를 먹인다 (고기 -1)', onSelect: () => { p.inventory.meat--; baby.feed(); show(baby, kid, line(kid, 'feed'), [{ label: '많이 먹어.', onSelect: back }]); } });
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
    show(baby, kid, line(kid, 'greet'), opts);
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
    baby.grow(22);
    showToast(`${kid.name}의 훈련: 성장 +22`, '💪');
    show(baby, kid, line(kid, 'train'), [{ label: '대견하구나.', onSelect: back }]);
}
