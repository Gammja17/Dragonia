import { Entity } from './Entity.js';
import { Fireball, addBullet } from './Fireball.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist, rand } from '../core/utils.js';
import { setKidStage, addAffection } from '../systems/kids.js';
import { showToast } from '../ui/toast.js';

const TAU = Math.PI * 2;
const STAGE_COLOR = { BABY: '#f1c40f', TEEN: '#e67e22', ADULT: '#9b59b6' };
const STAGE_SCALE = { BABY: 0.6, TEEN: 0.8, ADULT: 1.0 };

export class BabyDragon extends Entity {
    constructor(x, y) {
        super(x, y);
        this.wing = 0;
        this.growth = 0;      // 0~200
        this.stage = 'BABY';  // BABY → TEEN → ADULT
        this.atkTimer = 0;
        this.angle = 0;
        this.home = null;     // 성체가 되면 둥지 주변을 배회
        this.wanderTimer = 0;
    }

    feed() {
        this.growth += 34;
        addAffection(this, 20);
        showToast("아기에게 고기를 먹였습니다!", "🍖");
        burst(this.x, this.y, '#2ecc71', 0.8, 10);

        if (this.growth >= 70 && this.stage === 'BABY') {
            this.stage = 'TEEN';
            setKidStage(this, 'TEEN');
            showToast("아기 용이 청소년이 되었습니다! (전투 가능)", "🔥");
        } else if (this.growth >= 140 && this.stage === 'TEEN') {
            this.stage = 'ADULT';
            setKidStage(this, 'ADULT');
            const nest = state.entities.nests[0];
            this.home = nest ? { x: nest.x, y: nest.y } : { x: this.x, y: this.y };
            showToast("자식이 성체가 되었습니다! 이제 둥지 근처에서 지냅니다.", "🐉");
        }
    }

    update(dt) {
        if (this.stage === 'ADULT') { this.updateAdult(dt); return; }

        const player = state.player;
        let target = player;

        if (this.stage === 'TEEN') {
            const E = state.entities;
            const enemy = E.enemies.find(e => dist(this, e) < 280) || E.humans.find(h => dist(this, h) < 280);
            if (enemy) {
                target = enemy;
                this.atkTimer -= dt;
                if (this.atkTimer <= 0) {
                    addBullet(new Fireball(this.x, this.y, Math.atan2(enemy.y - this.y, enemy.x - this.x), player, 'ALLY'));
                    this.atkTimer = 1.6;
                }
            }
        }

        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        const d = dist(this, target);
        const keep = (this.stage === 'TEEN' && target !== player) ? 150 : 70;
        if (d > keep) {
            this.x += Math.cos(this.angle) * 190 * dt;
            this.y += Math.sin(this.angle) * 190 * dt;
            this.wing += 20 * dt;
        } else {
            this.wing += 7 * dt;
        }
    }

    // 예전엔 성체가 된 순간 그 자리에 영원히 멈췄다. 이제 둥지 주변을 느긋하게 배회.
    updateAdult(dt) {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.wanderTimer = rand(2, 5);
            this.angle = rand(0, TAU);
        }
        if (dist(this, this.home) > 200) this.angle = Math.atan2(this.home.y - this.y, this.home.x - this.x);
        this.x += Math.cos(this.angle) * 40 * dt;
        this.y += Math.sin(this.angle) * 40 * dt;
        this.wing += 4 * dt;
    }

    draw(ctx) {
        if (!isOnScreen(this)) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const s = STAGE_SCALE[this.stage];
        ctx.scale(s, s);
        ctx.rotate(this.angle);
        this.drawShadow(ctx, 20 * s);
        const f = Math.sin(this.wing) * 0.7;
        ctx.fillStyle = STAGE_COLOR[this.stage];
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-30, -20 * (1 + f), 10, -8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-30, 20 * (1 + f), 10, 8); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 10, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(18, 0, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(20, -2, 2, 0, TAU); ctx.arc(20, 2, 2, 0, TAU); ctx.fill();
        ctx.restore();
    }
}
