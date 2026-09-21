import { state } from '../core/state.js';
import { dialogueUI } from '../ui/dialogueUI.js';
import { Enemy } from '../entities/Enemy.js';
import { showToast } from '../ui/toast.js';
import { dist } from '../core/utils.js';

// 수련장 시험 표지. 행동별로 무리를 불러내 바로 싸워 본다.
// 수치를 만질 때, 매번 숲을 헤매며 그 적을 찾지 않아도 되게.

const MENU = [
    { label: '덤빔: 슬라임 ×3',           units: [['SLIME', 3]] },
    { label: '돌진: 붉은 게 ×2',          units: [['CRAB', 2]] },
    { label: '포위: 고블린 ×4',           units: [['GOBLIN', 4]] },
    { label: '사수: 광신도 ×2',           units: [['CULTIST', 2]] },
    { label: '잠복: 독거미 ×2',           units: [['SPIDER', 2]] },
    { label: '방패: 방패 고블린 ×2',      units: [['WARDEN', 2]] },
    { label: '소환: 서리 주술사 ×1',      units: [['ICE_MAGE', 1]] },
    { label: '떼: 박쥐 ×6',               units: [['BAT', 6]] },
    { label: '정예 대장 + 졸개',           units: [['GOBLIN', 1, true], ['GOBLIN', 3]] },
    { label: '섞어서: 사수 2 + 방패 1 + 떼 4', units: [['CULTIST', 2], ['WARDEN', 1], ['BAT', 4]] },
];

const close = () => { state.isDialogueOpen = false; dialogueUI.hide(); };

export function nearbyArena() {
    return state.entities.props.find(p => p.type === 'ARENA' && dist(p, state.player) < 120) || null;
}

export function openArena() {
    const spot = state.dojoSpot || state.player;
    const options = MENU.map(m => ({
        label: m.label,
        onSelect: () => {
            close();
            let i = 0;
            for (const [type, n, elite] of m.units) for (let k = 0; k < n; k++, i++) {
                const a = (i / 8) * Math.PI * 2, r = 160 + (i % 3) * 40;
                { const e = new Enemy(spot.x + Math.cos(a) * r, spot.y + 60 + Math.sin(a) * r * 0.6, type, !!elite); e.aggro = true; state.entities.enemies.push(e); }
            }
            showToast(`${m.label}. 시험 시작`, '⚔️');
        },
    }));
    options.push({ label: '싸움터를 비운다', onSelect: () => { close(); for (const e of state.entities.enemies) if (e.type !== 'DUMMY') e.remove = true; } });
    options.push({ label: '돌아간다', onSelect: close });
    state.isDialogueOpen = true;
    dialogueUI.show({
        name: '시험 표지',
        text: '스승이 세워 둔 표지다. 숲의 것들을 흉내 낸 허깨비를 불러낼 수 있다.\n(무엇과 싸워 볼까?)',
        options, onClose: close,
    });
}
