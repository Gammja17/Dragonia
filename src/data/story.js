// 스승 카이론의 수련과, 잠에서 깰 때 이어지는 이야기.
// 하루의 흐름: 낮에 수련·사냥·퀘스트 → 둥지에서 잠(T) → 다음 날 아침, 조건이 맞는 장면이 있으면 재생.

// 수련: 하루에 하나. drill 종류는 systems/story.js 참고. level: 이 레벨은 되어야 받아 준다
export const LESSONS = [
    { id: 'L1', level: 1,  title: '첫 수련 — 꼬리 쓰는 법',   skill: 'TAIL_SWIPE',   drill: { type: 'TARGETS', count: 4, hp: 40, time: 45 },
      intro: "숨결만 믿는 용은 오래 못 산다. 몸을 써라. 저 허수아비 넷을 부숴 보거라." },
    { id: 'L2', level: 2,  title: '둘째 수련 — 피하는 법',     skill: 'ROAR',         drill: { type: 'DODGE', time: 20, rate: 0.55 },
      intro: "맞지 않는 것이 제일가는 방어다. [Shift]로 몸을 날려 내 불씨를 스무 숨 동안 피해 보거라." },
    { id: 'L3', level: 4,  title: '셋째 수련 — 불의 무게',     skill: 'METEOR',       drill: { type: 'TARGETS', count: 6, hp: 90, time: 50 },
      intro: "불은 가볍게 흩뿌리는 게 아니다. 무겁게 내리꽂는 것이지. 허수아비 여섯, 시간 안에 모두 태워라." },
    { id: 'L4', level: 5,  title: '넷째 수련 — 바람을 읽어라', skill: 'WING_GUST',    drill: { type: 'DODGE', time: 28, rate: 0.4 },
      intro: "이번엔 더 촘촘하다. 바람의 결을 읽으면 탄막 사이에도 길이 보인다." },
    { id: 'L5', level: 7,  title: '다섯째 수련 — 숨 고르기',   skill: 'HEAL',         drill: { type: 'TARGETS', count: 8, hp: 130, time: 60 },
      intro: "싸움은 길다. 숨을 고르는 법을 모르면 끝까지 서 있을 수 없다. 여덟이다. 서둘러라." },
    { id: 'L6', level: 9,  title: '여섯째 수련 — 용의 숨',     skill: 'FLAME_BREATH', drill: { type: 'DUEL', hp: 260 },
      intro: "이제 나와 직접 겨룬다. 봐주지 않는다. 네 숨결을 전부 보여 다오." },
    { id: 'L7', level: 11, title: '일곱째 수련 — 강철 비늘',   skill: 'IRON_SCALE',   drill: { type: 'DODGE', time: 36, rate: 0.3 },
      intro: "피할 수 없는 공격도 있다. 그때는 버텨야 한다. 하지만 오늘은… 일단 피해 보거라. 허허." },
    { id: 'L8', level: 13, title: '마지막 수련 — 무리의 왕',   skill: 'RALLY',        drill: { type: 'DUEL', hp: 420 },
      intro: "마지막이다. 네 뒤에는 가족과 마을이 있다. 그 무게를 담아 내게 오너라." },
];

// 승급 시험: 레벨이 차도 스승과 겨뤄 이겨야 다음 단계로 자란다. stage: 도달할 단계 번호
export const TRIALS = [
    { stage: 1, hp: 160, intro: "날개가 근질근질하구나? 좋다. [어린 용]이 될 자격이 있는지 보자." },
    { stage: 2, hp: 300, intro: "[성체]의 문턱이다. 어른의 싸움은 봐주는 법이 없다. 오너라." },
    { stage: 3, hp: 480, intro: "[고룡]… 나도 밟아 보지 못한 경지다. 나를 넘어서라, 제자야." },
    { stage: 4, hp: 700, intro: "불과 얼음과 번개를 한 몸에… 전설로만 듣던 [삼원룡]의 문이다. 내 전부를 걸고 막아 보마. 넘어서라!" },
];

