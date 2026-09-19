import { Entity } from './Entity.js';
import { Item } from './Item.js';
import { Projectile, addBullet } from './Projectile.js';
import { burst } from './Particle.js';
import { facingFromVector } from './Dragon.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist, rand } from '../core/utils.js';
import { BOSSES } from '../data/enemies.js';
import { ELEMENTS } from '../data/elements.js';
import { getDragonSheet } from '../render/dragonSprites.js';
import { Animator, drawFrame } from '../render/spritesheet.js';
import { drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';
import { updateStatus, statusTint } from '../systems/status.js';
import { notify } from '../systems/quests.js';
import { showToast } from '../ui/toast.js';
import { setBossBar } from '../ui/hud.js';

const WAKE_RANGE = 520;   // 이 안에 들어오면 깨어난다
const LEASH_RANGE = 1000; // 결투장에서 이만큼 벗어나면 돌아가서 회복
const ORB_SPEED = 300;

export class Boss extends Entity {
    constructor(id) {
        const def = BOSSES[id];
        super(def.x, def.y);
        this.id = id;
        this.def = def;
        this.hp = def.hp;
        this.statusImmune = true;
        this.sheet = getDragonSheet(def.species, def.colors);
        this.animator = new Animator(this.sheet);
        this.facing = 'down';
        this.awake = false;
        this.hitFlash = 0;
        this.patternTimer = 2;
        this.patternIndex = 0;
        this.spiral = null;   // { left, angle, timer }
        this.charge = null;   // { windup, time, angle }
    }
    get light() { return { r: 360, color: ELEMENTS[this.def.element].color, intensity: this.awake ? 0.9 : 0.4, dy: -60 }; }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt * 8;
        const player = state.player;
        const d = dist(this, player);
        const home = dist(this, this.def);

        if (!this.awake) {
            if (d < WAKE_RANGE) {
                this.awake = true;
                showToast(`${this.def.name} — ${this.def.title}`, '⚔️');
                spawnEffect('RING', this.x, this.y - 60, { size: 2 });
            }
            this.animator.playBase('idle');
            this.animator.update(dt);
            return;
        }
        if (home > LEASH_RANGE || d > LEASH_RANGE * 1.3) { this.reset(); return; }

        const speedMult = updateStatus(this, dt);
        if (this.remove) return;
        let moving = false;

        if (this.charge) {
            moving = this.updateCharge(dt, speedMult);
        } else {
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

        if (d < 60 * this.def.scale) player.takeDamage(this.def.contact * dt * (this.charge && !this.charge.windup ? 4 : 1));

        this.animator.playBase(moving ? 'move' : 'idle');
        this.animator.update(dt);
        setBossBar(this.def.name, this.hp / this.def.hp);
    }

    reset() {
        this.awake = false;
        this.x = this.def.x; this.y = this.def.y;
        this.hp = this.def.hp;
        this.charge = this.spiral = null;
        setBossBar(null);
    }

    mouth() { return { x: this.x, y: this.y - 50 * this.def.scale }; }

    orb(angle, damage = 11) {
        const m = this.mouth();
        addBullet(new Projectile(m.x, m.y, angle, { faction: 'ENEMY', element: this.def.element, damage, speed: ORB_SPEED, life: 3.2, scale: 0.8 }));
    }

    startPattern() {
        const patterns = this.def.patterns;
        const p = patterns[this.patternIndex++ % patterns.length];
        const rage = this.hp < this.def.hp * 0.4; // 체력이 낮으면 더 자주, 더 많이
        this.patternTimer = rage ? 1.8 : 2.8;
        this.animator.play('attack');
        const m = this.mouth();
        const aim = Math.atan2(state.player.y - 40 - m.y, state.player.x - m.x);
        switch (p) {
            case 'RING': {
                const n = rage ? 22 : 16, off = rand(0, 6.28);
                for (let i = 0; i < n; i++) this.orb(off + (i / n) * Math.PI * 2);
                break;
            }
            case 'AIMED':
                for (const da of rage ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.22, 0, 0.22]) this.orb(aim + da, 13);
                break;
            case 'SPIRAL':
                this.spiral = { left: rage ? 36 : 24, angle: aim, timer: 0 };
                break;
            case 'CHARGE':
                this.charge = { windup: 0.7, time: 0.75, angle: aim };
                break;
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
        const c = this.charge;
        if (c.windup > 0) {               // 돌진 전 움찔 (피할 시간)
            c.windup -= dt;
            c.angle = Math.atan2(state.player.y - this.y, state.player.x - this.x);
            return false;
        }
        c.time -= dt;
        this.x += Math.cos(c.angle) * 620 * speedMult * dt;
        this.y += Math.sin(c.angle) * 620 * speedMult * dt;
        this.facing = facingFromVector(Math.cos(c.angle), Math.sin(c.angle), this.facing);
        if (Math.random() < 0.5) burst(this.x, this.y, ELEMENTS[this.def.element].trail, 0.5);
        if (c.time <= 0) this.charge = null;
        return true;
    }

    takeDamage(dmg, silent = false) {
        if (!this.awake) return;
        this.hp -= dmg;
        if (!silent) this.hitFlash = 1;
        if (this.hp <= 0 && !this.remove) this.die();
    }

    die() {
        this.remove = true;
        setBossBar(null);
        state.bossesDefeated[this.id] = true;
        for (let i = 0; i < 6; i++) spawnEffect('SMOKE', this.x + rand(-90, 90), this.y - rand(0, 140), { size: 1.6 });
        spawnEffect('RING', this.x, this.y - 60, { size: 2.6 });
        spawnEffect('STAR', this.x, this.y - 60, { size: 3 });
        for (let i = 0; i < 5; i++) state.entities.items.push(new Item(this.x + rand(-80, 80), this.y + rand(-50, 50), 'MEAT'));
        showToast(`${this.def.name} 처치!`, '🏆');
        const player = state.player;
        if (this.def.unlock) player.unlockElement(this.def.unlock);
        player.gainXp(this.def.xp);
        notify('boss', this.id);
    }

    draw(ctx) {
        if (!isOnScreen(this, 400)) return;
        const sc = this.def.scale;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.drawShadow(ctx, 40 * sc);
        ctx.restore();

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
        const hover = this.sheet.flying ? Math.sin(state.gameTime * 2) * 8 : 0;
        if (!this.awake) ctx.globalAlpha = 0.75;
        if (this.hitFlash > 0) ctx.filter = 'brightness(2.2)';
        drawFrame(ctx, this.sheet, this.animator.frame(this.facing), this.x, this.y + hover, sc);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;

        if (!this.awake) {
            ctx.fillStyle = '#fff'; ctx.font = '600 14px "Noto Sans KR"'; ctx.textAlign = 'center';
            ctx.fillText('z z z', this.x, this.y - 130 * sc + Math.sin(state.gameTime * 2) * 4);
        }
    }
}
