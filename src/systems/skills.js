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
export function skillCooldown(id) { return SKILLS[id].cooldown * skillCdMult(id) * (hasRelic('GLACIA_TEAR') ? 0.75 : 1); }

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
        spawnEffect('SLASH', p.x, p.y - 30, { size: 3.2, color: '#ffffff' });
        spawnEffect('SLASH', p.x, p.y - 30, { size: 3.2, angle: Math.PI, color: '#ffe9a0' });
        shake(5); play('slash');
    },
    ROAR(p, m) {
        for (const e of foes()) {
            const d = dist(p, e);
            if (d > 340) continue;
            hurt(e, 15 * power(p, null, m));
            applyStatus(e, 'STUN', 1.8);
            if (!e.statusImmune) { e.x += ((e.x - p.x) / (d || 1)) * 90; e.y += ((e.y - p.y) / (d || 1)) * 90; }
        }
        p.fury = 6;
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.2, color: '#fff2a8' });
        spawnEffect('RING', p.x, p.y - 40, { size: 3 });
        shake(8); play('roar');
    },
    METEOR(p, m) {
        const { x, y } = p.aimPoint(420);
        addHazard(x, y, { faction: 'ALLY', r: 185, delay: 0.6, linger: 2.5, damage: 48 * power(p, 'FIRE', m), dps: 6 * power(p, 'FIRE', m),
            color: '#ff6a2a', effect: 'FIRE_HIT', effectSize: 2.8, sound: 'boom', shake: 12, status: { type: 'BURN', duration: 4 } });
        spawnEffect('MAGIC_CIRCLE', x, y, { size: 1.6, color: '#ff9a3c' });
        setTimeout(() => spawnEffect('SCORCH', x, y, { size: 1.3, color: '#1a0d08' }), 600);
        play('flame');
    },
    WING_GUST(p, m) {
        const { angle } = p.aimAngle();
        for (const e of foes()) {
            const d = dist(p, e);
            let da = Math.atan2(e.y - p.y, e.x - p.x) - angle; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (d > 380 || Math.abs(da) > 0.9) continue;
            hurt(e, 12 * power(p, null, m));
            if (!e.statusImmune) { e.x += Math.cos(angle) * 230; e.y += Math.sin(angle) * 230; }
            applyStatus(e, 'SLOW', 2);
        }
        for (const b of state.entities.bullets) if (b.faction === 'ENEMY' && dist(p, b) < 340) { b.remove = true; burst(b.x, b.y, '#cfe9ff', 0.4, 2); }
        for (let i = 1; i <= 3; i++) spawnEffect('GUST', p.x + Math.cos(angle) * i * 90, p.y - 30 + Math.sin(angle) * i * 90, { size: 0.8 + i * 0.4, angle, color: '#dff4ff' });
        play('gust');
    },
    HEAL(p, m) {
        p.channels.push({ id: 'HEAL', m, time: 4, tick: 0 });
        for (const a of [...allies(), ...state.entities.babies]) if (dist(p, a) < 400 && a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.35 * m);
        spawnEffect('AURA', p.x, p.y - 40, { size: 2, color: '#8dffb0' });
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
        p.channels.push({ id: 'FLAME_BREATH', m, time: 1.8, tick: 0 });
    },
    IRON_SCALE(p) {
        p.guard = 5;
        spawnEffect('AURA', p.x, p.y - 40, { size: 1.8, color: '#cfd8e6' });
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
        for (let i = 1; i <= 4; i++) spawnEffect('GUST', p.x + Math.cos(angle) * i * 95, p.y - 30 + Math.sin(angle) * i * 95, { size: 1 + i * 0.45, angle, color: '#4aa3ff' });
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 1.8, color: '#4aa3ff' });
        shake(7); play('gust');
    },
    UPHEAVAL(p, m) {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            addHazard(p.x + Math.cos(a) * 170, p.y + Math.sin(a) * 130, { faction: 'ALLY', r: 95, delay: 0.25 + (i % 2) * 0.12, linger: 0,
                damage: 30 * power(p, 'EARTH', m), color: '#c9a06a', effect: 'FIRE_HIT', effectSize: 1.6, sound: i === 0 ? 'boom' : null, shake: i === 0 ? 10 : 0, status: { type: 'STUN', duration: 1.6 } });
        }
        spawnEffect('SHOCKWAVE', p.x, p.y, { size: 2.4, color: '#c9a06a' });
    },
    BRAMBLE(p, m) {
        const { x, y } = p.aimPoint(380);
        addHazard(x, y, { faction: 'ALLY', r: 175, delay: 0.35, linger: 5, damage: 10 * power(p, 'GRASS', m), dps: 7 * power(p, 'GRASS', m),
            color: '#6fcf5a', effect: 'THUNDER_HIT', effectSize: 2.2, sound: 'zap', status: { type: 'POISON', duration: 5 } });
        spawnEffect('MAGIC_CIRCLE', x, y, { size: 1.5, color: '#6fcf5a' });
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
        burst(p.x, p.y - 40, '#aee6ff', 1, 40);
        play('freeze');
    },
    STORM(p, m) {
        p.channels.push({ id: 'STORM', m, time: 3, tick: 0 });
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
        spawnEffect('MAGIC_CIRCLE', p.x, p.y, { size: 2, color: '#c77dff' });
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
                if (d > 330 || Math.abs(da) > 0.55) continue;
                e.takeDamage(7 * power(p, 'FIRE', m));
                applyStatus(e, 'BURN', 3);
            }
            const r = rand(80, 300), a = angle + rand(-0.45, 0.45);
            spawnEffect('FLAMES', p.x + Math.cos(a) * r, p.y - 10 + Math.sin(a) * r, { size: 0.7 + r / 400 });
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
