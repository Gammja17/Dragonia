// 스승 카이론의 수련과, 잠에서 깰 때 이어지는 이야기.
// 하루의 흐름: 낮에 수련·사냥·퀘스트 → 둥지에서 잠(T) → 다음 날 아침, 조건이 맞는 장면이 있으면 재생.

// 수련: 하루에 하나. drill 종류는 systems/story.js 참고. level: 이 레벨은 되어야 받아 준다
export const LESSONS = [
    { id: 'L1', level: 1,  title: '첫 수련: 꼬리 쓰는 법',   skill: 'TAIL_SWIPE',   drill: { type: 'TARGETS', count: 4, hp: 40, time: 45 },
      intro: "첫날이니까 어려운 건 안 시킨다. 저기 허수아비 넷 보이지. 시간 안에 다 부숴 봐라. 네가 어떻게 움직이나 좀 보자. 끝나면 꼬리 쓰는 법을 알려 주마." },
    { id: 'L2', level: 2,  title: '둘째 수련: 피하는 법',     skill: 'ROAR',         drill: { type: 'DODGE', time: 20, rate: 0.55 },
      intro: "안 맞는 게 제일 좋은 방어라는 말, 들어는 봤지. 말이야 쉽다. 내가 불씨를 던질 테니까 스무 숨만 버텨 봐라. 구르든 뛰든 네 맘대로 하고." },
    { id: 'L3', level: 4,  title: '셋째 수련: 불의 무게',     skill: 'METEOR',       drill: { type: 'TARGETS', count: 6, hp: 90, time: 50 },
      intro: "불을 흩뿌리지 마라. 한 군데에 내리꽂아라. 허수아비 여섯, 시간 안에 다 태운다." },
    { id: 'L4', level: 5,  title: '넷째 수련: 바람 읽기', skill: 'WING_GUST',    drill: { type: 'DODGE', time: 28, rate: 0.4 },
      intro: "이번엔 더 촘촘하다. 불씨 사이에도 길이 있다. 그걸 찾아라." },
    { id: 'L5', level: 7,  title: '다섯째 수련: 숨 고르기',   skill: 'HEAL',         drill: { type: 'TARGETS', count: 8, hp: 130, time: 60 },
      intro: "싸움은 길다. 숨 고를 줄 모르면 끝까지 못 선다. 여덟이다. 서둘러라." },
    { id: 'L6', level: 9,  title: '여섯째 수련: 용의 숨',     skill: 'FLAME_BREATH', drill: { type: 'DUEL', hp: 260 },
      intro: "오늘은 나랑 한다. 봐주지 않는다. 가진 걸 다 써라." },
    { id: 'L7', level: 11, title: '일곱째 수련: 강철 비늘',   skill: 'IRON_SCALE',   drill: { type: 'DODGE', time: 36, rate: 0.3 },
      intro: "못 피하는 공격도 있다. 그땐 버텨야지. 근데 오늘은 일단 피해라. 버티는 건 내일부터." },
    { id: 'L8', level: 13, title: '마지막 수련: 무리의 왕',   skill: 'RALLY',        drill: { type: 'DUEL', hp: 420 },
      intro: "마지막이다. 뒤에 뭐가 있는지 생각하고 와라. 그게 있는 놈과 없는 놈은 다르게 친다." },
];

// 승급 시험: 레벨이 차도 스승과 겨뤄 이겨야 다음 단계로 자란다. stage: 도달할 단계 번호
export const TRIALS = [
    // 몸이 자라는 건 레벨만으로 되지 않는다. 스승에게 배운 만큼, 마을에서 겪은 만큼 자란다.
    //   needs(s)  이게 참이어야 시험을 청할 수 있다
    //   why       아직 안 될 때 스승이 하는 말
    {
        stage: 1, hp: 160,
        needs: (s) => s.story.lessons.length >= 1,
        why: '아직 한 수도 안 배웠다. 수련부터 하고 와라.',
        intro: "날개가 근질거리느냐. 좋다. [어린 용] 소리를 들을 만한지 보자.",
    },
    {
        stage: 2, hp: 300,
        needs: (s) => s.story.lessons.length >= 3 && s.quests.done.includes('m3'),
        why: '몸만 크다고 어른이냐. 수련 셋은 마치고, 마을 일도 하나 네 손으로 끝내고 와라.',
        intro: "[성체] 시험이다. 오늘은 안 봐준다. 와라.",
    },
    {
        stage: 3, hp: 480,
        needs: (s) => s.story.lessons.length >= 6 && Object.keys(s.bossesDefeated).length >= 1,
        why: '고룡은 마을 안에서 안 나온다. 바깥의 큰 놈을 하나는 잡고 와라.',
        intro: "[고룡]이라. 나도 못 가 본 데다. 나를 넘어라.",
    },
    {
        stage: 4, hp: 700,
        needs: (s) => s.story.lessons.length >= 8 && Object.keys(s.bossesDefeated).length >= 3,
        why: '셋을 하나로 엮는 일이다. 큰 놈들을 더 잡고 와라.',
        intro: "불, 얼음, 번개를 한 몸에. 얘기로만 듣던 [삼원룡]이다. 내 전부로 막을 테니 넘어라.",
    },
];

