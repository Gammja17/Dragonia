// 대화창 DOM만 담당. 어떤 대사를 보여줄지는 systems/dialogue.js 가 결정.
import { drawPortrait } from '../render/spritesheet.js';
import { play } from '../systems/audio.js';

const $ = (id) => document.getElementById(id);

let selected = 0;
let typer = null;

/** 대사를 한 글자씩 찍는다. 다시 호출되면 이전 것은 멈춘다 */
function typeText(text) {
    clearInterval(typer);
    const el = $('d-text');
    let i = 0;
    el.textContent = '';
    typer = setInterval(() => {
        i += 2;
        el.textContent = text.slice(0, i);
        if (i % 6 === 0) play('talk');
        if (i >= text.length) clearInterval(typer);
    }, 16);
}

function highlight() {
    [...$('d-options').children].forEach((b, i) => b.classList.toggle('selected', i === selected));
}

export const dialogueUI = {
    /** options: [{ label, onSelect }]. 비어 있으면 '닫기' 버튼만 표시 */
    show({ name, text, options, onClose, sheet }) {
        drawPortrait($('d-portrait'), sheet);
        $('dialogue-overlay').style.display = 'flex';
        $('d-name').textContent = name;
        typeText(text);
        const box = $('d-options');
        box.innerHTML = '';
        const list = options.length ? options : [{ label: '닫기', onSelect: onClose }];
        list.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'd-btn';
            btn.textContent = opt.label;                      // 번호는 붙이지 않는다 (방향키로 고른다)
            btn.onclick = () => { play('ui'); opt.onSelect(); };
            // 마우스를 '움직여' 얹으면 그 줄이 골라진다.
            // mouseenter 를 쓰면 창이 열리는 순간 커서 밑에 깔린 줄이 멋대로 골라진다
            btn.onmousemove = () => { if (selected !== i) { selected = i; highlight(); } };
            box.appendChild(btn);
        });
        selected = 0;
        highlight();
    },
    /** 키보드로 고르기: 방향키(또는 W·S)로 옮기고 [Space]·Enter 로 고른다 */
    handleKeys(input) {
        const buttons = [...$('d-options').children];
        if (!buttons.length) return;
        if (input.pressed('down') || input.pressed('right')) { selected = (selected + 1) % buttons.length; play('ui'); highlight(); }
        if (input.pressed('up') || input.pressed('left')) { selected = (selected + buttons.length - 1) % buttons.length; play('ui'); highlight(); }
        if (input.pressed('confirm') || input.pressed('interact') || input.pressed('talk')) buttons[selected].click();
    },
    hide() {
        $('dialogue-overlay').style.display = 'none';
        $('d-options').innerHTML = ''; // 숨겨진 버튼이 남아 다시 눌리는 일 방지
    },
};
