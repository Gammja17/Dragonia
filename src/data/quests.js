// 퀘스트 정의. giver: 고정 NPC 이름(data/npcs.js). requires: 먼저 끝내야 하는 퀘스트 id.
// goal.type: 'kill'(target = 적 종류 | 'HUNTER') | 'stage'(index 이상으로 성장) | 'boss'(id) | 'collect'(고기 count개를 건넨다) | 'hatch'
export const QUESTS = [
    // ---- 메인: 촌장 엘더 ----
    {
        id: 'm1', giver: 'Elder', title: '첫 사냥',
        offer: "몸은 좀 풀렸느냐? 마을 밖 숲에 [슬라임]이 들끓는다. 세 마리만 처리해 다오. 네 불꽃이 쓸 만한지 보자꾸나.",
        done: "호오, 제법이구나. 해츨링치고는 매운 불꽃이야. 자, 이건 수고비다.",
        goal: { type: 'kill', target: 'SLIME', count: 3 }, reward: { xp: 80, meat: 2 },
    },
    {
        id: 'm2', giver: 'Elder', requires: 'm1', title: '자라나는 날개',
        offer: "용은 싸우고 먹으며 자란다. [어린 용]으로 자라서 다시 오너라. 그때가 되면 [Q] 브레스 노바를 쓸 수 있을 게다.",
        done: "날개가 제법 넓어졌구나! 이제 숲 깊은 곳도 다닐 만하겠어.",
        goal: { type: 'stage', index: 1 }, reward: { xp: 100, meat: 3 },
    },
    {
        id: 'm3', giver: 'Elder', requires: 'm2', title: '마을의 방패',
        offer: "인간 [사냥꾼]들이 주기적으로 마을 서쪽에서 쳐들어온다. 넷만 쓰러뜨려 다오. 둥지의 알을 노리는 놈들이다.",
        done: "마을이 네 덕에 한숨 돌렸구나. …이제 네게 진짜 이야기를 해 줄 때가 됐다.",
        goal: { type: 'kill', target: 'HUNTER', count: 4 }, reward: { xp: 200, meat: 2 },
    },
    {
        id: 'm4', giver: 'Elder', requires: 'm3', title: '달빛 골짜기의 뼈용',
        offer: "마을에서 [동쪽 길]을 따라가면 달빛 골짜기가 나온다. 그곳에 죽지 못한 용, [모르가스]가 잠들어 있지. 놈을 쓰러뜨리면 [냉기]의 숨결을 얻을 게다.",
        done: "모르가스가… 드디어 쉬게 되었구나. 냉기의 숨결이 네 안에서 느껴진다. [2]번 키로 바꿔 쓸 수 있다.",
        goal: { type: 'boss', id: 'MORGATH' }, reward: { xp: 300, meat: 3 },
    },
    {
        id: 'm5', giver: 'Elder', requires: 'm4', title: '환영의 밀림',
        offer: "[남쪽 길] 끝 환영의 밀림에는 쌍두룡 [잘고라]가 산다. 두 머리가 서로 다투느라 늘 화가 나 있지. 놈에게서 [번개]의 숨결을 빼앗아 오너라.",
        done: "번개까지 다루게 되다니. 세 숨결을 모두 가진 용은 수백 년 만이다.",
        goal: { type: 'boss', id: 'ZALGORA' }, reward: { xp: 400, meat: 3 },
    },
    {
        id: 'm6', giver: 'Elder', requires: 'm5', title: '하늘에서 떨어진 재앙',
        offer: "이제 말해 주마. 네가 하늘에서 떨어지던 날, 너를 떨어뜨린 것은 고룡 [이그나르]다. 놈은 [남동쪽 끝]에서 다음 먹잇감을 기다리고 있다. 끝을 내고 오너라.",
        done: "해냈구나…! 이제 이 땅의 하늘은 네 것이다. 드래고니아의 새 수호룡이여, 마을은 언제나 네 둥지다.",
        goal: { type: 'boss', id: 'IGNAR' }, reward: { xp: 1000, meat: 5 },
    },
    // ---- 사이드 ----
    {
        id: 's1', giver: 'Poco', title: '배고픈 포코',
        offer: "배고파아… [고기 3개]만 가져다주면 안 돼? 나 진짜 쓰러질 것 같아!",
        done: "우와아 고기다! 너 최고야! 우리 이제 절친이지?",
        goal: { type: 'collect', count: 3 }, reward: { xp: 60, relation: 20 },
    },
    {
        id: 's2', giver: 'Gron', title: '시끄러운 고블린',
        offer: "숲의 [고블린] 놈들 때문에 낮잠을 못 자겠어. 다섯 마리만 조용히 시켜. …부탁이다.",
        done: "…조용해졌군. 고맙다. 이건 내 간식이었는데, 너 먹어라.",
        goal: { type: 'kill', target: 'GOBLIN', count: 5 }, reward: { xp: 150, meat: 3, relation: 15 },
    },
    {
        id: 's3', giver: 'Tiamat', title: '전사의 증명',
        offer: "달빛 골짜기의 [흡혈박쥐] 여섯 마리. 그 정도는 잡아야 내 옆에서 날 자격이 있지. 어때, 할 수 있겠어?",
        done: "하! 정말 해냈네. 인정할게. 너, 꽤 멋진 용이야.",
        goal: { type: 'kill', target: 'BAT', count: 6 }, reward: { xp: 250, relation: 20 },
    },
    {
        id: 's4', giver: 'Poco', requires: 's1', title: '새 생명',
        offer: "있잖아, 둥지에서 [알이 부화]하는 거 본 적 있어? 나 아기 용 너무 보고 싶어! 한 마리만 태어나게 해 줘!",
        done: "꺄아 너무 귀여워!! 내가 이모… 아니 삼촌? 아무튼 내가 많이 놀아줄게!",
        goal: { type: 'hatch', count: 1 }, reward: { xp: 200, relation: 10 },
    },
];
