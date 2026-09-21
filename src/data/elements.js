// 브레스 속성. 속성마다 공격 "방식"이 다르다.
//  FIRE    산탄: 짧은 사거리로 3갈래. 붙어서 쏘면 세 발 다 맞아 가장 아프다. 화상.
//  ICE     관통창: 느리게 쏘지만 적을 꿰뚫고 지나간다. 둔화, 이미 느려진 적은 얼린다.
//  THUNDER 속사: 아주 빠른 연사, 한 발은 약하지만 근처 적에게 튄다.
//  WATER   물줄기: 적을 밀어내고 적신다. 젖은 적은 번개와 냉기에 약해진다. (구름마루에서 받는다)
//  EARTH   바위: 느리고 묵직하다. 맞은 적이 잠깐 기절한다. (돌등에서 받는다)
//  GRASS   가시: 두 갈래로 나가 독을 묻힌다. 독은 오래가고, 불이 닿으면 번진다. (뿌리골에서 받는다)
//
// proj.filter: 새 속성은 아직 제 그림이 없어서 있는 그림의 색을 돌려 쓴다 (CSS filter).
// rate: 꾹 누르고 있을 때 발사 간격(초). pellets: 한 번에 나가는 탄 수, spread: 탄 사이 각도(rad)
export const ELEMENTS = {
    FIRE: {
        name: '화염', key: '1', color: '#ff9a3c', damage: 8, speed: 620, rate: 0.36, life: 0.5, pellets: 3, pelletsByStage: [1, 2, 3, 3, 5], spread: 0.2, radius: 46,   // 자랄수록 갈래가 는다
        proj: { img: 'firebolt', fw: 48, fh: 48, frames: [0, 1, 2, 3], fps: 14, ax: 0.8, ay: 0.6 },
        hit: 'FIRE_HIT', trail: '#e67e22', sound: 'shoot',
        status: { type: 'BURN', duration: 3 },      // 초당 3 피해
        desc: '짧은 사거리의 세 갈래 불길. 맞은 적을 불태운다',
    },
    ICE: {
        name: '냉기', key: '2', color: '#7fd4ff', damage: 15, speed: 500, rate: 0.62, life: 1.5, pellets: 1, pelletsByStage: [1, 1, 1, 2, 3], spread: 0.16, radius: 50, pierce: true, pierceFromStage: 1,   // 해츨링의 얼음은 아직 꿰뚫지 못한다
        proj: { img: 'ice', fw: 48, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], fps: 16, ax: 0.8, ay: 0.5 },
        hit: 'ICE_HIT', trail: '#aee6ff', sound: 'ice',
        status: { type: 'SLOW', duration: 2.5 },     // 이동 속도 절반. 이미 느린 적에게 맞히면 1.2초 빙결
        desc: '적을 꿰뚫는 얼음창. 느리게 하고, 느려진 적은 얼린다',
    },
    THUNDER: {
        name: '번개', key: '3', color: '#ffe27a', damage: 4.5, speed: 900, rate: 0.15, rateByStage: [0.26, 0.2, 0.15, 0.13, 0.1], life: 0.75, pellets: 1, spread: 0, radius: 40,   // 자랄수록 빨라진다
        proj: { img: 'thunder', fw: 32, fh: 32, frames: [0, 1, 2, 3, 4], fps: 18, ax: 0.7, ay: 0.5 },
        hit: 'THUNDER_HIT', trail: '#fff2a8', sound: 'zap',
        chain: { count: 2, range: 230, damage: 3 }, // 근처 적에게 튄다
        desc: '쉴 새 없이 쏟아지는 번개. 근처 적에게 연쇄로 튄다',
    },
    WATER: {
        name: '물', key: '4', color: '#4aa3ff', damage: 6, speed: 560, rate: 0.3, life: 0.7, pellets: 1, spread: 0, radius: 46, push: 22,
        proj: { img: 'ice', fw: 48, fh: 32, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], fps: 20, ax: 0.8, ay: 0.5, filter: 'hue-rotate(25deg) saturate(1.8) brightness(0.95)' },
        hit: 'ICE_HIT', trail: '#7fc4ff', sound: 'ice',
        status: { type: 'WET', duration: 4.5 },
        desc: '적을 밀어내는 물줄기. 젖은 적은 번개와 냉기에 약해진다',
    },
    EARTH: {
        name: '땅', key: '5', color: '#c9a06a', damage: 24, speed: 380, rate: 0.95, life: 0.95, pellets: 1, spread: 0, radius: 72,
        proj: { img: 'firebolt', fw: 48, fh: 48, frames: [0, 1, 2, 3], fps: 8, ax: 0.8, ay: 0.6, filter: 'grayscale(1) sepia(0.9) brightness(0.8) contrast(1.3)' },
        hit: 'FIRE_HIT', trail: '#a88a5a', sound: 'shoot',
        status: { type: 'STUN', duration: 0.7 },
        desc: '느리고 묵직한 바위. 맞은 적이 잠깐 기절하고, 얼거나 굳은 적은 부서진다',
    },
    GRASS: {
        name: '풀', key: '6', color: '#6fcf5a', damage: 5, speed: 540, rate: 0.28, life: 0.7, pellets: 2, spread: 0.12, radius: 40,
        proj: { img: 'thunder', fw: 32, fh: 32, frames: [0, 1, 2, 3, 4], fps: 14, ax: 0.7, ay: 0.5, filter: 'hue-rotate(60deg) saturate(1.4)' },
        hit: 'THUNDER_HIT', trail: '#9fe07a', sound: 'zap',
        status: { type: 'POISON', duration: 5 },
        desc: '독을 묻히는 가시 두 갈래. 독은 오래가고, 불이 닿으면 번진다',
    },
};

