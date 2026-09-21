import { state } from '../core/state.js';
import { inMyDen, visitLine } from './den.js';
import { npcName } from '../data/npcs.js';
import { clamp, dist, pick, rand } from '../core/utils.js';
import { NPC_TALK, TIER_NAMES, SITUATION_LINES, DATES, CONFESSION, FAMILY_TALK, BOND_SCENES, ROMANCE_GATES, relationTier } from '../data/npcTalk.js';
import { MAX_KIDS } from '../core/config.js';
import { mixGenes } from './kids.js';
import { fadeScreen } from '../ui/hud.js';
import { Projectile, addBullet } from '../entities/Projectile.js';
import { burst } from '../entities/Particle.js';
import { spawnEffect } from '../render/vfx.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { setBossBar } from '../ui/hud.js';
import { offerFor, heldOffer, runningFor, reportableFor, talkQuestFor, bringQuestFor,
         completeStep, handOver, curStep, acceptQuest, turnInQuest, stepGoalText, questProgress, stepTotal,
         notify } from './quests.js';
import { playScene } from './chronicle.js';
import { masterOptions, updateDrill, isDrill } from './story.js';
import { learnSkill } from './skills.js';
import { RECIPES, GOODS, MATERIALS, costOf, costText, canAfford, forge, buy, matCount } from './smithing.js';

// 마을 고정 NPC와의 고유 상호작용: 이야기, 선물, 동료, 대련(티아맷), 술래잡기(포코), 상점(그론), 축복(엘더).
// 진행 중인 놀이는 state.activity = { type: 'SPAR' | 'TAG', npc, hp, max, time } 에 담는다.

const SPAR_HP = 140;
const TAG_TIME = 25;

function close() {
    state.isDialogueOpen = false;
    state.currentNpc = null;
    dialogueUI.hide();
}

/**
 * 호감도를 올린다. 단계가 올라가면 그 인물의 장면을 하나 예약한다.
 * 장면은 지금 대화가 끝난 뒤에 재생된다 (systems/chronicle.js 가 꺼내 준다).
 */
function addRelation(npc, amount) {
    const before = relationTier(npc.relation || 0);
    npc.relation = clamp((npc.relation || 0) + amount, 0, 100);
    const after = relationTier(npc.relation);
    const name = npc.config.name;
    if (after <= before || !BOND_SCENES[name] || !BOND_SCENES[name][after]) return;
    const key = `${name}:${after}`;
    if (!state.story.bonds) state.story.bonds = [];
    if (state.story.bonds.includes(key)) return;
    state.story.bonds.push(key);
    state.pendingBond = { name, tier: after };
}

function show(npc, text, options) {
    state.isDialogueOpen = true;
    state.currentNpc = npc;
    // 사이와 맡은 일은 이름 옆이 아니라 머리 칸에서 보여 준다 (ui/dialogueUI.js)
    dialogueUI.show({ name: npcName(npc.config.name), text, sheet: npc.sheet, npc, onClose: close, options });
}

/**
 * 고정 NPC의 대화 첫 화면. 이 NPC용 대화가 없으면 false.
 * 선택지는 늘 네댓 개를 넘지 않게 묶는다: [용건] · [이야기] · [함께] · [마음] · [닫기].
 * 자잘한 것들(잡담·선물·대련·상점·데이트)은 각 묶음 안에 들어간다.
 */
