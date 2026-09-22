// 장(章). 본 이야기의 한 줄기 (text/story-bible.md 7절).
//
// 세상은 이야기만큼만 열린다. 장마다 갈 수 있는 지도가 늘어나고,
// 아직 안 열린 길 앞에서는 발이 멈춘다 (systems/world.js 의 updatePortals).
//
//   done(s)   이게 참이면 이 장은 끝났다. 끝나지 않은 첫 장이 '지금 장'이다
//   maps      이 장에서 새로 열리는 지도 (앞 장의 것은 계속 열려 있다)
//   blocked   아직 못 가는 길 앞에서 뜨는 말
//   locked    이 장의 지도가 아직 닫혀 있을 때, 그 길 앞에서 뜨는 말 (없으면 지금 장의 blocked)
//
// 2장부터는 아직 옛 퀘스트(m3~m6)에 묶여 있다. 장을 새로 쓸 때마다 done 을 그 장의 끝으로 바꾼다.

const done = (id) => (s) => s.quests.done.includes(id);

export const CHAPTERS = [
    {
        id: 'c1', title: '1장', name: '웨스턴 마을', done: done('m2'),
        maps: ['VILLAGE', 'EAST_ROAD', 'DOJO'],
        blocked: "아직은 마을 근처를 벗어나지 말라고 했다. 몸부터 키우자.",
    },
    {
        id: 'c2', title: '2장', name: '나팔 소리', done: done('m3'),
        maps: ['LAKE', 'SOUTH_ROAD'],
        blocked: "그쪽은 아직 이르다. 마을 일이 먼저다.",
    },
    {
        id: 'c3', title: '3장', name: '골짜기의 옛 수호룡', done: s => !!s.bossesDefeated.MORGATH,
        maps: ['HOLLOW', 'HOLLOW_DEEP', 'MORGATH_LAIR'],
        blocked: "거기까지 갈 일은 아직 없다.",
    },
    {
        // 같은 3장의 뒷부분. 얼음이 녹아 폭포까지 길이 열린다
        id: 'c3b', title: '3장', name: '골짜기의 옛 수호룡', done: done('m4'),
        maps: ['FALLS'],
        locked: "폭포로 가는 길은 허옇게 얼어붙어 있다. 골짜기에서 밤마다 내려오는 냉기 때문이라고 한다.",
        blocked: "거기까지 갈 일은 아직 없다.",
    },
    {
        id: 'c4', title: '4장', name: '굶는 계절', done: done('m5g'),
        maps: ['JUNGLE', 'JUNGLE_DEEP', 'ZALGORA_LAIR', 'ROOTVALE', 'CLOUDTOP', 'SKY_RUINS'],
        blocked: "거기까지 갈 일은 아직 없다.",
    },
    {
        id: 'c5', title: '5장', name: '맡긴 알', done: done('m5a'),
        maps: ['SNOW_ROAD', 'SNOW_RIDGE', 'GLACIA_LAIR'],
        blocked: "거기까지 갈 일은 아직 없다.",
    },
    {
        id: 'c6', title: '6장', name: '전쟁', done: done('m6w'),
        maps: [],
        blocked: "지금 마을을 멀리 떠날 수는 없다.",
    },
    {
        id: 'c7', title: '7장', name: '사막 길', done: done('m5c'),
        maps: ['DESERT', 'DESERT_BONES', 'BASIL_LAIR', 'STONEBACK', 'ASH_CITY', 'AUTUMN'],
        blocked: "화산 쪽은 아직 아무도 보내 주지 않는다.",
    },
    {
        id: 'c8', title: '8장', name: '잿마루', done: s => s.quests.done.includes('m6') || s.quests.done.includes('m7d'),
        maps: ['VOLCANO', 'VOLCANO_PATH', 'IGNAR_LAIR'],
        blocked: '',
    },
];

/** 지금 장 (다 끝났으면 마지막 장) */
export function currentChapter(s) {
    return CHAPTERS.find(c => !c.done(s)) || CHAPTERS[CHAPTERS.length - 1];
}

/** 막힌 길 앞에서 띄울 말 */
export function blockedText(s, id) {
    const owner = CHAPTERS.find(c => c.maps.includes(id));
    return (owner && owner.locked) || currentChapter(s).blocked;
}

/** 이 지도에 지금 갈 수 있나. 굴과, 이미 가 본 곳(옛 세이브)은 늘 열려 있다 */
export function mapOpen(s, id) {
    if ((s.visited || []).includes(id)) return true;
    const at = CHAPTERS.indexOf(currentChapter(s));
    const owner = CHAPTERS.findIndex(c => c.maps.includes(id));
    return owner < 0 || owner <= at;
}
