# 서체

이 폴더에 아래 파일을 넣으면 게임이 그 서체로 바뀐다 (`styles/main.css` 맨 위의 `@font-face`).
파일이 없으면 Google Fonts(Gowun Batang · Noto Sans KR)로 물러나므로 게임은 그대로 돈다.

Windows 라면 (PowerShell, 저장소 폴더에서):
```
Copy-Item "$env:USERPROFILE\Downloads\KOTRA LEAP.ttf" assets\fonts\
Copy-Item "$env:USERPROFILE\Downloads\BookkMyungjo_*.ttf" assets\fonts\
```

| 쓰임 | 서체 | 파일 이름 (이 중 하나) |
|---|---|---|
| 제목·강조 (로고, 지역 이름, 장면 제목, 말하는 이, 보스 이름, 판 제목, 퀘스트 제목, 간발!·빈틈! 같은 뜬 글자) | KOTRA 도약체 | `KOTRA LEAP.ttf` · `KOTRA_LEAP.ttf` · `KOTRA_LEAP.otf` · `KOTRA_DOYAK.ttf` |
| 본문 (대사, 안내, 일지, 이름표, 말풍선) | 부크크 명조 Light | `BookkMyungjo_Light.ttf` · `Bookk Myungjo Light.ttf` · `BookkMyungjo-Light.ttf` · `bookkmyungjo_light.ttf` · `BookkMyungjo_Light.otf` |
| 본문의 굵은 글 (font-weight 600 이상) | 부크크 명조 Bold | `BookkMyungjo_Bold.ttf` · `Bookk Myungjo Bold.ttf` · `BookkMyungjo-Bold.ttf` · `bookkmyungjo_bold.ttf` · `BookkMyungjo_Bold.otf` |

내려받은 파일 이름이 표에 없으면 표의 이름 중 하나로 바꿔 넣거나, `styles/main.css` 의 `src:` 줄에 그 이름을 보태면 된다.
GitHub Pages 는 대소문자를 가리므로 이름을 정확히 맞춘다. 숫자는 그대로 Fredoka 를 쓴다.

라이선스와 출처는 `CREDITS.md` 의 '서체' 절.
