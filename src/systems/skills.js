import { state } from '../core/state.js';
import { shake } from '../core/camera.js';
import { dist, pick, rand } from '../core/utils.js';
import { SKILLS, SKILL_SLOTS } from '../data/skills.js';
import { addHazard } from '../entities/Hazard.js';
import { burst } from '../entities/Particle.js';
import { spawnEffect, spawnBolt, spawnText } from '../render/vfx.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { showToast } from '../ui/toast.js';
import { applyStatus } from './status.js';
import { allies } from './combat.js';
import { weatherDamageMult } from './weather.js';
import { hasRelic } from './relics.js';
import { play } from './audio.js';

// 플레이어 스킬의 실행부. 배운 스킬은 player.skills, 장착은 player.slots = { Q, F, R }.
// 시간이 걸리는 스킬(폭풍, 방사, 회복, 급강하)은 player.channels 에 넣어 매 프레임 진행한다.

const foes = () => { const E = state.entities; return [...E.enemies, ...E.humans, ...E.bosses].filter(e => e.awake !== false); };
const power = (p, element) => p.damageMult * (element ? weatherDamageMult(element) : 1);
const hurt = (e, dmg, color = '#fff') => { e.takeDamage(dmg); spawnText(e.x, e.y - 50, `${Math.round(dmg)}`, color, 16); };

export function learnSkill(id, silent = false) {
    const p = state.player;
    if (p.skills.includes(id)) return false;
    p.skills.push(id);
    const free = SKILL_SLOTS.find(s => !p.slots[s]);
    if (free) p.slots[free] = id;   // 빈 칸이 있으면 바로 장착
    if (!silent) {
        showToast(`새 스킬 [${SKILLS[id].name}] 습득!` + (free ? ` — [${free}] 칸에 장착` : ' — [B] 스킬 수첩에서 장착'), '📖');
        play('quest');
    }
    return true;
}

/** slot: 'Q' | 'F' | 'R' */
export function useSlot(p, slot) {
    const id = p.slots[slot];
    if (!id) { showToast(`[${slot}] 칸이 비어 있습니다. [B] 스킬 수첩에서 장착하세요.`, '📖'); return; }
    const def = SKILLS[id];
    if ((p.cooldowns[id] || 0) > 0 || p.channels.some(c => c.lock)) return;
    p.cooldowns[id] = def.cooldown * (hasRelic('GLACIA_TEAR') ? 0.75 : 1);   // 스킬은 대기 시간만 쓴다 (허기는 안 든다)
    if (p.animator) p.animator.play('attack');
    CAST[id](p);
}

