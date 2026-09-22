// 배울 수 있는 스킬. 배운 것 중 3개만 Q / F / R 칸에 골라 장착한다 ([J] 일지의 [스킬] 탭).
// 쓰는 값은 재사용 대기 시간뿐이다. 허기는 더 이상 마나로 쓰이지 않는다 (systems/skills.js).
// 스킬은 세 계통으로 나뉘고, 계통 안에서 tier 가 낮은 것부터 자연스럽게 손에 들어온다.
//   branch  : BODY(육체) · BREATH(숨결) · SOUL(혼) — 일지의 스킬 나무에서 어느 갈래에 놓일지
//   tier    : 그 갈래의 몇 번째 줄인지 (0이 뿌리에 가장 가깝다)
//   element : 비 올 때 위력 보정에 쓰는 속성 (없으면 무속성)
//   source  : 어떻게 손에 넣는지. systems/skills.js 가 해금을 판정한다
//     { type: 'MASTER' }             스승 카이론의 수련 (data/story.js 의 LESSONS)
//     { type: 'BOSS',   id }         그 보스를 쓰러뜨리면
//     { type: 'EVENT',  hint }       특정 사건 (티아맷과의 첫 대련 승리 등)
//     { type: 'SELF',   cond, hint } 혼자 싸우다 스스로 깨우친다
//     { type: 'GIFT',   hint }       숨결을 맡겨 받을 때 같이 배운다 (ELEMENT_SKILLS)
//     { type: 'AWAKEN', need, hint } 다른 스킬을 일정 단수까지 익히면 열린다. need: [[스킬id, 단수], ...]
export const SKILL_SLOTS = ['Q', 'F', 'R'];

export const SKILL_BRANCHES = {
    BODY:   { name: '육체', color: '#ff8a5c', desc: '꼬리와 날개, 몸으로 치고 파고드는 기술' },
    BREATH: { name: '숨결', color: '#7fd4ff', desc: '숨결을 쏟아내 넓은 땅을 지배하는 기술' },
    SOUL:   { name: '혼',   color: '#ffd84a', desc: '자신과 무리를 일으켜 세우는 기술' },
};

// 강화 단수. 1단이 기본이고, 성장 포인트로 2·3단까지 올린다 (systems/growth.js)
export const SKILL_RANKS = [
    { power: 1,    cd: 1,    cost: 0 },
    { power: 1.3,  cd: 0.85, cost: 2 },
    { power: 1.65, cd: 0.7,  cost: 3 },
];
export const MAX_SKILL_RANK = SKILL_RANKS.length;

