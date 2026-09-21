import { state } from '../core/state.js';
import { pick } from '../core/utils.js';
import { npcName } from '../data/npcs.js';
import { FAMILY_LINES, KID_JOBS, OUTING_PARTNER } from '../data/family.js';
import { playScene } from './chronicle.js';
import { addMaterial } from './smithing.js';
import { isDead } from './routine.js';
import { showToast } from '../ui/toast.js';
import { spawnEffect } from '../render/vfx.js';
import { fadeScreen } from '../ui/hud.js';
import { saveGame } from './save.js';

// 가족의 뒷이야기. 아이를 다 키우고 나면 할 일이 없던 것에 그 뒤를 붙인다.
//
//   성년식    다 자란 아이는 다음 날 아침 촌장 앞에서 마을의 용으로 이름을 올리고, 성격대로 일을 맡는다
//   품삯      일을 맡은 아이는 아침마다 뭔가를 들고 온다 (골드 · 고기 · 쇳조각 · 경험치)
//   나들이    사흘에 한 번, 짝과 아이들을 데리고 호숫가에 다녀온다. 다들 정이 깊어진다
//   눈치      부모가 다투거나 헤어지거나 평생을 약속하면 아이들이 한마디씩 한다 (kidActions.js)

/** 받침을 보고 '이/가' 를 붙인다 (아이 이름은 플레이어가 지으므로 미리 알 수 없다) */
function iga(word) {
    const c = word.charCodeAt(word.length - 1);
    const batchim = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
    return word + (batchim ? '이' : '가');
}

const kidsAt = (stage) => state.kids.filter(k => k.stage === stage);

/** 아침에 (systems/story.js 의 playMorningScene). 장면을 틀었으면 true */
export function familyMorning() {
    bringHome();
    const kid = kidsAt('ADULT').find(k => !k.job);
    if (!kid) return false;
    const job = KID_JOBS[kid.personality];
    // 일을 가르쳐 줄 용이 죽고 없으면 다른 용이 맡는다
    const mentor = isDead(job.mentor) ? job.fallback : job.mentor;
    kid.job = kid.personality;
    const say = FAMILY_LINES[kid.personality];
    playScene(`${kid.name}의 성년식`, [
        { who: 'Elder', text: `오늘부터 ${kid.name}도 이 마을의 어엿한 용이란다. 알에서 나오던 날이 엊그제 같은데 벌써 이만큼 컸구나…` },
        { who: '나', text: `(${kid.name}: "${say.rite}")` },
        { who: mentor, text: job.offer[mentor] || job.offer.default },
        { who: '나', text: `(${iga(kid.name)} ${npcName(mentor)} 밑에서 [${job.name}] 일을 맡았다. 이제 아침마다 뭔가를 들고 돌아온다.)` },
    ], saveGame, { place: 'VILLAGE' });
    return true;
}

/** 일을 맡은 아이들이 아침마다 들고 오는 것 */
function bringHome() {
    const p = state.player, got = [];
    for (const kid of kidsAt('ADULT')) {
        if (!kid.job) continue;
        const bonus = 1 + kid.affection / 100;   // 정이 깊을수록 넉넉히 챙겨 온다
        const job = KID_JOBS[kid.job];
        if (job.pay === 'gold') { const g = Math.round(18 * bonus); p.gold += g; got.push(`${kid.name} ${g}G`); }
        if (job.pay === 'meat') { const n = bonus > 1.5 ? 2 : 1; p.inventory.meat += n; got.push(`${kid.name} 고기 ${n}`); }
        if (job.pay === 'ore') { addMaterial('ORE', 1); got.push(`${kid.name} 쇳조각 1`); }
        if (job.pay === 'xp') { const x = Math.round(30 * bonus); p.gainXp(x); got.push(`${kid.name} 경험치 ${x}`); }
    }
    if (got.length) showToast(`아이들이 들고 왔다: ${got.join(' · ')}`, '🎒');
}

// ---------- 가족 나들이 (npcActions.js 의 '함께' 메뉴) ----------

export function canOuting() {
    return !!state.partner && state.partner.state !== 'WANDER' && state.kids.length > 0
        && (state.story.lastOuting == null || state.day - state.story.lastOuting >= 3);
}
export function outingWait() {
    return state.story.lastOuting == null ? 0 : Math.max(0, 3 - (state.day - state.story.lastOuting));
}

export function goOuting(then) {
    const partner = state.partner, name = partner.config.name;
    state.story.lastOuting = state.day;
    const lines = [{ who: name, text: OUTING_PARTNER[name] || OUTING_PARTNER.default }];
    for (const kid of state.kids.slice(0, 3)) lines.push({ who: '나', text: `(${kid.name}: "${pick(FAMILY_LINES[kid.personality].outing)}")` });
    lines.push({ who: '나', text: '(해가 기울 때까지 호숫가에 있었다. 돌아오는 길에는 아이들이 졸려서 등에 업혀 왔다.)' });
    fadeScreen('가족 나들이', () => { state.dayTime = Math.min(0.78, state.dayTime + 0.14); }, () => playScene('호숫가의 하루', lines, () => {
        for (const kid of state.kids) { kid.affection = Math.min(100, kid.affection + 10); if (kid.entity && kid.entity.grow) kid.entity.grow(10); }
        partner.relation = Math.min(100, (partner.relation || 0) + 6);
        state.player.hp = state.player.maxHp;
        spawnEffect('HEART', state.player.x, state.player.y - 90, { color: '#ff7aa8', size: 1.4 });
        showToast('가족 나들이를 다녀왔습니다. 아이들의 애정과 성장, 짝의 호감이 올랐습니다.', '🧺');
        saveGame();
        if (then) then();
    }));
}

// ---------- 아이들의 눈치 (kidActions.js 가 인사말 대신 쓴다) ----------

/** 부모 사이에 일이 있으면 아이가 그 얘기부터 꺼낸다. 없으면 null */
export function kidMoodLine(kid) {
    const love = state.story.love, say = FAMILY_LINES[kid.personality];
    if (!love || kid.stage === 'BABY' && Math.random() < 0.5) return null;
    const p = state.partner;
    if (p && love.mood[p.config.name] && love.mood[p.config.name].kind === 'SULK') return say.fight;
    if (!p && Object.values(love.mood).some(m => m.kind === 'EX')) return say.split;
    if (p && love.vow && love.vow.with === p.config.name && state.day - love.vow.day < 3) return say.vow;
    return null;
}
