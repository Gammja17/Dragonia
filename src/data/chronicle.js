// 사건. 위에서부터 훑어서, 아직 안 본 것 중 조건이 맞는 첫 번째가 그 자리에서 재생된다.
//   when(ctx)  ctx = { s(state), biome, region, night, day, done(id), active(id), lessons, boss(id), relationOf(name) }
//   grant      장면이 끝나면 저절로 맡게 되는 퀘스트 id (data/quests.js 에서 auto: true 인 것들)
//
// 보스는 더 이상 "가서 잡아라"로 시작하지 않는다. 밀림에 발을 들이면 무언가를 보고,
// 마을에 때아닌 눈이 내리면 원인을 찾아 나서는 식이다.
export const CHRONICLE = [
    // ---------- 1장: 마을에서 자라는 시기 ----------
    {
        id: 'ev_nara', title: '수련장 — 또래',
        when: c => c.s.elderTutorialDone && c.biome !== 'VILLAGE' && Math.hypot(c.s.player.x - 2448, c.s.player.y - 1104) < 620,
        lines: [
            { who: 'Nara', text: "거기 서. …네가 그 애구나. 하늘에서 떨어졌다는." },
            { who: 'Nara', text: "난 나라. 여기서 삼 년째 굴렀어. 오늘부터 같이 수련한다니까 미리 말해 두는데," },
            { who: 'Nara', text: "봐주지 마. 나도 안 봐줄 거니까. …그리고, 어… 잘 부탁해." },
            { who: '나', text: "(또래가 있다는 게 이렇게 마음이 놓이는 일인 줄 몰랐다.)" },
        ],
        toast: '나라와 함께 수련하게 되었습니다.', icon: '🤝',
    },
    {
        id: 'ev_first_night', title: '첫 밤',
        when: c => c.night && c.day >= 2 && c.lessons >= 1 && c.region === 'HOMELAND',
        lines: [
            { who: '나', text: "(마을의 밤은 조용하다. 떨어지던 날의 소리가 아직 귀에 남아 있다.)" },
            { who: 'Elder', text: "잠이 안 오느냐. …나도 그렇단다. 삼백 년째." },
            { who: 'Elder', text: "이 마을은 쫓겨 온 용들이 마지막으로 숨어든 곳이다. 우리는 모두 어딘가에서 떨어져 온 셈이지." },
            { who: 'Elder', text: "그러니 네가 어디서 왔든 상관없다. 여기 있는 동안은 여기 아이다." },
        ],
    },

    // ---------- 보스는 사건으로 열린다 ----------
    {
        id: 'ev_morgath', title: '사건 — 골짜기의 울음', grant: 'm4',
        when: c => c.done('m3') && !c.done('m4') && !c.active('m4') && c.biome === 'HOLLOW',
        lines: [
            { who: '???', text: "(골짜기 안쪽에서 긴 울음이 울렸다. 짐승의 소리가 아니었다. 뼈가 서로 갈리는 소리에 가까웠다.)" },
            { who: 'Kairon', text: "…따라왔다. 혼자 이 안쪽까지 들어오다니, 간이 크구나." },
            { who: 'Kairon', text: "저 소리의 주인을 안다. 모르가스. 죽어서도 이 골짜기를 떠나지 못한 늙은 수호룡이다." },
            { who: 'Kairon', text: "내 스승이셨다. …보내 드려라. 그게 우리가 해 줄 수 있는 전부다." },
        ],
        toast: '새 퀘스트: 달빛 골짜기의 뼈용', icon: '📜',
    },
    {
        id: 'ev_zalgora', title: '사건 — 밀림에서 본 것', grant: 'm5',
        when: c => c.done('m4') && !c.done('m5') && !c.active('m5') && c.biome === 'JUNGLE',
        lines: [
            { who: '나', text: "(나뭇잎 사이로 거대한 그림자가 지나갔다. 목이 둘이었다.)" },
            { who: '???', text: "「내가 왕이다」 「닥쳐, 네가 무슨 왕이야」 「내가—」" },
            { who: '나', text: "(한 몸에서 두 목소리가 서로 악을 썼다. 저건… 싸우고 있는 게 아니다. 서로를 견디고 있는 거다.)" },
            { who: 'Tiamat', text: "잘고라야. 원래 형제였대. 이그나르의 저주로 한 몸이 됐다더라." },
            { who: 'Tiamat', text: "…끝내 주는 게 나아. 저건 사는 게 아니야." },
        ],
        toast: '새 퀘스트: 환영의 밀림', icon: '📜',
    },
    {
        id: 'ev_glacia', title: '사건 — 여름에 내린 눈', grant: 'm5a',
        when: c => c.done('m5') && !c.done('m5a') && !c.active('m5a') && c.biome === 'VILLAGE',
        lines: [
            { who: '나', text: "(마을 광장에 눈이 내리고 있었다. 한여름에.)" },
            { who: 'Poco', text: "우와아 눈이다! …근데 왜 춥지? 왜 이렇게 추워?" },
            { who: 'Elder', text: "포코야, 안으로 들어가거라. …이건 날씨가 아니다." },
            { who: 'Elder', text: "북동쪽 봉우리에 서리 여왕 글라시아가 산다. 이그나르를 피해 숨은 용이지." },
            { who: 'Elder', text: "숨다 못해 산을 통째로 얼렸더니, 그 한기가 여기까지 내려온 게다. 마을이 얼기 전에 가 봐야겠구나." },
        ],
        toast: '새 퀘스트: 얼어붙은 봉우리', icon: '📜',
    },
    {
        id: 'ev_basil', title: '사건 — 모래 속의 발자국', grant: 'm5b',
        when: c => c.done('m5a') && !c.done('m5b') && !c.active('m5b') && c.biome === 'DESERT',
        lines: [
            { who: '나', text: "(모래 위에 깊게 패인 자국이 이어져 있었다. 용의 발자국이 아니다. 무언가 땅속을 헤엄친 자국이다.)" },
            { who: 'Gron', text: "…거기 서라. 그 이상 들어가면 안 된다." },
            { who: 'Gron', text: "내가 여기서 무릎을 잃었다. 같이 온 놈 넷 중에 나만 기어서 돌아갔지." },
            { who: 'Gron', text: "바실이다. 땅속으로 다니다 붉은 선을 긋고 튀어나온다. 그 선이 보이면 무조건 옆으로 굴러라." },
            { who: 'Gron', text: "…말린다고 안 갈 놈은 아니겠지. 그럼 이것만 기억해라. 살아서 돌아와." },
        ],
        toast: '새 퀘스트: 죽은 사구의 폭군', icon: '📜',
    },
    {
        id: 'ev_ignar', title: '사건 — 하늘이 붉던 날', grant: 'm6',
        when: c => c.done('m5b') && !c.done('m6') && !c.active('m6'),
        lines: [
            { who: '???', text: "(하늘이 붉게 탔다. 아주 높은 곳에서, 거대한 무언가가 마을 위를 한 바퀴 돌고 지나갔다.)" },
            { who: 'Kairon', text: "…형이다." },
            { who: 'Kairon', text: "네가 하늘에서 떨어지던 날, 너를 떨어뜨린 것도 저놈이다. 네가 자기를 넘어설 걸 알았던 게지." },
            { who: 'Kairon', text: "인간을 이 숲으로 끌어들인 것도, 모르가스를 저리 만든 것도, 잘고라를 가른 것도 전부 형이다." },
            { who: 'Elder', text: "카이론. 네가 갈 셈이냐." },
            { who: 'Kairon', text: "…아니. 나는 못 한다. 삼백 년을 못 했다." },
            { who: 'Kairon', text: "남동쪽 끝, 잿빛 화산이다. 준비가 되면 가거라, 제자야." },
        ],
        toast: '새 퀘스트: 하늘에서 떨어진 재앙', icon: '📜',
    },

    // ---------- 탐험 중의 작은 발견 ----------
    {
        id: 'ev_river', title: '발견 — 큰 강',
        when: c => c.region !== 'HOMELAND' && c.lessons >= 1,
        lines: [
            { who: '나', text: "(강을 건넜다. 물살이 세서 헤엄칠 엄두가 나지 않는 강이다.)" },
            { who: '나', text: "(건널 수 있는 곳은 몇 안 되는 여울뿐. 마을 쪽을 돌아보니 꽤 멀리 온 것 같다.)" },
            { who: '나', text: "(길목마다 옛 용들이 세워 둔 돌기둥이 있다. 손을 얹으면 멀리 있는 돌과 울린다고 했다. [E])" },
        ],
        toast: '이동 석비를 찾으면 먼 길을 건너뛸 수 있습니다.', icon: '🗿',
    },
    {
        id: 'ev_cave', title: '발견 — 땅 밑의 길',
        when: c => c.s.entities.props.some(p => p.type === 'CAVE' && Math.hypot(p.x - c.s.player.x, p.y - c.s.player.y) < 360),
        lines: [
            { who: '나', text: "(바위 틈으로 찬 바람이 올라온다. 아래로 이어지는 굴이다.)" },
            { who: 'Elder', text: "(전에 엘더가 해 준 이야기가 떠올랐다.) …옛 용들이 파 둔 굴이 여럿 있단다." },
            { who: 'Elder', text: "들어갈 때마다 길이 달라진다더구나. 깊이 들어갈수록 험하지만, 그만큼 쥐고 나오는 것도 많고." },
        ],
        toast: '굴 입구에서 [E]로 들어갈 수 있습니다.', icon: '🕯️',
    },
    {
        id: 'ev_snowland', title: '발견 — 서리 봉우리',
        when: c => c.biome === 'SNOW',
        lines: [{ who: '나', text: "(숨을 쉴 때마다 하얀 김이 났다. 여기서는 불꽃이 금방 식는다. 대신 얼음 숨결은 더 매서워질 것 같다.)" }],
    },
    {
        id: 'ev_volcano', title: '발견 — 잿빛 화산',
        when: c => c.biome === 'VOLCANO',
        lines: [
            { who: '나', text: "(비늘이 뜨거워졌다. 발밑의 돌이 아직 식지 않았다.)" },
            { who: '나', text: "(이 땅의 열기… 어디선가 맡아 본 냄새다. 떨어지던 날, 등 뒤에서 나던 냄새.)" },
        ],
    },
];
