import { state } from '../core/state.js';
import { dist, rand } from '../core/utils.js';
import { slideMove } from '../world/collision.js';
import { spawnEffect, spawnText } from '../render/vfx.js';
import { burst } from './Particle.js';
import { Projectile, addBullet } from './Projectile.js';
import { shake } from '../core/camera.js';
import { play } from '../systems/audio.js';

// 적의 행동.
//
// 예전엔 네 가지(chase · erratic · ranged · flee)뿐이었고, 그마저도 "닿아 있으면
// 초당 깎임"이라 언제 맞았는지 몰랐다. 이제 모든 공격은 예고(tell) → 발동(act) →
// 숨 고르기(recover) 를 거친다. 예고를 보고 피하는 게 전투의 알맹이다.
//
//   chase   어슬렁 다가와 덤빈다. 덤비기 전 0.5초 움츠린다
//   charge  멀리서 몸을 낮추고(0.6초, 바닥에 선) 직선으로 돌진. 빗나가면 벽에 박혀 기절
//   flank   무리가 나를 둘러싸고, 한 마리씩 차례로 덤빈다
//   kite    거리를 두고 세 발씩 쏜다. 쏘기 전 조준선. 다가가면 옆으로 빠진다
//   burrow  땅속에 숨어 발밑으로 온다. 흙더미가 0.7초 솟은 뒤 튀어나온다
//   guard   앞을 막는다. 정면에서 오는 탄을 튕겨낸다 — 옆이나 뒤에서 때려야 한다
//   summon  뒤에서 8초마다 졸개를 부른다. 먼저 잡는 게 답이다
//   swarm   약하고 많고 빠르다. 흔들리며 몰려온다 (산탄·연쇄가 빛난다)
//   flee    사냥감. 도망만 다닌다
//
// 각 행동은 fsm 하나: e.ai = { s: 상태, t: 남은 시간, ... }

const RING = 150;             // flank: 링 반지름
const LUNGE_RANGE = 78;       // chase/flank: 덤비는 거리
const REACH = 46;             // 맞았다고 치는 거리
const LEASH = 1100;           // 이보다 멀어지면 쫓기를 그만두고 제자리로 돌아간다
// 어그로 반경. 이 안에 들어가거나 먼저 때려야 덤빈다. 그 전엔 제 자리 근처를 어슬렁거린다
const AGGRO = { chase: 240, charge: 330, flank: 260, kite: 360, ranged: 360, burrow: 200, guard: 220, summon: 300, swarm: 230, erratic: 230, flee: 0 };

export function initAI(e) {
    e.ai = { s: 'idle', t: 0, dir: 0, cd: rand(0.4, 1.4), wt: rand(0.5, 2.5), wdir: rand(0, Math.PI * 2), wmove: false };
    e.home = { x: e.x, y: e.y };
    e.aggro = e.def.move === 'flee';   // 사냥감은 늘 제 행동(도망)을 한다
    if (e.def.move === 'burrow') { e.ai.s = 'hidden'; e.hidden = true; }
}

/** 한 방. 예고 있는 공격만 피해를 준다 */
function strike(e, mult = 1) {
    const p = state.player;
    if (p.flying && !e.def.flying) return false;   // 하늘에 있는 놈은 발톱이 안 닿는다
    const dmg = (e.def.hit ?? e.def.damage * 2) * (e.elite ? 1.5 : 1) * (e.frenzied ? 1.35 : 1) * mult;
    if (dist(e, p) < REACH + (e.elite ? 16 : 0) + (e.ai.reach || 0)) {
        p.takeDamage(dmg);
        return true;
    }
    return false;
}

function face(e, tx, ty) { e.angle = Math.atan2(ty - e.y, tx - e.x); }

function move(e, ax, ay, speed, dt) {
    if (e.def.flying) { e.x += Math.cos(ax) * speed * dt; e.y += Math.sin(ax) * speed * dt; }
    else slideMove(e, e.x + Math.cos(ax) * speed * dt, e.y + Math.sin(ax) * speed * dt, 14);
}

// ---------- 행동들 ----------

