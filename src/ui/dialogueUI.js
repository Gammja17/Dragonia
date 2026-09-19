// 대화창 DOM만 담당. 어떤 대사를 보여줄지는 systems/dialogue.js 가 결정.
import { drawPortrait } from '../render/spritesheet.js';
import { play } from '../systems/audio.js';

const $ = (id) => document.getElementById(id);

let selected = 0;

function highlight() {
    [...$('d-options').children].forEach((b, i) => b.classList.toggle('selected', i === selected));
}

export const dialogueUI = {
    /** options: [{ label, onSelect }]. 비어 있으면 '닫기' 버튼만 표시 */
    show({ name, text, options, onClose, sheet }) {
        drawPortrait($('d-portrait'), sheet);
        $('dialogue-overlay').style.display = 'flex';
        $('d-name').textContent = name;
        $('d-text').textContent = text;
        const box = $('d-options');
        box.innerHTML = '';
        const list = options.length ? options : [{ label: '닫기', onSelect: onClose }];
        for (const opt of list) {
            const btn = document.createElement('button');
            btn.className = 'd-btn';
            btn.textContent = `${box.children.length + 1}. ${opt.label}`;
            btn.onclick = () => { play('ui'); opt.onSelect(); };
            box.appendChild(btn);
        }
        selected = 0;
        highlight();
    },
    /** 키보드로 고르기: 숫자키는 바로 선택, W/S·방향키로 옮기고 Enter/E 로 확정 */
    handleKeys(input) {
        const buttons = [...$('d-options').children];
        if (!buttons.length) return;
        for (let i = 0; i < Math.min(9, buttons.length); i++) {
            if (input.pressed('num' + (i + 1))) { buttons[i].click(); return; }
        }
        if (input.pressed('down') || input.pressed('right')) { selected = (selected + 1) % buttons.length; highlight(); }
        if (input.pressed('up') || input.pressed('left')) { selected = (selected + buttons.length - 1) % buttons.length; highlight(); }
        if (input.pressed('confirm') || input.pressed('interact')) buttons[selected].click();
    },
    hide() {
        $('dialogue-overlay').style.display = 'none';
        $('d-options').innerHTML = ''; // 숨겨진 버튼이 남아 다시 눌리는 일 방지
    },
};