export function openNpcHub(npc, skipErrand = false) {
    const talk = NPC_TALK[npc.config.name];
    if (!npc.config.fixed || !talk) return false;
    const tier = relationTier(npc.relation);
    const name = npc.config.name;
    const opts = [];

    // 1) 용건이 있으면 메뉴를 거치지 않고 바로 그 이야기부터 한다.
    //    (메뉴를 먼저 보여 주면 정작 하려던 일이 한 겹 뒤로 밀려 번잡해진다)
    //    순서: 보고 → 물어보려던 것 → 건네주려던 것 → 새 부탁
    const running = runningFor(npc);
    if (!skipErrand) {
        const report = reportableFor(npc);
        if (report) { reportQuest(npc, report); return true; }
        const ask = talkQuestFor(npc);
        if (ask) { askQuest(npc, ask); return true; }
        const bring = bringQuestFor(npc);
        if (bring) { bringToQuest(npc, bring); return true; }
        const offer = offerFor(npc);
        if (offer) { hearQuest(npc, offer); return true; }
    }

    // 2) 이야기 — 잡담·선물·받을 것
    opts.push({ label: '💬 이야기를 나눈다', onSelect: () => talkMenu(npc) });

    // 3) 함께 — 그 용만의 것
    const mine = ownMenu(npc, name);
    if (mine) opts.push(mine);

    // 3-1) 주워 온 알 맡기기 — 촌장에게만. 아직 제 둥지에서 품을 수 없는 용의 길이다
    if (name === 'Elder' && state.player.carrying === 'EGG') {
        opts.push({ label: '🥚 알을 맡긴다', onSelect: () => entrustEgg(npc) });
    }

    // 4) 마음 — 짝이 될 수 있는 용만
    if (npc.config.canPartner) {
        // heartCount 는 "보여 줄 것이 없다" 를 null 로, 짝에게는 꼬리표 없는 '' 를 돌려준다.
        // 예전엔 여기서 빈 문자열을 '없음' 으로 읽어, 짝이 되는 순간 이 항목이 통째로 사라졌다.
        // 그래서 짝과 아이를 갖자는 말을 꺼낼 길이 아예 없었다.
        const heart = heartCount(npc);
        if (heart !== null) opts.push({ label: `♥ 마음을 전한다${heart}`, onSelect: () => heartMenu(npc) });
    }

    opts.push({ label: '다음에 봐', onSelect: close });

    // 인사말 앞에 지금 무얼 하고 있었는지를 한 줄 깔아 둔다 (하루 일과).
    // 내 굴까지 따라 들어왔다면 굴 구경평부터 한다
    let text = greeting(npc, talk, tier);
    if (inMyDen()) text = `${visitLine()}\n\n` + text;
    else if (npc.doing) text = `(${npc.doing}.)\n\n` + text;
    if (running) text += `\n\n(${running.title}: ${stepGoalText(running)} ${questProgress(running)}/${stepTotal(running)})`;
    // 곁가지 부탁은 본 이야기가 끝나야 나온다. 왜 안 꺼내는지는 한 줄로 알려 준다
    else if (!skipErrand && heldOffer(npc)) text += '\n\n(하던 일부터 끝내고 오라는 눈치다.)';
    show(npc, text, opts);
    return true;
}

/** NPC 고유 행동 묶음. 없으면 null */
function ownMenu(npc, name) {
    const back = () => openNpcHub(npc);
    const sub = [];
    if (name === 'Elder') return { label: '✨ 축복을 청한다', onSelect: () => blessing(npc) };
    if (name === 'Kairon') return { label: '🎓 가르침을 청한다', onSelect: () => show(npc, '무엇을 배우러 왔느냐.', [...masterOptions(npc), { label: '돌아간다', onSelect: back }]) };
    if (name === 'Tiamat') sub.push({ label: '⚔️ 대련을 신청한다', onSelect: () => startSpar(npc) });
    if (name === 'Poco') sub.push({ label: '🎾 술래잡기 하자!', onSelect: () => startTag(npc) });
    if (name === 'Gron') sub.push({ label: '🔨 모루 앞에 선다', onSelect: () => openForge(npc) });
    // 동행. 짝도 오늘은 혼자 다녀오겠다고 할 수 있다
    // (예전엔 "짝은 늘 따라다니므로" 하고 아예 빼 놓아, 떼어 놓을 길이 없었다)
    if (npc === state.partner) {
        sub.push(npc.state === 'WANDER'
            ? { label: '🤝 같이 가자', onSelect: () => setFollowing(npc, true) }
            : { label: '👋 여기서 기다려 줄래?', onSelect: () => setFollowing(npc, false) });
    } else if (state.companion === npc) {
        sub.push({ label: '이제 마을로 돌아가도 돼', onSelect: () => setCompanion(npc, false) });
    } else if (relationTier(npc.relation) >= 2) {
        sub.push({ label: '🤝 같이 모험을 떠나자', onSelect: () => setCompanion(npc, true) });
    }
    if (!sub.length) return null;
    if (sub.length === 1) return sub[0];
    return { label: '🤝 함께 하자고 한다', onSelect: () => show(npc, '뭘 같이 할까?', [...sub, { label: '돌아간다', onSelect: back }]) };
}

