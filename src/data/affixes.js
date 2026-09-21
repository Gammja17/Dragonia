// 정예 접사.
//
// 정예가 "체력 3.5배, 피해 1.6배" 이기만 하면 그냥 오래 걸리는 적이다.
// 접사 하나가 붙으면 싸우는 법이 달라진다:
//
//   ARMORED  무장 — 정면(바라보는 쪽 ±70°)에서 오는 피해 60% 감소. 돌아서 때린다
//   FRENZY   광폭 — 체력 30% 아래로 떨어지면 빨라지고 세진다. 끝까지 방심 못 한다
//   PLAGUE   전염 — 죽을 때 화상·둔화를 주변 적에게 옮긴다… 가 아니라, 반대로:
//            맞을 때마다 자기 상태이상을 곁의 적에게 옮긴다. 떼와 있으면 무섭다
//   SPLIT    분열 — 죽으면 작은 것 둘로 갈라진다 (체력 35%)
//   MIRROR   거울 — 속성 하나에 면역. 그 속성 탄은 튕겨 나온다. 속성을 바꿔야 한다

export const AFFIXES = {
    ARMORED: { name: '무장', color: '#b8c8d8', desc: '정면이 단단하다. 옆이나 뒤에서 때려라' },
    FRENZY:  { name: '광폭', color: '#ff5a3c', desc: '체력이 떨어지면 폭주한다' },
    PLAGUE:  { name: '전염', color: '#9fdc5a', desc: '상태이상을 곁의 적에게 옮긴다' },
    SPLIT:   { name: '분열', color: '#c9a8f0', desc: '죽으면 둘로 갈라진다' },
    MIRROR:  { name: '거울', color: '#ffe27a', desc: '속성 하나를 튕겨낸다' },
};
export const AFFIX_IDS = Object.keys(AFFIXES);

/** 정예에게 접사를 하나 준다. 거울은 그 적이 쓰지 않는 속성 중 하나를 막는다 */
export function rollAffix(def, rng = Math.random) {
    const id = AFFIX_IDS[Math.floor(rng() * AFFIX_IDS.length)];
    if (id !== 'MIRROR') return { id };
    const pool = ['FIRE', 'ICE', 'THUNDER'].filter(e => e !== def.element);
    return { id, element: pool[Math.floor(rng() * pool.length)] };
}
