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
    GRUMPY: [
        "누가 또 떠들어...",
        "낮잠 시간이라고 했지...",
        "허리 아파 죽겠는데...",
        "조용히 좀 못 하나.",
    ],
};

// 대화 트리. options[].next 가 'end' | 'meat' | 'partner' 면 특수 처리, 그 외엔 같은 그룹의 노드 키.
export const NPC_SCRIPTS = {
    TUTORIAL: {
        intro: {
            text: "일어났느냐, 낯선 용이여. 하늘에서 떨어져 이곳 마을 중앙에 쓰러져 있더구나.",
            options: [{ t: "여기는 어디죠?", next: 'where', eff: 0 }],
        },
        where: {
            text: "이곳은 드래곤들의 마지막 안식처, '드래곤 빌리지'란다. 나는 촌장 엘더라고 하지.",
            options: [{ t: "머리가 아파요...", next: 'pain', eff: 0 }],
        },
        pain: {
            text: "큰 충격을 받았으니 그럴만도 하지. 우선 이 [고기]를 좀 먹고 기운을 차리게나.",
            options: [{ t: "감사합니다. (고기 받기)", next: 'meat', eff: 5 }],
        },
        meat: {
            text: "조작법을 알려주지. [WASD]로 움직이고, [Space]로 불꽃을 뿜을 수 있다. [E]키로 물건을 줍거나 먹을 수 있지.",
            options: [{ t: "알겠습니다!", next: 'warn', eff: 0 }],
        },
        warn: {
            text: "하지만 조심해라. 숲 밖에는 [인간 사냥꾼]들이 우리 알을 노리고 있다. 우리와 함께 마을을 지켜다오.",
            options: [{ t: "제가 지키겠습니다!", next: 'end', eff: 10 }],
        },
        end: {
            text: "든든하군. 마을을 자유롭게 둘러보거라. 둥지와 편의시설을 마련해 두었다.",
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
                { t: "좋아요. 파트너가 되죠.", next: 'partner', eff: 15 },
                { t: "아직 마음의 준비가…", next: 'end', eff: -3 },
            ],
        },
        end: { text: "흠… 일단은 여기까지.", options: [] },
    },
};