const CAST = {
    TAIL_SWIPE(p) {
        for (const e of foes()) {
            const d = dist(p, e);
            if (d > 210) continue;
            hurt(e, 34 * power(p));
            if (!e.statusImmune) { e.x += ((e.x - p.x) / (d || 1)) * 120; e.y += ((e.y - p.y) / (d || 1)) * 120; }
        }
        spawnEffect('SLASH', p.x, p.y - 30, { size: 3.2, color: '#ffffff' });
        spawnEffect('SLASH', p.x, p.y - 30, { size: 3.2, angle: Math.PI, color: '#ffe9a0' });
        shake(5); play('slash');
    },
    ROAR(p) {
        for (const e of foes()) {
            const d = dist(p, e);
            if (d > 340) continue;
            hurt(e, 15 * power(p));
            applyStatus(e, 'STUN', 1.8);
            if (!e.statusImmune) { e.x += ((e.x - p.x) / (d || 1)) * 90; e.y += ((e.y - p.y) / (d || 1)) * 90; }
        }
        p.fury = 6;
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.2, color: '#fff2a8' });
        spawnEffect('RING', p.x, p.y - 40, { size: 3 });
        shake(8); play('roar');
    },
    METEOR(p) {
        const { x, y } = p.aimPoint(420);
        addHazard(x, y, { faction: 'ALLY', r: 185, delay: 0.6, linger: 2.5, damage: 48 * power(p, 'FIRE'), dps: 6 * power(p, 'FIRE'),
            color: '#ff6a2a', effect: 'FIRE_HIT', effectSize: 2.8, sound: 'boom', shake: 12, status: { type: 'BURN', duration: 4 } });
        spawnEffect('MAGIC_CIRCLE', x, y, { size: 1.6, color: '#ff9a3c' });
        setTimeout(() => spawnEffect('SCORCH', x, y, { size: 1.3, color: '#1a0d08' }), 600);
        play('flame');
    },
    WING_GUST(p) {
        const { angle } = p.aimAngle();
        for (const e of foes()) {
            const d = dist(p, e);
            let da = Math.atan2(e.y - p.y, e.x - p.x) - angle; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (d > 380 || Math.abs(da) > 0.9) continue;
            hurt(e, 12 * power(p));
            if (!e.statusImmune) { e.x += Math.cos(angle) * 230; e.y += Math.sin(angle) * 230; }
            applyStatus(e, 'SLOW', 2);
        }
        for (const b of state.entities.bullets) if (b.faction === 'ENEMY' && dist(p, b) < 340) { b.remove = true; burst(b.x, b.y, '#cfe9ff', 0.4, 2); }
        for (let i = 1; i <= 3; i++) spawnEffect('GUST', p.x + Math.cos(angle) * i * 90, p.y - 30 + Math.sin(angle) * i * 90, { size: 0.8 + i * 0.4, angle, color: '#dff4ff' });
        play('gust');
    },
    HEAL(p) {
        p.channels.push({ id: 'HEAL', time: 4, tick: 0 });
        for (const a of [...allies(), ...state.entities.babies]) if (dist(p, a) < 400 && a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.35);
        spawnEffect('AURA', p.x, p.y - 40, { size: 2, color: '#8dffb0' });
        play('heal');
    },
    FLAME_BREATH(p) {
        p.channels.push({ id: 'FLAME_BREATH', time: 1.8, tick: 0 });
    },
    IRON_SCALE(p) {
        p.guard = 5;
        spawnEffect('AURA', p.x, p.y - 40, { size: 1.8, color: '#cfd8e6' });
        play('guard');
    },
    RALLY(p) {
        state.rally = 10;
        for (const a of [...allies(), ...state.entities.babies]) {
            if (a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.4);
            if (a.downTimer > 0) a.downTimer = 0.1;   // 쓰러진 용도 일으켜 세운다
            spawnEffect('AURA', a.x, a.y - 30, { size: 1.2, color: '#ffd84a' });
            if (a.say) a.say(pick(['간다!', '우오오!', '같이 싸우자!']));
        }
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 3, color: '#ffd84a' });
        shake(6); play('roar');
    },
    FROST_NOVA(p) {
        for (const e of foes()) {
            if (dist(p, e) > 340) continue;
            hurt(e, 22 * power(p, 'ICE'), '#aee6ff');
            applyStatus(e, 'STUN', 2.5);
            applyStatus(e, 'SLOW', 5);
            spawnEffect('ICE_SPIKE', e.x, e.y + 10, { size: 1.2 });
        }
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.6, color: '#aee6ff' });
        burst(p.x, p.y - 40, '#aee6ff', 1, 40);
        play('freeze');
    },
    STORM(p) {
        p.channels.push({ id: 'STORM', time: 3, tick: 0 });
        play('thunder');
    },
    ICE_SPIKES(p) {
        const { angle } = p.aimAngle();
        for (let i = 1; i <= 6; i++) {
            addHazard(p.x + Math.cos(angle) * i * 85, p.y + Math.sin(angle) * i * 85, { faction: 'ALLY', r: 70, delay: 0.1 + i * 0.08, linger: 0,
                damage: 24 * power(p, 'ICE'), color: '#7fd4ff', effect: 'ICE_SPIKE', effectSize: 1.3, sound: i % 2 ? 'ice' : null, status: { type: 'STUN', duration: 1.4 } });
        }
    },
    DIVE(p) {
        const { x: tx, y: ty } = p.aimPoint(420);
        p.channels.push({ id: 'DIVE', time: 0.55, total: 0.55, sx: p.x, sy: p.y, tx, ty, lock: true });
        p.invuln = 0.7;
        spawnEffect('DUST', p.x, p.y, { size: 1.5, color: '#d8c8a8' });
        play('gust');
    },
    BLINK(p) {
        const { angle } = p.aimAngle();
        const sx = p.x, sy = p.y - 30;
        const len = 380;
        for (const e of foes()) {     // 지나가는 선분 근처의 적
            const t = Math.max(0, Math.min(len, (e.x - p.x) * Math.cos(angle) + (e.y - p.y) * Math.sin(angle)));
            if (Math.hypot(e.x - (p.x + Math.cos(angle) * t), e.y - (p.y + Math.sin(angle) * t)) < 70) {
                hurt(e, 30 * power(p, 'THUNDER'), '#ffe27a');
                spawnEffect('THUNDER_HIT', e.x, e.y - 16);
            }
        }
        p.x += Math.cos(angle) * len; p.y += Math.sin(angle) * len;
        p.invuln = 0.35;
        spawnBolt(sx, sy, p.x, p.y - 30);
        spawnEffect('THUNDER_BALL', sx, sy); spawnEffect('THUNDER_BALL', p.x, p.y - 30);
        play('thunder');
    },
};

