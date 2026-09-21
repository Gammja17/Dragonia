import { state } from '../core/state.js';
import { npcName } from '../data/npcs.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { play } from './audio.js';
import { saveGame } from './save.js';
import { acceptQuest, takeQuestScene, notify } from './quests.js';
import { QUESTS } from '../data/quests.js';
import { CHRONICLE } from '../data/chronicle.js';
import { BOND_SCENES } from '../data/npcTalk.js';
import { activeBiome } from '../world/terrain.js';
import { inDungeon } from './delve.js';
import { isGatherNow } from './gathering.js';
import { beginCutscene, focusOn, endCutscene } from './cutscene.js';
import { anyNpc, travelTo } from './world.js';

// 사건. "가서 잡아라" 대신, 돌아다니다 보면 일이 벌어지고 그 자리에서 이야기가 열린다.
//
//  · 조건이 맞으면 그 자리에서 장면이 재생된다 (하루의 아무 때나)
//  · 장면이 끝나면 그에 딸린 퀘스트가 저절로 맡겨진다 (auto 퀘스트는 NPC가 따로 주지 않는다)
//  · 한 번 본 사건은 state.story.events 에 남아 다시 나오지 않는다
//
// 조건은 data/chronicle.js 의 when(ctx) 하나로 쓴다. ctx 에는 state 와 함께
// 지금 있는 바이옴·지역·시간대처럼 자주 쓰는 것들을 미리 담아 준다.

let checkTimer = 0;
let playing = false;

function context() {
    const p = state.player;
    const t = state.dayTime;
    return {
        s: state,
        biome: activeBiome(),
        map: state.mapId,
        night: t < 0.22 || t > 0.82,
        hour: t * 24,
        day: state.day,
        done: (id) => state.quests.done.includes(id),
        active: (id) => id in state.quests.active,
        lessons: state.story.lessons.length,
        gathering: isGatherNow(),
        boss: (id) => !!state.bossesDefeated[id],
        // 퀘스트 마무리에서 무엇을 골랐는지. 사건이 그 선택을 기억한다
        chose: (questId, optionId) => (state.quests.choices || {})[questId] === optionId,
        // 그 용과 데이트를 몇 번 했나 (밀회 줄기가 갈린다)
        datesOf: (name) => { const n = anyNpc(name); return n ? (n.dates || 0) : 0; },
        relationOf: (name) => {
            const n = state.entities.npcs.find(x => x.config.name === name);
            return n ? (n.relation || 0) : 0;
        },
    };
}

/** 정체의 단서를 하나 적어 둔다 (일지 [기록]) */
export function addClue(id) {
    if (!state.story.clues) state.story.clues = [];
    if (!state.story.clues.includes(id)) state.story.clues.push(id);
}

export function seenEvent(id) { return (state.story.events || []).includes(id); }

/** 매 프레임 호출. 0.8초마다 조건이 맞는 사건이 있는지 살핀다 */
export function updateChronicle(dt) {
    if (playing || state.isDialogueOpen || inDungeon() || state.activity || state.raid.active) return;
    if (state.bannerUntil && state.gameTime < state.bannerUntil) return;   // 지역 이름이 떠 있는 동안은 기다린다
    checkTimer -= dt;
    if (checkTimer > 0) return;
    checkTimer = 0.8;
    if (!state.story.events) state.story.events = [];

    // 퀘스트 대목을 끝내며 밀어 둔 장면이 먼저다. 싸움 한복판에서 대목이 끝났을 수 있으므로
    // 그 자리에서 바로 틀지 않고, 조용해진 지금 꺼내 재생한다 (systems/quests.js)
    const qs = takeQuestScene();
    if (qs) {
        playing = true;
        playScene(qs.title, qs.lines, () => { playing = false; saveGame(); });
        return;
    }

    // 대화 중에 사이가 깊어졌으면, 대화가 끝난 지금 그 장면을 보여 준다
    const bond = state.pendingBond;
    if (bond) {
        state.pendingBond = null;
        const lines = (BOND_SCENES[bond.name] || {})[bond.tier];
        if (lines) {
            playing = true;
            playScene(`${bond.name}와(과) ${['', '아는 사이', '친구', '절친'][bond.tier]}가 되었다`, lines, () => { playing = false; saveGame(); });
            return;
        }
    }
    const ctx = context();
    const ev = CHRONICLE.find(e => !seenEvent(e.id) && e.when(ctx));
    if (ev) fire(ev);
}

function fire(ev) {
    state.story.events.push(ev.id);
    playing = true;
    playScene(ev.title, ev.lines, () => {
        playing = false;
        if (ev.grant) {
            const q = QUESTS.find(x => x.id === ev.grant);
            if (q) acceptQuest(q);
        }
        if (ev.clue) addClue(ev.clue);
        notify('event', ev.id);      // "그 자리에 가 있기"가 목표인 대목
        if (ev.toast) showToast(ev.toast, ev.icon || '📖');
        saveGame();
    });
}

/**
 * 여러 줄짜리 장면을 차례로 보여 준다. 아침 장면(systems/story.js)도 이걸 쓴다.
 * line = { who: NPC 이름 | '나' | '???', text }
 */
export function playScene(title, lines, then, { cinematic = true, place = null } = {}) {
    // 장면이 벌어질 곳이 따로 있으면 먼저 그리로 간다. 그 자리에서 촌장이 튀어나오는 것보다 낫다
    if (place && place !== state.mapId && !state.dungeon) travelTo(place);
    if (cinematic) beginCutscene(title || '');
    else if (title) showToast(title, '📖');

    // 말하는 용이 지금 이 지도에 없어도 찾아낸다 (초상화가 비면 장면이 허전하다)
    const find = (who) => who === '나' ? state.player
        : state.entities.bosses.find(b => b.id === who || (b.def && b.def.name === who))
        || anyNpc(who)
        || null;

    let i = 0;
    const step = () => {
        if (i >= lines.length) {
            state.isDialogueOpen = false;
            dialogueUI.hide();
            if (cinematic) endCutscene();
            if (then) then();
            return;
        }
        const line = lines[i++];
        const speaker = find(line.who);
        if (cinematic) focusOn(speaker);
        state.isDialogueOpen = true;
        dialogueUI.show({
            name: line.who === '나' ? state.player.config.name : npcName(line.who),
            text: line.text,
            sheet: line.who === '나' ? state.player.sheet : speaker ? speaker.sheet : null,
            onClose: step,
            options: [{ label: i < lines.length ? '다음' : '끝', onSelect: step }],
        });
        play('talk');
    };
    step();
}
