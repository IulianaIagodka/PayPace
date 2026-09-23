#!/usr/bin/env python3
"""Prepare PayPace screenshots for App Store Connect (6.7\" iPhone)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SRC = Path("/home/ubuntu/.cursor/projects/workspace/assets")
OUT = Path("/opt/cursor/artifacts/appstore-screenshots")
OUT.mkdir(parents=True, exist_ok=True)

TARGET = (1290, 2796)  # iPhone 6.7"
ORBITRON = Path(
    "/workspace/node_modules/@expo-google-fonts/orbitron/700Bold/Orbitron_700Bold.ttf"
)
BARLOW = Path(
    "/workspace/node_modules/@expo-google-fonts/barlow-condensed/700Bold/BarlowCondensed_700Bold.ttf"
)
SF = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")

BG = (10, 8, 6)
GREEN = (111, 175, 69)
GOLD = (154, 138, 106)
WHITE = (228, 220, 208)
TAB_DIM = (90, 80, 72)


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path if path.exists() else SF), size)


def cover(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill=BG) -> None:
    draw.rectangle(box, fill=fill)


def draw_status_bar(im: Image.Image) -> None:
    """Replace messy status bar with a clean App Store–friendly strip."""
    w, h = im.size
    draw = ImageDraw.Draw(im)
    pix = im.load()
    # Device status icons live in this band after upscale (below the island).
    y0, y1 = 68, 128
    sample = pix[w // 2, min(y1 + 6, h - 1)]
    cover(draw, (0, y0, w, y1), fill=sample)
    # Also wipe any leftover top-left/top-right chrome above the band
    cover(draw, (0, 0, w, y0), fill=sample)

    tfont = font(SF, 36)
    time = "9:41"
    draw.text((52, 82), time, fill=WHITE, font=tfont)

    right = w - 48
    base_y = 90
    for i, bh in enumerate((12, 16, 20, 24)):
        x = right - 118 + i * 11
        draw.rectangle((x, base_y + (24 - bh), x + 8, base_y + 24), fill=WHITE)

    bx, by, bw, bh = right - 56, 84, 48, 24
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=5, outline=WHITE, width=2)
    draw.rectangle((bx + bw, by + 7, bx + bw + 5, by + bh - 7), fill=WHITE)
    draw.rounded_rectangle(
        (bx + 4, by + 4, bx + bw - 4, by + bh - 4), radius=3, fill=WHITE
    )


def patch_tab_trans(im: Image.Image) -> None:
    """Replace bottom-tab label TRANS → SPEND on screens that have the tab bar."""
    w, h = im.size
    draw = ImageDraw.Draw(im)
    # second tab column
    col_l = int(w * 0.25)
    col_r = int(w * 0.50)
    # label band
    y0, y1 = int(h * 0.952), int(h * 0.975)
    # sample bg under label
    pix = im.load()
    sample = pix[(col_l + col_r) // 2, (y0 + y1) // 2]
    # slightly taller cover to erase TRANS
    cover(draw, (col_l + 20, y0 - 2, col_r - 20, y1 + 4), fill=sample)

    lab = font(BARLOW if BARLOW.exists() else ORBITRON, 22)
    text = "SPEND"
    tw = draw.textlength(text, font=lab)
    cx = (col_l + col_r) / 2
    draw.text((cx - tw / 2, y0), text, fill=TAB_DIM, font=lab)


def patch_spend_link(im: Image.Image) -> None:
    """Home RECENT row: TRANS › → SPEND ›."""
    w, h = im.size
    draw = ImageDraw.Draw(im)
    # approximate link position (right side, above recent panel / mid-lower)
    # Search for green-ish pixels that form TRANS in upper-mid area — use known band
    # From screenshots, RECENT header is roughly 68–72% down when categories present,
    # ~62–66% when Plus upsell is shown.
    pix = im.load()
    candidates = []
    for y in range(int(h * 0.58), int(h * 0.78)):
        greens = 0
        for x in range(int(w * 0.72), int(w * 0.95)):
            r, g, b = pix[x, y][:3]
            if g > 100 and g > r + 20 and g > b + 20:
                greens += 1
        if greens > 25:
            candidates.append(y)
    if not candidates:
        return
    y_mid = candidates[len(candidates) // 2]
    y0, y1 = y_mid - 18, y_mid + 22
    x0, x1 = int(w * 0.74), int(w * 0.96)
    sample = pix[x0 - 10, y_mid]
    cover(draw, (x0, y0, x1, y1), fill=sample)
    lab = font(BARLOW if BARLOW.exists() else ORBITRON, 26)
    text = "SPEND ›"
    tw = draw.textlength(text, font=lab)
    draw.text((x1 - tw - 8, y0 + 4), text, fill=GREEN, font=lab)


def patch_try_plus_demo(im: Image.Image) -> bool:
    """Replace TRY PLUS (DEMO) button label with GET PLUS."""
    w, h = im.size
    draw = ImageDraw.Draw(im)
    pix = im.load()

    def is_green(p):
        r, g, b = p[:3]
        return g > 130 and g > r + 35 and g > b + 20

    rows = []
    for y in range(int(h * 0.45), int(h * 0.78)):
        gcount = sum(
            1
            for x in range(int(w * 0.1), int(w * 0.9), 2)
            if is_green(pix[x, y])
        )
        if gcount > 50:
            rows.append(y)
    if not rows:
        return False

    # Contiguous clusters; first tall-ish inner band after a top rim is the CTA
    clusters: list[list[int]] = []
    cur: list[int] = []
    for y in rows:
        if not cur or y <= cur[-1] + 3:
            cur.append(y)
        else:
            clusters.append(cur)
            cur = [y]
    if cur:
        clusters.append(cur)

    # Prefer a short top rim + short bottom rim pair for the Plus CTA
    # CTA top rim ≈ first cluster with max green > 400
    top = next((c for c in clusters if len(c) <= 10), None)
    if not top:
        return False
    # next short cluster after some gap is bottom rim
    bottom = None
    for c in clusters:
        if c[0] > top[-1] + 40 and len(c) <= 10:
            bottom = c
            break
    if not bottom:
        # fallback: cover fixed height under top rim
        y0, y1 = top[-1] + 4, top[-1] + 160
    else:
        y0, y1 = top[-1] + 4, bottom[0] - 4

    x0, x1 = int(w * 0.08) + 10, int(w * 0.92) - 10
    sample = (16, 24, 14)
    cover(draw, (x0, y0, x1, y1), fill=sample)
    lab = font(ORBITRON, 38)
    text = "GET PLUS"
    tw = draw.textlength(text, font=lab)
    th = lab.getbbox(text)[3]
    draw.text(((w - tw) / 2, y0 + (y1 - y0 - th) / 2), text, fill=GREEN, font=lab)
    return True


def patch_add_expense_copy(im: Image.Image) -> None:
    """Soften Plus-only camera copy on Add Expense for store accuracy."""
    w, h = im.size
    draw = ImageDraw.Draw(im)
    pix = im.load()
    # Subhead under ADD EXPENSE
    y0, y1 = int(h * 0.145), int(h * 0.195)
    sample = pix[40, (y0 + y1) // 2]
    cover(draw, (32, y0, w - 32, y1), fill=sample)
    body = font(SF, 28)
    lines = [
        "Log it yourself anytime. Free includes 3 receipt",
        "scans; bank statements are Plus.",
    ]
    y = y0 + 2
    for line in lines:
        draw.text((40, y), line, fill=GOLD, font=body)
        y += 34

    # PHOTO RECEIPT hint under left card
    # Rough band under camera card
    hy0, hy1 = int(h * 0.30), int(h * 0.335)
    sample2 = pix[int(w * 0.18), (hy0 + hy1) // 2]
    cover(draw, (int(w * 0.08), hy0, int(w * 0.48), hy1), fill=sample2)
    hint = font(SF, 22)
    draw.text((int(w * 0.10), hy0 + 2), "3 free · camera or gallery", fill=GOLD, font=hint)


def process(src: Path, name: str, *, tabs: bool, spend_link: bool, demo: bool, add_copy: bool) -> Path:
    im = Image.open(src).convert("RGB")
    im = im.resize(TARGET, Image.Resampling.LANCZOS)
    draw_status_bar(im)
    if tabs:
        patch_tab_trans(im)
    if spend_link:
        patch_spend_link(im)
    if demo:
        patch_try_plus_demo(im)
    if add_copy:
        patch_add_expense_copy(im)
    out = OUT / name
    im.save(out, "PNG", optimize=True)
    print(f"wrote {out} {im.size}")
    return out


JOBS = [
    # Best App Store set
    dict(
        src=SRC / "E51CD4AB-4EA6-4B9F-83BE-CC9761FEBA2F_L0_001.jpg",
        name="01-home-safe-spend.png",
        tabs=True,
        spend_link=True,
        demo=False,
        add_copy=False,
    ),
    dict(
        src=SRC / "D91EF183-60CC-4F3D-9024-D54A550B19C9_L0_001.jpg",
        name="02-pace.png",
        tabs=True,
        spend_link=False,
        demo=False,
        add_copy=False,
    ),
    dict(
        src=SRC / "4AD9ED0F-9DFE-4FC9-BF50-0A39CAB8F380_L0_001.jpg",
        name="03-add-expense.png",
        tabs=False,
        spend_link=False,
        demo=False,
        add_copy=True,
    ),
    dict(
        src=SRC / "AB86D926-62D6-4F93-ADF4-F533B70E96E4_L0_001.jpg",
        name="04-scan-receipt.png",
        tabs=False,
        spend_link=False,
        demo=False,
        add_copy=False,
    ),
    dict(
        src=SRC / "B5FCD62A-FCAD-47DB-B8A4-6243661AC63C_L0_001.jpg",
        name="05-statement.png",
        tabs=False,
        spend_link=False,
        demo=False,
        add_copy=False,
    ),
    # Fixed demo home as optional 6th
    dict(
        src=SRC / "BBEF1315-EC83-4EEE-8ABA-65C578FB2018_L0_001.jpg",
        name="06-home-get-plus.png",
        tabs=True,
        spend_link=True,
        demo=True,
        add_copy=False,
    ),
]


def main() -> None:
    for job in JOBS:
        process(**job)
    print("done →", OUT)


if __name__ == "__main__":
    main()
