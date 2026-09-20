import { state } from '../core/state.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { play } from './audio.js';
import { saveGame } from './save.js';
import { acceptQuest } from './quests.js';
import { QUESTS } from '../data/quests.js';
import { CHRONICLE } from '../data/chronicle.js';
import { BOND_SCENES } from '../data/npcTalk.js';
import { getBiome, getRegion } from '../world/biomes.js';
import { inDungeon } from './delve.js';

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
        biome: getBiome(p.x, p.y),
        region: getRegion(p.x, p.y),
        night: t < 0.22 || t > 0.82,
        day: state.day,
        done: (id) => state.quests.done.includes(id),
        active: (id) => id in state.quests.active,
        lessons: state.story.lessons.length,
        boss: (id) => !!state.bossesDefeated[id],
        relationOf: (name) => {
            const n = state.entities.npcs.find(x => x.config.name === name);
            return n ? (n.relation || 0) : 0;
        },
    };
}

export function seenEvent(id) { return (state.story.events || []).includes(id); }

/** 매 프레임 호출. 0.8초마다 조건이 맞는 사건이 있는지 살핀다 */
export function updateChronicle(dt) {
    if (playing || state.isDialogueOpen || inDungeon() || state.activity || state.raid.active) return;
    checkTimer -= dt;
    if (checkTimer > 0) return;
    checkTimer = 0.8;
    if (!state.story.events) state.story.events = [];

    // 대화 중에 사이가 깊어졌으면, 대화가 끝난 지금 그 장면을 보여 준다
    const bond = state.pendingBond;
    if (bond) {
        state.pendingBond = null;
        const lines = (BOND_SCENES[bond.name] || {})[bond.tier];
        if (lines) {
            playing = true;
            playScene(`${bond.name} — ${['', '아는 사이', '친구', '절친'][bond.tier]}가 되었다`, lines, () => { playing = false; saveGame(); });
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
        if (ev.toast) showToast(ev.toast, ev.icon || '📖');
        saveGame();
    });
}

/**
 * 여러 줄짜리 장면을 차례로 보여 준다. 아침 장면(systems/story.js)도 이걸 쓴다.
 * line = { who: NPC 이름 | '나' | '???', text }
 */
export function playScene(title, lines, then) {
    if (title) showToast(title, '📖');
    let i = 0;
    const step = () => {
        if (i >= lines.length) {
            state.isDialogueOpen = false;
            dialogueUI.hide();
            if (then) then();
            return;
        }
        const line = lines[i++];
        const npc = state.entities.npcs.find(n => n.config.name === line.who);
        state.isDialogueOpen = true;
        dialogueUI.show({
            name: line.who === '나' ? state.player.config.name : line.who,
            text: line.text,
            sheet: line.who === '나' ? state.player.sheet : npc ? npc.sheet : null,
            onClose: step,
            options: [{ label: i < lines.length ? '▶ 다음' : '▶ 끝', onSelect: step }],
        });
        play('talk');
    };
    step();
}
