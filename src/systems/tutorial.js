import { state } from '../core/state.js';

// 처음 며칠을 이끌어 주는 안내. 화면 오른쪽에 "지금 할 일" 한 줄씩 뜨고,
// 해내면 체크되고 다음으로 넘어간다. 아홉 단계를 다 마치면 조용히 사라진다.
//
// 조건은 대부분 이미 있는 상태값으로 판단한다. 그걸로 알 수 없는 것(움직였나,
// 일지를 열었나, 고기를 먹었나)만 state.tutorial 에 깃발을 세운다.

const kills = (s) => Object.values(s.stats.kills || {}).reduce((a, b) => a + b, 0);

export const TUTORIAL_STEPS = [
    { id: 'move',    text: '[WASD]로 마을을 걸어 본다',                          done: s => s.tutorial.moved },
    { id: 'talk',    text: '촌장 엘더에게 [Space]로 말을 건다',                   done: s => s.elderTutorialDone },
    { id: 'quest',   text: '엘더의 첫 부탁을 맡는다',                             done: s => Object.keys(s.quests.active).length > 0 || s.quests.done.length > 0 },
    { id: 'journal', text: '[J] 일지를 열어 맡은 일을 읽어 본다',                  done: s => s.tutorial.journal },
    { id: 'fight',   text: '마을 밖으로 나가, 마우스로 겨눠 적을 쓰러뜨린다',        done: s => kills(s) >= 1 },
    { id: 'eat',     text: '[E]로 고기를 먹어 허기를 채운다',                      done: s => s.tutorial.ate },
    { id: 'report',  text: '엘더에게 돌아가 끝낸 일을 보고한다',                    done: s => s.quests.done.length >= 1 },
    { id: 'dojo',    text: '마을 동쪽 수련장에서 카이론에게 수련을 받는다',          done: s => s.story.lessons.length >= 1 },
    { id: 'sleep',   text: '마을 북쪽 아지트의 둥지에서 [Space]로 잠든다',          done: s => s.day >= 2 },
];

/** 아직 못 끝낸 첫 단계의 번호. 다 끝냈으면 -1 */
export function currentStep() {
    if (!state.tutorial || state.tutorial.finished) return -1;
    return TUTORIAL_STEPS.findIndex(step => !step.done(state));
}

/** 화면에 띄울 것: { index, total, steps: [{ text, done }] } · 끝났으면 null */
export function tutorialView() {
    const at = currentStep();
    if (at < 0) return null;
    // 지금 할 일과 그다음 둘까지만 보여 준다 (다 늘어놓으면 그것대로 부담이다)
    const steps = TUTORIAL_STEPS.slice(at, at + 3).map((s, i) => ({ text: s.text, now: i === 0 }));
    return { index: at + 1, total: TUTORIAL_STEPS.length, steps };
}

/** 매 프레임. 단계를 다 마치면 한 번만 알린다 */
export function updateTutorial(onFinish) {
    if (!state.tutorial || state.tutorial.finished) return;
    if (currentStep() < 0) {
        state.tutorial.finished = true;
        if (onFinish) onFinish();
    }
}

/** 상태값만으로는 알 수 없는 것들 (게임 곳곳에서 한 줄로 부른다) */
export function markTutorial(flag) {
    if (state.tutorial && !state.tutorial[flag]) state.tutorial[flag] = true;
}
