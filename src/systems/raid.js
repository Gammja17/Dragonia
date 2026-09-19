import { state } from '../core/state.js';
import { RAID_INTERVAL } from '../core/config.js';
import { rand } from '../core/utils.js';
import { Human } from '../entities/Human.js';
import { showToast } from '../ui/toast.js';
import { showRaidWarning } from '../ui/hud.js';

export function updateRaid(dt) {
    state.raidTimer -= dt;
    if (state.raidTimer <= 0) {
        triggerRaid();
        state.raidTimer = RAID_INTERVAL;
    }
}

export function triggerRaid() {
    showRaidWarning();
    showToast("사냥꾼 습격이 시작되었습니다!", "⚔️");
    for (let i = 0; i < 4; i++) {
        state.entities.humans.push(new Human(800 + rand(-80, 80), 1200 + rand(-220, 220)));
    }
}
