"""Generate Quaywatch favicons: shield + chain mark (industrial amber / steel blue)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

STEEL_BG = (18, 26, 36, 255)  # #121A24
STEEL_BLUE = (59, 130, 246, 255)  # #3B82F6
AMBER = (245, 158, 11, 255)  # #F59E0B
AMBER_LIGHT = (251, 191, 36, 255)  # #FBBF24
LIVE_BLUE = (56, 189, 248, 255)  # #38BDF8


def draw_mark(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), STEEL_BG)
    d = ImageDraw.Draw(img)
    s = size / 64.0
    cx = cy = size / 2

    # Shield
    top = 9 * s
    shield = [
        (32 * s, top),
        (50 * s, 17 * s),
        (50 * s, 31.5 * s),
        (32 * s, 52 * s),
        (14 * s, 31.5 * s),
        (14 * s, 17 * s),
    ]
    d.polygon(shield, fill=(59, 130, 246, 36), outline=STEEL_BLUE, width=max(1, int(2.2 * s)))

    # Chain links (simplified ellipses)
    for ox, color in ((22, AMBER), (34, AMBER_LIGHT)):
        rx, ry = 6.2 * s, 4.8 * s
        ox_c = (ox + 5.5) * s
        oy_c = 34.5 * s
        d.ellipse(
            [ox_c - rx, oy_c - ry, ox_c + rx, oy_c + ry],
            outline=color,
            width=max(1, int(2.4 * s)),
        )

    # Scan line
    y = 33 * s
    d.line([(11 * s, y), (53 * s, y)], fill=LIVE_BLUE, width=max(1, int(1.4 * s)))
    r = 2.2 * s
    d.ellipse([cx - r, y - r, cx + r, y + r], fill=LIVE_BLUE)

    return img


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    public = root / "public"
    public.mkdir(parents=True, exist_ok=True)

    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "apple-touch-icon.png": 180,
        "quaywatch-icon.png": 192,
    }
    for name, px in sizes.items():
        im = draw_mark(px)
        path = public / name
        im.save(path, format="PNG", optimize=True)
        print(f"wrote {path} ({path.stat().st_size} bytes)")

    ico_path = public / "favicon.ico"
    ico_imgs = [draw_mark(s) for s in (16, 32, 48)]
    ico_imgs[0].save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=ico_imgs[1:],
    )
    print(f"wrote {ico_path} ({ico_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
