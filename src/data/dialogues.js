// NPC가 혼잣말로 내뱉는 대사 (성격별)
export const IDLE_LINES = {
    WISE: [
        "바람이 심상치 않군...",
        "고대 드래곤의 숨결이 느껴지는군.",
        "이 숲의 역사는 생각보다 깊지.",
        "하늘을 자주 보거라. 징조가 떠 있지.",
    ],
    BRAVE: [
        "오늘도 싸울 준비는 끝났다!",
        "훈련 안 한 용에게 내일은 없다!",
        "마을은 내가 지킨다.",
        "불 냄새가 좋군.",
    ],
    PLAYFUL: [
        "나랑 술래잡기 할 사람~?",
        "구름 저거 먹으면 무슨 맛일까?",
        "심심해 심심해~",
        "날개 간지러워!",
    ],
    RIVAL: [
        "한 번만 더. 딱 한 번만 더 해 보고.",
        "쟤는 벌써 저기까지 갔단 말이지…",
        "재능 같은 소리 하네. 시간을 더 쓰면 돼.",
        "스승님은 왜 나한테만 엄하실까.",
    ],
    GRUMPY: [
        "누가 또 떠들어...",
        "낮잠 시간이라고 했지...",
        "허리 아파 죽겠는데...",
        "조용히 좀 못 하나.",
    ],
};

