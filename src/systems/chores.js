import { state } from '../core/state.js';
import { CHORES, choreById } from '../data/chores.js';
import { goalText, setChoreNotify } from './quests.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { play } from './audio.js';
import { saveGame } from './save.js';

// 마을 게시판. 숫자를 채우면 끝나는 일거리는 퀘스트에서 빼서 전부 여기 붙여 두었다.
// 아무도 말을 걸지 않고, 아무 이야기도 열지 않는다. 하고 싶을 때 가서 떼어 오면 된다.
//
// state.chores = { day: 쪽지를 붙인 날, offers: [id], taken: { [id]: 진행도 }, done: [id] }

const MAX_TAKEN = 2;      // 한 번에 떼어 올 수 있는 쪽지 수
const OFFER_COUNT = 3;    // 하루에 붙는 쪽지 수

function chores() {
    if (!state.chores) state.chores = { day: 0, offers: [], taken: {}, done: [] };
    return state.chores;
}

/** 날짜가 바뀌면 쪽지를 새로 붙인다. 같은 날이면 늘 같은 셋이 붙어 있다 */
export function refreshBoard() {
    const c = chores(), day = state.day;
    if (c.day === day && c.offers.length) return c;
    const pool = CHORES.filter(x => (x.min || 1) <= state.player.level && !(x.id in c.taken));
    // 날짜를 씨앗으로 고른다 — 저장했다 켜도 그날 게시판은 그대로다
    const picks = [];
    for (let i = 0; i < pool.length && picks.length < OFFER_COUNT; i++) {
        const idx = Math.floor(Math.abs(Math.sin((day + 1) * 97.13 + i * 31.7)) * 1e4) % pool.length;
        const pick = pool[(idx + i) % pool.length];
        if (!picks.includes(pick.id)) picks.push(pick.id);
    }
    c.day = day;
    c.offers = picks;
    c.done = [];            // 어제 끝낸 것은 다시 붙을 수 있다. 잡일은 되풀이되는 일거리다
    return c;
}

function count(ch) { return ch.goal.count || 1; }
/** 고기를 모으는 쪽지는 가방 속을 본다 */
function progress(ch) {
    const c = chores();
    if (ch.goal.type === 'collect') return Math.min(count(ch), state.player.inventory.meat);
    return Math.min(count(ch), c.taken[ch.id] || 0);
}
function filled(ch) { return progress(ch) >= count(ch); }

/** 퀘스트와 같은 통지를 듣는다 (systems/quests.js 의 notify 가 넘겨 준다) */
function choreNotify(type, target) {
    const c = chores();
    for (const id in c.taken) {
        const ch = choreById(id);
        if (!ch || ch.goal.type !== type || ch.goal.type === 'collect' || filled(ch)) continue;
        const g = ch.goal;
        if ((type === 'kill' || type === 'visit') && g.target !== target) continue;
        if (type === 'delve') c.taken[id] = Math.max(c.taken[id] || 0, target);
        else c.taken[id] = (c.taken[id] || 0) + 1;
        if (filled(ch)) showToast(`[잡일] ${ch.title} 완료! 게시판에 가서 값을 받자`, '📌');
    }
}
setChoreNotify(choreNotify);

/** 떼어 온 쪽지가 몇 장인지 (HUD 가 읽는다) */
export function takenChores() {
    const c = chores();
    return Object.keys(c.taken).map(id => choreById(id)).filter(Boolean)
        .map(ch => ({ id: ch.id, title: ch.title, goal: goalText(ch.goal), text: `${progress(ch)} / ${count(ch)}`, complete: filled(ch) }));
}

function close() { state.isDialogueOpen = false; dialogueUI.hide(); }

function rewardLine(r) {
    const parts = [];
    if (r.gold) parts.push(`${r.gold}G`);
    if (r.meat) parts.push(`고기 ${r.meat}`);
    if (r.xp) parts.push(`경험치 ${r.xp}`);
    return parts.join(' · ');
}

/** 게시판을 연다 (마을 광장의 BOARD 소품에서 [E]) */
export function openChoreBoard() {
    const c = refreshBoard();
    state.isDialogueOpen = true;
    const opts = [];

    // 떼어 온 쪽지부터. 다 채웠으면 값을 받는다
    for (const id in c.taken) {
        const ch = choreById(id);
        if (!ch) continue;
        opts.push(filled(ch)
            ? { label: `✅ 값을 받는다 — ${ch.title} (${rewardLine(ch.reward)})`, onSelect: () => payOut(ch) }
            : { label: `📌 ${ch.title} — ${goalText(ch.goal)} ${progress(ch)}/${count(ch)}`, onSelect: () => dropChore(ch) });
    }
    // 새로 붙은 쪽지
    const room = MAX_TAKEN - Object.keys(c.taken).length;
    for (const id of c.offers) {
        if (id in c.taken || c.done.includes(id)) continue;
        const ch = choreById(id);
        if (!ch) continue;
        opts.push(room > 0
            ? { label: `📄 ${ch.title} — ${goalText(ch.goal)} (${rewardLine(ch.reward)})`, onSelect: () => readChore(ch) }
            : { label: `📄 ${ch.title} (손이 모자란다)`, onSelect: () => board('한 번에 두 장까지만 떼어 갈 수 있다. 하던 것부터 끝내라.') });
    }
    opts.push({ label: '돌아선다', onSelect: close });
    board(`${state.day}일째 아침에 붙은 쪽지들이다.\n(잡일은 이야기와 상관없다. 하고 싶을 때만 떼어 가면 된다.)`, opts);
}

function board(text, options) {
    state.isDialogueOpen = true;
    dialogueUI.show({ name: '마을 게시판', text, sheet: null, onClose: close, options: options || [{ label: '돌아선다', onSelect: openChoreBoard }] });
}

function readChore(ch) {
    board(ch.note, [
        { label: `📌 떼어 간다 — ${goalText(ch.goal)}`, onSelect: () => takeChore(ch) },
        { label: '그냥 둔다', onSelect: openChoreBoard },
    ]);
}

function takeChore(ch) {
    const c = chores();
    c.taken[ch.id] = 0;
    showToast(`잡일: ${ch.title} — ${goalText(ch.goal)}`, '📌');
    play('quest');
    saveGame();
    openChoreBoard();
}

function dropChore(ch) {
    board(`${ch.note}\n\n(${goalText(ch.goal)} — ${progress(ch)}/${count(ch)})`, [
        { label: '🗑️ 쪽지를 도로 붙여 둔다', onSelect: () => { delete chores().taken[ch.id]; saveGame(); openChoreBoard(); } },
        { label: '계속 한다', onSelect: openChoreBoard },
    ]);
}

function payOut(ch) {
    const c = chores(), p = state.player, r = ch.reward;
    if (ch.goal.type === 'collect') p.inventory.meat -= count(ch);
    delete c.taken[ch.id];
    c.done.push(ch.id);
    if (r.gold) p.gold += r.gold;
    if (r.meat) p.inventory.meat += r.meat;
    showToast(`잡일 완료: ${ch.title} (${rewardLine(r)})`, '💰');
    play('quest');
    if (r.xp) p.gainXp(r.xp);
    saveGame();
    openChoreBoard();
}