/** 잡담·선물 묶음 */
function talkMenu(npc) {
    const p = state.player, name = npc.config.name;
    const sub = [{ label: '요즘 어때?', onSelect: () => chat(npc) }];
    if (p.inventory.meat > 0 && npc.lastGiftDay !== state.day) {
        sub.push({ label: '🎁 고기를 선물한다 (고기 -1)', onSelect: () => giveGift(npc) });
    }
    if (relationTier(npc.relation) >= 2 && npc.lastPresentDay !== state.day) {
        sub.push({ label: '(뭔가 주려는 눈치다)', onSelect: () => receivePresent(npc) });
    }
    sub.push({ label: '돌아간다', onSelect: () => openNpcHub(npc) });
    if (sub.length === 2) { chat(npc); return; }   // 잡담밖에 없으면 바로 잡담
    show(npc, '무슨 얘기를 할까?', sub);
}

/** 데이트를 청할 수 있는 호감도. 스승·촌장·그론은 좀 더 높다 (data/npcTalk.js) */
function dateThreshold(npc) {
    const gate = ROMANCE_GATES[npc.config.name];
    return gate ? gate.dateAt : 40;
}

/** 연애 묶음에 붙는 꼬리표 (없으면 null = 아직 아무것도 못 한다) */
function heartCount(npc) {
    const dates = npc.dates || 0;
    if (npc === state.partner) return '';
    const gate = ROMANCE_GATES[npc.config.name];
    if (gate && !gate.gate(state)) return null;   // 아직 때가 아니다
    if (dates >= 3 && npc.relation >= 80) return ' (고백할 수 있다)';
    if (npc.relation >= dateThreshold(npc)) return ` (데이트 ${dates}/3)`;
    return null;
}

function heartMenu(npc) {
    const dates = npc.dates || 0;
    const sub = [];
    if (npc === state.partner) {
        sub.push({ label: '우리… 아이를 가질까?', onSelect: () => familyTalk(npc) });
    } else if (dates >= 3 && npc.relation >= 80) {
        sub.push({ label: '♥ 마음을 고백한다', onSelect: () => confess(npc) });
    } else if (npc.relation >= dateThreshold(npc) && dates < 3) {
        if (npc.lastDateDay === state.day) sub.push({ label: `(오늘은 이미 함께 있었다. ${dates}/3)`, onSelect: () => openNpcHub(npc) });
        else sub.push({ label: `♥ 데이트를 신청한다 (${dates}/3)`, onSelect: () => goOnDate(npc) });
    } else if (dates >= 3) {
        sub.push({ label: '(마음은 통한 것 같은데, 아직 한마디가 모자라다)', onSelect: () => openNpcHub(npc) });
    }
    sub.push({ label: '돌아간다', onSelect: () => openNpcHub(npc) });
    if (sub.length === 2) { sub[0].onSelect(); return; }
    show(npc, '……', sub);
}

/** 부탁을 듣는다: 배경을 읽고 수락 여부를 고른다. 맡으면 그대로 대화를 끝낸다 */
function hearQuest(npc, q) {
    show(npc, q.offer, [
        { label: `📜 맡는다: ${q.title}`, onSelect: () => { close(); acceptQuest(q); } },
        { label: '지금은 어렵겠어', onSelect: close },
        { label: '다른 얘기를 한다', onSelect: () => openNpcHub(npc, true) },
    ]);
}

/**
 * 물어보려던 대목. 말을 거는 순간 대목이 넘어가고 그 자리에서 장면이 난다.
 * 장면이 끝나면 대화창을 다시 열어 준다 — 이어서 [승급 시험]을 청하는 식이 되게.
 */
function askQuest(npc, q) {
    const st = curStep(q);
    close();
    completeStep(q, { quiet: true });
    if (st && st.scene) playScene(q.title, st.scene, () => openNpcHub(npc, true));
    else openNpcHub(npc, true);
}

/** 건네주려던 대목. 모자라면 얼마나 모자란지 알려 준다 */
function bringToQuest(npc, q) {
    const st = curStep(q), need = st.goal.count || 1, have = state.player.inventory.meat;
    if (have < need) {
        show(npc, `${st.hint || ''}\n\n(지금 가진 고기 ${have}개. ${need - have}개가 더 필요하다.)`, [
            { label: '더 모아 온다', onSelect: close },
            { label: '다른 얘기를 한다', onSelect: () => openNpcHub(npc, true) },
        ]);
        return;
    }
    show(npc, st.hint || '건넬 것이 있다.', [
        {
            label: `🍖 고기 ${need}개를 건넨다`,
            onSelect: () => {
                close();
                if (!handOver(q)) return;
                completeStep(q, { quiet: true });
                if (st.scene) playScene(q.title, st.scene, () => openNpcHub(npc, true));
                else openNpcHub(npc, true);
            },
        },
        { label: '아직 안 줄래', onSelect: close },
    ]);
}

