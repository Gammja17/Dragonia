import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { hasRelic, resonates } from './relics.js';
import { spawnEffect, spawnText } from '../render/vfx.js';
import { burst } from '../entities/Particle.js';
import { shake } from '../core/camera.js';
import { flash, hitStop } from '../render/feedback.js';
import { play } from './audio.js';
import { showToast } from '../ui/toast.js';

// 싸움의 흐름. 쏘고 피하는 것만으로는 잘 싸운 것과 대충 싸운 것의 차이가 없었다.
// 세 가지가 서로 물려 돈다:
//
//   기세      맞히고 쓰러뜨릴수록 차오르고, 맞으면 반이 날아간다. 찰수록 숨결이 세진다
//   간발      날아오는 것을 아슬아슬하게 대시로 피하면 세상이 잠깐 느려지고 기세가 크게 찬다
//   물어뜯기  숨이 붙어 있는 적을 대시로 뚫고 지나가면 끝장을 내고 체력을 조금 되찾는다
//
// 보스전도 같은 흐름을 탄다 (entities/Boss.js):
//   보스의 돌진·광선·솟구침·장판을 간발로 피하면 보스가 잠깐 빈틈을 보인다 (exposed: 그동안 1.5배로 맞는다)
//   빗나간 돌진도 빈틈이다. 페이즈가 넘어갈 때 기세가 거세면 그 숨 고르는 틈을 더 길게 몰아붙인다
//   숨이 얼마 안 남은 보스는 기세가 있을 때 대시로 뚫고 지나가면 끝난다 (숨통 끊기)
//
// state.flow = { m: 기세 0~100, idle: 기세를 못 올린 시간, slow: 느려진 세상의 남은 시간, edge: 간발 뒤 강화 시간, stacks/stackT: 굶주린 불꽃 }

const TIERS = [30, 60, 100];
const TIER_NAMES = ['', '기세', '기세 · 거셈', '기세 · 절정'];
const TIER_DMG = [1, 1.1, 1.2, 1.35];
export const TIER_COLORS = ['#8a7a5a', '#ffd07a', '#ff9a3c', '#ff5a3c'];

const F = () => state.flow || (state.flow = { m: 0, idle: 0, slow: 0, edge: 0, stacks: 0, stackT: 0 });

/** 처음 한 번만 알려 준다 (state.stats 는 저장된다) */
function once(key, text, icon) {
    const seen = state.stats.seen || (state.stats.seen = {});
    if (seen[key]) return;
    seen[key] = true;
    showToast(text, icon);
}

export function momentum() { return F().m; }
export function momentumTier() { const m = F().m; return m >= TIERS[2] ? 3 : m >= TIERS[1] ? 2 : m >= TIERS[0] ? 1 : 0; }
export function momentumName() { return TIER_NAMES[momentumTier()]; }

/** 숨결·기술 피해에 곱해진다 (entities/Dragon.js 의 damageMult) */
export function flowDamageMult() {
    const f = F();
    return TIER_DMG[momentumTier()] * (f.edge > 0 ? 1.5 : 1);
}
/** 연사 간격에 곱해진다. 유물 '굶주린 불꽃': 쓰러뜨릴 때마다 잠깐 빨라진다 */
export function flowRateMult() { return 1 - 0.1 * F().stacks; }
/** 절정에서는 기술이 더 빨리 돌아온다 */
export function flowCooldownRate() { return momentumTier() === 3 ? 1.3 : 1; }
/** 세상이 흐르는 빠르기. 간발 직후에는 나만 빼고 다 느려진다 (main.js) */
export function worldTimeScale() { return F().slow > 0 ? 0.3 : 1; }

export function addMomentum(n) {
    const f = F(), before = momentumTier();
    f.m = Math.min(100, f.m + n * (resonates('flame') ? 1.3 : 1));
    f.idle = 0;
    const now = momentumTier(), p = state.player;
    if (now > before && p) {
        once('flowTier', '기세: 맞지 않고 계속 맞히면 게이지가 차고 숨결이 세진다. 아슬아슬하게 대시로 피하면(간발) 한꺼번에 많이 찬다.', '🔥');
        spawnEffect('AURA', p.x, p.y - 40, { size: 0.8 + now * 0.3, color: TIER_COLORS[now] });
        if (now === 3) { spawnText(p.x, p.y - 120 * p.stage.scale, '절정!', TIER_COLORS[now], 18); play('evolve'); }
    }
}

