"""Generate compact Quaywatch favicons: radar-ring Q mark on navy."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

NAVY = (11, 20, 32, 255)  # #0B1420
TEAL = (45, 212, 191, 255)  # #2DD4BF
AMBER = (240, 169, 63, 255)  # #F0A93F
CREAM = (232, 226, 208, 255)  # #E8E2D0


def draw_mark(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), NAVY)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    # Outer radar rings
    for i, scale in enumerate((0.92, 0.72, 0.52)):
        r = size * scale / 2
        width = max(1, int(size * (0.045 if i == 0 else 0.032)))
        bbox = [cx - r, cy - r, cx + r, cy + r]
        # Open ring (gap at lower-right for Q tail feel)
        d.arc(bbox, start=200, end=140, fill=TEAL, width=width)

    # Inner Q bowl (cream stroke)
    r_q = size * 0.28
    q_w = max(2, int(size * 0.07))
    d.ellipse(
        [cx - r_q, cy - r_q, cx + r_q, cy + r_q],
        outline=CREAM,
        width=q_w,
    )
    # Amber sweep wedge / beacon
    r_dot = size * 0.07
    d.ellipse(
        [cx - r_dot, cy - r_dot - size * 0.02, cx + r_dot, cy + r_dot - size * 0.02],
        fill=AMBER,
    )
    # Q tail (cream)
    tail_w = max(2, int(size * 0.08))
    x0, y0 = cx + r_q * 0.35, cy + r_q * 0.35
    x1, y1 = cx + r_q * 1.05, cy + r_q * 1.05
    d.line([(x0, y0), (x1, y1)], fill=CREAM, width=tail_w)
    # Small teal tick on tail tip
    tip = size * 0.045
    d.ellipse([x1 - tip, y1 - tip, x1 + tip, y1 + tip], fill=TEAL)
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
    images: dict[str, Image.Image] = {}
    for name, px in sizes.items():
        im = draw_mark(px)
        path = public / name
        im.save(path, format="PNG", optimize=True)
        images[name] = im
        print(f"wrote {path} ({path.stat().st_size} bytes)")

    # Multi-resolution ICO
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
