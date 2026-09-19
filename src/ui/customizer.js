import { readSave } from '../systems/save.js';
import { STAGES } from '../data/elements.js';

const $ = (id) => document.getElementById(id);

/** 시작 화면. AWAKEN: onStart(config) 새 게임 / 이어하기: onStart(null, true) */
export function initCustomizer(onStart) {
    const save = readSave();
    if (save) {
        const btn = $('continue-btn');
        btn.textContent = `이어하기 — ${save.player.config.name} · LV.${save.player.level} ${STAGES[save.player.stageIndex].name}`;
        btn.style.display = 'block';
        btn.addEventListener('click', () => onStart(null, true));
    }
    $('start-btn').addEventListener('click', () => {
        if (save && !confirm('새로 시작하면 저장된 진행 상황을 덮어씁니다. 계속할까요?')) return;
        onStart({
            name: $('c-name').value.trim() || 'Player',
            species: $('c-type').value,
            colors: {
                body: $('c-body').value,
                wing: $('c-wing').value,
            },
        });
    });
}