/** 숨결이 적에게 닿았다 (entities/Projectile.js) */
export function onPlayerHitEnemy() { addMomentum(2); }

/** 적을 쓰러뜨렸다 (Enemy · Human · Boss 의 die) */
export function onKill(big = false) {
    addMomentum(big ? 20 : 8);
    if (hasRelic('HUNGRY_FLAME')) { const f = F(); f.stacks = Math.min(3, f.stacks + 1); f.stackT = 3; }
}

/** 내가 맞았다 (entities/Dragon.js 의 takeDamage) */
export function onPlayerHurt() {
    const f = F();
    f.m *= hasRelic('BOILING_BLOOD') ? 0.8 : 0.5;
}

export function updateFlow(dt) {
    const f = F();
    f.slow = Math.max(0, f.slow - dt);
    f.edge = Math.max(0, f.edge - dt);
    if (f.stackT > 0) { f.stackT -= dt; if (f.stackT <= 0) f.stacks = 0; }
    f.idle += dt;
    if (f.idle > 5 && f.m > 0) f.m = Math.max(0, f.m - 7 * dt);   // 싸움이 끊기면 식는다
}

// ---------- 대시 도중 (entities/Dragon.js 의 updatePlayer 가 대시하는 동안 매 프레임 부른다) ----------

const EDGE_RANGE = 78;        // 이만큼 가까이 스친 것을 피했으면 간발
const BITE_RANGE = 62;
const BOSS_FINISH = 0.07;     // 보스 체력이 이 아래면 숨통을 끊을 수 있다
export const BOSS_EXPOSED_MULT = 1.5;

/** 보스가 지금 막 큰 공격을 내지르려는 순간인가 (예고선의 끝자락). 이걸 스치듯 피한 것이 간발이다 */
function bossThreat(b, p) {
    if (b.remove || !b.awake) return false;
    const c = b.charge, d = dist(b, p);
    if (c && c.windup > 0 && c.windup < 0.3 && d < 640) return true;
    if (b.beam && b.beam.warm > 0 && b.beam.warm < 0.3 && d < 760) return true;
    if (b.burrow && b.burrow.erupting && b.burrow.time < 0.3 && d < 240) return true;
    return false;
}
/** 곧 터질 장판 안에 서 있는가 (터지기 0.3초 전) */
function hazardThreat(p) {
    return state.entities.hazards.some(h => !h.remove && !h.burst && h.faction === 'ENEMY' && h.delay - h.t < 0.3
        && (() => { const d = dist(h, p); return d <= h.r + 10 && d >= (h.inner || 0) - 10; })());
}

/** 간발: 대시 첫머리에 적의 탄이나 내려치는 공격을 스치듯 피했는가. 대시 한 번에 한 번만 */
export function tryPerfectDodge(p) {
    if (p.dashEdge) return;
    const E = state.entities;
    const boss = E.bosses.find(b => bossThreat(b, p)) || null;
    const near = boss
        || E.bullets.some(b => !b.remove && b.faction === 'ENEMY' && dist(b, { x: p.x, y: p.y - 30 }) < EDGE_RANGE)
        || E.enemies.some(e => !e.remove && e.ai && (e.ai.s === 'act' || (e.ai.s === 'tell' && e.ai.t < 0.25)) && dist(e, p) < 120)
        || E.humans.some(h => !h.remove && ((h.swing > 0 && h.swing < 0.25 && dist(h, p) < 120) || (h.charge && h.charge.windup > 0 && h.charge.windup < 0.3 && dist(h, p) < 520)))
        || hazardThreat(p);
    if (!near) return;
    p.dashEdge = true;
    // 보스의 큰 공격을 간발로 피하면 보스가 빈틈을 보인다
    const target = boss || E.bosses.find(b => b.awake && !b.remove && dist(b, p) < 700);
    if (target) exposeBoss(target, 2.4, '빈틈!');
    const f = F();
    f.slow = hasRelic('FROZEN_CLOCK') ? 1.6 : 0.8;
    f.edge = 3;
    p.dashCd = 0;
    addMomentum(25);
    spawnText(p.x, p.y - 130 * p.stage.scale, '간발!', '#9fe3ff', 22);
    spawnEffect('RING', p.x, p.y - 40, { size: 1.8, color: '#9fe3ff' });
    flash(0.35, '160,220,255');
    play('crit');
    // 유물 '폭풍의 눈': 간발로 피한 자리에 번개가 떨어진다
    if (hasRelic('STORM_EYE')) {
        for (const e of [...E.enemies, ...E.humans, ...E.bosses]) {
            if (e.remove || dist(e, p) > 300) continue;
            e.takeDamage(30 * p.damageMult, false, p);
            spawnEffect('THUNDER_HIT', e.x, e.y - 30, { size: 1.6 });
        }
        shake(6); play('zap');
    }
}

