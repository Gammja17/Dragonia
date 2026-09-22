import { state } from '../core/state.js';
import { shake } from '../core/camera.js';
import { dist, pick, rand } from '../core/utils.js';
import { SKILLS, SKILL_SLOTS } from '../data/skills.js';
import { addHazard } from '../entities/Hazard.js';
import { burst } from '../entities/Particle.js';
import { spawnEffect, spawnBolt, spawnText } from '../render/vfx.js';
import { showToast } from '../ui/toast.js';
import { applyStatus } from './status.js';
import { allies } from './combat.js';
import { weatherDamageMult } from './weather.js';
import { hasRelic } from './relics.js';
import { skillPower, skillCdMult, skillRank, stat } from './growth.js';
import { play } from './audio.js';
import { hitStop, flash } from '../render/feedback.js';

/** 여러 개를 시간차로 뿌린다 */
function later(ms, fn) { setTimeout(() => { if (state.gameActive) fn(); }, ms); }

// 플레이어 스킬의 실행부. 배운 스킬은 player.skills, 장착은 player.slots = { Q, F, R }.
// 강화 단수(1~3)는 systems/growth.js 가 들고 있고, 여기서는 위력 배수 m 으로 받아 쓴다.
// 시간이 걸리는 스킬(폭풍, 방사, 회복, 급강하…)은 player.channels 에 넣어 매 프레임 진행하며,
// 자기 m 을 채널에 함께 실어 둔다.

const foes = () => { const E = state.entities; return [...E.enemies, ...E.humans, ...E.bosses].filter(e => e.awake !== false); };
const power = (p, element, m = 1) => p.damageMult * m * (element ? weatherDamageMult(element) : 1);
const hurt = (e, dmg, color = '#fff') => { e.takeDamage(dmg); spawnText(e.x, e.y - 50, `${Math.round(dmg)}`, color, 16); };

/** 강화 단수와 성장 트리를 합친 스킬 위력 배수 */
export function castMult(id) { return skillPower(id) * (1 + stat('skill')); }
/** 강화 단수와 성장 트리를 합친 실제 대기 시간 (HUD 와 스킬 나무의 표시에도 쓴다) */
export function skillCooldown(id) { return SKILLS[id].cooldown * skillCdMult(id) * (hasRelic('GLACIA_TEAR') ? 0.75 : 1) * (1 - Math.min(0.25, 0.05 * (state.upgrades.cd || 0))); }   // 끝은 대장간 '숨길 트기'

export function learnSkill(id, silent = false) {
    const p = state.player;
    if (!p || p.skills.includes(id)) return false;
    p.skills.push(id);
    const free = SKILL_SLOTS.find(s => !p.slots[s]);
    if (free) p.slots[free] = id;   // 빈 칸이 있으면 바로 장착
    if (!silent) {
        showToast(`새 스킬 [${SKILLS[id].name}] 습득!` + (free ? ` ([${free}] 칸에 장착)` : ' ([K] 스킬 나무에서 장착)'), '📖');
        play('quest');
    }
    checkSkillUnlocks(true);   // 이 스킬이 다른 각성 스킬의 조건이었을 수도 있다
    return true;
}

// ---------- 스스로 깨우치는 스킬 · 각성 ----------
const SELF_CONDS = {
    kills25: () => Object.values(state.stats.kills).reduce((a, b) => a + b, 0) >= 25,
    brink3:  () => (state.stats.brinks || 0) >= 3,
};

/** 조건이 찬 SELF / AWAKEN 스킬을 자동으로 익힌다. Dragon.updatePlayer 가 1초에 한 번 부른다 */
export function checkSkillUnlocks(silent = false) {
    if (!state.player) return;
    for (const [id, def] of Object.entries(SKILLS)) {
        if (state.player.skills.includes(id)) continue;
        const s = def.source;
        if (s.type === 'SELF' && SELF_CONDS[s.cond] && SELF_CONDS[s.cond]()) learnSkill(id);
        else if (s.type === 'AWAKEN' && s.need.every(([need, rank]) => skillRank(need) >= rank)) {
            if (!silent) play('evolve');
            learnSkill(id);
        }
    }
}