/** 끝낸 일을 보고한다. 마무리에 고를 것이 있으면 그것부터 묻는다 */
function reportQuest(npc, q) {
    const finish = (choiceId) => {
        close();
        turnInQuest(q, npc, choiceId);
        const next = offerFor(npc);
        if (next) hearQuest(npc, next);
    };
    if (!q.choice) {
        show(npc, q.done, [{ label: `보상을 받는다 (${q.title})`, onSelect: () => finish(null) }]);
        return;
    }
    // 마무리는 한 화면에서. 보고를 받은 말 아래에 고를 것을 바로 붙인다
    show(npc, `${q.done}\n\n${q.choice.prompt}`, q.choice.options.map(o => ({ label: o.label, onSelect: () => finish(o.id) })));
}

/** 인사말: 가끔은 지금 상황(날씨, 밤, 습격, 가족…)에 맞는 한마디 */
function greeting(npc, talk, tier) {
    const fits = SITUATION_LINES.filter(s => s.lines[npc.config.name] && s.when(state, npc));
    if (fits.length && Math.random() < 0.55) return pick(fits).lines[npc.config.name];
    return talk.greet[tier];
}

function chat(npc) {
    const tier = relationTier(npc.relation);
    // 지금 단계까지 열린 이야기 중 하나
    const text = pick(NPC_TALK[npc.config.name].topics.slice(0, tier + 1).flat());
    if (npc.lastTalkDay !== state.day) {   // 하루 첫 대화는 호감이 조금 오른다
        npc.lastTalkDay = state.day;
        addRelation(npc, 3);
    }
    show(npc, text, [{ label: '그렇구나.', onSelect: () => openNpcHub(npc) }]);
}

function giveGift(npc) {
    state.player.inventory.meat--;
    npc.lastGiftDay = state.day;
    addRelation(npc, 8);
    burst(npc.x, npc.y - 60, '#ff7aa8', 1, 10);
    showToast(`${npcName(npc.config.name)}에게 고기를 선물했습니다. (호감 ↑)`, '🎁');
    show(npc, '이걸 나한테? 고마워. 잘 먹을게.', [{ label: '별말씀을.', onSelect: () => openNpcHub(npc) }]);
}

function receivePresent(npc) {
    npc.lastPresentDay = state.day;
    const gold = 15 + relationTier(npc.relation) * 10;
    state.player.gold += gold;
    state.player.inventory.meat += 1;
    showToast(`${npcName(npc.config.name)}의 선물: ${gold}G, 고기 1개`, '🎁');
    show(npc, '자, 이거. 오다가 주웠어. …별건 아니고.', [{ label: '고마워!', onSelect: () => openNpcHub(npc) }]);
}

/** 여러 줄짜리 장면을 차례로 보여 주고 끝나면 then */
function playLines(npc, lines, then) {
    let i = 0;
    const next = () => {
        if (i >= lines.length) { close(); if (then) then(); return; }
        show(npc, lines[i++], [{ label: i < lines.length ? '▶ 다음' : '▶', onSelect: next }]);
    };
    next();
}

function goOnDate(npc) {
    close();
    npc.lastDateDay = state.day;
    const lines = DATES[npc.config.name][npc.dates || 0];
    fadeScreen('♥', () => { state.dayTime = Math.min(0.78, state.dayTime + 0.12); }, () => playLines(npc, lines, () => {
        npc.dates = (npc.dates || 0) + 1;
        addRelation(npc, 12);
        spawnEffect('HEART', npc.x, npc.y - 80, { color: '#ff7aa8', size: 1.4 });
        showToast(`${npcName(npc.config.name)}와(과) 데이트했습니다. (${npc.dates}/3, 호감 ↑)`, '💕');
    }));
}

