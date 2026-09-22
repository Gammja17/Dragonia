import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { Enemy } from './Enemy.js';
import { addHazard } from './Hazard.js';
import { Projectile, addBullet } from './Projectile.js';
import { burst } from './Particle.js';
import { facingFromVector } from './Dragon.js';
import { state } from '../core/state.js';
import { isOnScreen, shake } from '../core/camera.js';
import { dist, rand, pick } from '../core/utils.js';
import { BOSSES } from '../data/enemies.js';
import { BOSS_SKILLS } from '../data/skills.js';
import { ELEMENTS } from '../data/elements.js';
import { getDragonSheet } from '../render/dragonSprites.js';
import { Animator, drawFrame } from '../render/spritesheet.js';
import { drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { updateStatus, statusTint } from '../systems/status.js';
import { notify } from '../systems/quests.js';
import { grantRelic, bossRelic } from '../systems/relics.js';
import { offerRelics } from '../systems/relicOffer.js';
import { learnSkill } from '../systems/skills.js';
import { play } from '../systems/audio.js';
import { showToast } from '../ui/toast.js';
import { setBossBar } from '../ui/hud.js';

const WAKE_RANGE = 520;   // 이 안에 들어오면 깨어난다
const LEASH_RANGE = 1100; // 결투장에서 이만큼 벗어나면 돌아가서 회복
const ORB_SPEED = 300;

/**
 * 보스. 공통 패턴(RING, AIMED, SPIRAL, CHARGE) 위에 보스마다 고유 기믹이 있다 (data/enemies.js 의 patterns).
 *  모르가스: SUMMON(망령 소환), BONE_RAIN(얼음 기둥 비), 한 번 되살아난다(revive)
 *  잘고라:   TWIN_BEAM(두 머리의 회전 광선), 조준탄이 불·번개를 번갈아 쏜다
 *  글라시아: HOMING(따라오는 얼음 조각), ICE_FIELD(느려지는 빙판), BLIZZARD(눈보라에 밀려남)
 *  바실:     BURROW(땅속으로 숨었다가 발밑에서 솟구침), QUAKE(번져 나가는 충격파 고리)
 *  이그나르: METEOR_RAIN, FLAME_WALL(틈이 있는 불의 벽), 체력 절반부터 2페이즈(더 빠르고 광신도 소환)
 */
export class Boss extends Entity {
    constructor(id) {
        const def = BOSSES[id];
        super(def.x, def.y);
        this.id = id;
        this.def = def;
        // 결투장 자리는 지도가 정한다 (systems/world.js 가 덮어쓴다). def 의 좌표는 대비책
        this.home = { x: def.x, y: def.y };
        this.hp = def.hp;
        this.statusImmune = true;
        this.sheet = getDragonSheet(def.species, def.colors);
        this.animator = new Animator(this.sheet);
        this.facing = 'down';
        this.awake = false;
        this.hitFlash = 0;
        this.patternTimer = 2;
        this.patternIndex = 0;
        this.revived = false;
        this.phase2 = false;
        this.phase = 0;        // 몇 번째 페이즈인가 (data/enemies.js 의 phases)
        this.stagger = 0;      // 페이즈가 넘어가는 동안 잠깐 숨을 고른다
        this.hidden = false;   // 땅속에 있는 동안: 안 보이고 안 맞는다
        this.spiral = null;    // { left, angle, timer }
        this.charge = null;    // { windup, time, angle, chain }
        this.beam = null;      // { time, angle, spin, warm }
        this.burrow = null;    // { time }
        this.blizzard = null;  // { time, angle }
    }
    get light() { return this.hidden ? null : { r: 360, color: ELEMENTS[this.def.element].color, intensity: this.awake ? 0.9 : 0.4, dy: -60 }; }
    get rage() { return this.def.phases ? this.phase === this.def.phases.length - 1 : (this.hp < this.def.hp * 0.4 || this.phase2); }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 8;
        if (this.squash > 0) this.squash -= dt * 7;
        const player = state.player;
        const d = dist(this, player);

        if (!this.awake) {
            // 이그나르는 먼저 말을 건다. 대면(ev_ignar_meet)에서 무엇을 고를지 정하기 전에는 깨어나지 않고, 손을 잡았다면 끝내 싸우지 않는다
            const held = this.id === 'IGNAR' && (state.story.route === 'dark'
                || ('m6' in state.quests.active && !(state.story.choices || {}).ev_ignar_meet));
            if (d < WAKE_RANGE && !held) {
                this.awake = true;
                showToast(`${this.def.name}, ${this.def.title}`, '⚔️');
                spawnEffect('SHOCKWAVE', this.x, this.y, { size: 3, color: ELEMENTS[this.def.element].color });
                shake(10); play('dieBig');
            }
            this.animator.playBase('idle');
            this.animator.update(dt);
            return;
        }
        if (dist(this, this.home) > LEASH_RANGE || d > LEASH_RANGE * 1.3) { this.reset(); return; }

        const speedMult = updateStatus(this, dt);
        if (this.remove) return;
        if (this.def.phase2 && !this.phase2 && this.hp < this.def.hp * 0.5) this.enterPhase2();
        // 페이즈: 체력이 문턱 아래로 내려가면 판이 바뀐다. 넘어가는 동안은 공격을 멈추고, 날아오던 탄도 걷힌다
        const phases = this.def.phases;
        if (phases && phases[this.phase + 1] && this.hp <= this.def.hp * phases[this.phase + 1].at) this.enterPhase(this.phase + 1);
        if (this.stagger > 0) { this.stagger -= dt; this.patternTimer = Math.max(this.patternTimer, 0.6); if (this.stagger <= 0) this.opening = false; }

        let moving = false;
        if (this.burrow) this.updateBurrow(dt);
        else if (this.charge) moving = this.updateCharge(dt, speedMult);
        else if (this.beam) this.updateBeam(dt);
        else {
            // 적당한 거리를 두고 빙빙 돈다
            const a = Math.atan2(player.y - this.y, player.x - this.x);
            const want = d > 300 ? a : d < 200 ? a + Math.PI : a + Math.PI / 2;
            this.x += Math.cos(want) * this.def.speed * speedMult * dt;
            this.y += Math.sin(want) * this.def.speed * speedMult * dt;
            this.facing = facingFromVector(player.x - this.x, player.y - this.y, this.facing);
            moving = speedMult > 0;
            this.patternTimer -= dt * (speedMult > 0 ? 1 : 0);
            if (this.patternTimer <= 0) this.startPattern();
        }
        if (this.spiral) this.updateSpiral(dt);
        if (this.blizzard) this.updateBlizzard(dt);

        if (!this.hidden && d < 60 * this.def.scale) player.takeDamage(this.def.contact * dt * (this.charge && !this.charge.windup ? 4 : 1));

        this.animator.playBase(moving ? 'move' : 'idle');
        this.animator.update(dt);
        const phaseName = this.def.phases ? ` · ${this.def.phases[this.phase].name}` : (this.phase2 ? ' (분노)' : '');
        setBossBar(this.def.name + phaseName, this.hp / this.def.hp);
    }

    reset() {
        this.awake = false;
        this.x = this.home.x; this.y = this.home.y;
        this.hp = this.def.hp;
        this.hidden = this.phase2 = false;
        this.phase = 0; this.stagger = 0;   // 쓰러지면 처음부터 다시다
        this.charge = this.spiral = this.beam = this.burrow = this.blizzard = null;
        setBossBar(null);
    }

    /** 판이 바뀐다: 한마디 하고, 탄을 걷고, 잠깐 숨을 고른 뒤 새 패턴으로 */
    enterPhase(i) {
        const ph = this.def.phases[i];
        this.phase = i;
        this.patternIndex = 0;
        this.stagger = 1.4;
        this.charge = this.spiral = this.beam = this.burrow = this.blizzard = null;
        this.hidden = false;
        for (const b of state.entities.bullets) if (b.faction === 'ENEMY') b.remove = true;
        if (i === this.def.phases.length - 1) this.phase2 = !!this.def.glow;
        showToast(ph.say ? `${ph.name} — ${ph.say}` : ph.name, '⚔️');
        spawnEffect('SHOCKWAVE', this.x, this.y, { size: 3.5, color: ELEMENTS[this.def.element].color });
        shake(12); play('dieBig');
        if (ph.summon) this.summon(ph.summon);
    }

    enterPhase2() {
        this.phase2 = true;
        showToast(`${this.def.name}의 분노! 하늘이 불타오릅니다.`, '🔥');
        spawnEffect('SHOCKWAVE', this.x, this.y, { size: 4, color: '#ff5a1f' });
        shake(16); play('dieBig');
        this.summon(['CULTIST', 'CULTIST', 'MAGMA_SLIME']);
    }

    mouth() { return { x: this.x, y: this.y - (this.def.species === 'SHADOW' ? 70 : 50) * this.def.scale }; }

    orb(angle, damage = 11, opts = {}) {
        const m = this.mouth();
        addBullet(new Projectile(m.x, m.y, angle, { faction: 'ENEMY', element: this.def.element, damage, speed: ORB_SPEED, life: 3.2, scale: 0.8, ...opts }));
    }

    summon(types) {
        for (const type of types) {
            const a = rand(0, 6.28);
            const e = new Enemy(this.x + Math.cos(a) * 220, this.y + Math.sin(a) * 160, type);
            e.aggro = true;
            state.entities.enemies.push(e);
            spawnEffect('MAGIC_CIRCLE', e.x, e.y, { size: 1, color: ELEMENTS[this.def.element].color });
        }
        play('summon');
    }

    startPattern() {
        const patterns = this.def.phases ? this.def.phases[this.phase].patterns : this.def.patterns;
        const p = patterns[this.patternIndex++ % patterns.length];
        const rage = this.rage;
        this.patternTimer = rage ? 1.9 : 2.9;
        this.animator.play('attack');
        const player = state.player, m = this.mouth();
        const aim = Math.atan2(player.y - 40 - m.y, player.x - m.x);
        switch (p) {
            case 'RING': {
                const n = rage ? 22 : 16, off = rand(0, 6.28);
                for (let i = 0; i < n; i++) this.orb(off + (i / n) * Math.PI * 2);
                play('flame');
                break;
            }
            case 'AIMED': {
                // 잘고라는 두 머리가 불과 번개를 번갈아 뱉는다
                const spreads = rage ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.22, 0, 0.22];
                spreads.forEach((da, i) => this.orb(aim + da, 13, this.def.twin ? { element: i % 2 ? 'FIRE' : 'THUNDER' } : {}));
                play('shoot');
                break;
            }
            case 'SPIRAL':
                this.spiral = { left: rage ? 36 : 24, angle: aim, timer: 0 };
                break;
            case 'CHARGE':
                this.charge = { windup: 0.7, time: 0.75, angle: aim, chain: this.def.chargeChain ? (rage ? 3 : 2) : 1 };
                play('warn');
                break;
            case 'SUMMON':
                this.summon(rage ? ['GHOST', 'GHOST', 'BAT', 'BAT'] : ['GHOST', 'BAT', 'BAT']);
                break;
            case 'BONE_RAIN':
                for (let i = 0; i < (rage ? 9 : 6); i++) {
                    addHazard(player.x + rand(-260, 260), player.y + rand(-200, 200), { r: 80, delay: 0.8 + i * 0.12, damage: 16, color: '#bfe9ff',
                        effect: 'ICE_SPIKE', effectSize: 1.5, sound: i % 3 ? null : 'freeze', status: { type: 'SLOW', duration: 1.5 } });
                }
                break;
            case 'TWIN_BEAM':
                this.beam = { warm: 0.9, time: rage ? 4 : 3, angle: aim + 0.9, spin: (Math.random() < 0.5 ? -1 : 1) * (rage ? 1.1 : 0.85) };
                play('warn');
                break;
            case 'HOMING':
                for (let i = 0; i < (rage ? 7 : 5); i++) this.orb(aim + (i - 2) * 0.5, 10, { homing: 1.6, speed: 230, life: 4.5 });
                play('ice');
                break;
            case 'ICE_FIELD':
                for (let i = 0; i < (rage ? 5 : 3); i++) {
                    addHazard(player.x + rand(-220, 220), player.y + rand(-160, 160), { r: 130, delay: 0.7, linger: 6, damage: 8, dps: 5, slow: true, color: '#7fd4ff', effect: 'ICE_SPIKE', effectSize: 2, sound: 'freeze' });
                }
                break;
            case 'BLIZZARD':
                this.blizzard = { time: rage ? 5 : 3.5, angle: rand(0, 6.28), timer: 0 };
                showToast('눈보라가 몰아칩니다! 바람을 거슬러 버티세요.', '🌨️');
                play('gust');
                break;
            case 'BURROW':
                this.burrow = { time: rage ? 1.6 : 2.2 };
                this.hidden = true;
                spawnEffect('DUST', this.x, this.y, { size: 3, color: '#c9a24a' });
                play('gust');
                break;
            case 'QUAKE':
                for (let i = 0; i < (rage ? 4 : 3); i++) {
                    addHazard(this.x, this.y, { r: 170 + i * 150, inner: 70 + i * 150, delay: 0.7 + i * 0.45, damage: 20, color: '#d8a24a', sound: 'boom', shake: 8 });
                }
                play('warn');
                break;
            case 'METEOR_RAIN':
                for (let i = 0; i < (rage ? 11 : 7); i++) {
                    const x = player.x + rand(-320, 320), y = player.y + rand(-240, 240);
                    addHazard(x, y, { r: 110, delay: 0.9 + i * 0.16, linger: 2, damage: 24, dps: 8, color: '#ff5a1f', effect: 'FIRE_HIT', effectSize: 2.2, sound: 'boom', shake: 6 });
                }
                play('warn');
                break;
            case 'FLAME_WALL': {
                // 플레이어를 가로지르는 불의 벽. 한 군데 틈이 있다
                const across = aim + Math.PI / 2, gap = Math.floor(rand(2, 9));
                for (let i = 0; i < 11; i++) {
                    if (i === gap || i === gap + 1) continue;
                    const k = (i - 5) * 95;
                    addHazard(player.x + Math.cos(across) * k + Math.cos(aim) * 40, player.y + Math.sin(across) * k + Math.sin(aim) * 40,
                        { r: 60, delay: 1.0, linger: 3.5, damage: 18, dps: 14, color: '#ff7a2a', effect: 'FLAMES', effectSize: 1.4, sound: i === 0 ? 'flame' : null });
                }
                play('warn');
                break;
            }
        }
    }

    updateSpiral(dt) {
        const s = this.spiral;
        s.timer -= dt;
        while (s.timer <= 0 && s.left > 0) {
            this.orb(s.angle, 9);
            s.angle += 0.52;
            s.left--;
            s.timer += 0.065;
        }
        if (s.left <= 0) this.spiral = null;
    }

    updateCharge(dt, speedMult) {
        const c = this.charge, player = state.player;
        if (c.windup > 0) {               // 돌진 전 움찔 (피할 시간)
            c.windup -= dt;
            c.angle = Math.atan2(player.y - this.y, player.x - this.x);
            return false;
        }
        c.time -= dt;
        this.x += Math.cos(c.angle) * 620 * speedMult * dt;
        this.y += Math.sin(c.angle) * 620 * speedMult * dt;
        this.facing = facingFromVector(Math.cos(c.angle), Math.sin(c.angle), this.facing);
        if (Math.random() < 0.5) burst(this.x, this.y, ELEMENTS[this.def.element].trail, 0.5);
        if (Math.random() < 0.25) spawnEffect('DUST', this.x, this.y, { size: 1.2, color: '#c9b18a' });
        if (c.time <= 0) {
            c.chain--;
            if (c.chain > 0) { c.windup = 0.45; c.time = 0.7; play('warn'); }   // 바실: 연속 돌진
            else this.charge = null;
        }
        return true;
    }

    /** 잘고라: 두 머리에서 뻗는 회전 광선. warm 동안은 예고선만 */
    updateBeam(dt) {
        const b = this.beam, player = state.player;
        if (b.warm > 0) { b.warm -= dt; if (b.warm <= 0) play('beam'); return; }
        b.time -= dt;
        b.angle += b.spin * dt;
        const m = this.mouth();
        for (const a of [b.angle, b.angle + Math.PI]) {
            // 광선(선분)과 플레이어 사이 거리
            const t = Math.max(0, Math.min(700, (player.x - m.x) * Math.cos(a) + (player.y - 30 - m.y) * Math.sin(a)));
            if (Math.hypot(player.x - (m.x + Math.cos(a) * t), player.y - 30 - (m.y + Math.sin(a) * t)) < 30) player.takeDamage(45 * dt);
        }
        if (b.time <= 0) this.beam = null;
    }

    /** 바실: 땅속에서 플레이어를 쫓다가 발밑에서 솟구친다 */
    updateBurrow(dt) {
        const b = this.burrow, player = state.player;
        b.time -= dt;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(a) * 330 * dt;
        this.y += Math.sin(a) * 330 * dt;
        if (Math.random() < 0.4) spawnEffect('DUST', this.x + rand(-20, 20), this.y + rand(-10, 10), { size: 0.9, color: '#c9a24a' });
        if (b.time <= 0 && !b.erupting) {
            b.erupting = true;
            b.time = 0.75;
            addHazard(this.x, this.y, { r: 170, delay: 0.75, damage: 34, color: '#d8a24a', effect: 'DUST', effectSize: 3.5, sound: 'boom', shake: 14 });
            play('warn');
        } else if (b.time <= 0) {
            this.hidden = false;
            this.burrow = null;
        }
    }

    /** 글라시아: 눈보라가 플레이어를 한쪽으로 밀어내고, 그 방향으로 얼음 조각이 날아든다 */
    updateBlizzard(dt) {
        const z = this.blizzard, player = state.player;
        z.time -= dt; z.timer -= dt;
        player.x += Math.cos(z.angle) * 150 * dt;
        player.y += Math.sin(z.angle) * 150 * dt;
        if (z.timer <= 0) {
            z.timer = 0.22;
            const side = z.angle + Math.PI / 2, k = rand(-420, 420);
            const sx = player.x - Math.cos(z.angle) * 560 + Math.cos(side) * k, sy = player.y - Math.sin(z.angle) * 560 + Math.sin(side) * k;
            addBullet(new Projectile(sx, sy, z.angle, { faction: 'ENEMY', element: 'ICE', damage: 9, speed: 420, life: 2.8, scale: 0.7 }));
        }
        if (z.time <= 0) this.blizzard = null;
    }

    takeDamage(dmg, silent = false) {
        if (!this.awake || this.hidden) return;
        if (this.opening) dmg *= 2;   // 간발로 만든 빈틈 (systems/flow.js)
        this.hp -= dmg;
        if (!silent) { this.hitFlash = 1; this.squash = 1; }
        if (this.hp > 0 || this.remove) return;
        if (this.def.revive && !this.revived) {      // 모르가스: 죽지 못한 용
            this.revived = true;
            this.hp = this.def.hp * 0.45;
            showToast(`${this.def.name}의 뼈가 다시 맞춰집니다…!`, '💀');
            spawnEffect('MAGIC_CIRCLE', this.x, this.y, { size: 3, color: '#bfe9ff' });
            this.summon(['GHOST', 'GHOST']);
            shake(10);
            return;
        }
        this.die();
    }

    die() {
        this.remove = true;
        setBossBar(null);
        state.bossesDefeated[this.id] = true;
        for (let i = 0; i < 6; i++) spawnEffect('SMOKE', this.x + rand(-90, 90), this.y - rand(0, 140), { size: 1.6 });
        spawnEffect('SHOCKWAVE', this.x, this.y, { size: 4, color: '#fff2b0' });
        spawnEffect('RING', this.x, this.y - 60, { size: 2.6 });
        spawnEffect('STAR', this.x, this.y - 60, { size: 3 });
        shake(18); play('dieBig');
        for (let i = 0; i < 5; i++) state.entities.items.push(new Item(this.x + rand(-80, 80), this.y + rand(-50, 50), 'MEAT'));
        state.entities.items.push(new Item(this.x, this.y + 40, 'GOLD', 80 + Math.round(this.def.xp / 10)));
        showToast(`${this.def.name} 처치!`, '🏆');
        const player = state.player;
        if (this.def.unlock) player.unlockElement(this.def.unlock);
        if (BOSS_SKILLS[this.id]) learnSkill(BOSS_SKILLS[this.id]);
        grantRelic(bossRelic(this.id), this.x, this.y);
        player.gainXp(this.def.xp);
        offerRelics(`${this.def.name}의 둥지에서`);
        notify('boss', this.id);
    }

    draw(ctx) {
        if (!isOnScreen(this, 800)) return;
        const sc = this.def.scale;

        if (this.beam) {               // 회전 광선 (예고 중엔 가는 선)
            const m = this.mouth(), warm = this.beam.warm > 0;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            [[this.beam.angle, '#ff9a3c'], [this.beam.angle + Math.PI, '#ffe27a']].forEach(([a, color]) => {
                for (const [w, alpha] of warm ? [[4, 0.5]] : [[46, 0.25], [20, 0.6], [7, 1]]) {
                    ctx.strokeStyle = w === 7 ? '#fff' : color; ctx.lineWidth = w; ctx.globalAlpha = alpha * (warm ? 0.5 + Math.sin(state.gameTime * 30) * 0.3 : 1);
                    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(a) * 700, m.y + Math.sin(a) * 700); ctx.stroke();
                }
            });
            ctx.restore();
        }
        if (this.hidden) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 40 * sc);
        ctx.restore();

        if (this.opening) drawGlow(ctx, this.x, this.y - 40 * this.def.scale, 90 * this.def.scale, '#9fe3ff', 0.35 + Math.sin(state.gameTime * 14) * 0.15);
        if (this.charge && this.charge.windup > 0) {   // 돌진 예고선
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(state.gameTime * 30) * 0.15;
            ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 50; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(this.charge.angle) * 460, this.y + Math.sin(this.charge.angle) * 460);
            ctx.stroke();
            ctx.restore();
        }

        const tint = statusTint(this);
        if (tint) drawGlow(ctx, this.x, this.y - 60 * sc, 90 * sc, tint, 0.5);
        if (this.phase2) drawGlow(ctx, this.x, this.y - 60 * sc, 150 * sc, '#ff5a1f', 0.3 + Math.sin(state.gameTime * 8) * 0.1);
        const hover = this.sheet.flying ? Math.sin(state.gameTime * 2) * 8 : 0;
        if (!this.awake) ctx.globalAlpha = 0.75;
        if (this.hitFlash > 0) ctx.filter = 'brightness(2.2)';
        const q = this.squash > 0 ? Math.sin(this.squash * Math.PI) : 0;
        if (q) { ctx.save(); ctx.translate(this.x, this.y + hover); ctx.scale(1 + 0.1 * q, 1 - 0.1 * q); ctx.translate(-this.x, -(this.y + hover)); }
        drawFrame(ctx, this.sheet, this.animator.frame(this.facing), this.x, this.y + hover, sc);
        if (q) ctx.restore();
        ctx.filter = 'none';
        ctx.globalAlpha = 1;

        if (!this.awake) {
            ctx.fillStyle = '#fff'; ctx.font = '700 12px "Mulmaru", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('z z z', this.x, this.y - 130 * sc + Math.sin(state.gameTime * 2) * 4);
        }
    }
}
