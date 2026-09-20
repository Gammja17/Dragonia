// 퀘스트 정의.
//   giver    의뢰인(고정 NPC 이름, data/npcs.js)
//   act      퀘스트 로그에서 묶이는 장 ('main' 은 본 이야기, 나머지는 그 인물의 이야기)
//   requires 먼저 끝내야 하는 퀘스트 id
//   auto     NPC가 주지 않는다. 돌아다니다 사건이 터지면서 저절로 맡게 된다 (data/chronicle.js)
//   summary  왜 이 일을 맡았는지 (로그에서 읽는 배경)
//   hint     지금 뭘 해야 하는지 (로그의 '해야 할 일')
//   goal.type: 'kill'(target = 적 종류 | 'HUNTER') | 'stage'(index 이상으로 성장) | 'boss'(id)
//              | 'collect'(고기 count개를 건넨다) | 'killAny'(아무 적) | 'elite'(정예 처치)
//              | 'visit'(target 바이옴에 가 보기) | 'hatch' | 'raid'(습격 격퇴) | 'spar'(대련 승리)
//              | 'tag'(술래잡기 승리) | 'upgrade'(비늘 단련) | 'chest'(상자 열기)
//              | 'delve'(굴의 지하 N층까지 내려가기)
export const QUESTS = [
    // ---- 본 이야기: 촌장 엘더 ----
    {
        id: 'm1', giver: 'Elder', act: 'main', title: '첫 사냥',
        offer: "몸은 좀 풀렸느냐? 마을 밖 숲에 [슬라임]이 들끓는다. 세 마리만 처리해 다오. 네 불꽃이 쓸 만한지 보자꾸나.",
        summary: "하늘에서 떨어진 나를 거둬 준 마을. 엘더는 고맙다는 말 대신 일거리를 줬다. 스스로 먹고사는 법부터 배우라는 뜻이다.",
        hint: "마을 밖 숲(어느 쪽이든 마을을 벗어나면 된다)에서 슬라임 세 마리를 쓰러뜨린다.",
        done: "호오, 제법이구나. 해츨링치고는 매운 불꽃이야. 자, 이건 수고비다.",
        goal: { type: 'kill', target: 'SLIME', count: 3 }, reward: { xp: 80, meat: 2 },
    },
    {
        id: 'm2', giver: 'Elder', act: 'main', requires: 'm1', title: '자라나는 날개',
        offer: "용은 싸우고 먹고 자면서 자란다. 레벨 4가 되면 스승 카이론에게 [승급 시험]을 청해 [어린 용]으로 자라서 오너라.",
        summary: "몸이 작아서는 숨결에 힘이 실리지 않는다. 용은 나이로 자라는 게 아니라, 자기보다 강한 상대를 넘어서면서 자란다.",
        hint: "레벨 4를 찍고 마을 동쪽 수련장의 카이론에게 [승급 시험]을 청한다.",
        done: "날개가 제법 넓어졌구나! 이제 숲 깊은 곳도 다닐 만하겠어.",
        goal: { type: 'stage', index: 1 }, reward: { xp: 100, meat: 3 },
    },
    {
        id: 'm3', giver: 'Elder', act: 'main', requires: 'm2', title: '마을의 방패',
        offer: "인간 [사냥꾼]들이 주기적으로 마을로 쳐들어온다. 어느 쪽에서 올지는 아무도 모르지. 넷만 쓰러뜨려 다오. 둥지의 알을 노리는 놈들이다.",
        summary: "이 숲은 삼백 년 동안 들키지 않았다. 그런데 요즘 사냥꾼이 길을 알고 찾아온다. 누군가 길을 알려 준 것처럼.",
        hint: "마을에 습격이 오면 맞서 싸운다. 사냥꾼 넷을 쓰러뜨린다.",
        done: "마을이 네 덕에 한숨 돌렸구나. …이제 네게 진짜 이야기를 해 줄 때가 됐다.",
        goal: { type: 'kill', target: 'HUNTER', count: 4 }, reward: { xp: 200, meat: 2 },
    },
    {
        id: 'm4', auto: true, giver: 'Elder', act: 'main', requires: 'm3', title: '달빛 골짜기의 뼈용',
        offer: "마을에서 [동쪽 길]을 따라가면 달빛 골짜기가 나온다. 그곳에 죽지 못한 용, [모르가스]가 잠들어 있지. 놈을 쓰러뜨리면 [냉기]의 숨결을 얻을 게다.",
        summary: "모르가스는 원래 이 마을의 수호룡이었다. 이그나르에게 당한 뒤로도 마을을 떠나지 못하고, 뼈만 남은 채 골짜기를 맴돈다. 보내 주는 것도 예의다.",
        hint: "마을 동쪽, 달빛 골짜기의 결투장으로 간다.",
        done: "모르가스가… 드디어 쉬게 되었구나. 냉기의 숨결이 네 안에서 느껴진다. [2]번 키로 바꿔 쓸 수 있다.",
        goal: { type: 'boss', id: 'MORGATH' }, reward: { xp: 300, meat: 3 },
    },
    {
        id: 'm5', auto: true, giver: 'Elder', act: 'main', requires: 'm4', title: '환영의 밀림',
        offer: "[남쪽 길] 끝 환영의 밀림에는 쌍두룡 [잘고라]가 산다. 두 머리가 서로 다투느라 늘 화가 나 있지. 놈에게서 [번개]의 숨결을 빼앗아 오너라.",
        summary: "잘고라는 원래 형제였다. 이그나르의 저주로 한 몸이 되어, 서로가 왕이 되겠다고 다투다 미쳤다. 둘 다 불쌍한 용이다.",
        hint: "마을 남쪽 끝, 환영의 밀림으로 간다.",
        done: "번개까지 다루게 되다니. 세 숨결을 모두 가진 용은 수백 년 만이다.",
        goal: { type: 'boss', id: 'ZALGORA' }, reward: { xp: 400, meat: 3 },
    },
    {
        id: 'm5a', auto: true, giver: 'Elder', act: 'main', requires: 'm5', title: '얼어붙은 봉우리',
        offer: "이그나르에게 가려면 아직 이르다. 먼저 [북동쪽 끝] 서리 봉우리의 여왕 [글라시아]를 넘어서거라. 놈의 얼음 탄막을 피하지 못하면 이그나르 앞에선 숨도 못 쉰다.",
        summary: "글라시아는 이그나르를 피해 봉우리로 숨은 용이다. 숨다 못해 봉우리째로 얼려 버렸다. 그 탄막을 피할 수 있어야 이그나르 앞에 설 수 있다.",
        hint: "북동쪽 끝, 서리 봉우리의 결투장으로 간다. 탄막은 [Shift] 대시로 피한다.",
        done: "글라시아까지…! 네 비늘에 서리가 앉았구나. 그 눈물은 네 기술을 더 빨리 되돌려 줄 게다.",
        goal: { type: 'boss', id: 'GLACIA' }, reward: { xp: 700, meat: 4 },
    },
    {
        id: 'm5b', auto: true, giver: 'Elder', act: 'main', requires: 'm5a', title: '죽은 사구의 폭군',
        offer: "[남서쪽 끝] 사막에는 모래 폭군 [바실]이 산다. 그론의 무릎을 앗아간 놈이지. 돌진을 조심하거라. 붉은 선이 보이면 [Shift]로 몸을 날려라.",
        summary: "그론이 모험을 접은 이유. 젊은 그론은 바실의 돌진을 한 번 피하지 못했고, 그 뒤로 대장간 밖을 나가지 않는다.",
        hint: "남서쪽 끝, 죽은 사구의 결투장으로 간다. 붉은 예고선이 보이면 대시로 피한다.",
        done: "바실마저 쓰러뜨리다니. 이제 남은 것은 단 하나… 네 운명뿐이다.",
        goal: { type: 'boss', id: 'BASIL' }, reward: { xp: 900, meat: 4 },
    },
    {
        id: 'm6', auto: true, giver: 'Elder', act: 'main', requires: 'm5b', title: '하늘에서 떨어진 재앙',
        offer: "이제 말해 주마. 네가 하늘에서 떨어지던 날, 너를 떨어뜨린 것은 고룡 [이그나르]다. 놈은 [남동쪽 끝] 잿빛 화산 지대에서 다음 먹잇감을 기다리고 있다. 끝을 내고 오너라.",
        summary: "나를 떨어뜨린 것도, 이 숲에 사냥꾼을 불러들인 것도, 모르가스와 잘고라를 저렇게 만든 것도 전부 한 용이었다. 카이론의 형, 이그나르.",
        hint: "남동쪽 끝, 잿빛 화산의 결투장으로 간다. 준비를 단단히 하고 간다.",
        done: "해냈구나…! 이제 이 땅의 하늘은 네 것이다. 드래고니아의 새 수호룡이여, 마을은 언제나 네 둥지다.",
        goal: { type: 'boss', id: 'IGNAR' }, reward: { xp: 1000, meat: 5 },
    },

    // ---- 포코의 이야기 ----
    {
        id: 's1', giver: 'Poco', act: 'Poco', title: '배고픈 포코',
        offer: "배고파아… [고기 3개]만 가져다주면 안 돼? 나 진짜 쓰러질 것 같아!",
        summary: "포코는 마을에서 제일 시끄럽고 제일 잘 먹는다. 사냥은 무서워서 못 간다고 한다.",
        hint: "고기 3개를 모아 포코에게 건넨다. 고기는 들쥐를 잡거나 물가에서 낚시하면 나온다.",
        done: "우와아 고기다! 너 최고야! 우리 이제 절친이지?",
        goal: { type: 'collect', count: 3 }, reward: { xp: 60, relation: 20 },
    },
    {
        id: 's4', giver: 'Poco', act: 'Poco', requires: 's1', title: '새 생명',
        offer: "있잖아, 둥지에서 [알이 부화]하는 거 본 적 있어? 나 아기 용 너무 보고 싶어! 한 마리만 태어나게 해 줘!",
        summary: "포코는 아기 용을 한 번도 본 적이 없다. 이 마을에 마지막으로 알이 부화한 게 언제였는지, 아무도 기억하지 못한다.",
        hint: "아지트에 둥지를 짓고(나뭇가지 8, 30G), 짝과 함께 알을 낳아 품는다.",
        done: "꺄아 너무 귀여워!! 내가 이모… 아니 삼촌? 아무튼 내가 많이 놀아줄게!",
        goal: { type: 'hatch', count: 1 }, reward: { xp: 200, relation: 10 },
    },
    {
        id: 's6', giver: 'Poco', act: 'Poco', requires: 's4', title: '마을 최고의 술래',
        offer: "나 요즘 술래잡기에서 한 번도 안 잡혔다? 네가 [두 번] 잡으면 내 보물 줄게! 진짜야!",
        summary: "포코가 유일하게 자신 있어 하는 것. 사실은 같이 놀아 달라는 말을 돌려서 하는 중이다.",
        hint: "포코에게 말을 걸어 [술래잡기]를 두 번 이긴다. [Shift] 달리기를 쓴다.",
        done: "헉… 헉… 너 진짜 빠르다! 자, 약속한 보물! 반짝반짝하지?",
        goal: { type: 'tag', count: 2 }, reward: { xp: 200, meat: 2, relation: 15 },
    },

    // ---- 티아맷의 이야기 ----
    {
        id: 's3', giver: 'Tiamat', act: 'Tiamat', title: '전사의 증명',
        offer: "달빛 골짜기의 [흡혈박쥐] 여섯 마리. 그 정도는 잡아야 내 옆에서 날 자격이 있지. 어때, 할 수 있겠어?",
        summary: "티아맷은 누구도 쉽게 곁에 두지 않는다. 자격을 증명하라는 건, 곁을 내줄 생각이 있다는 뜻이기도 하다.",
        hint: "마을 동쪽 달빛 골짜기에서 흡혈박쥐 여섯 마리를 잡는다.",
        done: "하! 정말 해냈네. 인정할게. 너, 꽤 멋진 용이야.",
        goal: { type: 'kill', target: 'BAT', count: 6 }, reward: { xp: 250, relation: 20 },
    },
    {
        id: 's5', giver: 'Tiamat', act: 'Tiamat', requires: 's3', title: '번개보다 빠르게',
        offer: "말로만 강하다고 하는 용은 질색이야. 나와 [대련]해서 한 번이라도 이겨 봐. 말 걸어서 '대련을 신청한다'를 고르면 돼.",
        summary: "티아맷의 번개는 마을에서 제일 빠르다. 그 속도를 한 번이라도 따라잡으면, 그녀는 등을 맡길 상대로 인정한다.",
        hint: "티아맷에게 말을 걸어 [대련]에서 이긴다. 이기면 그녀의 기술 [번개 질주]를 배운다.",
        done: "…졌어. 깨끗하게. 너라면 내 등을 맡겨도 되겠다.",
        goal: { type: 'spar', count: 1 }, reward: { xp: 300, relation: 15 },
    },
    {
        id: 's9', giver: 'Tiamat', act: 'Tiamat', requires: 's5', title: '끝나지 않는 습격',
        offer: "사냥꾼 놈들, 갈수록 많이 몰려와. 마을 용들이랑 같이 [습격을 세 번] 막아내자. 대장이 나오면… 그건 네 몫이야.",
        summary: "티아맷은 어릴 때 사냥꾼에게 가족을 잃었다. 그래서 습격만은 남에게 맡기지 않는다.",
        hint: "마을 습격을 세 번 막아낸다.",
        done: "세 번이나 막아냈네. 이제 마을 용들도 널 믿고 따를 거야. 나도 그렇고.",
        goal: { type: 'raid', count: 3 }, reward: { xp: 500, meat: 4, relation: 15 },
    },

    // ---- 그론의 이야기 ----
    {
        id: 's2', giver: 'Gron', act: 'Gron', title: '시끄러운 고블린',
        offer: "숲의 [고블린] 놈들 때문에 낮잠을 못 자겠어. 다섯 마리만 조용히 시켜. …부탁이다.",
        summary: "그론은 부탁을 부탁처럼 하지 못한다. '부탁이다'라는 말을 꺼낸 것만으로도 큰 결심을 한 셈이다.",
        hint: "숲에서 고블린 다섯 마리를 잡는다.",
        done: "…조용해졌군. 고맙다. 이건 내 간식이었는데, 너 먹어라.",
        goal: { type: 'kill', target: 'GOBLIN', count: 5 }, reward: { xp: 150, meat: 3, relation: 15 },
    },
    {
        id: 's7', giver: 'Gron', act: 'Gron', requires: 's2', title: '단골의 자격',
        offer: "구경만 하는 놈은 손님이 아니다. 내 모루에서 [비늘을 두 번] 단련해라. 그럼 단골로 쳐주지.",
        summary: "그론의 대장간은 손님이 없다. 마을 용들은 비늘을 단련할 만큼 싸울 일이 없으니까. 나는 예외다.",
        hint: "그론에게 말을 걸어 [모루에서 단련한다]를 두 번 한다. 소재는 몬스터를 잡으면 나온다.",
        done: "흥. 이제 좀 용다워졌군. 이건 단골 선물이다. 어디 가서 말하지 마라.",
        goal: { type: 'upgrade', count: 2 }, reward: { xp: 200, meat: 3, relation: 20 },
    },
    {
        id: 's8', giver: 'Gron', act: 'Gron', requires: 's7', title: '숲의 보물',
        offer: "숲 곳곳에 옛 용들이 숨겨 둔 [보물상자]가 있다. 다섯 개만 찾아 열어 봐라. 내용물은 네 거다.",
        summary: "삼백 년 전 이 숲으로 쫓겨 온 용들이, 언젠가 돌아갈 날을 생각하며 묻어 둔 것들이다. 아무도 돌아가지 못했다.",
        hint: "숲 곳곳의 보물상자를 다섯 개 찾아 [Space]로 연다.",
        done: "다 찾았냐? 보는 눈이 있군. 상자는 아직 많이 남았을 거다.",
        goal: { type: 'chest', count: 5 }, reward: { xp: 350, relation: 10 },
    },

    // ---- 나라의 이야기 ----
    {
        id: 'n1', giver: 'Nara', act: 'Nara', title: '같은 수만큼',
        offer: "오늘 나 열다섯 마리 잡았어. 너도 열다섯. 그래야 내일 같은 자리에서 시작하지.",
        summary: "나라는 늘 숫자로 말한다. 허수아비 서른 번, 열다섯 마리. 그게 뒤처지지 않으려고 붙잡은 유일한 손잡이다.",
        hint: "숲에서 아무 적이나 열다섯 마리를 쓰러뜨린다.",
        done: "…진짜 다 채웠네. 좋아. 내일은 스무 마리다.",
        goal: { type: 'killAny', count: 15 }, reward: { xp: 200, relation: 15 },
    },
    {
        id: 'n2', giver: 'Nara', act: 'Nara', requires: 'n1', title: '허수아비는 반격하지 않는다',
        offer: "수련장 밖으로 나가자. 금빛으로 빛나는 놈 둘. 그 정도는 잡아야 우리가 컸다고 할 수 있어.",
        summary: "나라는 허수아비를 믿지 않는다. 부모를 앗아간 것은 반격하는 쪽이었으니까.",
        hint: "정예 몬스터 둘을 쓰러뜨린다. 금빛으로 빛나는 놈이다.",
        done: "둘 다…? 하. 역시 너랑 다니면 무서운 게 줄어들어.",
        goal: { type: 'elite', count: 2 }, reward: { xp: 400, gold: 80, relation: 20 },
    },
    {
        id: 'n3', giver: 'Nara', act: 'Nara', requires: 'n2', title: '땅 밑까지',
        offer: "옛 용들이 파 둔 굴 있잖아. 지하 세 층까지 내려가 봐. 나는… 아직 무서워서 못 가. 대신 네 이야기를 들을래.",
        summary: "밖에서는 누구보다 앞서 가는 나라가, 어두운 곳만은 못 간다. 숨어 있던 그날의 나무 뒤가 어두웠기 때문이다.",
        hint: "굴에 들어가 지하 3층까지 내려간다. 각 층의 파수꾼을 잡아야 아래로 갈 수 있다.",
        done: "세 층이나…? 무섭지 않았어? …아니다, 대답하지 마. 다음엔 나도 갈게. 같이.",
        goal: { type: 'delve', count: 3 }, reward: { xp: 600, gold: 120, relation: 25 },
    },

    // ---- 스승 카이론의 이야기 ----
    {
        id: 'k1', giver: 'Kairon', act: 'Kairon', title: '기초 체력',
        offer: "수련장에서 허수아비만 패서는 실전 감각이 안 생긴다. 숲에서 [아무 적이나 열둘] 쓰러뜨리고 오너라.",
        summary: "카이론은 수련장에서 배운 것이 실전에서 반도 안 나온다는 걸 안다. 그래서 늘 제자를 밖으로 내보낸다.",
        hint: "숲에서 아무 적이나 열둘을 쓰러뜨린다.",
        done: "땀 냄새가 나는군. 좋다. 그게 실전의 냄새다.",
        goal: { type: 'killAny', count: 12 }, reward: { xp: 180, gold: 40 },
    },
    {
        id: 'k2', giver: 'Kairon', act: 'Kairon', requires: 'k1', title: '금빛 사냥감',
        offer: "금빛으로 빛나는 [정예] 몬스터를 본 적 있느냐? 놈들은 무리의 우두머리다. 하나만 잡아 와라. 겁나면 도망쳐도 된다. 허허.",
        summary: "정예는 무리를 이끄는 개체다. 혼자 덤비면 위험하지만, 그만큼 좋은 것을 지니고 있다.",
        hint: "금빛으로 빛나는 정예 몬스터를 하나 잡는다. 어느 지역에서나 드물게 나온다.",
        done: "정예를 잡았다고? …제법이군. 놈들이 가끔 [유물]을 떨어뜨리니 눈여겨보거라.",
        goal: { type: 'elite', count: 1 }, reward: { xp: 320, gold: 80 },
    },
    {
        id: 'k3', giver: 'Kairon', act: 'Kairon', requires: 'k2', title: '스승의 밥상',
        offer: "…요즘 통 입맛이 없구나. 늙으면 그래. [고기 다섯 덩이]만 구해다 주겠느냐. 제자 덕 좀 보자.",
        summary: "카이론이 제자에게 뭔가를 부탁한 건 처음이다. 늙었다는 말을 입에 올린 것도.",
        hint: "고기 다섯 덩이를 모아 카이론에게 건넨다.",
        done: "오오, 이 냄새! …크흠. 맛이 없진 않군. 너도 한 점 하거라.",
        goal: { type: 'collect', count: 5 }, reward: { xp: 250, relation: 25 },
    },
    {
        id: 'k4', giver: 'Kairon', act: 'Kairon', requires: 'k3', title: '형의 발자취',
        offer: "남동쪽 끝 [잿빛 화산 지대]에 발을 들여 보고 오너라. 싸울 필요는 없다. 그 땅의 열기를 네 비늘로 느껴 보기만 하면 된다.",
        summary: "카이론은 형의 이름을 오래 입에 담지 않았다. 제자에게 그 땅을 먼저 보여 주려는 건, 언젠가 올 싸움을 준비시키는 것이다.",
        hint: "남동쪽 끝 잿빛 화산 지대에 발을 들인다. 싸우지 않아도 된다.",
        done: "다녀왔느냐. 그 열기가… 내 형 이그나르의 숨결이다. 언젠가 네가 맞서야 할 불이지.",
        goal: { type: 'visit', target: 'VOLCANO' }, reward: { xp: 500, gold: 100 },
    },
];

/** 로그에서 묶어 보여 줄 장 이름 */
export const ACT_NAMES = {
    main: '본 이야기',
    Kairon: '스승 카이론',
    Nara: '또래 나라',
    Tiamat: '티아맷',
    Poco: '포코',
    Gron: '그론',
};

export const questById = (id) => QUESTS.find(q => q.id === id);