function confess(npc) {
    if (state.player.stageIndex < 2) { show(npc, '(아직 너무 어리다. [성체]가 되면 마음을 전하자.)', [{ label: '조금만 더 크자.', onSelect: () => openNpcHub(npc) }]); return; }
    playLines(npc, CONFESSION[npc.config.name], () => {
        if (state.partner) { state.partner.state = 'WANDER'; moveHome(state.partner, false); }
        if (state.companion === npc) state.companion = null;
        state.partner = npc;
        npc.state = 'PARTNER_FOLLOW';
        moveHome(npc, true);
        for (let i = 0; i < 6; i++) spawnEffect('HEART', npc.x + rand(-60, 60), npc.y - 60 - rand(0, 60), { color: '#ff7aa8', size: 1.2 });
        showToast(`${npcName(npc.config.name)}(이)가 짝이 되었습니다! 이제 아지트에서 함께 삽니다.`, '💞');
    });
}

/**
 * 짝·단짝은 늘 따라다니므로 따로 집을 옮길 필요가 없다.
 * 헤어지면 다음에 자기 지도에 들렀을 때 제자리에 서 있다 (systems/world.js 가 다시 놓는다).
 */
function moveHome() { /* 지도별로 다시 놓이므로 할 일이 없다 */ }

function familyTalk(npc) {
    const nest = state.entities.nests[0];
    const back = [{ label: '그래.', onSelect: () => openNpcHub(npc) }];
    if (!state.den.built) { show(npc, '아직 둥지가 없잖아. 아지트에 둥지부터 짓자. (둥지에서 [T]. 나뭇가지 8, 30G)', back); return; }
    // 둥지는 내 굴 안에만 있다(밖에서는 state.denNest 에 상태만 들고 다닌다).
    // 예전엔 굴 밖에서도 nest 를 그대로 읽어, 마을에서 이 말을 꺼내면 대화가 통째로 죽었다
    if (!nest) { show(npc, '여기선 좀… 우리 굴로 가자. 둥지가 있어야지.', back); return; }
    if (nest.hasEgg) { show(npc, '둥지에 이미 알이 있어. 저 아이부터 잘 품어 주자.', back); return; }
    if (state.kids.length >= MAX_KIDS) { show(npc, '우리 집, 이미 북적북적해. 이 아이들부터 잘 키우자.', back); return; }
    if (npc.lastEggDay && state.day - npc.lastEggDay < 3) { show(npc, '조금만 더 있다가. 몸을 추슬러야 해. (사흘에 한 번)', back); return; }
    playLines(npc, FAMILY_TALK[npc.config.name], () => {
        npc.lastEggDay = state.day;
        nest.layEgg(state.player, npc);
        spawnEffect('RING', nest.x, nest.y, { size: 1.4 });
        showToast(`${npcName(npc.config.name)}(이)가 둥지에 알을 낳았습니다! 곁에서 품어 주세요.`, '🥚');
    });
}

/**
 * 주워 온 알을 촌장에게 맡긴다. 사흘 뒤 아침에 촌장이 아기를 데려온다 (systems/story.js).
 * 알을 품으려면 다 자란 몸과 제 둥지가 있어야 하는데, 그게 없는 동안 알이 갈 곳이 없었다.
 */
function entrustEgg(npc) {
    const back = [{ label: '그래.', onSelect: () => openNpcHub(npc) }];
    if (state.eggSitting) { show(npc, '이미 하나 품고 있잖느냐. 저 아이가 깨어난 뒤에 오거라.', back); return; }
    if (state.kids.length >= MAX_KIDS) { show(npc, '네 집이 이미 북적북적하다. 그 아이들부터 잘 키우고 오거라.', back); return; }
    state.player.carrying = null;
    state.eggSitting = { day: state.day, genes: mixGenes(state.player, state.partner) };
    playLines(npc, [
        '알이구나. 어디서 주워 왔느냐.',
        '네 몸으로는 아직 못 품는다. 알은 품는 이의 체온을 따라가거든.',
        '내가 맡으마. 사흘이면 깨어날 게다. 그때 데려다주지.',
    ], () => {
        spawnEffect('RING', npc.x, npc.y, { size: 1.2 });
        showToast('엘더에게 알을 맡겼습니다. 사흘 뒤 아침에 데려옵니다.', '🥚');
    });
}

/**
 * 짝을 데리고 다닐지 정한다. 짝인 것은 그대로고 따라다니기만 끈다 —
 * 아이 갖기도, 쌓인 사이도 그대로다. 마을에서 다시 말을 걸면 부를 수 있다.
 * 따라다니는가의 기준은 state.partner 가 아니라 npc.state 다 (systems/routine.js 외).
 */