// ---- 프롤로그 ----
// 새 게임을 시작하면 한 번. 광장에 떨어지던 그 밤을 직접 보여 준다.
// 엘더의 튜토리얼 대사가 이 장면을 말로만 설명하고 있었다
// ("떨어졌다. 하늘에서. … 포코가 별이 떨어졌다고 울면서 나를 깨우러 왔지.").
//
// 대사는 자리만 잡아 둔 임시다. 줄을 더하거나 빼도 연출은 그대로 돌아간다.
export const PROLOGUE = {
    // 떨어진 것을 포코가 발견한다
    poco: [
        { who: 'Poco', text: '…별?' },
        { who: 'Poco', text: '별이다! 별이 떨어졌어!' },
        { who: 'Poco', text: '(조심조심 다가간다) 우와… 우와아…' },
        { who: 'Poco', text: '…어? 이거, 별이 아닌데.' },
        { who: 'Poco', text: '숨 쉬어. 이거 숨 쉬고 있어!' },
        { who: 'Poco', text: '엘더! 엘더어어! 광장에! 광장에 별이 떨어졌는데 그게 숨을 쉬어!' },
    ],
    // 포코가 데려온 엘더가 알아본다
    elder: [
        { who: 'Elder', text: '포코야, 이 밤중에 무슨 소란이냐… 무릎도 시린데…' },
        { who: 'Elder', text: '……' },
        { who: 'Elder', text: '(엘더는 한참 말이 없었다.)' },
        { who: 'Elder', text: '별이 아니란다, 포코야. 용이다. …아직 어린 용이야.' },
        { who: 'Elder', text: '삼백 년 만이구나. 하늘에서 내려온 건.' },
        { who: 'Elder', text: '가서 그론을 깨우거라. 들것이 있어야겠다. …어서, 뛰어!' },
    ],
};