/** 시간이 걸리는 스킬의 진행. Dragon.updatePlayer 가 매 프레임 호출 */
export function updateChannels(p, dt) {
    for (const c of p.channels) {
        c.time -= dt;
        c.tick -= dt;
        if (c.id === 'HEAL') {
            p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35 / 4 * dt);
            if (c.tick <= 0) { c.tick = 0.4; spawnEffect('HEART', p.x + rand(-30, 30), p.y - 60, { color: '#8dffb0' }); }
        } else if (c.id === 'STORM' && c.tick <= 0) {
            c.tick = 0.18;
            const near = foes().filter(e => dist(p, e) < 480);
            if (near.length) {
                const e = pick(near);
                spawnBolt(e.x + rand(-40, 40), e.y - 420, e.x, e.y - 16);
                spawnEffect('SPARK', e.x, e.y - 16, { size: 1.2, color: '#fff2a8', angle: rand(0, 6) });
                hurt(e, 12 * power(p, 'THUNDER'), '#ffe27a');
                play('zap');
            }
        } else if (c.id === 'FLAME_BREATH' && c.tick <= 0) {
            c.tick = 0.12;
            const angle = p.angle;
            for (const e of foes()) {
                const d = dist(p, e);
                let da = Math.atan2(e.y - p.y, e.x - p.x) - angle; da = Math.atan2(Math.sin(da), Math.cos(da));
                if (d > 330 || Math.abs(da) > 0.55) continue;
                e.takeDamage(7 * power(p, 'FIRE'));
                applyStatus(e, 'BURN', 3);
            }
            const r = rand(80, 300), a = angle + rand(-0.45, 0.45);
            spawnEffect('FLAMES', p.x + Math.cos(a) * r, p.y - 10 + Math.sin(a) * r, { size: 0.7 + r / 400 });
            play('flame');
        } else if (c.id === 'DIVE') {
            const k = 1 - Math.max(0, c.time) / c.total;
            p.x = c.sx + (c.tx - c.sx) * k; p.y = c.sy + (c.ty - c.sy) * k;
            p.diveHeight = Math.sin(k * Math.PI) * 160;   // 그릴 때 이만큼 떠오른다
            if (c.time <= 0) {
                p.diveHeight = 0;
                for (const e of foes()) if (dist(p, e) < 210) { hurt(e, 42 * power(p)); applyStatus(e, 'STUN', 1.2); }
                spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.4, color: '#ffe9c4' });
                spawnEffect('DUST', p.x, p.y, { size: 2.2, color: '#d8c8a8' });
                shake(12); play('boom');
            }
        }
    }
    p.channels = p.channels.filter(c => c.time > 0);
}

// ---------- 스킬 수첩 (B) ----------
function close() { state.isDialogueOpen = false; dialogueUI.hide(); }

export function openSkillBook() {
    const p = state.player;
    state.isDialogueOpen = true;
    const label = (s) => `[${s}] ${p.slots[s] ? SKILLS[p.slots[s]].name : '(비어 있음)'}`;
    dialogueUI.show({
        name: `스킬 수첩 · 배운 스킬 ${p.skills.length} / ${Object.keys(SKILLS).length}`, sheet: p.sheet, onClose: close,
        text: p.skills.length ? '바꿀 칸을 고르세요. 배운 스킬 가운데 셋만 장착할 수 있습니다.' : '아직 배운 스킬이 없습니다. 마을의 스승 카이론에게 수련을 청해 보세요.',
        options: [...SKILL_SLOTS.map(s => ({ label: label(s), onSelect: () => pickSkill(s) })), { label: '닫기', onSelect: close }],
    });
}

function pickSkill(slot) {
    const p = state.player;
    const options = p.skills.map(id => ({
        label: `${SKILLS[id].name} — ${SKILLS[id].desc} (대기 ${SKILLS[id].cooldown}초)`,
        onSelect: () => {
            for (const s of SKILL_SLOTS) if (p.slots[s] === id) p.slots[s] = p.slots[slot];   // 이미 장착된 스킬이면 자리를 맞바꾼다
            p.slots[slot] = id;
            openSkillBook();
        },
    }));
    options.push({ label: '이 칸 비우기', onSelect: () => { p.slots[slot] = null; openSkillBook(); } }, { label: '뒤로', onSelect: openSkillBook });
    dialogueUI.show({ name: `[${slot}] 칸에 장착할 스킬`, text: '숫자키로 바로 고를 수 있습니다.', sheet: p.sheet, onClose: close, options });
}
