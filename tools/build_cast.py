"""마을 인물 스프라이트 시트(assets/sprites/dragons/cast.png)와 대화창 초상화(assets/portraits/)를 만든다.

원본은 git 에 안 올리는 assets/raw/pixellab_test/picks/<이름>.png (바르코 GPT-image 로 뽑아 고른 1024px 그림) 와
assets/raw/pixellab_test/portraits/final/<이름>_<표정>.png (96px). 그림은 전부 왼쪽을 본다 (static 시트 규칙).

    python tools/build_cast.py

찍어 주는 boxes 를 src/data/sprites.js 의 CAST.boxes 에 붙여 넣는다.
"""
from collections import deque
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'assets/raw/pixellab_test'
# src/data/sprites.js 의 CAST_NAMES 와 같은 순서
NAMES = ['elder', 'tiamat', 'poco', 'gron', 'nara', 'kairon', 'ember', 'mira', 'vesna',
         'ignar', 'moss', 'fern', 'garam', 'dol', 'riun', 'seiran', 'haru', 'yuan']
CW, CH, COLS = 192, 160, 6      # 칸 크기·열 수
FIT_W, FIT_H = 150, 120         # 그림이 들어갈 최대 크기 (체구 차이는 npcs.js 의 scale 이 준다)
COLORS = 32


def cut_border(im, thr=235):
    """가장자리에서 이어진 흰색만 투명하게 한다 (갈기 속 흰색은 남긴다)"""
    im = im.convert('RGBA')
    w, h = im.size
    src = im.convert('RGB').load()
    mask = Image.new('L', (w, h), 0)
    m = mask.load()
    seen = bytearray(w * h)
    q = deque([(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)])
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b = src[x, y]
        if r > thr and g > thr and b > thr:
            m[x, y] = 255
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    q.append((nx, ny))
    a = im.getchannel('A').point(lambda v: 255)
    a.paste(0, None, mask)
    im.putalpha(a)
    return im.crop(im.getbbox())


def pixelize(im, fit_w, fit_h, colors=COLORS):
    s = min(fit_w / im.width, fit_h / im.height)
    small = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    rgb = small.convert('RGB').quantize(colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    rgb.putalpha(small.getchannel('A').point(lambda v: 255 if v > 140 else 0))
    return rgb


def main():
    rows = (len(NAMES) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (CW * COLS, CH * rows), (0, 0, 0, 0))
    boxes = []
    for i, name in enumerate(NAMES):
        sp = pixelize(cut_border(Image.open(RAW / 'picks' / f'{name}.png')), FIT_W, FIT_H)
        cx, cy = (i % COLS) * CW, (i // COLS) * CH
        x, y = (CW - sp.width) // 2, CH - sp.height      # 가로 가운데, 발은 칸 바닥
        sheet.paste(sp, (cx + x, cy + y), sp)
        boxes.append((x, y, sp.width, sp.height))
    out = ROOT / 'assets/sprites/dragons/cast.png'
    sheet.save(out)
    print('wrote', out, sheet.size)
    print('boxes: [')
    for (x, y, w, h), name in zip(boxes, NAMES):
        print(f'        {{ x: {x}, y: {y}, w: {w}, h: {h} }},   // {name}')
    print('],')

    pdir = ROOT / 'assets/portraits'
    pdir.mkdir(exist_ok=True)
    n = 0
    for f in sorted((RAW / 'portraits/final').glob('*_*.png')):
        if f.name.startswith('sheet'):
            continue
        shutil.copy(f, pdir / f.name)
        n += 1
    print('portraits copied:', n)


if __name__ == '__main__':
    main()
