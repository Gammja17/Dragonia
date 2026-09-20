import { state } from '../core/state.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { DENS } from '../data/dens.js';
import { denLocked, cozyOf, inMyDen } from './den.js';
import { nearbyDenMouth, travelTo } from './world.js';
import { openDecorPanel } from '../ui/denPanel.js';
import { npcName } from '../data/npcs.js';
import { showToast } from '../ui/toast.js';

// 굴 입구 앞에서 [E] 를 눌렀을 때, 그리고 굴 안에서 [E] 를 눌렀을 때.

const close = () => { state.isDialogueOpen = false; dialogueUI.hide(); };

function ask(name, text, options) {
    state.isDialogueOpen = true;
    dialogueUI.show({ name, text, options, onClose: close });
}

/** 처리했으면 true */
export function tryDenInteract() {
    // 1) 굴 안 — 꾸미기
    if (inMyDen()) { openDecorPanel(); return true; }

    // 2) 굴 입구
    const mouth = nearbyDenMouth();
    if (!mouth) return false;
    const spec = DENS[mouth.denId];
    if (!spec) return false;

    const why = denLocked(mouth.denId);
    if (why) { ask(spec.name, why, [{ label: '돌아선다', onSelect: close }]); return true; }

    const owner = spec.owner ? state.entities.npcs.find(n => n.config.name === spec.owner) : null;
    const home = owner && Math.hypot(owner.x - mouth.x, owner.y - mouth.y) < 400;
    const line = spec.mine
        ? `내 굴이다. ${cozyOf(mouth.denId).name} — ${cozyOf(mouth.denId).note}`
        : home
            ? `${npcName(spec.owner)}의 굴이다. 주인이 근처에 있다.`
            : `${npcName(spec.owner)}의 굴이다. 지금은 비어 있는 것 같다.`;

    ask(spec.name, line, [
        { label: '🕯️ 들어간다', onSelect: () => { close(); travelTo(mouth.denId); } },
        { label: '다음에', onSelect: close },
    ]);
    return true;
}

/** 굴에 들어서면 한 번, 그 굴다운 첫인상을 남긴다 */
export function denIntro(mapId) {
    const spec = DENS[mapId];
    if (!spec || !spec.intro) return;
    state.densSeen = state.densSeen || [];
    if (state.densSeen.includes(mapId)) return;
    state.densSeen.push(mapId);
    showToast(spec.intro, '🕯️');
}
