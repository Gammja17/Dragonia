import { isMuted, toggleMute, sfxVolume, setSfxVolume } from '../systems/audio.js';
import { musicVolume, setMusicVolume } from '../systems/music.js';
import { cycleZoom, zoomName } from '../core/camera.js';
import { toggleHelp, toggleUi } from './hud.js';
import { state } from '../core/state.js';
import { ELEMENTS } from '../data/elements.js';
import { LESSONS } from '../data/story.js';
import { BOSSES } from '../data/enemies.js';
import { saveGame } from '../systems/save.js';
import { showToast } from './toast.js';
import { GUIDE_LEVELS, guideLevel, cycleGuideLevel } from '../systems/guide.js';

// 설정 창. [Esc] 로 연다. 열려 있는 다른 창이 있으면 Esc 는 그것부터 닫는다 (main.js).
//   소리: 배경음·효과음 슬라이더, 전체 끄기
//   화면: 시점 단계, 좌우 UI 접기
//   조작법 보기

const $ = (id) => document.getElementById(id);
const PANELS = ['journal-panel', 'kids-panel', 'help-panel', 'den-panel', 'settings-panel'];

/** 떠 있는 창을 하나 닫는다. 닫은 게 있으면 true */
export function closeTopPanel() {
    for (const id of PANELS) {
        const p = $(id);
        if (p && p.style.display === 'flex') {
            if (id === 'help-panel') toggleHelp(); else p.style.display = 'none';
            return true;
        }
    }
    return false;
}

export function toggleSettings() {
    const panel = $('settings-panel');
    if (panel.style.display === 'flex') { panel.style.display = 'none'; return; }
    render();
    panel.style.display = 'flex';
}

function row(label, control) {
    const r = document.createElement('div');
    r.className = 'journal-row';
    const name = document.createElement('span');
    name.textContent = label;
    r.append(name, control);
    return r;
}
function slider(get, set) {
    const knob = document.createElement('span');
    knob.className = 'journal-slider';
    const bar = document.createElement('input');
    bar.type = 'range'; bar.min = 0; bar.max = 100; bar.value = Math.round(get() * 100);
    const num = document.createElement('i');
    num.textContent = bar.value;
    bar.addEventListener('input', () => { set(bar.value / 100); num.textContent = bar.value; });
    knob.append(bar, num);
    return knob;
}
function button(label, onClick) {
    const b = document.createElement('button');
    b.className = 'settings-btn';
    b.textContent = label;
    b.addEventListener('click', () => { onClick(); render(); });
    return b;
}
function section(title) {
    const h = document.createElement('div');
    h.className = 'journal-title';
    h.textContent = title;
    return h;
}

function render() {
    const body = $('settings-panel').querySelector('.panel-body');
    body.innerHTML = '';
    body.append(section('소리'));
    body.append(row('배경음', slider(musicVolume, setMusicVolume)));
    body.append(row('효과음', slider(sfxVolume, setSfxVolume)));
    body.append(row('전체 (O)', button(isMuted() ? '꺼짐 · 켜기' : '켜짐 · 끄기', toggleMute)));
    body.append(section('화면'));
    body.append(row('시점 (V · 휠)', button(zoomName(), () => cycleZoom(window.innerWidth, window.innerHeight))));
    body.append(row('좌우 정보 창 (U)', button('접기 · 펴기', toggleUi)));
    body.append(section('길잡이'));
    body.append(row('목표 화살표 · 자동 이동', button(GUIDE_LEVELS[guideLevel()], cycleGuideLevel)));
    const gnote = document.createElement('div');
    gnote.className = 'settings-note';
    gnote.textContent = '"본 이야기만" 이면 본 줄기의 할 일만 화살표가 가리키고, 마을 용들의 부탁과 "그 자리에 가 있기" 대목은 스스로 찾는다. 헤매기 싫으면 "맡은 일 전부", 다 찾아내고 싶으면 "끔".';
    body.append(gnote);
    // 테스트용. 뒷이야기를 확인하려고 둔 것이라 진행이 그대로 건너뛰어진다
    body.append(section('테스트 (진행을 건너뛴다)'));
    body.append(row(`레벨 ${state.player.level} → 16`, button('올린다', () => {
        const p = state.player;
        while (p.level < 16) p.gainXp(p.maxXp - p.xp);
        saveGame();
    })));
    body.append(row(`숨결 ${state.player.elements.length} / 3`, button('전부 준다', () => {
        const p = state.player;
        for (const id of Object.keys(ELEMENTS)) if (!p.elements.includes(id)) p.elements.push(id);
        showToast('세 숨결을 모두 얻었다. (테스트)', '✨');
        saveGame();
    })));
    body.append(row(`수련 ${state.story.lessons.length} / ${LESSONS.length} · 보스 ${Object.keys(state.bossesDefeated).length}`, button('채운다', () => {
        state.story.lessons = LESSONS.map(l => l.id);
        state.story.lessonDay = 0;
        for (const id of Object.keys(BOSSES)) state.bossesDefeated[id] = true;
        showToast('수련과 보스 기록을 채웠다. (테스트)', '📜');
        saveGame();
    })));

    body.append(section('그 밖에'));
    body.append(row('조작법 (H)', button('보기', () => { $('settings-panel').style.display = 'none'; toggleHelp(); })));
    const note = document.createElement('div');
    note.className = 'settings-note';
    note.textContent = '게임은 자동으로 저장된다. 처음부터 다시 하려면 첫 화면에서 새 용을 만든다.\n[테스트] 줄은 승급 시험 조건을 채워 주는 것뿐이다. 시험 자체는 카이론에게 청해야 한다.';
    body.append(note);
}

export function initSettings() {
    $('settings-close').addEventListener('click', toggleSettings);
}
