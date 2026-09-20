import { state } from '../core/state.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { npcName } from '../data/npcs.js';
import { daysToGather, isGatherDay } from './gathering.js';
import { play } from './audio.js';

// 폭포 위로 올라가려 할 때 유안이 막아선다.
// 모임에 한 번 나가 보기 전까지는 남의 마을이다.

export { invitedUp } from './gathering.js';

let cooling = 0;

export function blockAtBorder() {
    if (state.gameTime < cooling) return;     // 포탈 앞에서 반복해 뜨지 않게
    cooling = state.gameTime + 6;
    state.isDialogueOpen = true;
    play('talk');
    const yuan = state.entities.npcs.find(n => n.config.name === 'Yuan');
    const left = daysToGather();
    const when = isGatherDay() ? '오늘 밤이 그날이다. 해가 지거든 다시 오너라.' : `${left}일 뒤 밤이 그날이다.`;
    dialogueUI.show({
        name: npcName('Yuan'),
        text: `거기까지다. 이 위는 구름마루의 땅이다.\n\n…달이 가장 밝은 밤에는 폭포 아래에서 모임이 선다. 그날은 누구도 이빨을 드러내지 않기로 했지. 올라오고 싶거든 그날 여기로 와라.\n\n(${when})`,
        sheet: yuan ? yuan.sheet : null,
        onClose: close,
        options: [{ label: '알겠다', onSelect: close }],
    });
}

function close() { state.isDialogueOpen = false; dialogueUI.hide(); }