function setFollowing(npc, on) {
    close();
    npc.state = on ? 'PARTNER_FOLLOW' : 'WANDER';
    showToast(on
        ? `${npcName(npc.config.name)}(이)가 다시 따라나섭니다.`
        : `${npcName(npc.config.name)}(이)가 마을에 남습니다. 다시 부르려면 말을 거세요.`, on ? '🤝' : '👋');
}

function setCompanion(npc, join) {
    if (join) {
        if (state.companion) { state.companion.state = 'WANDER'; moveHome(state.companion, false); }
        state.companion = npc;
        npc.state = 'COMPANION_FOLLOW';
        moveHome(npc, true);   // 단짝도 아지트에서 같이 지낸다
        showToast(`${npcName(npc.config.name)}(이)가 동료로 합류했습니다!`, '🤝');
    } else {
        state.companion = null;
        npc.state = 'WANDER';
        moveHome(npc, false);
        showToast(`${npcName(npc.config.name)}(이)가 마을로 돌아갑니다.`, '👋');
    }
    close();
}

// ---------- 엘더: 축복 ----------
function blessing(npc) {
    if (state.blessingDay === state.day) {
        show(npc, '축복은 하루에 한 번이다. 욕심내지 말거라.', [{ label: '네…', onSelect: () => openNpcHub(npc) }]);
        return;
    }
    state.blessingDay = state.day;
    const p = state.player;
    p.hp = p.maxHp;
    p.hunger = 100;
    spawnEffect('RING', p.x, p.y - 40, { size: 2 });
    showToast('엘더의 축복: 오늘 하루 경험치 +25%, 체력·허기 회복', '✨');
    show(npc, '고대의 바람이 네 날개를 밀어 주기를.', [{ label: '감사합니다.', onSelect: close }]);
}

// ---------- 그론: 대장간 ----------
// 골드로 비늘을 사던 것을 접었다. 이제는 잡은 것에서 나온 소재를 모아 직접 두드린다.
// 골드는 고기와, 급할 때 소재를 비싸게 사는 데만 쓴다.

function matLine() {
    return Object.keys(MATERIALS).map(k => `${MATERIALS[k].name} ${matCount(k)}`).join(' · ');
}

function openForge(npc) {
    const opts = RECIPES.map(r => {
        const cost = costOf(r), times = state.upgrades[r.id] || 0;
        const ok = canAfford(cost);
        return {
            label: `${ok ? '🔨' : '🔒'} ${r.name} (${times}단 → ${times + 1}단) ${r.effect}`,
            onSelect: () => forgeOne(npc, r),
        };
    });
    opts.push({ label: `💰 골드로 산다 (소지금 ${state.player.gold}G)`, onSelect: () => openGoods(npc) });
    opts.push({ label: '돌아간다', onSelect: () => openNpcHub(npc) });
    show(npc, `모루는 달궈 뒀다. 재료는 네가 가져와라.\n\n[가진 소재] ${matLine()}`, opts);
}

function forgeOne(npc, recipe) {
    const cost = costOf(recipe);
    if (!canAfford(cost)) {
        show(npc, `재료가 모자라다. ${recipe.name}에는 이만큼 든다.\n\n${costText(cost)}\n\n(앞의 숫자가 가진 것, 뒤가 드는 것이다)`,
            [{ label: '모아 오겠다', onSelect: () => openForge(npc) }]);
        return;
    }
    show(npc, `${recipe.flavor}\n\n드는 재료: ${costText(cost)}`, [
        { label: `🔨 두드린다: ${recipe.effect}`, onSelect: () => { forge(recipe); openForge(npc); } },
        { label: '아직 아껴 두겠다', onSelect: () => openForge(npc) },
    ]);
}

function openGoods(npc) {
    const p = state.player;
    const opts = GOODS.map(item => ({
        label: `${item.name}: ${item.desc} (${item.cost}G)`,
        onSelect: () => { buy(item); openGoods(npc); },
    }));
    opts.push({ label: '돌아간다', onSelect: () => openForge(npc) });
    show(npc, `돈으로 사겠다면 말리진 않는다. 비싸게 받을 뿐이지. (소지금 ${p.gold}G)`, opts);
}

// ---------- 티아맷: 대련 ----------
function startSpar(npc) {
    close();
    state.activity = { type: 'SPAR', npc, hp: SPAR_HP, max: SPAR_HP, timer: 1.5 };
    npc.say('봐주지 않는다!');
    showToast('대련 시작! 티아맷의 기력을 모두 깎으세요. (체력 25% 아래로 떨어지면 패배)', '⚔️');
}

