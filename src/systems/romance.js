import { state } from '../core/state.js';
import { npcName } from '../data/npcs.js';
import { LOVE_LINES, LOVE_CHOICES } from '../data/romance.js';
import { anyNpc } from './world.js';
import { grantRelic, ownsRelic } from './relics.js';
import { spawnEffect } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { saveGame } from './save.js';
import { play } from './audio.js';

// 마음의 뒷이야기. 데이트 세 번과 고백으로 끝나던 연애에 그 뒤를 붙인다.
//
//   한눈팔기  짝이 있거나 다른 용과도 데이트 중인데 또 데이트를 하면, 그 용이 봤을 수 있다
//   질투      본 용에게 다음에 말을 걸면 따져 묻는다. 사과 · 거짓말(반반) · 그쪽을 고른다
//   다툼      짝이 토라지면 굴을 나가 제 일과로 돌아간다. 고기 세 개를 들고 가서 사과해야 풀린다
//   헤어짐    토라진 짝을 엿새 넘게 내버려 두거나, 토라져 있는데 또 들키면 떠난다. 내가 먼저 말할 수도 있다
//   순애      한 번도 한눈팔지 않고 닷새를 함께 산 짝에게는 평생을 약속할 수 있다 (유물 '언약의 고리')
//   기념일    짝이 된 지 열흘마다 짝이 먼저 챙긴다
//
// state.story.love = {
//   pending: { [본 용]: 같이 있던 용 }      아직 따져 묻지 않은 것
//   mood:    { [용]: { kind: 'SULK' | 'EX' | 'HURT', day } }
//   ever:    [데이트해 본 용들]   cheated: 한눈판 적이 있는가
//   since:   짝이 된 날   vow: { with, day } | null   anniv: 마지막으로 챙긴 기념일 회차
// }

const MOOD_DAYS = { EX: 8, HURT: 5 };
const SULK_LIMIT = 6;

function L() {
    const s = state.story;
    return s.love || (s.love = { pending: {}, mood: {}, ever: [], cheated: false, since: null, vow: null, anniv: 0 });
}
const lines = (npc) => LOVE_LINES[npc.config.name];
const fill = (text, rival) => text.replace(/\{rival\}/g, npcName(rival));

/** 이 용의 지금 마음 상태. 시간이 지난 것은 걷어 낸다 */
export function moodOf(name) {
    const m = L().mood[name];
    if (!m) return null;
    if (MOOD_DAYS[m.kind] && state.day - m.day >= MOOD_DAYS[m.kind]) { delete L().mood[name]; return null; }
    return m.kind;
}
function setMood(name, kind) { L().mood[name] = { kind, day: state.day }; }

/** 인사말 대신 나올 말 (토라짐 · 헤어진 뒤 · 마음을 접은 뒤). 없으면 null */
export function moodGreeting(npc) {
    const kind = moodOf(npc.config.name), t = lines(npc);
    if (!kind || !t) return null;
    return kind === 'SULK' ? t.sulk : kind === 'EX' ? t.ex : t.hurt;
}

/** 마음 메뉴를 아예 닫아 둘 상태인가 */
export function heartClosed(npc) { const k = moodOf(npc.config.name); return k === 'EX' || k === 'HURT'; }
export function isSulking(npc) { return moodOf(npc.config.name) === 'SULK'; }

/** 짝이 되었다 (npcActions.js 의 confess) */
export function onPartnered(npc) {
    const l = L();
    l.since = state.day; l.anniv = 0;
    if (!l.ever.includes(npc.config.name)) l.ever.push(npc.config.name);
    delete l.pending[npc.config.name];
    // 마음을 주고받던 다른 용들은 여기서 마음을 접는다
    for (const o of courting(npc)) cool(o);
}

/** 지금 마음을 주고받는 중인 다른 용들 (데이트를 한 번이라도 했고, 아직 접지 않은) */
function courting(except) {
    return Object.keys(LOVE_LINES).map(anyNpc).filter(n => n && n !== except && n !== state.partner
        && n.config.canPartner && (n.dates || 0) >= 1 && !moodOf(n.config.name));
}

/** 마음을 접게 한다: 데이트가 처음으로 돌아가고 한동안 서먹하다 */
function cool(npc, relationLoss = 15) {
    npc.dates = 0;
    npc.relation = Math.max(0, (npc.relation || 0) - relationLoss);
    setMood(npc.config.name, 'HURT');
    delete L().pending[npc.config.name];
}

