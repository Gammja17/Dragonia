import { Entity } from './Entity.js';
import { BabyDragon } from './BabyDragon.js';
import { burst } from './Particle.js';
import { state } from '../core/state.js';
import { isOnScreen } from '../core/camera.js';
import { dist, rand } from '../core/utils.js';
import { registerKid, mixGenes } from '../systems/kids.js';
import { notify } from '../systems/quests.js';
import { hasRelic } from '../systems/relics.js';
import { showToast } from '../ui/toast.js';
import { drawIcon, drawGlow } from '../render/pixel.js';
import { spawnEffect } from '../render/vfx.js';

const TAU = Math.PI * 2;

export class Nest extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hasEgg = false;
        this.progress = 0; // 0~100, 플레이어가 근처에 있으면 빨리 찬다
        this.genes = null; // 알 속 아이의 { species, colors }
    }
    /** a, b: 부모 드래곤. b 가 없으면 주워 온 알 */
    layEgg(a, b) {
        this.hasEgg = true;
        this.progress = 0;
        this.genes = mixGenes(a, b);
    }
    get light() {
        if (this.hasEgg) return { r: 150, color: '#fff2c8', intensity: 0.8 };
        // 알이 없어도, 지어 둔 둥지는 굴 안에서 은은히 빛난다 (깜깜한 데서 찾지 못하면 소용없다)
        return state.den.built ? { r: 120, color: '#ffd89a', intensity: 0.45 } : null;
    }
    /** 사냥꾼이 알을 노린다. 부화 진행도가 깎이고, 바닥나면 알을 빼앗긴다 */
    attackEgg(amount) {
        if (!this.hasEgg) return;
        this.progress -= amount;
        burst(this.x, this.y, '#ff5a4d', 0.6, 6);
        if (this.progress < 0) {
            this.hasEgg = false;
            this.progress = 0;
            showToast("사냥꾼에게 알을 빼앗겼습니다…!", "💔");
        }
    }
    update(dt) {
        if (!this.hasEgg) return;
        const near = dist(this, state.player) < 120;
        // 예전엔 곁에 서 있으면 6초 만에 깼다. 이제 곁에서 품으면 하루 반, 밤에 곁에서 자면 하룻밤에 +25 (systems/story.js 의 sleep)
        this.progress += (near ? dt * 0.25 : dt * 0.05) * (hasRelic('NEST_CHARM') ? 1.5 : 1);
        if (this.progress > 100) this.hatch();
    }
    hatch() {
        this.hasEgg = false;
        this.progress = 0;
        const baby = new BabyDragon(this.x + rand(-20, 20), this.y + rand(-20, 20), this.genes);
        state.entities.babies.push(baby);
        registerKid(baby);
        notify('hatch');
        showToast("아기 용이 태어났습니다!", "🐣");
        burst(this.x, this.y, () => `hsl(${Math.floor(Math.random() * 12) * 30},100%,60%)`, 1, 25); // 색 12가지(빛 스프라이트 캐시)
        spawnEffect('RING', this.x, this.y);
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        // 돌무더기 터는 지형에 구워져 있다 (world/terrain.js). 둥지를 지으면 그 안에 짚을 깐다
        if (state.den.built) {
            ctx.fillStyle = '#6b4a22'; ctx.beginPath(); ctx.ellipse(this.x, this.y + 2, 30, 17, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#d8b25a'; ctx.beginPath(); ctx.ellipse(this.x, this.y, 25, 13, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#a07a30'; ctx.lineWidth = 2;
            for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.beginPath(); ctx.moveTo(this.x + Math.cos(a) * 8, this.y + Math.sin(a) * 4); ctx.lineTo(this.x + Math.cos(a) * 26, this.y + Math.sin(a) * 13); ctx.stroke(); }
            // 깜깜한 굴에서도 눈에 띄도록. 알이 없으면 "여기서 잘 수 있다"는 표시를 띄운다
            drawGlow(ctx, this.x, this.y - 4, 44, '#ffd89a', 0.24);
            if (!this.hasEgg) {
                const bob = Math.sin(state.gameTime * 2.2) * 3;
                ctx.save();
                ctx.font = '600 20px "Bookk Myungjo", "Noto Sans KR"';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255, 226, 170, 0.9)';
                ctx.fillText('💤', this.x, this.y - 30 + bob);
                ctx.restore();
            }
        }
        if (!this.hasEgg) return;
        const wobble = this.progress > 80 ? Math.sin(state.gameTime * 25) * 2 : 0;
        drawGlow(ctx, this.x, this.y - 4, 40, '#fff2c8', 0.35 + this.progress / 250);
        drawIcon(ctx, 'EGG', this.x + wobble, this.y - 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(this.x, this.y, 50, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#ffd866'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(this.x, this.y, 50, -Math.PI / 2, -Math.PI / 2 + TAU * this.progress / 100); ctx.stroke();
        ctx.lineCap = 'butt';
    }
}
