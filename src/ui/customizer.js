import { readSave } from '../systems/save.js';
import { STAGES } from '../data/elements.js';
import { DRAGON_SHEETS, HERO_PRESETS } from '../data/sprites.js';
import { loadImage } from '../render/assets.js';
import { tintImage } from '../render/tint.js';

const $ = (id) => document.getElementById(id);

// 고를 수 있는 외형: 주인공 프리셋 다섯 (data/sprites.js HERO). 몸·날개·문양 색을 바꿀 수 있다.
// 예전의 옛 종족 넷과 한 장짜리 외형 26종은 마을 용과 아이들이 계속 쓰지만 주인공용 고르기에서는 뺐다
let choice = { species: 'HERO', look: 0 };
let heroImg = null;
const cells = [];   // [canvas, preset]

function colorsNow() {
    return { body: $('c-body').value, wing: $('c-wing').value, mark: $('c-mark').value };
}

/** 고른 색으로 칸 미리보기를 다시 칠한다 (성체 그림) */
function paintCells() {
    if (!heroImg) return;
    const H = DRAGON_SHEETS.HERO;
    const tinted = tintImage(heroImg, H.zones, colorsNow());
    for (const [c, preset] of cells) {
        const look = preset * 3 + 2, b = H.boxes[look];
        const sx = (look % H.cols) * H.fw + b.x, sy = Math.floor(look / H.cols) * H.fh + b.y;
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.imageSmoothingEnabled = false;
        const k = Math.min(c.width / b.w, c.height / b.h);
        g.drawImage(tinted, sx, sy, b.w, b.h, (c.width - b.w * k) / 2, (c.height - b.h * k) / 2, b.w * k, b.h * k);
    }
}

async function buildGallery() {
    const box = $('c-gallery');
    heroImg = await loadImage(DRAGON_SHEETS.HERO.images.sheet);
    let first = null;
    HERO_PRESETS.forEach((preset, i) => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        c.title = preset.name;
        c.addEventListener('click', () => select(c, { species: 'HERO', look: i }, preset.name));
        box.appendChild(c);
        cells.push([c, i]);
        if (!first) first = [c, { species: 'HERO', look: i }, preset.name];
    });
    paintCells();
    for (const id of ['c-body', 'c-wing', 'c-mark']) $(id).addEventListener('input', paintCells);
    select(...first);
}

function select(canvas, value, name) {
    choice = value;
    for (const c of $('c-gallery').children) c.classList.toggle('selected', c === canvas);
    $('c-look-name').textContent = name;
    $('c-colors').style.display = value.species === 'LOOK' ? 'none' : 'flex';   // 한 장짜리 외형(LOOK)만 색을 못 바꾼다
}

/** 시작 화면. AWAKEN: onStart(config) 새 게임 / 이어하기: onStart(null, true) */
export function initCustomizer(onStart) {
    buildGallery();
    const save = readSave();
    if (save) {
        const btn = $('continue-btn');
        btn.textContent = `이어하기: ${save.player.config.name} · LV.${save.player.level} ${STAGES[save.player.stageIndex].name}`;
        btn.style.display = 'block';
        btn.addEventListener('click', () => onStart(null, true));
    }
    $('start-btn').addEventListener('click', () => {
        if (save && !confirm('새로 시작하면 저장된 진행 상황을 덮어씁니다. 계속할까요?')) return;
        onStart({
            name: $('c-name').value.trim() || 'Player',
            species: choice.species,
            look: choice.look,
            accessory: $('c-acc').value || null,
            colors: colorsNow(),
        });
    });
}
