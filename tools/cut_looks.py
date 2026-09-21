# looks.png 재단. 원본 두 장에서 용을 '연결된 덩어리'로 찾아 정확히 오려,
# 크기가 같은 칸에 가운데·아래 정렬로 다시 깐다.
#   - 원본은 64px 격자에 맞게 그려져 있지 않다. 가장 큰 용(75x57)은 격자선을 넘어가서
#     격자대로 자르면 목이 잘리고, 잘린 조각이 옆 칸에 섞여 들어간다.
#   - 용마다 크기가 제각각이라, 칸 안에서 그림이 실제로 차지하는 자리를 따로 뽑아 둔다.
#     이름표를 머리 바로 위에 붙이려면 칸 높이가 아니라 이 값이 필요하다.
# 실행: python tools/cut_looks.py [출력경로]
import sys, json
from collections import deque
from PIL import Image
import numpy as np

SOURCES = [('assets/raw/new_dragons/pxl_dragon.png', 64), ('assets/raw/new_dragons/image84.png', 66)]
COLS, CELL_W, CELL_H, MIN_PIXELS = 13, 80, 64, 150


def find_dragons(path, band):
    """알파가 있는 픽셀을 8방향으로 이어 붙여 용 하나를 한 덩어리로 찾는다."""
    im = Image.open(path).convert('RGBA')
    solid = np.array(im)[:, :, 3] > 0
    h, w = solid.shape
    seen = np.zeros_like(solid)
    found = []
    for sy in range(h):
        for sx in range(w):
            if not solid[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)]); seen[sy, sx] = True
            x0 = x1 = sx; y0 = y1 = sy; n = 0
            while q:
                y, x = q.popleft(); n += 1
                x0, x1 = min(x0, x), max(x1, x)
                y0, y1 = min(y0, y), max(y1, y)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
            if n >= MIN_PIXELS:
                # 줄은 덩어리의 세로 '중심'으로 가른다. 맨 윗픽셀로 가르면 윗줄에 1px 걸친
                # 용이 앞줄로 밀려 올라가 LOOK_NAMES 와 짝이 어긋난다.
                found.append((((y0 + y1) // 2) // band, x0, im.crop((x0, y0, x1 + 1, y1 + 1))))
    found.sort(key=lambda f: (f[0], f[1]))      # 원본에 놓인 차례 그대로 (LOOK_NAMES 순서를 지킨다)
    return [f[2] for f in found]


def main(out_path):
    dragons = [d for path, band in SOURCES for d in find_dragons(path, band)]
    rows = -(-len(dragons) // COLS)
    widest = max(d.width for d in dragons); tallest = max(d.height for d in dragons)
    if widest > CELL_W or tallest > CELL_H:
        sys.exit(f'칸({CELL_W}x{CELL_H})이 가장 큰 용({widest}x{tallest})보다 작다')

    sheet = Image.new('RGBA', (COLS * CELL_W, rows * CELL_H), (0, 0, 0, 0))
    boxes = []
    for i, d in enumerate(dragons):
        cx, cy = (i % COLS) * CELL_W, (i // COLS) * CELL_H
        x = cx + (CELL_W - d.width) // 2         # 가로 가운데
        y = cy + CELL_H - d.height               # 아래 정렬 (발이 바닥에 닿는 자리)
        sheet.paste(d, (x, y), d)
        boxes.append({'x': x - cx, 'y': y - cy, 'w': d.width, 'h': d.height})

    sheet.save(out_path)
    print(f'{out_path}  {sheet.width}x{sheet.height}  용 {len(dragons)}마리  칸 {CELL_W}x{CELL_H}')
    print('가장 큼:', widest, 'x', tallest)
    print(json.dumps(boxes, separators=(',', ':')))


main(sys.argv[1] if len(sys.argv) > 1 else 'assets/sprites/dragons/looks.png')
