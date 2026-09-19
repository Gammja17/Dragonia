import { state } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { NPC_SCRIPTS } from '../data/dialogues.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { openNpcHub } from './npcActions.js';
import { burst } from '../entities/Particle.js';

/** type: 'TALK' | 'FLIRT' */
export function startDialogue(npc, type) {
    state.currentNpc = npc;
    state.isDialogueOpen = true;

    // 엘더는 튜토리얼이 끝난 뒤에야 평소 대화·퀘스트가 열린다
    const tutorialPending = npc.config.role === 'ELDER' && !state.elderTutorialDone;
    // 마을 고정 NPC는 고유 대화 화면으로
    if (type === 'TALK' && !tutorialPending && openNpcHub(npc)) return;

    let group;
    let key = 'intro';
    if (npc.config.role === 'ELDER') {
        group = (!state.elderTutorialDone && type === 'TALK') ? NPC_SCRIPTS.TUTORIAL : NPC_SCRIPTS.WISE;
    } else if (type === 'FLIRT' && npc.config.canPartner) {
        group = NPC_SCRIPTS.FLIRT;
        key = npc.relation < 30 ? 'low' : npc.relation < 60 ? 'mid' : 'high';
    } else {
        group = NPC_SCRIPTS[npc.config.personality] || NPC_SCRIPTS.WISE;
    }
    renderNode(group, key, npc);
}

export function closeDialogue() {
    state.isDialogueOpen = false;
    state.currentNpc = null;
    dialogueUI.hide();
}

function renderNode(group, key, npc) {
    const node = group[key];
    if (!node) { closeDialogue(); return; }
    dialogueUI.show({
        name: npc.config.name || '???',
        text: node.text,
        options: [
            ...node.options.map(opt => ({ label: opt.t, onSelect: () => choose(group, opt, npc) })),
            ...(key === 'intro' && canGift(npc) ? [{ label: '고기를 선물한다 (고기 -1)', onSelect: () => gift(npc) }] : []),
        ],
        onClose: closeDialogue,
        sheet: npc.sheet,
    });
}

function choose(group, opt, npc) {
    if (opt.eff) {
        npc.relation = clamp((npc.relation || 0) + opt.eff, 0, 100);
        showToast(opt.eff > 0 ? "좋아했다!" : "싫어했다...", opt.eff > 0 ? "💖" : "💔");
    }

    switch (opt.next) {
        case 'end':
            if (group === NPC_SCRIPTS.TUTORIAL) {
                state.elderTutorialDone = true;
                giveMeat(3, "튜토리얼 보상: 고기 3개 획득!");
            }
            closeDialogue();
            break;
        case 'meat':
            giveMeat(3, "고기 3개를 받았습니다!");
            renderNode(group, 'meat', npc);
            break;
        case 'partner':
            // 짝이 되려면 데이트 세 번 뒤 대화(T)에서 고백해야 한다 (systems/npcActions.js)
            showToast("마음이 통한 것 같다. 데이트를 세 번 하고 나면, 대화에서 [마음을 고백한다]를 고를 수 있습니다.", "💗");
            closeDialogue();
            break;
        default:
            renderNode(group, opt.next, npc);
    }
}

function giveMeat(n, msg) {
    if (!state.player) return;
    state.player.inventory.meat += n;
    showToast(msg, "🍖");
}

// 선물: NPC마다 하루에 한 번, 호감도 +8
function canGift(npc) {
    return npc.config.role !== 'ELDER' && state.player.inventory.meat > 0 && npc.lastGiftDay !== state.day;
}

function gift(npc) {
    state.player.inventory.meat--;
    npc.lastGiftDay = state.day;
    npc.relation = clamp((npc.relation || 0) + 8, 0, 100);
    burst(npc.x, npc.y - 60, '#ff7aa8', 1, 10);
    npc.say('고마워! 잘 먹을게.');
    showToast(`${npc.config.name}에게 고기를 선물했습니다. (호감 ↑)`, '🎁');
    closeDialogue();
}
