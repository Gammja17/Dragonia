// 성장 트리. 레벨업마다 성장 포인트 2개, 승급 시험을 통과할 때마다 3개를 받는다.
// 세 갈래(송곳니·비늘·날개)로 나뉘고, 각 갈래는 아래에서 위로 이어진다.
//   tier  : 이 노드를 열려면 필요한 성장 단계 (0 해츨링 · 1 어린 용 · 2 성체 · 3 고룡)
//   need  : [선행 노드 id, 그 노드에 찍어 둬야 하는 단수]
//   stat  : systems/growth.js 가 합산하는 보정치 이름. 최종값 = 찍은 단수 × per
//   flag  : 수치가 아니라 특별한 효과. 찍으면 systems/growth.js 의 hasPerk(flag) 가 참이 된다
export const BRANCHES = {
    FANG:  { name: '송곳니', sub: '공격', color: '#ff8a5c', desc: '숨결과 기술의 위력을 키운다' },
    SCALE: { name: '비늘',   sub: '수비', color: '#8fb7ff', desc: '몸을 두껍게 하고 오래 버티게 한다' },
    WING:  { name: '날개',   sub: '기동', color: '#7dffb0', desc: '더 빨리 움직이고 더 자주 쓰게 한다' },
};

export const GROWTH_NODES = [
    // ---- 송곳니: 화력 ----
    { id: 'FANG1', branch: 'FANG', tier: 0, cost: 1, max: 5, name: '날카로운 이빨',
      stat: 'dmg', per: 0.04, desc: (r) => `주는 피해 +${Math.round(r * 4)}%` },
    { id: 'FANG2', branch: 'FANG', tier: 1, cost: 1, max: 5, name: '타오르는 목', need: ['FANG1', 3],
      stat: 'breath', per: 0.06, desc: (r) => `브레스 피해 +${Math.round(r * 6)}%` },
    { id: 'FANG3', branch: 'FANG', tier: 2, cost: 2, max: 5, name: '기술의 결', need: ['FANG2', 2],
      stat: 'skill', per: 0.07, desc: (r) => `스킬 피해 +${Math.round(r * 7)}%` },
    { id: 'FANG4', branch: 'FANG', tier: 3, cost: 3, max: 1, name: '역린', need: ['FANG3', 3],
      flag: 'SCORN', desc: () => '체력이 35% 아래일 때 주는 피해 +45%' },

    // ---- 비늘: 생존 ----
    { id: 'SCALE1', branch: 'SCALE', tier: 0, cost: 1, max: 5, name: '두꺼운 비늘',
      stat: 'hp', per: 25, desc: (r) => `최대 체력 +${r * 25}` },
    { id: 'SCALE2', branch: 'SCALE', tier: 1, cost: 1, max: 5, name: '단단한 등', need: ['SCALE1', 3],
      stat: 'armor', per: 0.03, desc: (r) => `받는 피해 -${Math.round(r * 3)}%` },
    { id: 'SCALE3', branch: 'SCALE', tier: 2, cost: 2, max: 5, name: '무쇠 위장', need: ['SCALE2', 2],
      stat: 'hunger', per: 0.08, desc: (r) => `허기 소모 -${Math.round(r * 8)}%` },
    { id: 'SCALE4', branch: 'SCALE', tier: 3, cost: 3, max: 1, name: '불사의 심장', need: ['SCALE3', 3],
      flag: 'UNDYING', desc: () => '하루 한 번, 쓰러질 공격을 체력 1로 버티고 3초간 무적' },

    // ---- 날개: 기동 ----
    { id: 'WING1', branch: 'WING', tier: 0, cost: 1, max: 5, name: '가벼운 날개',
      stat: 'speed', per: 0.03, desc: (r) => `이동 속도 +${Math.round(r * 3)}%` },
    { id: 'WING2', branch: 'WING', tier: 1, cost: 1, max: 5, name: '바람 타기', need: ['WING1', 3],
      stat: 'dash', per: 0.08, desc: (r) => `대시 재사용 대기 -${Math.round(r * 8)}%` },
    { id: 'WING3', branch: 'WING', tier: 2, cost: 2, max: 5, name: '숨 고르기', need: ['WING2', 2],
      stat: 'cdr', per: 0.04, desc: (r) => `스킬 대기 시간 -${Math.round(r * 4)}%` },
    { id: 'WING4', branch: 'WING', tier: 3, cost: 3, max: 1, name: '질풍', need: ['WING3', 3],
      flag: 'GALE', desc: () => '대시한 뒤 3초 동안 브레스 연사 속도 +35%' },
];

export const NODES_BY_ID = Object.fromEntries(GROWTH_NODES.map(n => [n.id, n]));
