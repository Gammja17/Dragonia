// 대화창 DOM만 담당. 어떤 대사를 보여줄지는 systems/dialogue.js 가 결정.
import { drawPortrait } from '../render/spritesheet.js';

const $ = (id) => document.getElementById(id);

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
            btn.textContent = opt.label;
            btn.onclick = opt.onSelect;
            box.appendChild(btn);
        }
    },
    hide() {
        $('dialogue-overlay').style.display = 'none';
        $('d-options').innerHTML = ''; // 숨겨진 버튼이 남아 다시 눌리는 일 방지
    },
};