/** 보스가 빈틈을 보인다: 그동안 1.5배로 맞는다 (entities/Boss.js 의 takeDamage) */
export function exposeBoss(b, t = 2, text = '빈틈!') {
    if (!b || b.hidden) return;
    b.exposed = Math.max(b.exposed || 0, t);
    spawnText(b.x, b.y - 150 * (b.def ? b.def.scale : 1), text, '#ffd84a', 20);
    spawnEffect('RING', b.x, b.y - 40, { size: 2.2, color: '#ffd84a' });
    once('bossExposed', '보스가 빈틈을 보였다. 이 동안은 숨결이 훨씬 아프게 들어간다. 큰 공격을 간발로 피할 때마다 생긴다.', '⚔️');
}

/**
 * 페이즈가 넘어가는 순간 (entities/Boss.js 의 enterPhase). 기세가 거세면 숨 고르는 틈을 더 길게 몰아붙인다.
 * 돌려주는 값은 보스가 멈춰 있을 시간
 */
export function onBossPhase(b) {
    const tier = momentumTier();
    if (tier < 2) return 1.4;
    exposeBoss(b, 2.6, '몰아붙이기!');
    play('crit');
    return 2.6;
}

/** 물어뜯기: 숨이 붙어 있는 적을 대시로 뚫고 지나가면 끝장을 낸다. 대장에게는 통하지 않는다. 보스는 숨이 얼마 안 남았을 때만 (숨통 끊기) */
export function tryBite(p) {
    const E = state.entities;
    for (const b of E.bosses) {
        if (b.remove || !b.awake || b.hidden) continue;
        const low = b.hp <= b.def.hp * BOSS_FINISH;
        if (low && !b.finishHint) { b.finishHint = true; showToast(`${b.def.name}의 숨이 얼마 안 남았다. 기세가 있을 때 대시로 뚫고 지나가면 끝난다!`, '🩸'); }
        if (!low || momentumTier() < 1 || dist(b, p) > BITE_RANGE + 40 * b.def.scale) continue;
        b.takeDamage(b.hp + 1, false, p);
        spawnText(p.x, p.y - 140 * p.stage.scale, '숨통 끊기!', '#ff5a3c', 26);
        spawnEffect('SLASH', b.x, b.y - 60, { size: 3, angle: Math.atan2(p.dashDir.y, p.dashDir.x), color: '#ffb0a0' });
        burst(b.x, b.y - 40, '#ff6b5e', 1.6, 24);
        hitStop(0.22); shake(14); flash(0.5, '255,120,90');
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.15);
        addMomentum(30);
        return;
    }
    const limit = hasRelic('RED_MOON_TOOTH') ? 0.45 : 0.25;
    for (const e of [...E.enemies, ...E.humans]) {
        if (e.remove || e.def.noLoot || e.def.scale || e.type === 'CAPTAIN') continue;
        if (dist(e, p) > BITE_RANGE || e.hp > e.maxHp * limit) continue;
        e.takeDamage(e.hp + 1, false, p);
        const heal = p.maxHp * (hasRelic('RED_MOON_TOOTH') ? 0.09 : 0.03);
        p.hp = Math.min(p.maxHp, p.hp + heal);
        p.dashCd = 0;
        addMomentum(12);
        spawnText(e.x, e.y - 70, '물어뜯기!', '#ff8a6a', 18);
        spawnText(p.x, p.y - 100 * p.stage.scale, `+${Math.round(heal)}`, '#9fe08a', 14);
        spawnEffect('SLASH', e.x, e.y - 24, { size: 1.5, angle: Math.atan2(p.dashDir.y, p.dashDir.x), color: '#ffb0a0' });
        burst(e.x, e.y - 20, '#ff6b5e', 1, 10);
        hitStop(0.09); shake(5);
    }
}
