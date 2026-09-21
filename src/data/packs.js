// 무리 편성표.
//
// 낱개를 무작위로 떨어뜨리면 늘 "하나씩 걸어오는" 싸움이 된다. 무리로 내보내면
// 포위형은 링을 만들고, 사수는 뒤에 서고, 소환형은 졸개를 앞세운다 —
// 행동(entities/enemyAI.js)이 비로소 서로 맞물린다.
//
//   [{ t: 적 종류, n: 마릿수 }]  한 무리. 가중치 w 가 높을수록 자주 나온다
//   lead: true                 그 자리에 정예(대장)를 세운다

export const PACKS = {
    FOREST: [
        { w: 4, units: [{ t: 'SLIME', n: 2 }] },
        { w: 3, units: [{ t: 'GOBLIN', n: 3 }] },
        { w: 2, units: [{ t: 'GOBLIN', n: 2 }, { t: 'SLIME', n: 1 }] },
        { w: 2, units: [{ t: 'PREY', n: 2 }] },
        { w: 1, units: [{ t: 'GOBLIN', n: 1, lead: true }, { t: 'GOBLIN', n: 2 }] },
    ],
    LAKE: [
        { w: 3, units: [{ t: 'SLIME', n: 2 }] },
        { w: 2, units: [{ t: 'CRAB', n: 1 }] },
        { w: 2, units: [{ t: 'PREY', n: 2 }] },
    ],
    JUNGLE: [
        { w: 4, units: [{ t: 'RAT', n: 4 }] },
        { w: 3, units: [{ t: 'SPIDER', n: 2 }] },
        { w: 2, units: [{ t: 'CRAB', n: 1 }, { t: 'RAT', n: 2 }] },
        { w: 1, units: [{ t: 'SPIDER', n: 1, lead: true }, { t: 'RAT', n: 3 }] },
    ],
    HOLLOW: [
        { w: 4, units: [{ t: 'BAT', n: 4 }] },
        { w: 3, units: [{ t: 'GHOST', n: 2 }] },
        { w: 2, units: [{ t: 'SPIDER', n: 1 }, { t: 'BAT', n: 2 }] },
        { w: 1, units: [{ t: 'GHOST', n: 1, lead: true }, { t: 'BAT', n: 3 }] },
    ],
    AUTUMN: [
        { w: 4, units: [{ t: 'BANDIT', n: 3 }] },
        { w: 3, units: [{ t: 'WARDEN', n: 1 }, { t: 'GOBLIN', n: 2 }] },
        { w: 2, units: [{ t: 'RAT', n: 3 }] },
        { w: 1, units: [{ t: 'WARDEN', n: 1, lead: true }, { t: 'BANDIT', n: 2 }] },
    ],
    SNOW: [
        { w: 4, units: [{ t: 'FROST_SLIME', n: 2 }] },
        { w: 3, units: [{ t: 'SNOW_BAT', n: 4 }] },
        { w: 2, units: [{ t: 'ICE_MAGE', n: 1 }, { t: 'FROST_SLIME', n: 1 }] },
        { w: 1, units: [{ t: 'ICE_MAGE', n: 1, lead: true }, { t: 'SNOW_BAT', n: 2 }] },
    ],
    DESERT: [
        { w: 3, units: [{ t: 'SAND_CRAB', n: 1 }] },
        { w: 3, units: [{ t: 'BANDIT', n: 3 }] },
        { w: 3, units: [{ t: 'CULTIST', n: 1 }, { t: 'SPIDER', n: 2 }] },
        { w: 1, units: [{ t: 'CULTIST', n: 1, lead: true }, { t: 'BANDIT', n: 2 }] },
    ],
    VOLCANO: [
        { w: 4, units: [{ t: 'MAGMA_SLIME', n: 2 }] },
        { w: 3, units: [{ t: 'EMBER_SPIDER', n: 2 }] },
        { w: 2, units: [{ t: 'CULTIST', n: 2 }, { t: 'MAGMA_SLIME', n: 1 }] },
        { w: 1, units: [{ t: 'MAGMA_SLIME', n: 1, lead: true }, { t: 'EMBER_SPIDER', n: 2 }] },
    ],
};

/** 가중치로 무리 하나를 고른다 */
export function pickPack(biome, rng = Math.random) {
    const list = PACKS[biome];
    if (!list || !list.length) return null;
    const total = list.reduce((s, p) => s + p.w, 0);
    let r = rng() * total;
    for (const p of list) { r -= p.w; if (r <= 0) return p; }
    return list[list.length - 1];
}
