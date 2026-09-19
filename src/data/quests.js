// 퀘스트 정의. giver: 고정 NPC 이름(data/npcs.js). requires: 먼저 끝내야 하는 퀘스트 id.
// goal.type: 'kill'(target = 적 종류 | 'HUNTER') | 'stage'(index 이상으로 성장) | 'boss'(id) | 'collect'(고기 count개를 건넨다)
//            | 'killAny'(아무 적) | 'elite'(정예 처치) | 'visit'(target 바이옴에 가 보기)
//            | 'hatch' | 'raid'(습격 격퇴) | 'spar'(대련 승리) | 'tag'(술래잡기 승리) | 'upgrade'(상점 강화) | 'chest'(상자 열기)
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
        offer: "용은 싸우고 먹고 자면서 자란다. 레벨 4가 되면 스승 카이론에게 [승급 시험]을 청해 [어린 용]으로 자라서 오너라.",
        done: "날개가 제법 넓어졌구나! 이제 숲 깊은 곳도 다닐 만하겠어.",
        goal: { type: 'stage', index: 1 }, reward: { xp: 100, meat: 3 },
    },
    {
        id: 'm3', giver: 'Elder', requires: 'm2', title: '마을의 방패',
        offer: "인간 [사냥꾼]들이 주기적으로 마을로 쳐들어온다. 어느 쪽에서 올지는 아무도 모르지. 넷만 쓰러뜨려 다오. 둥지의 알을 노리는 놈들이다.",
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
        id: 'm5a', giver: 'Elder', requires: 'm5', title: '얼어붙은 봉우리',
        offer: "이그나르에게 가려면 아직 이르다. 먼저 [북동쪽 끝] 서리 봉우리의 여왕 [글라시아]를 넘어서거라. 놈의 얼음 탄막을 피하지 못하면 이그나르 앞에선 숨도 못 쉰다.",
        done: "글라시아까지…! 네 비늘에 서리가 앉았구나. 그 눈물은 네 기술을 더 빨리 되돌려 줄 게다.",
        goal: { type: 'boss', id: 'GLACIA' }, reward: { xp: 700, meat: 4 },
    },
    {
        id: 'm5b', giver: 'Elder', requires: 'm5a', title: '죽은 사구의 폭군',
        offer: "[남서쪽 끝] 사막에는 모래 폭군 [바실]이 산다. 그론의 무릎을 앗아간 놈이지. 돌진을 조심하거라. 붉은 선이 보이면 [Shift]로 몸을 날려라.",
        done: "바실마저 쓰러뜨리다니. 이제 남은 것은 단 하나… 네 운명뿐이다.",
        goal: { type: 'boss', id: 'BASIL' }, reward: { xp: 900, meat: 4 },
    },
    {
        id: 'm6', giver: 'Elder', requires: 'm5b', title: '하늘에서 떨어진 재앙',
        offer: "이제 말해 주마. 네가 하늘에서 떨어지던 날, 너를 떨어뜨린 것은 고룡 [이그나르]다. 놈은 [남동쪽 끝] 잿빛 화산 지대에서 다음 먹잇감을 기다리고 있다. 끝을 내고 오너라.",
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
    {
        id: 's5', giver: 'Tiamat', requires: 's3', title: '번개보다 빠르게',
        offer: "말로만 강하다고 하는 용은 질색이야. 나와 [대련]해서 한 번이라도 이겨 봐. 말 걸어서 '대련을 신청한다'를 고르면 돼.",
        done: "…졌어. 깨끗하게. 너라면 내 등을 맡겨도 되겠다.",
        goal: { type: 'spar', count: 1 }, reward: { xp: 300, relation: 15 },
    },
    {
        id: 's6', giver: 'Poco', requires: 's4', title: '마을 최고의 술래',
        offer: "나 요즘 술래잡기에서 한 번도 안 잡혔다? 네가 [두 번] 잡으면 내 보물 줄게! 진짜야!",
        done: "헉… 헉… 너 진짜 빠르다! 자, 약속한 보물! 반짝반짝하지?",
        goal: { type: 'tag', count: 2 }, reward: { xp: 200, meat: 2, relation: 15 },
    },
    {
        id: 's7', giver: 'Gron', requires: 's2', title: '단골의 자격',
        offer: "구경만 하는 놈은 손님이 아니다. 내 가게에서 [강화를 두 번] 해라. 그럼 단골로 쳐주지.",
        done: "흥. 이제 좀 용다워졌군. 이건 단골 선물이다. 어디 가서 말하지 마라.",
        goal: { type: 'upgrade', count: 2 }, reward: { xp: 200, meat: 3, relation: 20 },
    },
    {
        id: 's8', giver: 'Gron', requires: 's7', title: '숲의 보물',
        offer: "숲 곳곳에 옛 용들이 숨겨 둔 [보물상자]가 있다. 다섯 개만 찾아 열어 봐라. 내용물은 네 거다.",
        done: "다 찾았냐? 보는 눈이 있군. 상자는 아직 많이 남았을 거다.",
        goal: { type: 'chest', count: 5 }, reward: { xp: 350, relation: 10 },
    },
    {
        id: 's9', giver: 'Tiamat', requires: 's5', title: '끝나지 않는 습격',
        offer: "사냥꾼 놈들, 갈수록 많이 몰려와. 마을 용들이랑 같이 [습격을 세 번] 막아내자. 대장이 나오면… 그건 네 몫이야.",
        done: "세 번이나 막아냈네. 이제 마을 용들도 널 믿고 따를 거야. 나도 그렇고.",
        goal: { type: 'raid', count: 3 }, reward: { xp: 500, meat: 4, relation: 15 },
    },
    // ---- 스승 카이론 ----
    {
        id: 'k1', giver: 'Kairon', title: '기초 체력',
        offer: "수련장에서 허수아비만 패서는 실전 감각이 안 생긴다. 숲에서 [아무 적이나 열둘] 쓰러뜨리고 오너라.",
        done: "땀 냄새가 나는군. 좋다. 그게 실전의 냄새다.",
        goal: { type: 'killAny', count: 12 }, reward: { xp: 180, gold: 40 },
    },
    {
        id: 'k2', giver: 'Kairon', requires: 'k1', title: '금빛 사냥감',
        offer: "금빛으로 빛나는 [정예] 몬스터를 본 적 있느냐? 놈들은 무리의 우두머리다. 하나만 잡아 와라. 겁나면 도망쳐도 된다. 허허.",
        done: "정예를 잡았다고? …제법이군. 놈들이 가끔 [유물]을 떨어뜨리니 눈여겨보거라.",
        goal: { type: 'elite', count: 1 }, reward: { xp: 320, gold: 80 },
    },
    {
        id: 'k3', giver: 'Kairon', requires: 'k2', title: '스승의 밥상',
        offer: "…요즘 통 입맛이 없구나. 늙으면 그래. [고기 다섯 덩이]만 구해다 주겠느냐. 제자 덕 좀 보자.",
        done: "오오, 이 냄새! …크흠. 맛이 없진 않군. 너도 한 점 하거라.",
        goal: { type: 'collect', count: 5 }, reward: { xp: 250, relation: 25 },
    },
    {
        id: 'k4', giver: 'Kairon', requires: 'k3', title: '형의 발자취',
        offer: "남동쪽 끝 [잿빛 화산 지대]에 발을 들여 보고 오너라. 싸울 필요는 없다. 그 땅의 열기를 네 비늘로 느껴 보기만 하면 된다.",
        done: "다녀왔느냐. 그 열기가… 내 형 이그나르의 숨결이다. 언젠가 네가 맞서야 할 불이지.",
        goal: { type: 'visit', target: 'VOLCANO' }, reward: { xp: 500, gold: 100 },
    },
];
