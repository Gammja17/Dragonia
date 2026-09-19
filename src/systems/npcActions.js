import { state } from '../core/state.js';
import { clamp, dist, pick, rand } from '../core/utils.js';
import { NPC_TALK, SHOP, TIER_NAMES, relationTier } from '../data/npcTalk.js';
import { Projectile, addBullet } from '../entities/Projectile.js';
import { burst } from '../entities/Particle.js';
import { spawnEffect } from '../render/vfx.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { setBossBar } from '../ui/hud.js';
import { notify } from './quests.js';

// 마을 고정 NPC와의 고유 상호작용: 이야기, 선물, 동료, 대련(티아맷), 술래잡기(포코), 상점(그론), 축복(엘더).
// 진행 중인 놀이는 state.activity = { type: 'SPAR' | 'TAG', npc, hp, max, time } 에 담는다.

const SPAR_HP = 140;
const TAG_TIME = 25;

function close() {
    state.isDialogueOpen = false;
    state.currentNpc = null;
    dialogueUI.hide();
}

function addRelation(npc, amount) { npc.relation = clamp((npc.relation || 0) + amount, 0, 100); }

function show(npc, text, options) {
    state.isDialogueOpen = true;
    state.currentNpc = npc;
    dialogueUI.show({ name: `${npc.config.name} · ${TIER_NAMES[relationTier(npc.relation)]}`, text, sheet: npc.sheet, onClose: close, options });
}

/** 고정 NPC의 대화 첫 화면. 이 NPC용 대화가 없으면 false */
export function openNpcHub(npc) {
    const talk = NPC_TALK[npc.config.name];
    if (!npc.config.fixed || !talk) return false;
    const tier = relationTier(npc.relation);
    const p = state.player;
    const name = npc.config.name;
    const opts = [{ label: '이야기를 나눈다', onSelect: () => chat(npc) }];

    if (name === 'Tiamat') opts.push({ label: '대련을 신청한다', onSelect: () => startSpar(npc) });
    if (name === 'Poco') opts.push({ label: '술래잡기 하자!', onSelect: () => startTag(npc) });
    if (name === 'Gron') opts.push({ label: `물건을 본다 (소지금 ${p.gold}G)`, onSelect: () => openShop(npc) });
    if (name === 'Elder') opts.push({ label: '축복을 청한다', onSelect: () => blessing(npc) });

    if (tier >= 2 && npc.lastPresentDay !== state.day) opts.push({ label: '(뭔가 주려는 눈치다)', onSelect: () => receivePresent(npc) });
    if (name !== 'Elder' && p.inventory.meat > 0 && npc.lastGiftDay !== state.day) opts.push({ label: '고기를 선물한다 (고기 -1)', onSelect: () => giveGift(npc) });
    if (name !== 'Elder' && npc !== state.partner) {
        if (state.companion === npc) opts.push({ label: '이제 마을로 돌아가도 돼', onSelect: () => setCompanion(npc, false) });
        else if (tier >= 2) opts.push({ label: '같이 모험을 떠나자', onSelect: () => setCompanion(npc, true) });
    }
    opts.push({ label: '다음에 봐', onSelect: close });
    show(npc, talk.greet[tier], opts);
    return true;
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
    showToast(`${npc.config.name}에게 고기를 선물했습니다. (호감 ↑)`, '🎁');
    show(npc, '…이걸 나한테? 고마워. 잘 먹을게.', [{ label: '별말씀을.', onSelect: () => openNpcHub(npc) }]);
}

function receivePresent(npc) {
    npc.lastPresentDay = state.day;
    const gold = 15 + relationTier(npc.relation) * 10;
    state.player.gold += gold;
    state.player.inventory.meat += 1;
    showToast(`${npc.config.name}의 선물: ${gold}G, 고기 1개`, '🎁');
    show(npc, '자, 이거. 오다가 주웠어. …별건 아니고.', [{ label: '고마워!', onSelect: () => openNpcHub(npc) }]);
}

function setCompanion(npc, join) {
    if (join) {
        if (state.companion) state.companion.state = 'WANDER';
        state.companion = npc;
        npc.state = 'COMPANION_FOLLOW';
        showToast(`${npc.config.name}(이)가 동료로 합류했습니다!`, '🤝');
    } else {
        state.companion = null;
        npc.state = 'WANDER';
        showToast(`${npc.config.name}(이)가 마을로 돌아갑니다.`, '👋');
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

// ---------- 그론: 상점 ----------
export function shopCost(item) { return item.flat ? item.cost : Math.round(item.cost * Math.pow(1.6, state.upgrades[item.id] || 0)); }

function openShop(npc) {
    const p = state.player;
    const opts = SHOP.map(item => ({
        label: `${item.name} — ${item.desc} (${shopCost(item)}G)` + (item.flat ? '' : ` [${state.upgrades[item.id] || 0}강]`),
        onSelect: () => {
            const cost = shopCost(item);
            if (p.gold < cost) { showToast('골드가 모자랍니다.', '💰'); return; }
            p.gold -= cost;
            if (item.id === 'meat') p.inventory.meat++;
            else {
                state.upgrades[item.id] = (state.upgrades[item.id] || 0) + 1;
                if (item.id === 'hp') { p.maxHp += 25; p.hp += 25; }
                notify('upgrade');
            }
            showToast(`${item.name} 구입!`, '🛒');
            openShop(npc);
        },
    }));
    opts.push({ label: '돌아가기', onSelect: () => openNpcHub(npc) });
    show(npc, `골라 봐라. (소지금 ${p.gold}G)`, opts);
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
            npc.say('…졌다. 인정할게.');
            showToast('대련 승리!' + (first ? ' (40G, 호감 ↑)' : ' (10G)'), '🏆');
            notify('spar');
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