export const SKILLS = {
    // ---------- 육체 ----------
    POUNCE:       { name: '덮치기',       branch: 'BODY', tier: 0, cooldown: 5,  desc: '짧게 도약해 앞의 적을 물어뜯는다',
                    source: { type: 'SELF', cond: 'kills25', hint: '숲에서 적 25마리를 쓰러뜨리면 몸이 먼저 기억한다' } },
    TAIL_SWIPE:   { name: '꼬리 후려치기', branch: 'BODY', tier: 0, cooldown: 4,  desc: '몸을 돌려 주변을 크게 후려친다. 밀쳐낸다',
                    source: { type: 'MASTER' } },
    WING_GUST:    { name: '날개 돌풍',     branch: 'BODY', tier: 1, cooldown: 7,  desc: '앞의 적을 날려 보내고 날아오는 탄을 지운다',
                    source: { type: 'MASTER' } },
    BLINK:        { name: '번개 질주',     branch: 'BODY', tier: 1, cooldown: 5,  desc: '번개가 되어 앞으로 순간이동. 지나간 길의 적을 지진다', element: 'THUNDER',
                    source: { type: 'EVENT', hint: '티아맷과의 대련에서 처음 이기면 그 몸놀림을 훔칠 수 있다' } },
    DIVE:         { name: '급강하',       branch: 'BODY', tier: 2, cooldown: 9,  desc: '겨눈 곳으로 날아올라 내리꽂는다. 나는 동안 무적',
                    source: { type: 'BOSS', id: 'BASIL' } },
    TEMPEST:      { name: '폭풍의 춤',     branch: 'BODY', tier: 3, cooldown: 15, desc: '2초 동안 회전하며 주변을 계속 베고 날아오는 탄을 지운다. 움직이며 쓸 수 있다',
                    source: { type: 'AWAKEN', need: [['TAIL_SWIPE', 3], ['WING_GUST', 2]], hint: '꼬리와 날개를 함께 갈고닦으면 한 동작으로 이어진다' } },

    // ---------- 숨결 ----------
    METEOR:       { name: '운석 낙하',     branch: 'BREATH', tier: 1, cooldown: 7,  desc: '겨눈 자리에 운석을 떨어뜨린다. 넓은 범위, 화상', element: 'FIRE',
                    source: { type: 'MASTER' } },
    FROST_NOVA:   { name: '빙결 파동',     branch: 'BREATH', tier: 1, cooldown: 9,  desc: '주변의 모든 적을 2.5초 동안 얼린다', element: 'ICE',
                    source: { type: 'BOSS', id: 'MORGATH' } },
    TIDE:         { name: '해일',         branch: 'BREATH', tier: 2, cooldown: 8,  desc: '앞쪽의 적을 멀리 쓸어 내고 흠뻑 적신다. 젖은 적은 번개와 냉기에 약하다', element: 'WATER',
                    source: { type: 'GIFT', hint: '구름마루에서 물의 숨결을 맡겨 받으면' } },
    UPHEAVAL:     { name: '지각 융기',     branch: 'BREATH', tier: 2, cooldown: 10, desc: '내 둘레로 바위가 솟아올라 닿은 적을 기절시킨다', element: 'EARTH',
                    source: { type: 'GIFT', hint: '바윗골에서 땅의 숨결을 맡겨 받으면' } },
    BRAMBLE:      { name: '가시덤불',     branch: 'BREATH', tier: 2, cooldown: 9,  desc: '겨눈 자리에 가시덤불이 자라 5초 동안 적을 붙들고 독을 묻힌다', element: 'GRASS',
                    source: { type: 'GIFT', hint: '뿌리골에서 풀의 숨결을 맡겨 받으면' } },
    FLAME_BREATH: { name: '화염 방사',     branch: 'BREATH', tier: 2, cooldown: 8,  desc: '1.8초 동안 앞쪽 부채꼴을 불태운다. 움직이며 쓸 수 있다', element: 'FIRE',
                    source: { type: 'MASTER' } },
    STORM:        { name: '번개 폭풍',     branch: 'BREATH', tier: 2, cooldown: 10, desc: '3초 동안 주변 적에게 벼락이 쏟아진다', element: 'THUNDER',
                    source: { type: 'BOSS', id: 'ZALGORA' } },
    ICE_SPIKES:   { name: '서릿발',       branch: 'BREATH', tier: 2, cooldown: 6,  desc: '앞으로 얼음 기둥이 줄지어 솟는다. 맞은 적은 언다', element: 'ICE',
                    source: { type: 'BOSS', id: 'GLACIA' } },
    AURORA:       { name: '오로라 숨결',   branch: 'BREATH', tier: 3, cooldown: 18, desc: '불·얼음·번개가 뒤엉킨 빛의 띠를 앞으로 길게 토해낸다. 화상·빙결·감전',
                    source: { type: 'AWAKEN', need: [['FLAME_BREATH', 2], ['ICE_SPIKES', 2], ['STORM', 2]], hint: '세 보스의 숨결을 모두 2단까지 익히면 하나로 엮인다' } },

    // ---------- 혼 ----------
    ROAR:         { name: '포효',         branch: 'SOUL', tier: 0, cooldown: 10, desc: '주변 적을 기절시키고 6초간 분노(피해·연사 증가)',
                    source: { type: 'MASTER' } },
    SHED:         { name: '허물 벗기',     branch: 'SOUL', tier: 1, cooldown: 22, desc: '느려진 몸을 털어내고 1.2초 무적. 체력 20% 회복하며 주변을 밀쳐낸다',
                    source: { type: 'SELF', cond: 'brink3', hint: '체력이 20% 아래로 떨어진 위기를 세 번 넘기면 몸이 스스로 껍질을 벗는다' } },
    HEAL:         { name: '재생의 숨결',   branch: 'SOUL', tier: 1, cooldown: 18, desc: '4초에 걸쳐 체력 35% 회복. 곁의 가족·동료도 회복',
                    source: { type: 'MASTER' } },
    IRON_SCALE:   { name: '강철 비늘',     branch: 'SOUL', tier: 2, cooldown: 16, desc: '5초 동안 받는 피해 70% 감소',
                    source: { type: 'MASTER' } },
    RALLY:        { name: '용의 함성',     branch: 'SOUL', tier: 3, cooldown: 25, desc: '가족·동료·마을 용을 회복시키고 10초간 공격력 +50%',
                    source: { type: 'MASTER' } },
};

// 보스를 잡으면 배우는 스킬 (source 와 같은 내용이지만 Boss.js 가 바로 찾아 쓴다)
// 맡겨 받은 숨결과 함께 배우는 기술 (entities/Dragon.js 의 unlockElement)
export const ELEMENT_SKILLS = { WATER: 'TIDE', EARTH: 'UPHEAVAL', GRASS: 'BRAMBLE' };
export const BOSS_SKILLS = { MORGATH: 'FROST_NOVA', ZALGORA: 'STORM', GLACIA: 'ICE_SPIKES', BASIL: 'DIVE' };