/** 데이트를 마쳤다 (npcActions.js 의 goOnDate). 다른 용이 봤을 수 있다 */
export function onDate(npc) {
    const l = L(), name = npc.config.name;
    if (!l.ever.includes(name)) l.ever.push(name);
    const others = courting(npc);
    if (state.partner && state.partner !== npc) others.push(state.partner);
    if (!others.length) return;
    l.cheated = true;
    for (const o of others) {
        const chance = o === state.partner ? 0.7 : 0.45;
        if (Math.random() < chance) l.pending[o.config.name] = name;
    }
}

// ---------- 말을 걸었을 때 끼어드는 것들 (npcActions.js 의 openNpcHub 맨 앞) ----------
// ui: { show, close, playLines, hub } — npcActions.js 가 제 것을 넘겨 준다

/** 끼어들 일이 있으면 그 장면을 열고 true */
export function loveIntercept(npc, ui) {
    const t = lines(npc);
    if (!t || state.raid.active) return false;
    const l = L(), name = npc.config.name;

    // 토라진 짝을 너무 오래 내버려 뒀다
    if (npc === state.partner && isSulking(npc) && state.day - l.mood[name].day > SULK_LIMIT) { theyLeave(npc, ui); return true; }

    const rival = l.pending[name];
    if (rival) {
        delete l.pending[name];
        if (npc === state.partner) {
            if (isSulking(npc)) { theyLeave(npc, ui); return true; }   // 토라져 있는데 또 들켰다
            jealousPartner(npc, rival, ui);
        } else if ((npc.dates || 0) >= 1 && !moodOf(name)) jealousRival(npc, rival, ui);
        else return false;
        return true;
    }

    // 기념일: 짝이 된 지 열흘마다 짝이 먼저 챙긴다
    if (npc === state.partner && !isSulking(npc) && l.since != null) {
        const nth = Math.floor((state.day - l.since) / 10);
        if (nth >= 1 && nth > (l.anniv || 0)) {
            l.anniv = nth;
            ui.playLines(npc, [t.anniv], () => {
                const gold = 40 + nth * 20;
                state.player.gold += gold; state.player.inventory.meat += 2;
                npc.relation = Math.min(100, (npc.relation || 0) + 5);
                spawnEffect('HEART', npc.x, npc.y - 80, { color: '#ff7aa8', size: 1.4 });
                showToast(`짝이 된 지 ${nth * 10}일째. ${npcName(name)}의 선물: ${gold}G, 고기 2개`, '💝');
                saveGame();
            });
            return true;
        }
    }
    return false;
}

function jealousPartner(npc, rival, ui) {
    const t = lines(npc), other = anyNpc(rival);
    ui.playLines(npc, t.jealousPartner.slice(0, -1).map(x => fill(x, rival)), () => ui.show(npc, fill(t.jealousPartner[t.jealousPartner.length - 1], rival), [
        { label: LOVE_CHOICES.sorry, onSelect: () => { if (other) cool(other); sulk(npc, ui, null); } },
        { label: LOVE_CHOICES.lie, onSelect: () => {
            if (Math.random() < 0.5) { ui.show(npc, '…그래. 네가 그렇다면 그런 거겠지.', [{ label: '(넘어갔다)', onSelect: ui.close }]); return; }
            npc.relation = Math.max(0, (npc.relation || 0) - 20);
            sulk(npc, ui, t.lieFail);
        } },
        { label: LOVE_CHOICES.other, onSelect: () => theyLeave(npc, ui) },
    ]));
}

function jealousRival(npc, rival, ui) {
    const t = lines(npc), other = anyNpc(rival);
    ui.playLines(npc, t.jealousRival.slice(0, -1).map(x => fill(x, rival)), () => ui.show(npc, fill(t.jealousRival[t.jealousRival.length - 1], rival), [
        { label: LOVE_CHOICES.pickYou, onSelect: () => {
            if (other && other !== state.partner) cool(other);
            npc.relation = Math.min(100, (npc.relation || 0) + 6);
            spawnEffect('HEART', npc.x, npc.y - 80, { color: '#ff7aa8', size: 1.2 });
            ui.close(); saveGame();
        } },
        { label: LOVE_CHOICES.both, onSelect: () => { cool(npc, 25); ui.show(npc, t.hurt, [{ label: '……', onSelect: ui.close }]); saveGame(); } },
    ]));
}