/** slot: 'Q' | 'F' | 'R' */
export function useSlot(p, slot) {
    const id = p.slots[slot];
    if (!id) { showToast(`[${slot}] 칸이 비어 있습니다. [B] 스킬 나무에서 장착하세요.`, '📖'); return; }
    if ((p.cooldowns[id] || 0) > 0 || p.channels.some(c => c.lock)) return;
    p.cooldowns[id] = p.cdMax[id] = skillCooldown(id);   // 스킬은 대기 시간만 쓴다 (허기는 안 든다)
    if (hasRelic('ECHO_SHELL') && Math.random() < 0.25) { p.cooldowns[id] = 0.4; showToast('메아리! 기술이 바로 돌아왔다.', '🐚'); }
    if (p.animator) p.animator.play('attack');
    CAST[id](p, castMult(id));
}

const CAST = {
    POUNCE(p, m) {
        const { x: tx, y: ty } = p.aimPoint(230);
        p.channels.push({ id: 'POUNCE', m, time: 0.3, total: 0.3, lock: true, sx: p.x, sy: p.y, tx, ty });
        p.invuln = 0.3;
        spawnEffect('PUFF', p.x, p.y - 6);
        play('dash');
    },
    TAIL_SWIPE(p, m) {
        for (const e of foes()) {
            const d = dist(p, e);
            if (d > 210) continue;
            hurt(e, 34 * power(p, null, m));
            if (!e.statusImmune) { e.x += ((e.x - p.x) / (d || 1)) * 120; e.y += ((e.y - p.y) / (d || 1)) * 120; }
        }
        for (let i = 0; i < 3; i++) later(i * 40, () => spawnEffect('ARC', p.x, p.y - 30, { size: 2.0, angle: i * 2.1 + p.angle, color: i ? '#ffd07a' : '#ffffff' }));
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 1.3, color: '#ffe9a0' });
        for (const e of foes()) if (dist(p, e) <= 210) { spawnEffect('EMBER', e.x, e.y - 24, { size: 1.1, color: '#ffd07a' }); burst(e.x, e.y - 20, '#ffe9a0', 0.8, 6); }
        hitStop(0.05); shake(6); play('slash');
        if (hasRelic('TAIL_TWIN') && !p.tailTwin) {   // 유물 '두 번 치는 꼬리'
            p.tailTwin = true;
            setTimeout(() => { p.tailTwin = false; if (state.player === p) { CAST.TAIL_SWIPE(p, m * 0.6); } }, 260);
        }
    },
    ROAR(p, m) {
        for (const e of foes()) {
            const d = dist(p, e);
            if (d > 340) continue;
            hurt(e, 15 * power(p, null, m));
            applyStatus(e, 'STUN', 1.8);
            if (hasRelic('ROAR_FLAME')) { applyStatus(e, 'BURN', 4); spawnEffect('FLAMES', e.x, e.y, { size: 0.9 }); }   // 유물 '불타는 목청'
            if (!e.statusImmune) { e.x += ((e.x - p.x) / (d || 1)) * 90; e.y += ((e.y - p.y) / (d || 1)) * 90; }
        }
        p.fury = 6;
        spawnEffect('BLOOM', p.x, p.y - 40, { size: 0.83, color: '#ffb347' });
        for (let i = 0; i < 3; i++) later(i * 110, () => { spawnEffect('SHOCKWAVE', p.x, p.y, { size: 1.6 + i * 0.7, color: '#fff2a8' }); spawnEffect('RING', p.x, p.y - 40, { size: 2 + i, color: '#ffd07a' }); });
        flash(0.25, '255,200,120');
        hitStop(0.08); shake(10); play('roar');
    },
    METEOR(p, m) {
        const { x, y } = p.aimPoint(420);
        addHazard(x, y, { faction: 'ALLY', r: 185, delay: 0.6, linger: 2.5, damage: 48 * power(p, 'FIRE', m), dps: 6 * power(p, 'FIRE', m),
            color: '#ff6a2a', effect: 'FIRE_HIT', effectSize: 2.8, sound: 'boom', shake: 12, status: { type: 'BURN', duration: 4 } });
        spawnEffect('RUNE', x, y, { size: 1.7, color: '#ff9a3c' });
        spawnEffect('FALLING_STAR', x, y - 40, { size: 1.6, color: '#ffb347', angle: 0.6 });
        later(560, () => { spawnEffect('BLOOM', x, y - 20, { size: 1.32, color: '#ff7a2a' }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; spawnEffect('EMBER', x + Math.cos(a) * 70, y - 10 + Math.sin(a) * 45, { size: 1.2, color: '#ff9a3c' }); } });
        if (hasRelic('METEOR_RAIN')) for (let i = 0; i < 3; i++) {   // 유물 '별 부스러기'
            const a = (i / 3) * Math.PI * 2 + 0.5, r = 190;
            addHazard(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, { faction: 'ALLY', r: 95, delay: 0.9 + i * 0.15, linger: 1, damage: 22 * power(p, 'FIRE', m), color: '#ff8a4a', effect: 'FIRE_HIT', effectSize: 1.6, sound: 'boom', shake: 4, status: { type: 'BURN', duration: 3 } });
        }
        setTimeout(() => spawnEffect('SCORCH', x, y, { size: 1.3, color: '#1a0d08' }), 600);
        play('flame');
    },
    WING_GUST(p, m) {
        const { angle } = p.aimAngle();
        for (const e of foes()) {
            const d = dist(p, e);
            let da = Math.atan2(e.y - p.y, e.x - p.x) - angle; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (d > 380 || Math.abs(da) > 0.9) continue;
            hurt(e, 12 * power(p, null, m) * (hasRelic('GUST_BLADE') ? 3 : 1));
            if (!e.statusImmune) { e.x += Math.cos(angle) * 230; e.y += Math.sin(angle) * 230; }
            applyStatus(e, 'SLOW', 2);
            if (hasRelic('GUST_BLADE')) { applyStatus(e, 'STUN', 1.2); spawnEffect('HIT_SPARK', e.x, e.y - 20, { size: 1.4, color: '#dff4ff' }); }   // 유물 '칼바람 깃'
        }
        for (const b of state.entities.bullets) if (b.faction === 'ENEMY' && dist(p, b) < 340) { b.remove = true; burst(b.x, b.y, '#cfe9ff', 0.4, 2); }
        for (let i = 1; i <= 3; i++) spawnEffect('WHIRL', p.x + Math.cos(angle) * i * 90, p.y - 30 + Math.sin(angle) * i * 90, { size: 0.7 + i * 0.35, angle, color: '#dff4ff' });
        for (let i = 0; i < 5; i++) { const off = (i - 2) * 0.22; spawnEffect('STREAK', p.x + Math.cos(angle + off) * 120, p.y - 30 + Math.sin(angle + off) * 120, { size: 1.6, angle: angle + off, color: '#ffffff' }); }
        play('gust');
    },
    HEAL(p, m) {
        p.channels.push({ id: 'HEAL', m, time: 4, tick: 0 });
        for (const a of [...allies(), ...state.entities.babies]) if (dist(p, a) < 400 && a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.35 * m);
        spawnEffect('AURA', p.x, p.y - 40, { size: 2, color: '#8dffb0' });
        spawnEffect('SIGIL', p.x, p.y, { size: 1.6, color: '#8dffb0' });
        for (let i = 0; i < 10; i++) later(i * 120, () => spawnEffect('SPARKLE', p.x + rand(-60, 60), p.y - rand(0, 60), { size: 1, color: '#c8ffd8' }));
        play('heal');
    },
    SHED(p) {
        p.slowTimer = 0;
        p.invuln = Math.max(p.invuln, 1.2);
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.2);
        for (const e of foes()) {
            const d = dist(p, e);
            if (d > 260 || e.statusImmune) continue;
            e.x += ((e.x - p.x) / (d || 1)) * 150; e.y += ((e.y - p.y) / (d || 1)) * 150;
        }
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2, color: '#cfe9ff' });
        spawnEffect('AURA', p.x, p.y - 40, { size: 1.8, color: '#dff4ff' });
        burst(p.x, p.y - 40, '#dff4ff', 0.9, 24);
        play('heal');
    },
    FLAME_BREATH(p, m) {
        p.channels.push({ id: 'FLAME_BREATH', m, time: hasRelic('LONG_BREATH') ? 3 : 1.8, tick: 0 });   // 유물 '긴 숨'
    },
    IRON_SCALE(p) {
        p.guard = 5;
        spawnEffect('HALO', p.x, p.y - 40, { size: 1.6, color: '#dfe8f4' });
        spawnEffect('BLOOM', p.x, p.y - 40, { size: 0.66, color: '#cfd8e6' });
        play('guard');
    },
    RALLY(p, m) {
        state.rally = 10;
        for (const a of [...allies(), ...state.entities.babies]) {
            if (a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.4 * m);
            if (a.downTimer > 0) a.downTimer = 0.1;   // 쓰러진 용도 일으켜 세운다
            spawnEffect('AURA', a.x, a.y - 30, { size: 1.2, color: '#ffd84a' });
            if (a.say) a.say(pick(['간다!', '우오오!', '같이 싸우자!']));
        }
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 3, color: '#ffd84a' });
        shake(6); play('roar');
    },
    // ---- 맡겨 받은 숨결의 기술 ----
    TIDE(p, m) {
        const { angle } = p.aimAngle();
        for (const e of foes()) {
            const d = dist(p, e);
            let da = Math.atan2(e.y - p.y, e.x - p.x) - angle; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (d > 420 || Math.abs(da) > 0.8) continue;
            hurt(e, 20 * power(p, 'WATER', m), '#7fc4ff');
            applyStatus(e, 'WET', 6);
            if (!e.statusImmune) { e.x += Math.cos(angle) * 260; e.y += Math.sin(angle) * 260; }
        }
        for (const b of state.entities.bullets) if (b.faction === 'ENEMY' && dist(p, b) < 360) b.remove = true;   // 날아오던 것도 같이 쓸려 간다
        for (let i = 1; i <= 4; i++) spawnEffect('WATER_SPLASH', p.x + Math.cos(angle) * i * 95, p.y + Math.sin(angle) * i * 95, { size: 0.8 + i * 0.3 });
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 1.8, color: '#4aa3ff' });
        shake(7); play('gust');
    },
    UPHEAVAL(p, m) {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            addHazard(p.x + Math.cos(a) * 170, p.y + Math.sin(a) * 130, { faction: 'ALLY', r: 95, delay: 0.25 + (i % 2) * 0.12, linger: 0,
                damage: 30 * power(p, 'EARTH', m), color: '#c9a06a', effect: 'EARTH_RISE', effectSize: 1.6, sound: i === 0 ? 'boom' : null, shake: i === 0 ? 10 : 0, status: { type: 'STUN', duration: 1.6 } });
        }
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.4, color: '#c9a06a' });
    },
    BRAMBLE(p, m) {
        const { x, y } = p.aimPoint(380);
        addHazard(x, y, { faction: 'ALLY', r: 175, delay: 0.35, linger: 5, damage: 10 * power(p, 'GRASS', m), dps: 7 * power(p, 'GRASS', m),
            color: '#6fcf5a', effect: 'GRASS_HIT', effectSize: 2.2, sound: 'zap', status: { type: 'POISON', duration: 5 } });
        spawnEffect('MAGIC_CIRCLE', x, y, { size: 1.5, color: '#6fcf5a' });
        for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; spawnEffect('ROOT', x + Math.cos(a) * 110, y + Math.sin(a) * 85, { size: 1 + (i % 2) * 0.3 }); }
        for (const e of foes()) if (Math.hypot(e.x - x, e.y - y) < 175) applyStatus(e, 'SLOW', 3);
    },
    FROST_NOVA(p, m) {
        for (const e of foes()) {
            if (dist(p, e) > 340) continue;
            hurt(e, 22 * power(p, 'ICE', m), '#aee6ff');
            applyStatus(e, 'STUN', 2.5);
            applyStatus(e, 'SLOW', 5);
            spawnEffect('ICE_SPIKE', e.x, e.y + 10, { size: 1.2 });
        }
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.6, color: '#aee6ff' });
        spawnEffect('BLOOM', p.x, p.y - 40, { size: 1.1, color: '#aee6ff' });
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; later(i * 25, () => spawnEffect('ICE_SPIKE', p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 105, { size: 1.1 })); }
        burst(p.x, p.y - 40, '#aee6ff', 1, 40);
        hitStop(0.06); play('freeze');
    },
    STORM(p, m) {
        p.channels.push({ id: 'STORM', m, time: 3, tick: 0 });
        spawnEffect('SIGIL', p.x, p.y, { size: 2.2, color: '#ffe27a' });
        spawnEffect('BLOOM', p.x, p.y - 40, { size: 1.1, color: '#ffe27a' });
        play('thunder');
    },
    ICE_SPIKES(p, m) {
        const { angle } = p.aimAngle();
        for (let i = 1; i <= 6; i++) {
            addHazard(p.x + Math.cos(angle) * i * 85, p.y + Math.sin(angle) * i * 85, { faction: 'ALLY', r: 70, delay: 0.1 + i * 0.08, linger: 0,
                damage: 24 * power(p, 'ICE', m), color: '#7fd4ff', effect: 'ICE_SPIKE', effectSize: 1.3, sound: i % 2 ? 'ice' : null, status: { type: 'STUN', duration: 1.4 } });
        }
    },
    AURORA(p, m) {
        // 불 → 얼음 → 번개가 번갈아 깔리는 긴 빛의 띠
        const { angle } = p.aimAngle();
        const BANDS = [
            { color: '#ff6a2a', effect: 'FIRE_HIT',    element: 'FIRE',    status: { type: 'BURN', duration: 4 },   sound: 'flame' },
            { color: '#7fd4ff', effect: 'ICE_SPIKE',   element: 'ICE',     status: { type: 'SLOW', duration: 4 },   sound: 'ice' },
            { color: '#ffe27a', effect: 'THUNDER_HIT', element: 'THUNDER', status: { type: 'STUN', duration: 1.2 }, sound: 'zap' },
        ];
        for (let i = 1; i <= 8; i++) {
            const b = BANDS[i % 3];
            addHazard(p.x + Math.cos(angle) * i * 95, p.y + Math.sin(angle) * i * 95, { faction: 'ALLY', r: 100, delay: 0.08 * i, linger: 1.6,
                damage: 30 * power(p, b.element, m), dps: 8 * power(p, b.element, m),
                color: b.color, effect: b.effect, effectSize: 1.8, sound: i % 3 === 0 ? b.sound : null, status: b.status });
        }
        spawnEffect('RUNE', p.x, p.y, { size: 2.2, color: '#c77dff' });
        spawnEffect('BLOOM', p.x, p.y - 40, { size: 1.43, color: '#e0b0ff' });
        flash(0.2, '200,150,255');
        shake(8); play('evolve');
    },
    DIVE(p, m) {
        const { x: tx, y: ty } = p.aimPoint(420);
        p.channels.push({ id: 'DIVE', m, time: 0.55, total: 0.55, sx: p.x, sy: p.y, tx, ty, lock: true });
        p.invuln = 0.7;
        spawnEffect('DUST', p.x, p.y, { size: 1.5, color: '#d8c8a8' });
        play('gust');
    },
    TEMPEST(p, m) {
        p.channels.push({ id: 'TEMPEST', m, time: 2, tick: 0, spin: 0 });
        spawnEffect('WHIRL', p.x, p.y - 30, { size: 2.4, color: '#dff4ff' });
        shake(4); play('gust');
    },
    BLINK(p, m) {
        const { angle } = p.aimAngle();
        const sx = p.x, sy = p.y - 30;
        const len = 380;
        for (const e of foes()) {     // 지나가는 선분 근처의 적
            const t = Math.max(0, Math.min(len, (e.x - p.x) * Math.cos(angle) + (e.y - p.y) * Math.sin(angle)));
            if (Math.hypot(e.x - (p.x + Math.cos(angle) * t), e.y - (p.y + Math.sin(angle) * t)) < 70) {
                hurt(e, 30 * power(p, 'THUNDER', m), '#ffe27a');
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
        const m = c.m || 1;
        c.time -= dt;
        c.tick -= dt;
        if (c.id === 'HEAL') {
            p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35 * m / 4 * dt);
            if (c.tick <= 0) { c.tick = 0.4; spawnEffect('HEART', p.x + rand(-30, 30), p.y - 60, { color: '#8dffb0' }); }
        } else if (c.id === 'STORM' && c.tick <= 0) {
            c.tick = 0.18;
            const near = foes().filter(e => dist(p, e) < 480);
            if (near.length) {
                const e = pick(near);
                spawnBolt(e.x + rand(-40, 40), e.y - 420, e.x, e.y - 16);
                spawnEffect('SPARK', e.x, e.y - 16, { size: 1.2, color: '#fff2a8', angle: rand(0, 6) });
                hurt(e, 12 * power(p, 'THUNDER', m), '#ffe27a');
                play('zap');
            }
        } else if (c.id === 'FLAME_BREATH' && c.tick <= 0) {
            c.tick = 0.12;
            const angle = p.angle;
            for (const e of foes()) {
                const d = dist(p, e);
                let da = Math.atan2(e.y - p.y, e.x - p.x) - angle; da = Math.atan2(Math.sin(da), Math.cos(da));
                if (d > 330 || Math.abs(da) > (hasRelic('LONG_BREATH') ? 0.8 : 0.55)) continue;
                e.takeDamage(7 * power(p, 'FIRE', m));
                applyStatus(e, 'BURN', 3);
            }
            const r = rand(80, 300), a = angle + rand(-0.45, 0.45);
            spawnEffect('FLAMES', p.x + Math.cos(a) * r, p.y - 10 + Math.sin(a) * r, { size: 0.9 + r / 300 });
            spawnEffect('EMBER', p.x + Math.cos(a) * r, p.y - 30 + Math.sin(a) * r, { size: 0.9, color: '#ff9a3c' });
            spawnEffect('MUZZLE', p.x + Math.cos(angle) * 50, p.y - 40 + Math.sin(angle) * 50, { angle: angle + Math.PI / 2, size: 1.4, color: '#ff9a3c' });
            play('flame');
        } else if (c.id === 'TEMPEST') {
            // 회전하며 주변을 계속 베고 날아오는 탄을 지운다
            if (c.tick <= 0) {
                c.tick = 0.16;
                c.spin += Math.PI * 0.6;
                for (const e of foes()) if (dist(p, e) < 230) hurt(e, 11 * power(p, null, m));
                for (const b of state.entities.bullets) if (b.faction === 'ENEMY' && dist(p, b) < 230) { b.remove = true; burst(b.x, b.y, '#cfe9ff', 0.4, 2); }
                spawnEffect('SLASH', p.x, p.y - 30, { size: 2.6, angle: c.spin, color: '#dff4ff' });
                play('slash');
            }
            if (c.time <= 0) { spawnEffect('GUST', p.x, p.y - 30, { size: 2.2, color: '#dff4ff' }); shake(5); }
        } else if (c.id === 'DIVE' || c.id === 'POUNCE') {
            const k = 1 - Math.max(0, c.time) / c.total;
            p.x = c.sx + (c.tx - c.sx) * k; p.y = c.sy + (c.ty - c.sy) * k;
            const big = c.id === 'DIVE';
            p.diveHeight = Math.sin(k * Math.PI) * (big ? 160 : 45);   // 그릴 때 이만큼 떠오른다
            if (c.time <= 0) {
                p.diveHeight = 0;
                spawnEffect(big ? 'BLOOM' : 'DUST', p.x, p.y - (big ? 20 : 0), { size: big ? 2.2 : 1.4, color: big ? '#ffe9a0' : '#d8c8a8' });
                for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; spawnEffect('STREAK', p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 40, { size: big ? 1.4 : 0.9, angle: a, color: '#fff2c8' }); }
                hitStop(big ? 0.08 : 0.04); shake(big ? 12 : 5); play(big ? 'boom' : 'thud');
                if (!big && hasRelic('POUNCE_QUAKE')) {   // 유물 '무거운 착지'
                    for (const e of foes()) if (dist(p, e) < 200) applyStatus(e, 'STUN', 1.3);
                    spawnEffect('SHOCKWAVE', p.x, p.y, { size: 1.8, color: '#c9a06a' }); shake(6);
                }
                for (const e of foes()) if (dist(p, e) < (big ? 210 : 130)) {
                    hurt(e, (big ? 42 : 28) * power(p, null, m));
                    applyStatus(e, 'STUN', big ? 1.2 : 0.6);
                }
                if (big) {
                    spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.4, color: '#ffe9c4' });
                    spawnEffect('DUST', p.x, p.y, { size: 2.2, color: '#d8c8a8' });
                    shake(12); play('boom');
                } else {
                    spawnEffect('SLASH', p.x, p.y - 30, { size: 2.2, color: '#ffffff' });
                    shake(4); play('slash');
                }
            }
        }
    }
    p.channels = p.channels.filter(c => c.time > 0);
}