// 아침에 깰 때 재생되는 장면. when(state) 가 참이고 아직 안 본 첫 장면 하나가 나온다.
// who: NPC 이름(초상화가 나온다) | '나' | '???'
export const SCENES = [
    {
        id: 'ch1', title: '1장. 스승', when: s => s.day >= 2, place: 'VILLAGE',
        lines: [
            { who: '???', text: "(떨어지는 꿈을 꿨다. 누가 위에서 내려다보고 있었는데, 얼굴이 기억나지 않는다.)" },
            { who: 'Elder', text: "일어났느냐. 밤새 끙끙 앓더구나… 꿈자리가 사나웠던 게지." },
            { who: 'Elder', text: "나와 보거라. 소개해 줄 놈이 있단다." },
            { who: 'Elder', text: "이쪽은 [카이론]. 내 오랜 친구인데, 젊을 땐 이 근방에서 제일 셌고 지금은 제일 잔소리가 많지." },
            { who: 'Kairon', text: "이 꼬맹이가 그 애요? 하늘에서 떨어졌다는." },
            { who: 'Elder', text: "이놈이 글쎄, 스무 해를 제자 안 받겠다고 버티더니 네 얘길 듣고는 제 발로 내려왔단다." },
            { who: 'Kairon', text: "영감이 사흘을 찾아와서 졸랐잖소. 귀찮아서 온 거요." },
            { who: 'Elder', text: "사흘은 무슨. 하루 만에 왔으면서." },
            { who: 'Kairon', text: "…됐고. 너, 동쪽 숲길 따라가다 북쪽으로 꺾으면 내 수련장이다. 밥 먹고 그리로 와라." },
            { who: 'Kairon', text: "하루에 하나씩만 가르친다. 그 이상은 해 봐야 몸에 안 남아. 늦으면 그날은 없는 거다." },
        ],
    },
    {
        id: 'ch1b', title: '1장. 같이 구르는 사이', when: s => s.story.lessons.length >= 1,
        lines: [
            { who: '나', text: "(어깨가 안 올라간다. 내가 허수아비를 팬 건지 허수아비가 나를 팬 건지.)" },
            { who: 'Nara', text: "야, 아직도 자? 해가 중천인데! 난 벌써 호수까지 뛰고 왔거든?" },
            { who: 'Nara', text: "…는 뻥이고 나도 방금 일어났어. 아 어깨야. 허수아비 그거 몇 대 쳤다고 팔이 안 올라가냐." },
            { who: 'Nara', text: "근데 너 어제 네 개 다 깼다며. 첫날에? 아 짜증 나, 난 첫날에 두 개 깨고 뻗었는데." },
            { who: 'Nara', text: "됐고 빨리 나와. 늦으면 네 몫까지 내가 다 친다?" },
        ],
    },
    // (예전 ch2 "자라는 날개"는 퀘스트 m2 와 같은 말을 두 번 해서 뺐다)
    {
        // "어제 습격"으로 여는 장면이라, 정말 어제 막아 낸 날 아침에만 나온다
        id: 'ch3', title: '2장. 다음 날 아침', when: s => s.story.yesterday.raid && s.story.scenes.includes('ch1'), place: 'VILLAGE',
        lines: [
            { who: 'Poco', text: "(눈 밑이 퀭하다.) …나 한숨도 못 잤어. 모루 밑이 생각보다 좁아." },
            { who: 'Tiamat', text: "다친 용은 없어. 미라가 다 봤대. 너는? 어디 긁힌 데 없어?" },
            { who: 'Nara', text: "알을 왜 노려, 치사하게… 싸울 거면 우리랑 싸우든가." },
            { who: 'Kairon', text: "인간들이 왜 저러는지는 알아 둬라. 예순 해 전에—" },
            { who: 'Elder', text: "카이론. 그 얘기는 아직 이르다." },
            { who: 'Kairon', text: "…영감은 맨날 이르다지. 알았소." },
            { who: 'Elder', text: "아이야, 지금은 밥 잘 먹고 크는 것만 생각하려무나." },
        ],
    },
    {
        id: 'ch4', title: '3장. 꿈', when: s => s.bossesDefeated.MORGATH,
        lines: [
            { who: '???', text: "(꿈에 뼈만 남은 용이 나왔다. 아무 말 없이 고개를 한 번 끄덕이고 갔다.)" },
            { who: 'Kairon', text: "일어났냐. …어제는 고마웠다. 그 말 하려고 왔다." },
            { who: 'Kairon', text: "네가 받은 [빙결 파동]은 스승님 기술이다. 스킬 나무에서 끼워 봐라. 아끼지 말고 써. 그분은 아끼는 걸 제일 싫어하셨다." },
            { who: 'Nara', text: "(문밖에서) 스승님이 고맙다는 말을 했어? 진짜? 나 방금 들은 거 맞아?" },
            { who: 'Kairon', text: "…너는 왜 여기 있냐." },
        ],
    },
    {
        id: 'ch5', title: '4장. 고기 나온 아침', when: s => s.bossesDefeated.ZALGORA, place: 'VILLAGE',
        lines: [
            { who: 'Poco', text: "야! 야야! 오늘 아침에 고기 나왔어! 진짜 고기! 두 점이나!" },
            { who: 'Gron', text: "네 덕이다. …리크랑 로크, 걔네 어릴 때 내 대장간에서 못을 훔쳐다가 팽이를 만들었지. 그때 혼을 냈어야 했는데." },
            { who: 'Gron', text: "됐다. 옛날얘기다. 밥이나 먹어라." },
        ],
    },
    {
        id: 'ch6', title: '6장. 떠나기 전날 밤', when: s => s.bossesDefeated.GLACIA && s.bossesDefeated.BASIL,
        lines: [
            { who: 'Kairon', text: "(어젯밤 스승이 화톳불 앞에 오래 앉아 있었다.)" },
            { who: 'Kairon', text: "형과 나는 같은 둥지에서 났다. 늘 형이 앞서 날고 내가 뒤를 쫓았지." },
            { who: 'Kairon', text: "어느 날 형이 그러더군. 뒤에서 보는 하늘은 좁지 않으냐고. 그게 마지막으로 나눈 말이다." },
            { who: 'Kairon', text: "나는 삼백 년을 못 갔다. 너한테 떠넘기는 거다. 미안하다." },
            { who: 'Nara', text: "(수련장 밖에서 나라가 기다리고 있었다.) 갈 거지. 알아." },
            { who: 'Nara', text: "돌아와. 세어 놓은 게 있단 말이야. 네가 없으면 숫자가 안 맞아." },
        ],
    },
    {
        id: 'ending', title: '마지막 장. 새 수호룡', when: s => s.bossesDefeated.IGNAR,
        lines: [
            { who: '???', text: "(꿈을 꿨다. 이번엔 안 떨어졌다. 구름 위를 오래 날았다.)" },
            { who: 'Kairon', text: "고맙다. 형을 멈춰 줘서. 마지막엔 웃고 있었다지." },
            { who: 'Elder', text: "어디서 떨어졌든 너는 여기서 자랐단다. 오늘부터 네가 이 마을의 수호룡이다. 나는 이제 좀 쉬련다…" },
            { who: 'Nara', text: "숫자 다시 셀 거야. 오늘부터 0부터. 같이." },
            { who: 'Poco', text: "수호룡님! 그래도 나랑 술래잡기는 계속 해 줄 거지?!" },
            { who: '나', text: "(이그나르도 나처럼 하늘에서 떨어진 용이었다. 다른 게 있다면, 나한테는 돌아올 마을이 있었다는 것뿐이다.)" },
            { who: '나', text: "(이야기는 끝났다. 마을의 하루는 계속된다.)" },
        ],
    },
];
