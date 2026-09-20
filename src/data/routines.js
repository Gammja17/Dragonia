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

export const ROUTINES = {
    // ── 엘더: 촌장. 마을을 뜨는 일이 거의 없다 ──────────────────────────
    Elder: {
        job: '촌장',
        day: [
            { h: 0,  map: 'VILLAGE', spot: [9, 12], doing: '제 집에서 잠들어 있다' },
            { h: 6,  map: 'VILLAGE', spot: [12, 7], doing: '분수 앞에서 아침 바람을 쐰다' },
            { h: 9,  map: 'VILLAGE', spot: [10, 7], doing: '마을 일을 보며 오가는 이를 맞는다' },
            { h: 14, map: 'LAKE',    spot: [14, 8], doing: '호숫가에 앉아 오래된 것들을 헤아린다' },
            { h: 17, map: 'VILLAGE', spot: [10, 7], doing: '마을로 돌아와 하루를 마무리한다' },
            { h: 20, map: 'VILLAGE', spot: [12, 10], doing: '모닥불 앞에서 옛이야기를 들려준다' },
            { h: 23, map: 'VILLAGE', spot: [9, 12], doing: '제 집으로 들어간다' },
        ],
        rain: { map: 'VILLAGE', spot: [9, 12], doing: '처마 밑에서 비를 바라보고 있다' },
        raid: { map: 'VILLAGE', spot: [12, 7], doing: '분수 앞에서 마을을 지휘한다' },
    },

    // ── 카이론: 스승. 수련장을 떠나는 시간이 짧다 ────────────────────────
    Kairon: {
        job: '수련장 사범',
        day: [
            { h: 0,  map: 'DOJO',      spot: [5, 4],  doing: '수련장 오두막에서 잠들어 있다' },
            { h: 4,  map: 'DOJO',      spot: [9, 6],  doing: '해 뜨기 전부터 혼자 창을 휘두른다' },
            { h: 8,  map: 'DOJO',      spot: [9, 7],  doing: '제자들의 자세를 하나씩 고쳐 준다' },
            { h: 13, map: 'EAST_ROAD', spot: [11, 7], doing: '숲길을 돌며 이상한 기척이 없는지 살핀다' },
            { h: 16, map: 'DOJO',      spot: [9, 7],  doing: '허수아비를 손보고 있다' },
            { h: 20, map: 'VILLAGE',   spot: [12, 10], doing: '모닥불 앞에서 엘더와 술잔을 기울인다' },
            { h: 23, map: 'DOJO',      spot: [5, 4],  doing: '수련장으로 돌아간다' },
        ],
        rain: { map: 'DOJO', spot: [5, 5], doing: '처마 밑에서 비 긋는 김에 창날을 갈고 있다' },
        raid: { map: 'DOJO', spot: [9, 6], doing: '수련장을 비우지 않고 버티고 서 있다' },
    },

    // ── 나라: 또래. 늘 한 발 앞서 있으려 한다 ───────────────────────────
    Nara: {
        job: '수련생',
        day: [
            { h: 0,  map: 'DOJO',      spot: [12, 4], doing: '수련장 한켠에 웅크려 자고 있다' },
            { h: 5,  map: 'DOJO',      spot: [9, 7],  doing: '아무도 없을 때 혼자 허수아비를 두들긴다' },
            { h: 8,  map: 'DOJO',      spot: [11, 6], doing: '스승 앞에서 자세를 잡는다' },
            { h: 12, map: 'EAST_ROAD', spot: [17, 10], doing: '굴 앞을 기웃거리며 들어갈까 망설인다' },
            { h: 15, map: 'HOLLOW',    spot: [11, 9], doing: '골짜기 안쪽을 혼자 정찰하고 있다' },
            { h: 19, map: 'DOJO',      spot: [12, 9], doing: '모닥불 앞에서 오늘 배운 것을 되짚는다' },
            { h: 23, map: 'DOJO',      spot: [12, 4], doing: '수련장으로 돌아가 눕는다' },
        ],
        rain: { map: 'DOJO', spot: [9, 7], doing: '비를 맞으면서도 허수아비를 놓지 않는다' },
        raid: { map: 'VILLAGE', spot: [14, 8], doing: '제일 앞에 나가 사냥꾼과 맞선다' },
    },

    // ── 티아맷: 망루지기 ────────────────────────────────────────────────
    Tiamat: {
        job: '망루지기',
        day: [
            { h: 0,  map: 'VILLAGE',   spot: [16, 6],  doing: '망루 위에서 밤을 지새운다' },
            { h: 7,  map: 'VILLAGE',   spot: [17, 10], doing: '교대하고 내려와 날개를 편다' },
            { h: 10, map: 'EAST_ROAD', spot: [6, 7],   doing: '동쪽 길목을 순찰한다' },
            { h: 14, map: 'SOUTH_ROAD', spot: [9, 7],  doing: '남쪽 길목까지 훑고 온다' },
            { h: 18, map: 'VILLAGE',   spot: [12, 10], doing: '모닥불 곁에서 날개를 말린다' },
            { h: 21, map: 'VILLAGE',   spot: [16, 6],  doing: '망루에 올라 밤을 맡는다' },
        ],
        rain: { map: 'VILLAGE', spot: [16, 6], doing: '비를 맞으며 망루를 지키고 있다' },
        raid: { map: 'VILLAGE', spot: [12, 7], doing: '하늘로 올라 사냥꾼의 수를 세고 있다' },
    },

    // ── 그론: 대장장이 ─────────────────────────────────────────────────
    Gron: {
        job: '대장장이',
        day: [
            { h: 0,  map: 'VILLAGE', spot: [16, 12], doing: '대장간 뒤편에서 코를 골고 있다' },
            { h: 6,  map: 'VILLAGE', spot: [15, 7],  doing: '화덕에 불을 지피고 있다' },
            { h: 9,  map: 'VILLAGE', spot: [15, 7],  doing: '모루 앞에서 쇠를 두드린다' },
            { h: 13, map: 'LAKE',    spot: [14, 11], doing: '물가에서 달군 쇠를 식히고 있다' },
            { h: 16, map: 'VILLAGE', spot: [15, 7],  doing: '주문 받은 것을 마저 벼르고 있다' },
            { h: 20, map: 'VILLAGE', spot: [12, 10], doing: '모닥불 앞에서 손을 쉰다' },
            { h: 23, map: 'VILLAGE', spot: [16, 12], doing: '대장간 문을 닫는다' },
        ],
        rain: { map: 'VILLAGE', spot: [15, 7], doing: '비가 오면 화덕이 더 잘 산다며 신이 났다' },
        raid: { map: 'VILLAGE', spot: [15, 7], doing: '대장간 앞을 지키고 서 있다' },
    },

    // ── 포코: 막내. 일이랄 게 없다 ──────────────────────────────────────
    Poco: {
        job: '심부름꾼',
        day: [
            { h: 0,  map: 'VILLAGE', spot: [8, 12],  doing: '배를 하늘로 하고 자고 있다' },
            { h: 7,  map: 'VILLAGE', spot: [8, 11],  doing: '아침부터 배가 고프다고 돌아다닌다' },
            { h: 10, map: 'VILLAGE', spot: [12, 7],  doing: '분수 가에서 물장난을 치고 있다' },
            { h: 13, map: 'LAKE',    spot: [15, 9],  doing: '호수에서 물고기를 노려보고 있다' },
            { h: 16, map: 'DEN',     spot: [9, 7],   doing: '남의 아지트에 마음대로 놀러 와 있다' },
            { h: 19, map: 'VILLAGE', spot: [12, 10], doing: '모닥불 앞에서 고기 냄새를 맡고 있다' },
            { h: 22, map: 'VILLAGE', spot: [8, 12],  doing: '하품을 하며 제 자리로 간다' },
        ],
        rain: { map: 'VILLAGE', spot: [12, 7], doing: '비 오는 게 신나서 웅덩이를 밟고 다닌다' },
        raid: { map: 'VILLAGE', spot: [9, 11], doing: '어른들 뒤에 숨어 덜덜 떨고 있다' },
    },
};

/** 시(0~24) 로 지금 칸을 고른다. 하루의 마지막 칸이 자정을 넘어 이어진다 */
export function slotAtHour(routine, hour) {
    const day = routine.day;
    let best = day[day.length - 1];
    for (const s of day) { if (s.h <= hour) best = s; }
    return best;
}
