// 브레스 속성. 속성마다 공격 "방식"이 다르다.
//  FIRE    산탄: 짧은 사거리로 3갈래. 붙어서 쏘면 세 발 다 맞아 가장 아프다. 화상.
//  ICE     관통창: 느리게 쏘지만 적을 꿰뚫고 지나간다. 둔화, 이미 느려진 적은 얼린다.
//  THUNDER 속사: 아주 빠른 연사, 한 발은 약하지만 근처 적에게 튄다.
// rate: 꾹 누르고 있을 때 발사 간격(초). pellets: 한 번에 나가는 탄 수, spread: 탄 사이 각도(rad)
export const ELEMENTS = {
    FIRE: {
        name: '화염', key: '1', color: '#ff9a3c', damage: 8, speed: 620, rate: 0.36, life: 0.5, pellets: 3, spread: 0.2, radius: 46,
        proj: { img: 'firebolt', fw: 48, fh: 48, frames: [0, 1, 2, 3], fps: 14, ax: 0.8, ay: 0.6 },
        hit: 'FIRE_HIT', trail: '#e67e22', sound: 'shoot',
        status: { type: 'BURN', duration: 3 },      // 초당 3 피해
        desc: '짧은 사거리의 세 갈래 불길. 맞은 적을 불태운다',
    },
    ICE: {
        name: '냉기', key: '2', color: '#7fd4ff', damage: 15, speed: 500, rate: 0.62, life: 1.5, pellets: 1, spread: 0, radius: 50, pierce: true,
        proj: { img: 'ice', fw: 48, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], fps: 16, ax: 0.8, ay: 0.5 },
        hit: 'ICE_HIT', trail: '#aee6ff', sound: 'ice',
        status: { type: 'SLOW', duration: 2.5 },     // 이동 속도 절반. 이미 느린 적에게 맞히면 1.2초 빙결
        desc: '적을 꿰뚫는 얼음창. 느리게 하고, 느려진 적은 얼린다',
    },
    THUNDER: {
        name: '번개', key: '3', color: '#ffe27a', damage: 4.5, speed: 900, rate: 0.15, life: 0.75, pellets: 1, spread: 0, radius: 40,
        proj: { img: 'thunder', fw: 32, fh: 32, frames: [0, 1, 2, 3, 4], fps: 18, ax: 0.7, ay: 0.5 },
        hit: 'THUNDER_HIT', trail: '#fff2a8', sound: 'zap',
        chain: { count: 2, range: 230, damage: 3 }, // 근처 적에게 튄다
        desc: '쉴 새 없이 쏟아지는 번개. 근처 적에게 연쇄로 튄다',
    },
};

// 성장 단계. 레벨이 minLevel 에 닿으면 진화한다.
export const STAGES = [
    { id: 'HATCHLING', name: '해츨링', minLevel: 1,  scale: 0.55, damage: 0.8, speed: 0.95 },
    { id: 'JUVENILE',  name: '어린 용', minLevel: 4,  scale: 0.78, damage: 1.0, speed: 1.0,  unlock: '더 센 숨결' },
    { id: 'ADULT',     name: '성체',   minLevel: 8,  scale: 1.0,  damage: 1.3, speed: 1.05, unlock: '짝 맺기' },
    { id: 'ELDER',     name: '고룡',   minLevel: 13, scale: 1.2,  damage: 1.7, speed: 1.1 },
];
