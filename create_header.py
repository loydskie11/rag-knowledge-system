from PIL import Image, ImageDraw, ImageFont
import os

# Create a 2480 x 300 header (approx A4 width at 300 DPI, height 300)
width = 2480
height = 350
img = Image.new('RGB', (width, height), color=(255, 255, 255))
draw = ImageDraw.Draw(img)

# Try to load a font
try:
    font_bold_huge = ImageFont.truetype("arialbd.ttf", 72)
    font_bold = ImageFont.truetype("arialbd.ttf", 48)
    font_regular = ImageFont.truetype("arial.ttf", 36)
except:
    font_bold_huge = ImageFont.load_default()
    font_bold = ImageFont.load_default()
    font_regular = ImageFont.load_default()

# Draw text centered
texts = [
    ("Republic of the Philippines", font_regular, (0, 0, 0)),
    ("CEBU TECHNOLOGICAL UNIVERSITY", font_bold_huge, (0, 0, 128)),
    ("ARGAO CAMPUS", font_bold, (0, 0, 0)),
    ("Ed Kintanar Street, Lamacan, Argao, Cebu", font_regular, (0, 0, 0))
]

y_offset = 40
for text, font, color in texts:
    # get text size
    # textbbox is standard in newer PIL
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
    except:
        w = len(text) * 20
        h = 40
    x = (width - w) / 2
    draw.text((x, y_offset), text, font=font, fill=color)
    y_offset += h + 15

# Draw a line at the bottom
draw.line([(100, height-20), (width-100, height-20)], fill=(200, 100, 0), width=8)

# Try to paste the logo on the left
try:
    logo = Image.open(r"c:\Projects\rag-governance\public\ctu-logo.png").convert("RGBA")
    logo = logo.resize((220, 220))
    # paste with alpha channel as mask
    img.paste(logo, (200, 50), logo)
except Exception as e:
    print("Logo paste failed:", e)

img.save(r"c:\Projects\rag-governance\public\ctu-argao-header.jpg", quality=90)

# Footer
footer = Image.new('RGB', (width, 150), color=(255, 255, 255))
fdraw = ImageDraw.Draw(footer)
fdraw.line([(100, 20), (width-100, 20)], fill=(0, 0, 0), width=4)
try:
    fbbox = fdraw.textbbox((0, 0), "www.ctu.edu.ph", font=font_regular)
    fw = fbbox[2] - fbbox[0]
    fh = fbbox[3] - fbbox[1]
except:
    fw = 200
    fh = 40
fdraw.text(((width-fw)/2, 50), "www.ctu.edu.ph", font=font_regular, fill=(0, 0, 0))
footer.save(r"c:\Projects\rag-governance\public\ctu-argao-footer.jpg", quality=90)

print("Created header and footer images!")
