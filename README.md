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
  core/             config, state(런타임 상태), input, camera, utils
  world/            biomes, terrain(타일맵 생성/그리기), spawn(월드 생성/적 스폰)
  data/             dialogues(대사 트리), npcs(고정 NPC 정의), sprites(드래곤 시트), tiles(타일 좌표)
  entities/         Dragon, BabyDragon, Enemy, Human, Nest, Fireball, Particle, Item, Prop
  render/           assets(이미지 로더), spritesheet(애니메이션), tint(색상 교체), dragonSprites,
                    pixel(픽셀 스프라이트/빛 번짐/아이콘), vfx(일회성 효과), lighting(낮밤 조명)
  systems/          combat(충돌), raid(습격), kids(자식 명부), dialogue(대화 진행)
  ui/               hud, dialogueUI, kidsPanel, customizer, toast
```

에셋 출처와 라이선스는 [CREDITS.md](CREDITS.md) 참고. `assets/raw/`는 내려받은 원본 보관용이라 저장소에 올리지 않는다.