function chase(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    switch (a.s) {
        case 'idle': case 'approach':
            face(e, p.x, p.y);
            if (d > LUNGE_RANGE) { move(e, e.angle, e.angle, speed, dt); a.s = 'approach'; }
            else if (a.cd <= 0) { a.s = 'tell'; a.t = 0.5; a.dir = e.angle; }
            break;
        case 'tell':
            a.t -= dt;
            if (a.t <= 0) { a.s = 'act'; a.t = 0.18; a.dir = Math.atan2(p.y - e.y, p.x - e.x); a.hit = false; }
            break;
        case 'act':
            a.t -= dt;
            move(e, a.dir, a.dir, speed * 4.2, dt);
            if (!a.hit && strike(e)) a.hit = true;
            if (a.t <= 0) { a.s = 'recover'; a.t = 0.6; a.cd = rand(0.9, 1.6); }
            break;
        case 'recover':
            a.t -= dt;
            if (a.t <= 0) a.s = 'approach';
            break;
    }
}

function swarm(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    face(e, p.x, p.y);
    const wob = Math.sin(state.gameTime * 5 + e.phase) * 1.1;
    if (a.s === 'act') {
        a.t -= dt;
        move(e, a.dir, a.dir, speed * 2.6, dt);
        if (!a.hit && strike(e, 0.8)) a.hit = true;
        if (a.t <= 0) { a.s = 'idle'; a.cd = rand(1.0, 1.8); }
        return;
    }
    if (d > 60) move(e, e.angle + wob, e.angle + wob, speed, dt);
    else if (a.cd <= 0) { a.s = 'act'; a.t = 0.22; a.dir = e.angle; a.hit = false; }
}

function charge(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    switch (a.s) {
        case 'idle': case 'approach':
            face(e, p.x, p.y);
            if (d > 340) move(e, e.angle, e.angle, speed, dt);
            else if (d < 90) move(e, e.angle + Math.PI, e.angle + Math.PI, speed * 0.7, dt);   // 너무 붙으면 물러나 거리를 잡는다
            else if (a.cd <= 0) { a.s = 'tell'; a.t = 0.6; a.dir = e.angle; play('ui'); }
            break;
        case 'tell':
            a.t -= dt;
            a.dir = Math.atan2(p.y - e.y, p.x - e.x);   // 예고 중에는 계속 겨눈다 — 마지막 순간에 비켜야 한다
            if (a.t <= 0) { a.s = 'act'; a.t = 0.55; a.hit = false; a.reach = 10; }
            break;
        case 'act': {
            a.t -= dt;
            const bx = e.x, by = e.y;
            move(e, a.dir, a.dir, speed * 3.4, dt);
            const moved = Math.hypot(e.x - bx, e.y - by);
            if (!a.hit && strike(e, 1)) { a.hit = true; shake(6); }
            // 벽에 박혔다 — 기절
            if (moved < speed * 3.4 * dt * 0.25 && !e.def.flying) {
                a.s = 'stun'; a.t = 1.1; burst(e.x, e.y - 10, '#ddd', 0.6, 8); shake(4);
                break;
            }
            if (a.t <= 0) { a.s = 'recover'; a.t = 0.5; a.cd = rand(1.4, 2.4); a.reach = 0; }
            break;
        }
        case 'stun':
            a.t -= dt;
            if (a.t <= 0) { a.s = 'approach'; a.cd = 0.6; a.reach = 0; }
            break;
        case 'recover':
            a.t -= dt;
            if (a.t <= 0) a.s = 'approach';
            break;
    }
}

/** 같은 지도에서 나를 둘러싸는 무리 (포위 행동인 것들) */
function packmates(e) {
    return state.entities.enemies.filter(o => !o.remove && o.def.move === 'flank' && dist(o, state.player) < 520);
}