/** 짝이 토라진다: 굴을 나가 제 일과로 돌아간다 */
function sulk(npc, ui, line) {
    setMood(npc.config.name, 'SULK');
    npc.state = 'WANDER';
    showToast(`${npcName(npc.config.name)}(이)가 토라져서 굴을 나갔습니다. 고기 3개를 들고 찾아가 사과하세요.`, '💔');
    play('hurt');
    saveGame();
    if (line) ui.show(npc, line, [{ label: '……', onSelect: ui.close }]); else ui.close();
}

/** 사과한다 (마음 메뉴). 고기 세 개가 든다 */
export function apologize(npc, ui) {
    const p = state.player, t = lines(npc);
    if (p.inventory.meat < 3) { ui.show(npc, `${t.sulk}\n\n(빈손으로는 말이 안 통할 것 같다. 고기 3개를 들고 오자. 지금 ${p.inventory.meat}개)`, [{ label: '다시 오자.', onSelect: ui.close }]); return; }
    p.inventory.meat -= 3;
    ui.playLines(npc, t.makeup, () => {
        delete L().mood[npc.config.name];
        npc.state = 'PARTNER_FOLLOW';
        npc.relation = Math.min(100, (npc.relation || 0) + 8);
        spawnEffect('HEART', npc.x, npc.y - 80, { color: '#ff7aa8', size: 1.4 });
        showToast(`${npcName(npc.config.name)}와(과) 화해했습니다. 다시 함께 다닙니다.`, '💞');
        saveGame();
    });
}

function endIt(npc) {
    const l = L();
    if (state.partner === npc) state.partner = null;
    npc.state = 'WANDER';
    npc.dates = 0;
    npc.relation = Math.min(npc.relation || 0, 35);
    setMood(npc.config.name, 'EX');
    l.since = null; l.anniv = 0; l.vow = null;
    delete l.pending[npc.config.name];
    play('hurt');
    saveGame();
}

/** 그쪽에서 떠난다 */
function theyLeave(npc, ui) {
    ui.playLines(npc, lines(npc).leave, () => { endIt(npc); showToast(`${npcName(npc.config.name)}(이)가 떠났습니다.`, '💔'); });
}

/** 내가 그만하자고 한다 (마음 메뉴) */
export function breakUp(npc, ui) {
    ui.show(npc, '(정말로 그만하자고 말할까? 한 번 꺼낸 말은 주워 담을 수 없다.)', [
        { label: '…우리 그만하자.', onSelect: () => ui.playLines(npc, lines(npc).left, () => { endIt(npc); showToast(`${npcName(npc.config.name)}와(과) 헤어졌습니다.`, '💔'); }) },
        { label: '아니야, 아무것도.', onSelect: () => ui.hub(npc) },
    ]);
}

// ---------- 순애 ----------
/** 평생을 약속할 수 있는가: 이 용 말고는 누구와도 데이트한 적이 없고, 짝으로 닷새를 살았다 */
export function canVow(npc) {
    const l = L();
    return npc === state.partner && !l.vow && !l.cheated && l.since != null && state.day - l.since >= 5
        && l.ever.every(n => n === npc.config.name) && !isSulking(npc);
}
/** 왜 아직 안 되는지 한 줄 (마음 메뉴에 흐리게 띄운다). 영영 안 되는 경우는 null */
export function vowHint(npc) {
    const l = L();
    if (npc !== state.partner || l.vow || l.cheated || !l.ever.every(n => n === npc.config.name)) return null;
    const left = 5 - (state.day - (l.since ?? state.day));
    return left > 0 ? `(평생을 약속하기에는 아직 이르다. 함께 ${left}일을 더 지내자)` : null;
}
export function vowed(npc) { const v = L().vow; return !!v && v.with === npc.config.name; }

export function makeVow(npc, ui) {
    ui.playLines(npc, lines(npc).vow, () => {
        L().vow = { with: npc.config.name, day: state.day };
        npc.relation = 100;
        for (let i = 0; i < 10; i++) spawnEffect('HEART', npc.x + (Math.random() - 0.5) * 160, npc.y - 40 - Math.random() * 90, { color: '#ff7aa8', size: 1.2 });
        spawnEffect('RING', npc.x, npc.y - 40, { size: 2.2, color: '#ffd0e0' });
        if (!ownsRelic('VOW_RING')) grantRelic('VOW_RING', state.player.x, state.player.y);
        showToast(`${npcName(npc.config.name)}와(과) 평생을 약속했습니다.`, '💍');
        play('evolve');
        saveGame();
    });
}
