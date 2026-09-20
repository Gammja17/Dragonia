import { Entity } from './Entity.js';
import { isOnScreen } from '../core/camera.js';
import { state } from '../core/state.js';
import { dist } from '../core/utils.js';
import { spawnText } from '../render/vfx.js';
import { hasRelic } from '../systems/relics.js';
import { MATERIALS } from '../data/materials.js';
import { addMaterial } from '../systems/smithing.js';
import { play } from '../systems/audio.js';
import { drawIcon, drawGlow } from '../render/pixel.js';

export class Item extends Entity {
    constructor(x, y, type, value = 0) {
        super(x, y);
        this.type = type; // 'MEAT' | 'EGG' | 'GOLD' | 'MAT'
        this.value = value; // GOLD 면 액수, MAT 이면 소재 id (data/materials.js)
        this.t = 0;
    }
    update(dt) {
        this.t += dt * 3;
        if (this.type !== 'GOLD' && this.type !== 'MAT') return;
        // 골드와 소재는 가까이 가면 빨려 들어온다 (E 안 눌러도 됨)
        const p = state.player, d = dist(this, p);
        if (d < 40) {
            if (this.type === 'MAT') {
                addMaterial(this.value, 1);
                spawnText(p.x, p.y - 90, `${MATERIALS[this.value].name} +1`, '#d8c39a', 14);
                play('pickup');
            } else {
                const gain = Math.round(this.value * (hasRelic('LUCKY_COIN') ? 1.3 : 1));
                p.gold += gain;
                spawnText(p.x, p.y - 90, `+${gain}G`, '#ffd84a', 15);
                play('coin');
            }
            this.remove = true;
        } else if (d < 170) {
            this.x += ((p.x - this.x) / d) * 420 * dt;
            this.y += ((p.y - this.y) / d) * 420 * dt;
        }
    }
    draw(ctx) {
        if (!isOnScreen(this)) return;
        const bob = Math.sin(this.t) * 5;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y + 20, 14 - bob * 0.4, 5, 0, 0, Math.PI * 2); ctx.fill();
        drawGlow(ctx, this.x, this.y + bob, 30, '#fff4c2', 0.35 + Math.sin(this.t * 1.3) * 0.15); // 주울 수 있다는 표시
        const icon = this.type === 'GOLD' ? 'COIN' : this.type === 'MAT' ? MATERIALS[this.value].icon : this.type;
        drawIcon(ctx, icon, this.x, this.y + bob);
    }
}