// ---------- 포코: 술래잡기 ----------
function startTag(npc) {
    close();
    state.activity = { type: 'TAG', npc, time: TAG_TIME, max: TAG_TIME, juke: 0, jukeAngle: 0 };
    npc.say('나 잡아 봐라~!');
    showToast(`술래잡기! ${TAG_TIME}초 안에 포코를 잡으세요. (Shift 달리기)`, '🏃');
}

function endActivity(win) {
    const a = state.activity, npc = a.npc, p = state.player;
    state.activity = null;
    setBossBar(null);
    const first = npc.lastPlayDay !== state.day;   // 보상은 하루 첫 판이 크다
    npc.lastPlayDay = state.day;
    if (a.type === 'SPAR') {
        if (win) {
            addRelation(npc, first ? 10 : 2);
            p.gold += first ? 40 : 10;
            p.gainXp(first ? 180 : 50);
            npc.say('졌다. 인정할게.');
            showToast('대련 승리!' + (first ? ' (40G, 호감 ↑)' : ' (10G)'), '🏆');
            notify('spar');
            learnSkill('BLINK');   // 첫 승리 때 티아맷의 기술을 배운다
        } else {
            p.hp = Math.max(p.hp, p.maxHp * 0.5);
            addRelation(npc, 1);
            npc.say('아직 멀었어. 다시 와.');
            showToast('대련 패배… 티아맷이 일으켜 세워 줍니다.', '💫');
        }
    } else if (win) {
        addRelation(npc, first ? 8 : 2);
        p.gold += first ? 25 : 5;
        npc.say('으악 잡혔다! 한 판 더!');
        showToast('포코를 잡았습니다!' + (first ? ' (25G, 호감 ↑)' : ' (5G)'), '🎉');
        notify('tag');
    } else {
        npc.say('헤헤, 내가 이겼다!');
        showToast('시간 초과! 포코가 도망쳤습니다.', '⏱️');
    }
}

/** 놀이 중인 NPC의 움직임. Dragon.updateNpc 가 호출한다 */
export function updateActivityNpc(npc, dt) {
    if (isDrill(state.activity)) { updateDrill(npc, dt); return; }
    const a = state.activity, p = state.player;
    const d = dist(npc, p);
    const toPlayer = Math.atan2(p.y - npc.y, p.x - npc.x);

    if (a.type === 'SPAR') {
        setBossBar('티아맷과 대련', a.hp / a.max);
        const move = d > 300 ? toPlayer : d < 180 ? toPlayer + Math.PI : toPlayer + Math.PI / 2;
        npc.moveBy(Math.cos(move), Math.sin(move), 170, dt);
        a.timer -= dt;
        if (a.timer <= 0) {
            a.timer = 0.95;
            for (const off of a.hp < a.max / 2 ? [-0.25, 0, 0.25] : [0]) {
                addBullet(new Projectile(npc.x, npc.y - 40, Math.atan2(p.y - 30 - (npc.y - 40), p.x - npc.x) + off,
                    { faction: 'ENEMY', element: 'THUNDER', damage: 6, speed: 330, life: 2.2, scale: 0.7 }));
            }
            if (npc.animator) npc.animator.play('attack');
        }
        if (a.hp <= 0) endActivity(true);
        else if (p.hp < p.maxHp * 0.25 || d > 1100) endActivity(false);
        return;
    }

    // TAG: 플레이어 반대쪽으로, 가끔 방향을 꺾고, 집에서 너무 멀어지면 돌아온다
    setBossBar('포코와 술래잡기', a.time / a.max);
    a.time -= dt;
    a.juke -= dt;
    if (a.juke <= 0) { a.juke = rand(0.5, 1.2); a.jukeAngle = rand(-1.2, 1.2); }
    let vx = Math.cos(toPlayer + Math.PI + a.jukeAngle), vy = Math.sin(toPlayer + Math.PI + a.jukeAngle);
    const home = { x: npc.homeX, y: npc.homeY }, dh = dist(npc, home);
    if (dh > 420) { vx += ((home.x - npc.x) / dh) * 1.6; vy += ((home.y - npc.y) / dh) * 1.6; }
    npc.moveBy(vx, vy, 335, dt);
    if (d < 75) endActivity(true);
    else if (a.time <= 0) endActivity(false);
}
