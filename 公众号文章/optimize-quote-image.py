# -*- coding: utf-8 -*-
"""把英文金句图适配为公众号中文配图：文内插图(1080x1440) + 封面(900x383, 2.35:1)。
用法: python3 optimize-quote-image.py [原图路径]"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = sys.argv[1] if len(sys.argv) > 1 else 'static/HHbUacAWAAEqaZj.jpeg'
OUT_DIR = 'static'
SONGTI = '/System/Library/Fonts/Supplemental/Songti.ttc'
CREAM = (246, 238, 225)
SHADOW = (15, 8, 6, 150)

# 改文案就改这里 ↓
INLINE_LINES = [('压力会骗你，', 0.25), ('让你以为每件事都十万火急。', 1.0),
                ('深呼吸。', 1.0), ('事情都是在平静里被解决的。', 0.0)]
COVER_LINES = [('压力最擅长骗你', 0.4), ('让你觉得每件事都十万火急', 0.0)]
INLINE_SIZE, COVER_SIZE = 64, 52

def font(size):
    return ImageFont.truetype(SONGTI, size, index=1)  # Songti SC Bold

def de_text_background(img, box, feather=60, blur=18):
    """抹掉 box 区域内的文字（缩小再放大+高斯模糊），边缘保持清晰。"""
    small = img.resize((max(2, img.width // 10), max(2, img.height // 10)), Image.LANCZOS)
    blurred = small.resize(img.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rectangle(box, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    return Image.composite(blurred, img, mask)

def draw_lines(draw, lines, cx, y_start, size, gap):
    y = y_start
    f = font(size)
    for text, extra in lines:
        bb = draw.textbbox((0, 0), text, font=f)
        x = cx - (bb[2] - bb[0]) / 2 - bb[0]
        draw.text((x + 2, y + 3 - bb[1]), text, font=f, fill=SHADOW)
        draw.text((x, y - bb[1]), text, font=f, fill=CREAM)
        y += (bb[3] - bb[1]) + int(size * (gap + extra))

def block_height(draw, lines, size, gap):
    f = font(size)
    return sum((draw.textbbox((0, 0), t, font=f)[3] - draw.textbbox((0, 0), t, font=f)[1])
               + int(size * (gap + e)) for t, e in lines)

src = Image.open(SRC).convert('RGB')

# 文内插图 1080x1440
big = src.resize((round(src.width * 1440 / src.height), 1440), Image.LANCZOS)
left = (big.width - 1080) // 2
inline = de_text_background(big.crop((left, 0, left + 1080, 1440)),
                            (int(0.10*1080), int(0.15*1440), int(0.90*1080), int(0.75*1440)), feather=70)
d = ImageDraw.Draw(inline, 'RGBA')
draw_lines(d, INLINE_LINES, 540, (1440 - block_height(d, INLINE_LINES, INLINE_SIZE, 0.8)) // 2, INLINE_SIZE, 0.8)
inline.save(f'{OUT_DIR}/文内插图-压力会骗你.png')

# 封面 900x383（裁取含底部雾色的横条）
full = de_text_background(src, (60, 150, 840, 900), feather=80, blur=24)
cover = full.crop((0, 660, 900, 1043)).filter(ImageFilter.GaussianBlur(2))
d = ImageDraw.Draw(cover, 'RGBA')
draw_lines(d, COVER_LINES, 450, (383 - block_height(d, COVER_LINES, COVER_SIZE, 0.6)) // 2, COVER_SIZE, 0.6)
cover.save(f'{OUT_DIR}/封面-压力会骗你.png')
print('saved:', f'{OUT_DIR}/文内插图-压力会骗你.png', f'{OUT_DIR}/封面-压力会骗你.png')