// 속성 연계: 앞서 걸린 상태(status)에 다른 숨결이 닿으면 반응이 난다. 숨결을 바꿔 가며 싸울 이유.
//   mult 피해 배율 · stun/burn 덧붙는 상태(초) · chain 번개가 더 튀는 수 · spread 주변으로 번지는 반경 · clear 그 상태를 지운다
export const REACTIONS = {
    THUNDER: { WET:    { name: '감전', mult: 1.6, chain: 2 } },
    ICE:     { WET:    { name: '빙결', stun: 1.6, clear: true } },
    FIRE:    { POISON: { name: '번지는 불', mult: 1.4, burn: 3, spread: 140, clear: true } },
    EARTH:   { STUN:   { name: '분쇄', mult: 2.0 }, SLOW: { name: '분쇄', mult: 1.6 } },
    WATER:   { BURN:   { name: '증기', mult: 1.8, spread: 110, clear: true } },
    GRASS:   { WET:    { name: '무성', mult: 1.3, poison: 4 } },
};

// 성장 단계. 레벨이 minLevel 에 닿으면 진화한다.
// shape: 단계마다 몸의 비율이 다르다. 덩치(scale)만 키우면 "커진 아기"로 보여서,
//        머리 쪽(head)과 꼬리 쪽(body)의 가로 배율을 따로 준다.
//        해츨링은 머리가 크고 몸이 작다(새끼 짐승의 비율), 고룡은 목이 길고 몸이 굵다.
//        tempo 는 숨·걸음의 빠르기 — 작은 것은 종종거리고 큰 것은 느긋하다.
//        성체는 원본 그림 그대로라 shape 가 없다 (띠로 나눠 그리지 않아 그리는 값도 싸다).
/** 융합 브레스(필살기 [X])를 쓸 수 있나: 품은 숨결이 셋 이상 */
export const canFuse = (dragon) => (dragon.elements || []).length >= 3;

export const STAGES = [
    { id: 'HATCHLING', name: '해츨링', minLevel: 1,  scale: 0.55, damage: 0.8, speed: 0.95, shape: { head: 1.26, body: 0.80, tempo: 1.5 } },
    { id: 'JUVENILE',  name: '어린 용', minLevel: 4,  scale: 0.78, damage: 1.0, speed: 1.0,  unlock: '더 센 숨결', shape: { head: 1.11, body: 0.92, tempo: 1.18 } },
    { id: 'ADULT',     name: '성체',   minLevel: 8,  scale: 1.0,  damage: 1.3, speed: 1.05, unlock: '짝 맺기 · 비행 (Z)' },
    { id: 'ELDER',     name: '고룡',   minLevel: 13, scale: 1.2,  damage: 1.7, speed: 1.1,  shape: { head: 0.92, body: 1.12, tempo: 0.8 } },
    // 옛 세이브용으로만 남겨 둔 단계. 이제는 오를 길이 없다 (승급 시험은 고룡까지).
    // 필살기 [X] 융합 브레스는 단계가 아니라 숨결이 셋 모이면 열린다 — canFuse()
    { id: 'PRISM',     name: '삼원룡', minLevel: 16, scale: 1.3,  damage: 2.2, speed: 1.15, unlock: '필살기 [X] 삼원 융합 브레스', needsAllElements: true, shape: { head: 0.90, body: 1.16, tempo: 0.72 } },
];