// 대화 트리. options[].next 가 'end' | 'meat' | 'partner' 면 특수 처리, 그 외엔 같은 그룹의 노드 키.
export const NPC_SCRIPTS = {
    // 눈을 뜨고 처음 나누는 말. 조작법은 여기서 알려 주지 않는다 —
    // 대사에 키 이름이 섞이면 이야기가 설명서가 된다. 키는 [H] 조작법 판과
    // 화면 오른쪽 길잡이가 맡는다 (systems/tutorial.js).
    TUTORIAL: {
        intro: {
            text: "눈을 떴구나.\n\n사흘이다. 사흘을 자고 있었어.",
            options: [{ t: "…여기는 어디죠.", next: 'where', eff: 0 }],
        },
        where: {
            text: "드래곤 빌리지. 인간에게 쫓기던 용들이 삼백 년 전에 숨어든 골짜기다. 나는 이곳의 촌장, 엘더라 한다.",
            options: [{ t: "제가 어떻게 여기에…", next: 'fell', eff: 0 }],
        },
        fell: {
            text: "하늘에서 떨어졌다. 광장 한복판으로, 불덩이처럼.\n\n포코가 울면서 나를 깨우러 왔지. 별이 떨어졌다고.",
            options: [{ t: "…죄송합니다.", next: 'species', eff: 0 }],
        },
        species: {
            text: "사과할 일이 아니다. 다만 한 가지 이상한 것이 있다.\n\n나는 삼백 년을 살았고, 이 골짜기를 거쳐 간 용을 다 안다. 그런데 네 비늘은 처음 본다.",
            options: [{ t: "제 종족을 모르신다는 건가요?", next: 'unknown', eff: 0 }],
        },
        unknown: {
            text: "모른다. 아무도 모르더구나.\n\n…그래서 더 두고 볼 수가 없었다. 어디서 왔는지 모르는 아이를 그냥 내보내는 법은 없지.",
            options: [{ t: "저를 거두어 주신 건가요.", next: 'gron', eff: 5 }],
        },
        gron: {
            text: "거둔 게 아니라 데리고 있는 것뿐이다. …그론, 고기 가져왔느냐.\n\n(대장장이가 투덜대며 구운 고기를 내려놓고 돌아섰다.)",
            options: [{ t: "감사합니다.", next: 'hunger', eff: 5 }],
        },
        hunger: {
            text: "먹어라. 용은 배를 곯으면 날개가 먼저 무거워진다. 죽지는 않지만, 싸울 때는 그 반 뼘이 목숨이지.",
            options: [{ t: "명심하겠습니다.", next: 'master', eff: 0 }],
        },
        master: {
            text: "몸이 낫거든 동쪽 숲길을 따라가 보거라. 수련장이 있다.\n\n카이론이라는 늙은 전사가 있지. 스무 해 동안 제자를 받지 않은 고집쟁이다만, 네 이야기를 듣더니 마당을 쓸더구나.",
            options: [{ t: "…기다리고 계신다는 뜻인가요?", next: 'warn', eff: 5 }],
        },
        warn: {
            text: "본인은 아니라 하겠지.\n\n한 가지만 더. 숲 밖에는 인간 사냥꾼이 돈다. 우리 알을 노리는 자들이다. 마을 밖으로 나설 때는 혼자라는 것을 잊지 마라.",
            options: [{ t: "마을은 제가 지키겠습니다.", next: 'end', eff: 10 }],
        },
        end: {
            text: "…그 말을 그리 쉽게 하는 아이는 오랜만이구나.\n\n가 보거라. 여기서는 누구도 너를 떨어진 아이라 부르지 않는다.",
            options: [],
        },
    },
    WISE: {
        intro: {
            text: "흐음... 자네의 날개에서 범상치 않은 기운이 느껴지는군. 무슨 일로 왔는가?",
            options: [
                { t: "지혜를 구하러 왔습니다.", next: 'wisdom', eff: 5 },
                { t: "그냥 지나가던 길입니다.", next: 'end', eff: 0 },
            ],
        },
        wisdom: {
            text: "배우려는 자세가 좋군. 이 숲은 위험하지만, 그만큼 보물도 많다네. 특히 인간들을 조심하게.",
            options: [
                { t: "명심하겠습니다.", next: 'end', eff: 8 },
                { t: "제가 다 이길 수 있습니다.", next: 'arrogant', eff: -5 },
            ],
        },
        arrogant: {
            text: "자만은 금물이야! 아직 어린 용이군.",
            options: [{ t: "(머쓱하게 물러난다)", next: 'end', eff: 0 }],
        },
        end: { text: "조심해서 가시게.", options: [] },
    },
    BRAVE: {
        intro: {
            text: "거기 너! 눈빛이 마음에 드는군. 힘 자랑이나 해볼까?",
            options: [
                { t: "좋습니다! (전투 연습)", next: 'fight', eff: 10 },
                { t: "아니요, 사양합니다.", next: 'coward', eff: -5 },
            ],
        },
        fight: {
            text: "하하하! 좋아! 나중에 훈련장에서 보자고. 기대하겠다!",
            options: [{ t: "저도 기대할게요.", next: 'end', eff: 5 }],
        },
        coward: {
            text: "뭐야, 겁이 난 건가? 아직은 초보인가 보군.",
            options: [{ t: "…강해져서 돌아올게요.", next: 'end', eff: 2 }],
        },
        end: { text: "언제든 싸울 준비를 해둬라!", options: [] },
    },
    PLAYFUL: {
        intro: {
            text: "우와! 새 얼굴이다! 나랑 놀래, 아니면 얘기할래?",
            options: [
                { t: "놀자!", next: 'play', eff: 12 },
                { t: "얘기나 하죠.", next: 'chat', eff: 5 },
                { t: "지금은 바빠요.", next: 'busy', eff: -3 },
            ],
        },
        play: {
            text: "신난다! 내가 술래! 도망쳐~ 꺄르르!",
            options: [{ t: "같이 뛰어논다.", next: 'end', eff: 5 }],
        },
        chat: {
            text: "어제 구름 모양 봤어? 딱 용 꼬리 같았는데!",
            options: [{ t: "그거 멋지다.", next: 'end', eff: 5 }],
        },
        busy: {
            text: "힝… 다들 바쁘대. 나중에는 꼭 같이 놀자?",
            options: [{ t: "미안, 다음엔 꼭.", next: 'end', eff: 2 }],
        },
        end: { text: "또 봐!", options: [] },
    },
    GRUMPY: {
        intro: {
            text: "하… 또 누구야. 무슨 일이지?",
            options: [
                { t: "인사하러 왔습니다.", next: 'polite', eff: 4 },
                { t: "좀 비켜주세요.", next: 'angry', eff: -8 },
            ],
        },
        polite: {
            text: "인사 같은 건 필요 없는데… 뭐, 정성은 봐주지.",
            options: [{ t: "방해해서 죄송해요.", next: 'end', eff: 0 }],
        },
        angry: {
            text: "뭐라고? 감히 나한테 명령을 해?",
            options: [{ t: "죄송합니다!", next: 'end', eff: 0 }],
        },
        end: { text: "용건 없으면 얼른 가.", options: [] },
    },
    FLIRT: {
        low: {
            text: "어… 우리 아직 그렇게 친한 사이는 아니지 않아?",
            options: [{ t: "미안, 너무 급했네요.", next: 'end', eff: 0 }],
        },
        mid: {
            text: "흐음… 너, 생각보다 꽤 매력적이야. 좀 더 같이 있어볼까?",
            options: [{ t: "천천히 알아가요.", next: 'end', eff: 6 }],
        },
        high: {
            text: "사실… 나도 너를 기다리고 있었어. 우리 둥지를 같이 지켜볼래?",
            options: [
                { t: "…나도 같은 마음이야.", next: 'partner', eff: 10 },
                { t: "아직 마음의 준비가…", next: 'end', eff: -3 },
            ],
        },
        end: { text: "흠… 일단은 여기까지.", options: [] },
    },
};
