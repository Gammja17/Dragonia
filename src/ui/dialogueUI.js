// 대화창 DOM만 담당. 어떤 대사를 보여줄지는 systems/dialogue.js 가 결정.
import { drawPortrait } from '../render/spritesheet.js';
import { play } from '../systems/audio.js';
import { state } from '../core/state.js';

const $ = (id) => document.getElementById(id);
const TIERS = ['낯선 사이', '아는 사이', '친구', '절친'];
const tierOf = (r) => (r >= 75 ? 3 : r >= 50 ? 2 : r >= 25 ? 1 : 0);

let selected = 0;
let typer = null;

// 마을 인물(CAST 시트)의 얼굴 초상화: assets/portraits/<이름>_<표정>.png (96px). 표정은 neutral·happy·angry·sad·surprised·worried.
// 그림이 아직 안 받아졌으면 스프라이트를 대신 그리고, 받아지는 대로 다시 그린다 (그새 다른 인물로 바뀌었으면 그리지 않는다).
const portraitCache = new Map();
let portraitShown = null;
function drawFace(canvas, sheet, face) {
    const name = sheet && sheet.portrait;
    portraitShown = name;
    if (!name) { drawPortrait(canvas, sheet); return; }
    const key = `${name}_${face || 'neutral'}`;
    let img = portraitCache.get(key);
    if (!img) {
        img = new Image();
        img.src = `assets/portraits/${key}.png`;
        portraitCache.set(key, img);
    }
    if (!img.complete || !img.naturalWidth) {
        drawPortrait(canvas, sheet);
        img.onload = () => { if (portraitShown === name) drawFace(canvas, sheet, face); };
        return;
    }
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.imageSmoothingEnabled = false;   // 도트를 키워 그린다
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
}

/** 대사 속 {name} 을 주인공 이름으로 바꾼다. "{name}(이)" 의 '이'는 받침이 있을 때만 붙는다 */
function fillName(text) {
    if (!text || text.indexOf('{name}') < 0) return text;
    const name = state.player ? state.player.config.name : '';
    const code = name.charCodeAt(name.length - 1);
    const batchim = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
    return text.replace(/\{name\}\(이\)/g, name + (batchim ? '이' : '')).replace(/\{name\}/g, name);
}

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
    /** npc 를 넘기면 머리에 맡은 일·사이·호감도 막대를 함께 보여 준다 */
    /** face 는 초상화 표정 (없으면 neutral) */
    show({ name, text, options, onClose, sheet, npc, face }) {
        text = fillName(text);
        drawFace($('d-portrait'), sheet, face);
        $('dialogue-overlay').style.display = 'flex';
        $('d-name').textContent = name;
        const job = npc && npc.job ? npc.job : '';
        const rel = npc && npc.config && npc.config.fixed ? (npc.relation || 0) : null;
        $('d-job').textContent = job;
        $('d-tier').textContent = rel === null ? '' : (job ? '· ' : '') + TIERS[tierOf(rel)];
        const bar = $('d-rel');
        bar.classList.toggle('show', rel !== null);
        if (rel !== null) $('d-rel-fill').style.width = Math.min(100, rel) + '%';
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