function flank(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    if (a.s === 'act') {
        a.t -= dt;
        move(e, a.dir, a.dir, speed * 3.2, dt);
        if (!a.hit && strike(e)) a.hit = true;
        if (a.t <= 0) { a.s = 'recover'; a.t = 0.7; a.cd = rand(1.6, 2.6); state.packTurn = state.gameTime + 0.9; }
        return;
    }
    if (a.s === 'tell') {
        a.t -= dt;
        a.dir = Math.atan2(p.y - e.y, p.x - e.x);
        if (a.t <= 0) { a.s = 'act'; a.t = 0.24; a.hit = false; }
        return;
    }
    if (a.s === 'recover') { a.t -= dt; if (a.t <= 0) a.s = 'ring'; return; }

    // 링 위의 제 자리로 간다. 자리는 무리 안에서의 순번으로 정한다
    const mates = packmates(e);
    const i = Math.max(0, mates.indexOf(e)), n = Math.max(1, mates.length);
    const base = Math.atan2(e.y - p.y, e.x - p.x);
    const slot = (n === 1) ? base : (i / n) * Math.PI * 2 + state.gameTime * 0.25;
    const tx = p.x + Math.cos(slot) * RING, ty = p.y + Math.sin(slot) * RING;
    const dd = Math.hypot(tx - e.x, ty - e.y);
    face(e, p.x, p.y);
    if (dd > 18) { const ma = Math.atan2(ty - e.y, tx - e.x); move(e, ma, ma, speed * (dd > 120 ? 1 : 0.6), dt); }
    a.s = 'ring';
    // 한 마리씩 차례로 덤빈다
    const turnFree = !(state.packTurn > state.gameTime);
    if (turnFree && a.cd <= 0 && d < RING + 60) {
        state.packTurn = state.gameTime + 1.3;
        a.s = 'tell'; a.t = 0.55; a.dir = e.angle;
    }
}

function kite(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    face(e, p.x, p.y);
    if (a.s === 'tell') {
        a.t -= dt;
        if (a.t <= 0) { a.s = 'act'; a.t = 0; a.shots = 3; }
        return;
    }
    if (a.s === 'act') {
        a.t -= dt;
        if (a.t <= 0 && a.shots > 0) {
            a.shots--; a.t = 0.16;
            const aim = Math.atan2(p.y - 30 - (e.y - 16), p.x - e.x) + rand(-0.06, 0.06);
            addBullet(new Projectile(e.x, e.y - 16, aim, { faction: 'ENEMY', element: e.def.element, damage: (e.def.hit ?? e.def.damage) * (e.elite ? 1.5 : 1), speed: 330, life: 2.4, scale: 0.7 }));
            play('shoot');
        }
        if (a.shots <= 0 && a.t <= 0) { a.s = 'idle'; a.cd = rand(1.8, 2.8); }
        return;
    }
    // 거리 유지: 가까우면 옆으로 빠지며 물러난다
    if (d < 240) { const away = e.angle + Math.PI + (a.side || (a.side = Math.random() < 0.5 ? 1 : -1)) * 0.9; move(e, away, away, speed * 1.15, dt); }
    else if (d > 400) move(e, e.angle, e.angle, speed, dt);
    else if (a.cd <= 0 && d < 520) { a.s = 'tell'; a.t = 0.45; }
}

function burrow(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    switch (a.s) {
        case 'hidden':
            e.hidden = true;
            // 땅속에서는 곧장 발밑으로 다가온다 (보이지 않는다)
            if (d > 40) { face(e, p.x, p.y); move(e, e.angle, e.angle, speed * 1.4, dt); }
            else if (a.cd <= 0) { a.s = 'tell'; a.t = 0.7; }
            break;
        case 'tell':
            a.t -= dt;
            if (a.t <= 0) {
                a.s = 'act'; a.t = 0.2; e.hidden = false; a.reach = 30;
                burst(e.x, e.y, '#a0793a', 0.9, 12); shake(5); play('dieBig');
                strike(e, 1);
            }
            break;
        case 'act':
            a.t -= dt;
            if (a.t <= 0) { a.s = 'surface'; a.t = rand(2.2, 3.4); a.reach = 0; }
            break;
        case 'surface':     // 잠깐 땅 위에서 어슬렁거린다 — 이때 때려야 한다
            a.t -= dt;
            face(e, p.x, p.y);
            if (d > 70) move(e, e.angle, e.angle, speed * 0.7, dt);
            else if (Math.random() < dt * 1.5) { a.s = 'tell2'; a.t = 0.4; }
            if (a.t <= 0) { a.s = 'hidden'; a.cd = rand(1.2, 2.0); burst(e.x, e.y, '#a0793a', 0.6, 8); }
            break;
        case 'tell2':       // 땅 위에서의 짧은 물기
            a.t -= dt;
            if (a.t <= 0) { strike(e, 0.7); a.s = 'surface'; a.t = Math.max(a.t, 0.8); }
            break;
    }
}

