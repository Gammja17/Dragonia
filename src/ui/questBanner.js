import { state } from '../core/state.js';
import { play } from '../systems/audio.js';

const $ = (id) => document.getElementById(id);

// 퀘스트 배너.
// 토스트는 쌓이다 사라져서, 이야기가 시작되거나 끝난 걸 놓치기 쉬웠다. 화면 가운데 위에 큼직하게 한 번 띄운다.
// 대화·컷씬 중이면 기다렸다가 조용해진 뒤에 띄운다 (updateHud 가 꺼낸다)
const bannerQueue = [];
let bannerTimer = null;
/** kind: '새 이야기' | '다음 할 일' | '이야기 완료' */
export function questBanner(kind, title, goal = '') {
    bannerQueue.push({ kind, title, goal });
}
export function flushQuestBanner() {
    if (!bannerQueue.length || state.isDialogueOpen || document.body.classList.contains('cutscene') || state.prologue) return;
    const b0 = $('quest-banner');
    if (b0.classList.contains('on')) return;   // 하나 끝나면 다음 것
    const { kind, title, goal } = bannerQueue.shift();
    $('qb-kind').textContent = kind;
    $('qb-title').textContent = title;
    $('qb-goal').textContent = goal;
    b0.classList.toggle('done', kind === '이야기 완료');
    b0.classList.remove('on'); void b0.offsetWidth; b0.classList.add('on');
    play(kind === '이야기 완료' ? 'level' : 'quest');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b0.classList.remove('on'), 3600);
}

