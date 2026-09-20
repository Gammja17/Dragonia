// 배울 수 있는 스킬. 배운 것 중 3개만 Q / F / R 칸에 골라 장착한다 (B 키: 스킬 수첩).
// 쓰는 값은 재사용 대기 시간뿐이다. 허기는 더 이상 마나로 쓰이지 않는다 (systems/skills.js).
// element: 비 올 때 위력 보정에 쓰는 속성(없으면 무속성). from: 어디서 배우는지(수첩 표시용)
export const SKILL_SLOTS = ['Q', 'F', 'R'];

export const SKILLS = {
    TAIL_SWIPE:   { name: '꼬리 후려치기', cooldown: 4,  desc: '몸을 돌려 주변을 크게 후려친다. 밀쳐낸다',            from: '스승의 수련' },
    ROAR:         { name: '포효',         cooldown: 10, desc: '주변 적을 기절시키고 6초간 분노(피해·연사 증가)',      from: '스승의 수련' },
    METEOR:       { name: '운석 낙하',     cooldown: 7,  desc: '겨눈 자리에 운석을 떨어뜨린다. 넓은 범위, 화상', element: 'FIRE', from: '스승의 수련' },
    WING_GUST:    { name: '날개 돌풍',     cooldown: 7,  desc: '앞의 적을 날려 보내고 날아오는 탄을 지운다',          from: '스승의 수련' },
    HEAL:         { name: '재생의 숨결',   cooldown: 18, desc: '4초에 걸쳐 체력 35% 회복. 곁의 가족·동료도 회복',     from: '스승의 수련' },
    FLAME_BREATH: { name: '화염 방사',     cooldown: 8,  desc: '1.8초 동안 앞쪽 부채꼴을 불태운다. 움직이며 쓸 수 있다', element: 'FIRE', from: '스승의 수련' },
    IRON_SCALE:   { name: '강철 비늘',     cooldown: 16, desc: '5초 동안 받는 피해 70% 감소',                       from: '스승의 수련' },
    RALLY:        { name: '용의 함성',     cooldown: 25, desc: '가족·동료·마을 용을 회복시키고 10초간 공격력 +50%',   from: '스승의 수련' },
    FROST_NOVA:   { name: '빙결 파동',     cooldown: 9,  desc: '주변의 모든 적을 2.5초 동안 얼린다',  element: 'ICE',     from: '뼈용 모르가스' },
    STORM:        { name: '번개 폭풍',     cooldown: 10, desc: '3초 동안 주변 적에게 벼락이 쏟아진다', element: 'THUNDER', from: '쌍두룡 잘고라' },
    ICE_SPIKES:   { name: '서릿발',       cooldown: 6,  desc: '앞으로 얼음 기둥이 줄지어 솟는다. 맞은 적은 언다', element: 'ICE', from: '서리 여왕 글라시아' },
    DIVE:         { name: '급강하',       cooldown: 9,  desc: '겨눈 곳으로 날아올라 내리꽂는다. 나는 동안 무적',     from: '모래 폭군 바실' },
    BLINK:        { name: '번개 질주',     cooldown: 5,  desc: '번개가 되어 앞으로 순간이동. 지나간 길의 적을 지진다', element: 'THUNDER', from: '티아맷과의 대련' },
};

// 보스를 잡으면 배우는 스킬
export const BOSS_SKILLS = { MORGATH: 'FROST_NOVA', ZALGORA: 'STORM', GLACIA: 'ICE_SPIKES', BASIL: 'DIVE' };