function guard(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    face(e, p.x, p.y);
    e.guardAngle = e.angle;       // 이쪽에서 오는 탄을 막는다 (Projectile 이 본다)
    if (a.s === 'act') {
        a.t -= dt;
        move(e, a.dir, a.dir, speed * 2.8, dt);
        if (!a.hit && strike(e, 1.2)) a.hit = true;
        if (a.t <= 0) { a.s = 'recover'; a.t = 0.9; a.cd = rand(1.8, 2.8); }
        return;
    }
    if (a.s === 'tell') { a.t -= dt; if (a.t <= 0) { a.s = 'act'; a.t = 0.22; a.dir = e.angle; a.hit = false; } return; }
    if (a.s === 'recover') { a.t -= dt; if (a.t <= 0) a.s = 'idle'; return; }
    if (d > 90) move(e, e.angle, e.angle, speed * 0.85, dt);      // 느리게, 방패를 앞세우고
    else if (a.cd <= 0) { a.s = 'tell'; a.t = 0.6; }
}

function summon(e, dt, d, speed) {
    const p = state.player, a = e.ai;
    face(e, p.x, p.y);
    if (a.s === 'tell') {
        a.t -= dt;
        if (a.t <= 0) {
            a.s = 'idle'; a.cd = 8;
            const kind = e.def.minion || 'SLIME';
            const alive = state.entities.enemies.filter(o => !o.remove && o.summonedBy === e).length;
            for (let i = 0; i < 2 && alive + i < 4; i++) {
                const ang = rand(0, Math.PI * 2);
                const m = new e.constructor(e.x + Math.cos(ang) * 60, e.y + Math.sin(ang) * 60, kind);
                m.summonedBy = e;
                m.aggro = true;
                state.entities.enemies.push(m);
                burst(m.x, m.y, e.def.color, 0.8, 8);
            }
            play('relic');
        }
        return;
    }
    if (d < 200) { const away = e.angle + Math.PI; move(e, away, away, speed, dt); }
    else if (d > 420) move(e, e.angle, e.angle, speed * 0.8, dt);
    if (a.cd <= 0 && d < 560) { a.s = 'tell'; a.t = 1.0; }
}

function flee(e, dt, d, speed) {
    const p = state.player;
    if (d < 300) e.angle = Math.atan2(e.y - p.y, e.x - p.x) + Math.sin(state.gameTime * 3 + e.phase) * 0.6;
    else if (Math.random() < dt * 0.5) e.angle = Math.random() * 6.28;
    move(e, e.angle, e.angle, d < 300 ? speed : speed * 0.25, dt);
}

const BEHAVIORS = { chase, erratic: swarm, swarm, charge, flank, kite, ranged: kite, burrow, guard, summon, flee };

/** 매 프레임. 상태별로 알맞은 행동을 돌린다 */
export function updateAI(e, dt, speed) {
    const a = e.ai;
    if (!a) initAI(e);
    if (e.ai.cd > 0) e.ai.cd -= dt;
    const d = dist(e, state.player);
    // 어그로가 없으면 덤비지 않는다. 반경 안에 들어오면 알아채고, 멀어지면 잊는다
    if (!e.aggro) {
        const range = (AGGRO[e.def.move] ?? 240) * (e.elite ? 1.15 : 1);
        if (range && d < range && !state.player.invisible) { alert(e); }
        else { wander(e, dt, speed); return; }
    } else if (d > LEASH) {
        e.aggro = false; e.ai.s = e.def.move === 'burrow' ? 'hidden' : 'idle';
        if (e.def.move === 'burrow') e.hidden = true;
        return;
    }
    (BEHAVIORS[e.def.move] || chase)(e, dt, d, speed);
}

/** 알아챘다. 같은 무리(가까이 있는 놈들)도 같이 돌아본다 */
export function alert(e, chain = true) {
    if (e.aggro || e.remove || e.def.move === 'none') return;
    e.aggro = true;
    spawnText(e.x, e.y - (e.elite ? 100 : 70), '!', '#ffd84a', 16);
    if (!chain) return;
    for (const o of state.entities.enemies) if (o !== e && !o.aggro && dist(o, e) < 220) alert(o, false);
}

