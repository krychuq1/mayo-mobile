import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H = 1284, 2778
shot_path, out_path, *lines = sys.argv[1:]
FONT = None
import glob
cands = glob.glob('/Users/krystian/mayo-mobile/node_modules/@expo-google-fonts/inter/**/Inter_700Bold.ttf', recursive=True) or glob.glob('/Users/krystian/mayo-mobile/node_modules/@expo-google-fonts/inter/**/*700Bold*.ttf', recursive=True)
FONT = cands[0] if cands else '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
# background: vertical gradient #FFF7E3 -> #FFECBC
bg = Image.new('RGB', (W, H), (255, 247, 227))
px = bg.load()
c0, c1 = (255, 247, 227), (255, 236, 188)
for y in range(H):
    t = y / (H - 1)
    col = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    for x in range(W):
        px[x, y] = col
# soft orange blob top-left
blob = Image.new('RGBA', (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(blob)
bd.ellipse((-260, -300, 560, 420), fill=(247, 119, 16, 60))
blob = blob.filter(ImageFilter.GaussianBlur(40))
bg = Image.alpha_composite(bg.convert('RGBA'), blob)
# headline
draw = ImageDraw.Draw(bg)
font = ImageFont.truetype(FONT, 88)
y = 200
for line in lines:
    w = draw.textlength(line, font=font)
    draw.text(((W - w) / 2, y), line, font=font, fill=(62, 38, 20))
    y += 112
# screenshot card
shot = Image.open(shot_path).convert('RGBA')
cw = 1000
ch = int(shot.height * cw / shot.width)
shot = shot.resize((cw, ch), Image.LANCZOS)
radius = 70
mask = Image.new('L', (cw, ch), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw, ch), radius=radius, fill=255)
card_y = y + 120
# shadow
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh).rounded_rectangle(((W - cw) // 2 + 10, card_y + 30, (W - cw) // 2 + cw + 10, card_y + ch + 30), radius=radius, fill=(120, 80, 20, 90))
sh = sh.filter(ImageFilter.GaussianBlur(35))
bg = Image.alpha_composite(bg, sh)
bg.paste(shot, ((W - cw) // 2, card_y), mask)
bg.convert('RGB').save(out_path, 'PNG')
print(out_path, bg.size, 'font:', FONT)