// 아침에 깰 때 재생되는 장면. when(state) 가 참이고 아직 안 본 첫 장면 하나가 나온다.
// who: NPC 이름(초상화가 나온다) | '나' | '???'
export const SCENES = [
    {
        id: 'ch1', title: '제1장 — 스승', when: s => s.day >= 2,
        lines: [
            { who: '???', text: "(꿈을 꾸었다. 끝없이 떨어지는 꿈. 등 뒤에서 불타는 날개가 웃고 있었다.)" },
            { who: 'Elder', text: "일어났느냐. 밤새 끙끙 앓더구나. 떨어지던 날의 꿈이겠지." },
            { who: 'Elder', text: "마을이 돌아가며 네 곁을 지켰단다. 그론이 고기를 굽고, 포코가 밤새 옆에서 떠들었지." },
            { who: 'Elder', text: "우리 중 누구도 네 종족을 본 적이 없다. 그래도 떨어진 아이를 그냥 두는 법은 없지." },
            { who: 'Elder', text: "이제 스스로 설 때가 됐다. 너를 가르칠 용을 불렀다. 젊은 날 이 숲 최고의 전사였던 [카이론]이다." },
            { who: 'Kairon', text: "…이 꼬맹이가 하늘에서 떨어졌다는 그 녀석인가. 눈빛은 쓸 만하군." },
            { who: 'Kairon', text: "마을에서 동쪽 길을 따라 숲을 지나면 내 수련장이 있다. 거기로 와라." },
            { who: 'Kairon', text: "하루에 하나씩 가르쳐 주마. 수련이 끝나면 푹 자라. 용은 자면서 큰다." },
        ],
    },
    {
        id: 'ch1b', title: '제1장 — 같이 구르는 사이', when: s => s.story.lessons.length >= 1,
        lines: [
            { who: '나', text: "(어깨가 뻐근하다. 어제 허수아비를 그렇게 쳤으니 당연하다.)" },
            { who: 'Nara', text: "일어났어? 나 벌써 한 바퀴 돌고 왔는데." },
            { who: 'Nara', text: "…거짓말이야. 나도 방금 일어났어. 어깨 아파 죽겠어." },
            { who: 'Nara', text: "스승님이 그러셨어. 아픈 건 몸이 자란다는 뜻이래. 그러니까 우리 둘 다 자라는 중인 거지." },
            { who: '나', text: "(하늘에서 떨어진 날에는, 이런 아침이 올 줄 몰랐다.)" },
        ],
    },
    {
        id: 'ch2', title: '제2장 — 자라나는 날개', when: s => s.story.lessons.length >= 2,
        lines: [
            { who: 'Kairon', text: "제법 따라오는군. 하지만 몸이 작아서야 숨결에 힘이 안 실린다." },
            { who: 'Kairon', text: "레벨이 차면 내게 [승급 시험]을 청해라. 나를 이기면 네 몸이 한 뼘 자랄 게다." },
            { who: 'Nara', text: "나는 지난달에 한 번 졌어. 다음엔 꼭 이길 거야. 너보다 먼저." },
            { who: '나', text: "(스승님을 이겨야 자란다니… 밥을 많이 먹어 둬야겠다.)" },
        ],
    },
    {
        id: 'ch3', title: '제3장 — 사냥꾼의 그림자', when: s => s.raid.count >= 1 && s.story.lessons.length >= 2,
        lines: [
            { who: 'Tiamat', text: "어제 습격, 봤지? 놈들은 알을 노려. 우리 씨를 말리려는 거야." },
            { who: 'Nara', text: "…우리 부모님도 저러다 돌아가셨어." },
            { who: 'Kairon', text: "인간이 이 숲을 찾아낸 건 [이그나르] 때문이다. 놈이 인간의 도시를 불태웠고, 그 원한이 우리 모두에게 돌아왔지." },
            { who: 'Elder', text: "그 이야기는 아직 이르다, 카이론. …아이야, 지금은 강해지는 데만 마음을 쓰거라." },
        ],
    },
    {
        id: 'ch4', title: '제4장 — 죽지 못한 용', when: s => s.bossesDefeated.MORGATH,
        lines: [
            { who: '???', text: "(꿈속에서 뼈만 남은 용이 고개를 숙였다. '고맙다… 이제 쉴 수 있겠구나.')" },
            { who: 'Kairon', text: "모르가스를 보내 줬다고 들었다. …내 스승이셨다. 이그나르에게 당하고도 마을을 떠나지 못하셨지." },
            { who: 'Kairon', text: "네가 얻은 [빙결 파동], 스승님의 기술이다. [B]를 눌러 스킬 수첩에서 장착해 보거라." },
        ],
    },
    {
        id: 'ch5', title: '제5장 — 두 개의 머리', when: s => s.bossesDefeated.ZALGORA,
        lines: [
            { who: 'Poco', text: "쌍두룡을 이겼다며?! 마을이 온통 네 얘기야!" },
            { who: 'Gron', text: "흥. 잘고라는 원래 형제였다. 이그나르의 저주로 한 몸이 되어 미쳐 버렸지. …네가 끝내 준 거다." },
            { who: '나', text: "(이그나르. 어디를 가도 그 이름이 나온다.)" },
        ],
    },
    {
        id: 'ch6', title: '제6장 — 떠나기 전날 밤', when: s => s.bossesDefeated.GLACIA && s.bossesDefeated.BASIL,
        lines: [
            { who: 'Kairon', text: "(어젯밤, 스승이 화톳불 앞에 오래 앉아 있었다.)" },
            { who: 'Kairon', text: "형과 나는 같은 둥지에서 났다. 늘 형이 앞서 날고 내가 뒤를 쫓았지." },
            { who: 'Kairon', text: "어느 날 형이 말하더군. '뒤에서 보는 하늘은 좁지 않으냐'고. 그게 마지막 대화였다." },
            { who: 'Kairon', text: "나는 삼백 년을 못 했다. …너에게 떠넘기는 거다. 미안하구나." },
            { who: 'Nara', text: "(수련장 밖에서 나라가 기다리고 있었다.) 갈 거지. 알아." },
            { who: 'Nara', text: "돌아와. 세어 놓은 게 있단 말이야. 네가 없으면 숫자가 안 맞잖아." },
        ],
    },
    {
        id: 'ending', title: '종장 — 새 수호룡', when: s => s.bossesDefeated.IGNAR,
        lines: [
            { who: '???', text: "(꿈을 꾸었다. 이번엔 떨어지지 않았다. 구름 위를, 끝없이 날았다.)" },
            { who: 'Kairon', text: "…고맙다. 형을 멈춰 줘서. 마지막엔 웃고 있었다지." },
            { who: 'Elder', text: "오늘부터 네가 이 마을의 수호룡이다. 하늘에서 떨어진 아이가, 하늘을 되찾았구나." },
            { who: 'Nara', text: "숫자 다시 셀 거야. 오늘부터 0부터. 같이." },
            { who: 'Poco', text: "수호룡님! 그래도 나랑 술래잡기는 계속 해 줄 거지?!" },
            { who: '나', text: "(이야기는 끝났지만, 마을의 하루는 계속된다. — 드래고니아 · 끝 —)" },
        ],
    },
];
