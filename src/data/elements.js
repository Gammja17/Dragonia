// 브레스 속성. vfx/hit 은 render/vfx.js 의 키, light 는 조명 색.
export const ELEMENTS = {
    FIRE: {
        name: '화염', key: '1', color: '#ff9a3c', damage: 10, speed: 580,
        proj: { img: 'firebolt', fw: 48, fh: 48, frames: [0, 1, 2, 3], fps: 14, ax: 0.8, ay: 0.6 },
        hit: 'FIRE_HIT', trail: '#e67e22',
        status: { type: 'BURN', duration: 3 },      // 초당 3 피해
        desc: '맞은 적을 불태운다',
    },
    ICE: {
        name: '냉기', key: '2', color: '#7fd4ff', damage: 7, speed: 520,
        proj: { img: 'ice', fw: 48, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], fps: 16, ax: 0.8, ay: 0.5 },
        hit: 'ICE_HIT', trail: '#aee6ff',
        status: { type: 'SLOW', duration: 2.5 },     // 이동 속도 절반
        desc: '맞은 적을 느리게 한다',
    },
    THUNDER: {
        name: '번개', key: '3', color: '#ffe27a', damage: 8, speed: 760,
        proj: { img: 'thunder', fw: 32, fh: 32, frames: [0, 1, 2, 3, 4], fps: 18, ax: 0.7, ay: 0.5 },
        hit: 'THUNDER_HIT', trail: '#fff2a8',
        chain: { count: 2, range: 220, damage: 5 }, // 근처 적에게 튄다
        desc: '근처 적에게 연쇄로 튄다',
    },
};

// 성장 단계. 레벨이 minLevel 에 닿으면 진화한다.
export const STAGES = [
    { id: 'HATCHLING', name: '해츨링', minLevel: 1, scale: 0.55, damage: 0.8, speed: 0.95 },
    { id: 'JUVENILE',  name: '어린 용', minLevel: 3, scale: 0.78, damage: 1.0, speed: 1.0,  unlock: '스킬 [Q] 브레스 노바' },
    { id: 'ADULT',     name: '성체',   minLevel: 5, scale: 1.0,  damage: 1.3, speed: 1.05, unlock: '스킬 [F] 포효, 짝 맺기' },
    { id: 'ELDER',     name: '고룡',   minLevel: 9, scale: 1.2,  damage: 1.7, speed: 1.1 },
];

export const SKILLS = {
    NOVA: { name: '브레스 노바', keyLabel: 'Q', cooldown: 6, hunger: 8, stage: 1 },
    ROAR: { name: '포효', keyLabel: 'F', cooldown: 10, hunger: 5, stage: 2 },
};
