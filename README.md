# Dragonia
바이브를 느끼며 드래곤 되기 게임

## 실행
ES 모듈을 쓰기 때문에 `index.html`을 더블클릭(file://)하면 열리지 않는다. 정적 서버로 띄운다.

```bash
python -m http.server 8901
```

그다음 http://localhost:8901 접속. GitHub Pages에 올리면 그대로 동작한다.

## 구조
```
index.html          DOM 뼈대
styles/main.css     스타일
src/
  main.js           부트스트랩 + 게임 루프 + 렌더 순서
  core/             config, state(런타임 상태), input(키보드·마우스), camera, utils
  world/            biomes(바이옴 팔레트), mapgen(지도 한 장 찍어 내기), terrain(지금 지도의 지형),
                    collision(물·벽·소품 충돌), dungeon(무작위 지하 미궁 생성), spawn(적 배치)
  data/             dialogues(대사 트리), npcs(고정 NPC), sprites(드래곤 시트), tiles(타일 좌표),
                    elements(브레스 속성/성장 단계), enemies(적·사냥꾼·보스), quests(퀘스트),
                    npcTalk(NPC 고유 대화·데이트·관계 장면), skills(스킬 13종),
                    story(수련·승급 시험·아침 장면), chronicle(돌아다니다 터지는 사건),
                    dungeons(굴 입구), materials(대장간 소재·조리법), maps(지도 17장 명세)
  entities/         Dragon, BabyDragon, Enemy, Human, Nest, Projectile, Boss, Hazard, Particle, Item, Prop
  render/           assets, spritesheet, tint, dragonSprites, pixel(픽셀 아이콘), vfx,
                    lighting(낮밤 조명), palette(지형 리컬러), cursor(마우스 조준점)
  systems/          combat, raid, kids, dialogue, status, quests(퀘스트·추적),
                    weather, save, npcActions(NPC 상호작용), relics(유물 장착),
                    smithing(대장간), travel(이동 석비), delve(굴 탐험),
                    chronicle(사건·장면 재생), events(밤 이벤트), audio, kidActions, story,
                    world(지도 오가기·개체 배치), tutorial(길잡이)
  ui/               hud(미니맵·길잡이), dialogueUI, kidsPanel, journal(퀘스트·기록·유물·도감 탭),
                    customizer, toast, touch(모바일 조작)
```

## 조작
- **WASD** 이동 · **Shift** 탁: 대시(무적) / 꾹: 달리기
- **마우스** 커서 쪽으로 조준 · **왼클릭(꾹)** 브레스 연사
- **1 2 3** 숨결 속성 · **Q F R** 스킬 · **B** 스킬 수첩 · **X** 필살기
- **Space** 말 걸기 · 둥지에서 잠자기 · 대화창 넘기기 (**T** 도 같음)
- **방향키** 대화 선택지 고르기 (**Space** 로 결정)
- **E** 줍기 · 먹기 · 상자 · 열매 · 낚시 · 이동 석비 · 굴 드나들기
- **L** 플러팅 · **K** 가족 · **J** 일지
- **마우스 휠** 시점 확대·축소 (**V** 로도 단계를 넘긴다) · **M** 소리 · **Esc** 닫기

## 세계
세계는 **지도 17장**으로 쪼개져 있다. 한 장은 화면 한두 개 크기라 한눈에 들어오고,
가장자리 **포탈**을 밟으면 옆 지도로 넘어간다 (메이플·스타듀 식).

```
                   나의 아지트                카이론의 수련장
                        │                          │
  신비의 호수 ── 드래곤 빌리지 ──────── 동쪽 숲길 ── 달빛 골짜기 ── 뼈용 둥지
                        │                                │
                   남쪽 숲길                          서리 봉우리 ── 얼음용 둥지
                    ╱      ╲
             모래 언덕      덩굴 밀림 ── 독사 둥지
                 │              │
            이무기 둥지     단풍 골 ── 불의 산 ── 화룡 둥지
```

지도 하나는 `data/maps.js` 의 명세 한 줄에서 `world/mapgen.js` 가 찍어 낸다 (씨앗 고정이라
다시 와도 모양이 같다). 물·나무·바위·집은 길을 막고, 가장자리는 빽빽한 숲이 막아
포탈로만 드나들 수 있다.

길목마다 **이동 석비**가 서 있다. 가까이 가면 깨어나고, 그 뒤로는 깨운 석비끼리 건너뛸 수 있다.

**굴 입구**는 지도 위에 흩어져 있다 (`data/dungeons.js`). 굴 안은 들어갈 때마다 방과 복도가
새로 그려진다. 층마다 파수꾼을 잡아야 아래로 내려갈 수 있고, 나올 때 가장 깊이 내려간
만큼 보상을 받는다. 처음 만나는 굴은 마을에서 한 지도 거리인 동쪽 숲길의 **나무뿌리 구멍**.

## 이야기
보스는 "가서 잡아라"로 시작하지 않는다. 달빛 골짜기에 발을 들이면 울음을 듣고,
마을에 한여름 눈이 내리면 원인을 찾아 나서는 식으로, **돌아다니다 사건이 터지며** 열린다
(`data/chronicle.js`). 호감도 단계가 오를 때마다 인물마다 장면이 하나씩 재생된다.

에셋 출처와 라이선스는 [CREDITS.md](CREDITS.md) 참고. `assets/raw/`는 내려받은 원본 보관용이라 저장소에 올리지 않는다.