/** 어그로 전: 제 자리 근처를 느릿느릿 오간다. 잠복형은 땅속에 그대로 */
function wander(e, dt, speed) {
    const a = e.ai;
    if (e.def.move === 'burrow') return;
    a.wt -= dt;
    if (a.wt <= 0) {
        a.wmove = !a.wmove;
        a.wt = a.wmove ? rand(0.6, 1.4) : rand(1.5, 4);
        // 집에서 멀어졌으면 돌아오는 쪽으로
        const far = e.home && dist(e, e.home) > 160;
        a.wdir = far ? Math.atan2(e.home.y - e.y, e.home.x - e.x) : rand(0, Math.PI * 2);
    }
    if (a.wmove) { e.angle = a.wdir; move(e, a.wdir, a.wdir, speed * 0.35, dt); }
}

/** 정면 방패: 이 각도에서 온 탄은 막힌다 (guard 행동만) */
export function blocksFrom(e, fromX, fromY) {
    if (!e || !e.def || !e.ai || e.def.move !== 'guard') return false;
    if (e.ai.s === 'act' || e.ai.s === 'recover') return false;
    if (e.guardAngle === undefined) return false;
    const a = Math.atan2(fromY - e.y, fromX - e.x);
    let da = a - e.guardAngle; da = Math.atan2(Math.sin(da), Math.cos(da));
    return Math.abs(da) < Math.PI * 0.42;
}

/**
 * 예고를 바닥에 그린다 (개체보다 먼저, 바닥 층에서).
 * 보고 피할 수 있어야 하니까 크고 분명하게.
 */
export function drawTell(ctx, e) {
    const a = e.ai;
    if (!a) return;
    const t = state.gameTime;
    ctx.save();
    if (a.s === 'tell' || a.s === 'tell2') {
        const k = 1 - Math.max(0, a.t) / (e.def.move === 'charge' ? 0.6 : e.def.move === 'burrow' ? 0.7 : 0.5);
        if (e.def.move === 'charge') {
            // 돌진 선
            ctx.strokeStyle = `rgba(255,90,60,${0.35 + k * 0.5})`;
            ctx.lineWidth = 6 + k * 8;
            ctx.setLineDash([16, 10]);
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(a.dir) * 330, e.y + Math.sin(a.dir) * 330);
            ctx.stroke();
        } else if (e.def.move === 'burrow' && a.s === 'tell') {
            // 흙더미
            ctx.fillStyle = `rgba(120,85,40,${0.5 + k * 0.4})`;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y, 22 + k * 18, 12 + k * 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(70,45,20,0.6)';
            for (let i = 0; i < 5; i++) { const q = t * 9 + i * 1.3; ctx.fillRect(e.x + Math.cos(q) * 14 * k - 2, e.y - 4 - Math.abs(Math.sin(q)) * 14 * k, 4, 4); }
        } else if (e.def.move === 'kite' || e.def.move === 'ranged') {
            // 조준선
            const p = state.player;
            ctx.strokeStyle = `rgba(255,220,120,${0.25 + k * 0.45})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 8]);
            ctx.beginPath(); ctx.moveTo(e.x, e.y - 16); ctx.lineTo(p.x, p.y - 30); ctx.stroke();
        } else {
            // 덤빔: 발밑 고리가 조여든다
            ctx.strokeStyle = `rgba(255,120,80,${0.4 + k * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y, 34 - k * 10, 17 - k * 5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    if (a.s === 'stun') {
        // 기절 별
        ctx.fillStyle = '#ffe27a';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) ctx.fillText('✦', e.x + Math.cos(t * 6 + i * 2.1) * 20, e.y - 44 + Math.sin(t * 6 + i * 2.1) * 6);
    }
    if (e.def.move === 'guard' && a.s !== 'act') {
        // 방패 호
        ctx.strokeStyle = 'rgba(180,200,230,0.8)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(e.x, e.y - 14, 30, e.guardAngle - 1.25, e.guardAngle + 1.25);
        ctx.stroke();
    }
    ctx.restore();
}
