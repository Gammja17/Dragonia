import { readSave } from '../systems/save.js';
import { STAGES } from '../data/elements.js';
import { DRAGON_SHEETS, LOOK_NAMES } from '../data/sprites.js';
import { loadImage } from '../render/assets.js';

const $ = (id) => document.getElementById(id);

// 고를 수 있는 외형: 색을 바꿀 수 있는 옛 종족 4 + 한 장짜리 새 외형 26
const CLASSIC = [['WESTERN', '서양룡 (색 변경 가능)'], ['WYVERN', '와이번 (색 변경 가능)'], ['HYDRA', '쌍두룡 (색 변경 가능)'], ['BEHEMOTH', '베히모스 (색 변경 가능)']];
let choice = { species: 'LOOK', look: 0 };

async function buildGallery() {
    const box = $('c-gallery');
    const looks = await loadImage(DRAGON_SHEETS.LOOK.images.sheet);
    const add = (draw, value, name) => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        draw(g);
        c.title = name;
        c.addEventListener('click', () => select(c, value, name));
        box.appendChild(c);
        return c;
    };
    let first = null;
    const L = DRAGON_SHEETS.LOOK;
    LOOK_NAMES.forEach((name, i) => {
        // 칸이 가로로 길어서(80x64) 64칸에 그대로 넣으면 눌린다. 비율을 지켜 가운데에 맞춘다
        const sx = (i % L.cols) * L.fw, sy = Math.floor(i / L.cols) * L.fh;
        const k = Math.min(64 / L.fw, 64 / L.fh);
        const c = add(g => g.drawImage(looks, sx, sy, L.fw, L.fh, (64 - L.fw * k) / 2, (64 - L.fh * k) / 2, L.fw * k, L.fh * k), { species: 'LOOK', look: i }, name);
        if (!first) first = [c, { species: 'LOOK', look: i }, name];
    });
    for (const [species, name] of CLASSIC) {
        const d = DRAGON_SHEETS[species];
        const img = await loadImage(d.images.down || d.images.sheet);
        // 정면 대기 프레임
        const sx = d.type === 'perDir' ? 0 : d.fw, sy = d.type === 'perDir' ? d.anims.idle.row * d.fh : d.rows.down * d.fh;
        add(g => { const k = Math.min(64 / d.fw, 64 / d.fh); g.imageSmoothingEnabled = true; g.drawImage(img, sx, sy, d.fw, d.fh, (64 - d.fw * k) / 2, (64 - d.fh * k) / 2, d.fw * k, d.fh * k); }, { species, look: 0 }, name);
    }
    select(...first);
}

function select(canvas, value, name) {
    choice = value;
    for (const c of $('c-gallery').children) c.classList.toggle('selected', c === canvas);
    $('c-look-name').textContent = name;
    $('c-colors').style.display = value.species === 'LOOK' ? 'none' : 'flex';   // 한 장짜리 외형은 색을 바꿀 수 없다
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
            colors: {
                body: $('c-body').value,
                wing: $('c-wing').value,
            },
        });
    });
}
