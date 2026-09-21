// 마을 용들의 하루.
//
// 스타듀처럼, 용마다 시간대별로 있는 자리와 하는 일이 정해져 있다.
// 아침에 수련장에 갔다가 낮에는 숲길을 돌고 저녁이면 모닥불 앞에 모인다.
// 어디서 만나느냐에 따라 하는 말도 달라진다.
//
//   job      일지에 적히는 맡은 일
//   day      [{ h, map, spot:[큰칸 x, y], doing }] — h 시(0~24)부터 그 자리
//            h 순서대로 적는다. 하루의 마지막 칸이 자정을 넘어 이어진다
//   rain     비·눈이 오면 이 칸으로 바꾼다
//   raid     사냥꾼이 쳐들어오면 이 칸으로 바꾼다 (하던 일을 내던진다)
//
// spot 은 그 지도의 '큰 칸' 좌표. 용은 그 자리를 중심으로 어슬렁거린다.
// 집(HOUSE)이 선 칸과 그 바로 위 칸에는 자리를 잡지 않는다 — 집 그림(240px)에 몸이 통째로 가려진다.
// 집에 있는 용은 집 한 칸 아래(문 앞)에 세운다

export const ROUTINES = {
    // ── 엘더: 촌장. 마을을 뜨는 일이 거의 없다 ──────────────────────────
    Elder: {
        job: '촌장',
        day: [
            { h: 0,  map: 'DEN_ELDER', spot: [7, 6], doing: '제 굴에서 잠들어 있다' },
            { h: 6,  map: 'VILLAGE', spot: [12, 7], doing: '분수 앞에서 아침 바람을 쐰다' },
            { h: 9,  map: 'VILLAGE', spot: [10, 7], doing: '마을 일을 보며 오가는 이를 맞는다' },
            { h: 14, map: 'LAKE',    spot: [14, 8], doing: '호숫가에 앉아 오래된 것들을 헤아린다' },
            { h: 17, map: 'VILLAGE', spot: [10, 7], doing: '마을로 돌아와 하루를 마무리한다' },
            { h: 20, map: 'VILLAGE', spot: [12, 10], doing: '모닥불 앞에서 옛이야기를 들려준다' },
            { h: 23, map: 'DEN_ELDER', spot: [7, 6], doing: '제 굴로 들어간다' },
        ],
        rain: { map: 'VILLAGE', spot: [9, 13], doing: '처마 밑에서 비를 바라보고 있다' },
        raid: { map: 'VILLAGE', spot: [12, 7], doing: '분수 앞에서 마을을 지휘한다' },
    },

    // ── 카이론: 스승. 수련장을 떠나는 시간이 짧다 ────────────────────────
    Kairon: {
        job: '수련장 사범',
        day: [
            { h: 0,  map: 'DEN_KAIRON', spot: [2, 7], doing: '제 굴에서 잠들어 있다' },
            { h: 4,  map: 'DOJO',      spot: [9, 6],  doing: '해 뜨기 전부터 혼자 창을 휘두른다' },
            { h: 8,  map: 'DOJO',      spot: [9, 7],  doing: '제자들의 자세를 하나씩 고쳐 준다' },
            { h: 13, map: 'EAST_ROAD', spot: [11, 7], doing: '숲길을 돌며 이상한 기척이 없는지 살핀다' },
            { h: 16, map: 'DOJO',      spot: [9, 7],  doing: '허수아비를 손보고 있다' },
            { h: 20, map: 'VILLAGE',   spot: [12, 10], doing: '모닥불 앞에서 엘더와 술잔을 기울인다' },
            { h: 23, map: 'DEN_KAIRON', spot: [2, 7], doing: '제 굴로 돌아간다' },
        ],
        rain: { map: 'DOJO', spot: [5, 5], doing: '처마 밑에서 비 긋는 김에 창날을 갈고 있다' },
        raid: { map: 'DOJO', spot: [9, 6], doing: '수련장을 비우지 않고 버티고 서 있다' },
    },

    // ── 나라: 또래. 늘 한 발 앞서 있으려 한다 ───────────────────────────
    Nara: {
        job: '수련생',
        day: [
            { h: 0,  map: 'DEN_NARA',  spot: [1, 7], doing: '제 굴에 웅크려 자고 있다' },
            { h: 5,  map: 'DOJO',      spot: [9, 7],  doing: '아무도 없을 때 혼자 허수아비를 두들긴다' },
            { h: 8,  map: 'DOJO',      spot: [11, 6], doing: '스승 앞에서 자세를 잡는다' },
            { h: 12, map: 'EAST_ROAD', spot: [17, 10], doing: '굴 앞을 기웃거리며 들어갈까 망설인다' },
            { h: 15, map: 'HOLLOW',    spot: [11, 9], doing: '골짜기 안쪽을 혼자 정찰하고 있다' },
            { h: 19, map: 'DOJO',      spot: [12, 9], doing: '모닥불 앞에서 오늘 배운 것을 되짚는다' },
            { h: 23, map: 'DEN_NARA',  spot: [1, 7], doing: '제 굴로 돌아가 눕는다' },
        ],
        rain: { map: 'DOJO', spot: [9, 7], doing: '비를 맞으면서도 허수아비를 놓지 않는다' },
        raid: { map: 'VILLAGE', spot: [14, 8], doing: '제일 앞에 나가 사냥꾼과 맞선다' },
        // 어둠의 결말: 마을이 잿마루에 넘어간 다음 날 말없이 떠났다 (data/quests.js 의 m7d)
        variants: [{ when: s => s.story.route === 'dark' && s.quests.done.includes('m7d'), day: [
            { h: 0,  map: 'CLOUDTOP', spot: [16, 12], doing: '구름마루에서 얻은 잠자리에 누워 있다' },
            { h: 6,  map: 'CLOUDTOP', spot: [15, 12], doing: '물가에서 혼자 자세를 잡고 있다' },
            { h: 13, map: 'FALLS',    spot: [10, 10], doing: '폭포 아래에 서서 마을 쪽을 한참 보고 있다' },
            { h: 17, map: 'CLOUDTOP', spot: [15, 12], doing: '물가에서 해가 질 때까지 수련한다' },
            { h: 21, map: 'CLOUDTOP', spot: [16, 12], doing: '구름마루에서 얻은 잠자리로 돌아간다' },
        ] }],
    },

    // ── 티아맷: 망루지기 ────────────────────────────────────────────────
    Tiamat: {
        job: '망루지기',
        day: [
            { h: 0,  map: 'VILLAGE',   spot: [17, 7],  doing: '망루 앞에서 밤을 지새운다' },
            { h: 7,  map: 'VILLAGE',   spot: [17, 10], doing: '교대하고 내려와 날개를 편다' },
            { h: 10, map: 'EAST_ROAD', spot: [6, 7],   doing: '동쪽 길목을 순찰한다' },
            { h: 14, map: 'SOUTH_ROAD', spot: [9, 7],  doing: '남쪽 길목까지 훑고 온다' },
            { h: 18, map: 'VILLAGE',   spot: [12, 10], doing: '모닥불 곁에서 날개를 말린다' },
            { h: 21, map: 'VILLAGE',   spot: [17, 7],  doing: '망루 앞에 서서 밤을 맡는다' },
        ],
        rain: { map: 'VILLAGE', spot: [17, 7], doing: '비를 맞으며 망루를 지키고 있다' },
        raid: { map: 'VILLAGE', spot: [12, 7], doing: '하늘로 올라 사냥꾼의 수를 세고 있다' },
    },

    // ── 그론: 대장장이 ─────────────────────────────────────────────────
    Gron: {
        job: '대장장이',
        day: [
            { h: 0,  map: 'DEN_GRON', spot: [12, 8], doing: '제 굴에서 코를 골고 있다' },
            { h: 6,  map: 'VILLAGE', spot: [15, 7],  doing: '화덕에 불을 지피고 있다' },
            { h: 9,  map: 'VILLAGE', spot: [15, 7],  doing: '모루 앞에서 쇠를 두드린다' },
            { h: 13, map: 'LAKE',    spot: [14, 11], doing: '물가에서 달군 쇠를 식히고 있다' },
            { h: 16, map: 'VILLAGE', spot: [15, 7],  doing: '주문 받은 것을 마저 벼르고 있다' },
            { h: 20, map: 'VILLAGE', spot: [12, 10], doing: '모닥불 앞에서 손을 쉰다' },
            { h: 23, map: 'DEN_GRON', spot: [12, 8], doing: '대장간 문을 닫고 굴로 들어간다' },
        ],
        rain: { map: 'VILLAGE', spot: [15, 7], doing: '비가 오면 화덕이 더 잘 산다며 신이 났다' },
        raid: { map: 'VILLAGE', spot: [15, 7], doing: '대장간 앞을 지키고 서 있다' },
    },

    // ── 이그나르: 결말 뒤에만 나타난다. when 이 거짓이면 어디에도 없다 ──────────
    Ignar: {
        job: '돌아온 용',
        when: s => (s.story.route === 'redeem' && s.quests.done.includes('m6')) || (s.story.route === 'dark' && s.quests.done.includes('m7d')),
        day: [
            { h: 0,  map: 'LAKE', spot: [5, 5],   doing: '호숫가 빈 굴 앞에서 눈을 붙이고 있다' },
            { h: 7,  map: 'LAKE', spot: [6, 6],   doing: '호숫가 바위에 앉아 물을 내려다보고 있다' },
            { h: 13, map: 'DOJO', spot: [13, 9],  doing: '수련장 구석에서 카이론이 가르치는 걸 말없이 보고 있다' },
            { h: 18, map: 'VILLAGE', spot: [14, 11], doing: '모닥불에서 조금 떨어진 자리에 앉아 있다' },
            { h: 22, map: 'LAKE', spot: [5, 5],   doing: '호숫가 빈 굴로 돌아간다' },
        ],
        // 어둠의 결말: 잿마루를 떠나지 않는다
        variants: [{ when: s => s.story.route === 'dark', day: [
            { h: 0,  map: 'VOLCANO', spot: [12, 7], doing: '잿마루의 불가에 앉아 있다' },
            { h: 9,  map: 'VOLCANO', spot: [14, 9], doing: '잿마루의 용들이 하는 보고를 듣고 있다' },
            { h: 20, map: 'VOLCANO', spot: [12, 7], doing: '불가에서 혼자 불을 보고 있다' },
        ] }],
    },

    // ── 엠버: 그론의 조수. 제 굴이 없다. 대장간 구석에서 잔다 ─────────────
    Ember: {
        job: '대장간 조수',
        day: [
            { h: 0,  map: 'VILLAGE', spot: [16, 8],  doing: '대장간 구석 화덕 옆에 웅크려 자고 있다' },
            { h: 6,  map: 'VILLAGE', spot: [16, 8],  doing: '하품을 하며 풀무를 밟고 있다' },
            { h: 9,  map: 'VILLAGE', spot: [16, 7],  doing: '그론한테 혼나면서 쇠를 나르고 있다' },
            { h: 13, map: 'VILLAGE', spot: [14, 9],  doing: '그론이 없는 틈에 게으름을 피우고 있다' },
            { h: 16, map: 'VILLAGE', spot: [16, 7],  doing: '휘어진 못을 몰래 펴고 있다' },
            { h: 20, map: 'VILLAGE', spot: [13, 11], doing: '모닥불 앞에서 제일 크게 떠들고 있다' },
            { h: 23, map: 'VILLAGE', spot: [16, 8],  doing: '대장간 구석으로 자러 간다' },
        ],
        rain: { map: 'VILLAGE', spot: [16, 8], doing: '비 새는 데를 찾아 양동이를 받치고 있다' },
        raid: { map: 'VILLAGE', spot: [16, 8], doing: '망치를 들고 대장간 앞에 서 있다' },
        // 그론이 떠난 뒤 (6장). systems/routine.js 의 planFor 가 after.of 가 죽었으면 이쪽을 쓴다
        after: { of: 'Gron', day: [
            { h: 0,  map: 'VILLAGE', spot: [16, 8],  doing: '대장간 구석 화덕 옆에 웅크려 자고 있다' },
            { h: 5,  map: 'VILLAGE', spot: [16, 7],  doing: '누가 깨우지 않아도 일어나 화덕에 불을 지피고 있다' },
            { h: 9,  map: 'VILLAGE', spot: [15, 7],  doing: '그론의 모루 앞에서 혼자 쇠를 두드린다' },
            { h: 17, map: 'VILLAGE', spot: [16, 7],  doing: '휘어진 못을 펴고 있다. 이제는 몰래가 아니다' },
            { h: 20, map: 'VILLAGE', spot: [13, 11], doing: '모닥불 앞에 앉아 있다. 예전만큼 떠들지는 않는다' },
            { h: 23, map: 'VILLAGE', spot: [16, 8],  doing: '대장간 구석으로 자러 간다' },
        ] },
    },

    // ── 미라: 약초꾼. 해 질 녘이면 폭포 쪽에 가 있다 ──────────────────────
    Mira: {
        job: '약초꾼',
        day: [
            { h: 0,  map: 'VILLAGE', spot: [8, 7],   doing: '약초 말리는 시렁 옆에서 자고 있다' },
            { h: 7,  map: 'VILLAGE', spot: [8, 7],   doing: '말린 약초를 하나하나 뒤집고 있다' },
            { h: 10, map: 'LAKE',    spot: [12, 9],  doing: '물가에서 약초를 캐고 있다' },
            { h: 14, map: 'VILLAGE', spot: [9, 7],   doing: '엘더의 무릎약을 달이고 있다' },
            { h: 17, map: 'FALLS',   spot: [9, 10],  doing: '약초를 캔다며 폭포 쪽을 서성이고 있다' },
            { h: 21, map: 'VILLAGE', spot: [11, 11], doing: '모닥불 곁에서 말없이 웃고 있다' },
            { h: 23, map: 'VILLAGE', spot: [8, 7],   doing: '시렁 옆 잠자리로 돌아간다' },
        ],
        rain: { map: 'VILLAGE', spot: [8, 7], doing: '젖기 전에 약초를 걷어 들이고 있다' },
        raid: { map: 'VILLAGE', spot: [9, 9], doing: '다친 용을 뒤로 끌어내고 있다' },
    },

    // ── 포코: 막내. 일이랄 게 없다 ──────────────────────────────────────
    Poco: {
        job: '심부름꾼',
        day: [
            { h: 0,  map: 'DEN_POCO', spot: [5, 4],  doing: '배를 하늘로 하고 자고 있다' },
            { h: 7,  map: 'VILLAGE', spot: [8, 13],  doing: '아침부터 배가 고프다고 돌아다닌다' },
            { h: 10, map: 'VILLAGE', spot: [12, 7],  doing: '분수 가에서 물장난을 치고 있다' },
            { h: 13, map: 'LAKE',    spot: [15, 9],  doing: '호수에서 물고기를 노려보고 있다' },
            { h: 16, map: 'VILLAGE', spot: [5, 11],  doing: '남의 굴 앞에서 마음대로 놀고 있다' },
            { h: 19, map: 'VILLAGE', spot: [12, 10], doing: '모닥불 앞에서 고기 냄새를 맡고 있다' },
            { h: 22, map: 'DEN_POCO', spot: [5, 4],  doing: '하품을 하며 제 굴로 간다' },
        ],
        rain: { map: 'VILLAGE', spot: [12, 7], doing: '비 오는 게 신나서 웅덩이를 밟고 다닌다' },
        raid: { map: 'VILLAGE', spot: [10, 13], doing: '어른들 뒤에 숨어 덜덜 떨고 있다' },
    },

    // ── 구름마루 마을. 폭포 위에 사는 동양용들 ──────────────────────────
    // 아래 마을 용들과 달리 물을 따라 움직인다. 폭포 아래로는 좀처럼 내려오지 않는다.
    Riun: {
        job: '구름마루의 어른',
        day: [
            { h: 0,  map: 'DEN_RIUN',  spot: [7, 6],  doing: '제 굴에서 물소리를 들으며 자고 있다' },
            { h: 6,  map: 'CLOUDTOP',  spot: [11, 8], doing: '샘 앞에서 물이 하는 말을 듣는다' },
            { h: 10, map: 'CLOUDTOP',  spot: [11, 6], doing: '마을 일을 보며 오가는 이를 맞는다' },
            { h: 15, map: 'CLOUDTOP',  spot: [18, 12], doing: '물가에 앉아 오래된 것들을 헤아린다' },
            { h: 19, map: 'CLOUDTOP',  spot: [11, 11], doing: '모닥불 앞에서 옛이야기를 들려준다' },
            { h: 23, map: 'DEN_RIUN',  spot: [7, 6],  doing: '제 굴로 들어간다' },
        ],
        rain: { map: 'CLOUDTOP', spot: [11, 8], doing: '비 오는 날의 물소리가 제일 맑다며 샘 앞에 서 있다' },
    },
    Seiran: {
        job: '물을 읽는 자',
        day: [
            { h: 0,  map: 'DEN_SEIRAN', spot: [6, 6], doing: '제 굴에서 자고 있다' },
            { h: 5,  map: 'FALLS',      spot: [11, 6], doing: '폭포에 비친 것을 읽고 있다' },
            { h: 9,  map: 'CLOUDTOP',   spot: [8, 12], doing: '이끼와 약초를 말리고 있다' },
            { h: 14, map: 'FALLS',      spot: [11, 6], doing: '고인 물을 들여다보며 무언가를 세고 있다' },
            { h: 18, map: 'CLOUDTOP',   spot: [11, 11], doing: '모닥불 곁에서 오늘 본 것을 적는다' },
            { h: 22, map: 'DEN_SEIRAN', spot: [6, 6], doing: '제 굴로 돌아간다' },
        ],
        rain: { map: 'FALLS', spot: [11, 6], doing: '비 오는 날엔 물이 말이 많다며 폭포 앞에 서 있다' },
    },
    Haru: {
        job: '구름마루의 수련생',
        day: [
            { h: 0,  map: 'DEN_HARU', spot: [5, 5],  doing: '제 굴에 웅크려 자고 있다' },
            { h: 6,  map: 'CLOUDTOP', spot: [15, 8], doing: '혼자 물수제비를 뜨고 있다' },
            { h: 10, map: 'CLOUDTOP', spot: [4, 12],  doing: '물속에 들어가 숨 참기를 연습한다' },
            { h: 14, map: 'FALLS',    spot: [10, 5],  doing: '폭포 끝까지 내려와 아래를 기웃거린다' },
            { h: 18, map: 'CLOUDTOP', spot: [11, 11], doing: '모닥불 앞에서 바깥 이야기를 조른다' },
            { h: 22, map: 'DEN_HARU', spot: [5, 5],  doing: '제 굴로 들어가 눕는다' },
        ],
        rain: { map: 'CLOUDTOP', spot: [11, 13], doing: '비가 오면 물이 불어서 더 재밌다며 뛰어다닌다' },
    },
    Yuan: {
        job: '경계를 도는 자',
        day: [
            { h: 0,  map: 'CLOUDTOP', spot: [11, 3], doing: '마을 초입에서 밤을 지새운다' },
            { h: 7,  map: 'FALLS',    spot: [10, 4], doing: '폭포 위 경계를 돌고 있다' },
            { h: 12, map: 'CLOUDTOP', spot: [11, 3], doing: '마을로 들어오는 길목을 지킨다' },
            { h: 16, map: 'FALLS',    spot: [10, 8], doing: '경계 아래쪽까지 내려와 발자국을 세고 있다' },
            { h: 20, map: 'DEN_YUAN', spot: [6, 6],  doing: '제 굴에서 창을 손질한다' },
            { h: 23, map: 'CLOUDTOP', spot: [11, 3], doing: '다시 초입으로 나선다' },
        ],
        rain: { map: 'CLOUDTOP', spot: [11, 3], doing: '비를 맞으며 길목에 버티고 서 있다' },
    },
};

/** 시(0~24) 로 지금 칸을 고른다. 하루의 마지막 칸이 자정을 넘어 이어진다 */
export function slotAtHour(routine, hour) {
    const day = routine.day;
    let best = day[day.length - 1];
    for (const s of day) { if (s.h <= hour) best = s; }
    return best;
}
