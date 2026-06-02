"""
Generate washing machine app icon for LaundryClassifier
- Foreground: washing machine icon (centered in 108x108 safe zone within 432x432)
- Background: solid green
- Monochrome: silhouette version
- Legacy ic_launcher / ic_launcher_round
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

BASE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(BASE, "android", "app", "src", "main", "res")

# Adaptive icon sizes: foreground/background are 108dp with 72dp visible area
# mdpi=108, hdpi=162, xhdpi=216, xxhdpi=324, xxxhdpi=432
ADAPTIVE_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

# Legacy icon sizes
LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

BG_COLOR = (34, 197, 94)       # #22c55e green
MACHINE_COLOR = (255, 255, 255) # white
DOOR_RING = (220, 230, 220)     # light gray ring
WATER_COLOR = (59, 130, 246)    # #3B82F6 blue
DARK = (31, 31, 29)             # #1F1F1D


def draw_washing_machine(draw, size, fg_color=MACHINE_COLOR, water=WATER_COLOR, is_mono=False):
    """Draw a washing machine icon centered in the given size."""
    # Safe zone: center 66.7% of adaptive icon
    margin = size * 0.185
    area = size - margin * 2
    cx, cy = size / 2, size / 2

    # Machine body (rounded rectangle)
    body_w = area * 0.72
    body_h = area * 0.78
    bx1 = cx - body_w / 2
    by1 = cy - body_h / 2 + area * 0.02
    bx2 = cx + body_w / 2
    by2 = cy + body_h / 2 + area * 0.02
    r = body_w * 0.12

    color = fg_color if not is_mono else (255, 255, 255)

    # Body with rounded corners
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=r, fill=color)

    # Top panel (control area)
    panel_h = body_h * 0.18
    panel_y2 = by1 + panel_h

    panel_color = (240, 240, 235) if not is_mono else (230, 230, 230)
    draw.rounded_rectangle(
        [bx1, by1, bx2, panel_y2],
        radius=r,
        fill=panel_color
    )
    # Fix bottom corners of panel (sharp)
    draw.rectangle([bx1, by1 + r, bx2, panel_y2], fill=panel_color)

    # Control knobs on top panel
    knob_r = body_w * 0.04
    knob_y = by1 + panel_h * 0.5
    knob_color = DARK if not is_mono else (100, 100, 100)

    # Power button (left)
    draw.ellipse([
        bx1 + body_w * 0.12 - knob_r, knob_y - knob_r,
        bx1 + body_w * 0.12 + knob_r, knob_y + knob_r
    ], fill=knob_color)

    # Dial (center-right)
    dial_r = knob_r * 1.6
    dial_x = bx1 + body_w * 0.75
    draw.ellipse([
        dial_x - dial_r, knob_y - dial_r,
        dial_x + dial_r, knob_y + dial_r
    ], fill=knob_color)

    # Display area (small rectangle)
    disp_w = body_w * 0.25
    disp_h = panel_h * 0.35
    disp_x = bx1 + body_w * 0.35
    disp_y = knob_y - disp_h / 2
    disp_color = (200, 220, 200) if not is_mono else (200, 200, 200)
    draw.rounded_rectangle(
        [disp_x, disp_y, disp_x + disp_w, disp_y + disp_h],
        radius=disp_h * 0.3,
        fill=disp_color
    )

    # Door (big circle)
    door_cx = cx
    door_cy = panel_y2 + (by2 - panel_y2) * 0.5
    door_r = min(body_w, by2 - panel_y2) * 0.36

    # Door outer ring
    ring_color = (200, 205, 200) if not is_mono else (210, 210, 210)
    draw.ellipse([
        door_cx - door_r - door_r * 0.1, door_cy - door_r - door_r * 0.1,
        door_cx + door_r + door_r * 0.1, door_cy + door_r + door_r * 0.1
    ], fill=ring_color)

    # Door glass (inner circle) - blue water
    glass_color = water if not is_mono else (180, 180, 180)
    draw.ellipse([
        door_cx - door_r, door_cy - door_r,
        door_cx + door_r, door_cy + door_r
    ], fill=glass_color)

    # Water/bubbles inside door
    if not is_mono:
        # Lighter water area (top of drum)
        light_water = (96, 165, 250)  # lighter blue
        inner_r = door_r * 0.75
        draw.ellipse([
            door_cx - inner_r, door_cy - inner_r,
            door_cx + inner_r, door_cy + inner_r
        ], fill=light_water)

        # Bubbles
        bubble_color = (255, 255, 255, 180)
        for bx, by, br in [
            (door_cx - door_r * 0.3, door_cy - door_r * 0.2, door_r * 0.12),
            (door_cx + door_r * 0.2, door_cy + door_r * 0.15, door_r * 0.09),
            (door_cx - door_r * 0.1, door_cy + door_r * 0.35, door_r * 0.07),
            (door_cx + door_r * 0.35, door_cy - door_r * 0.3, door_r * 0.06),
        ]:
            draw.ellipse([bx - br, by - br, bx + br, by + br], fill=(255, 255, 255))

    # Door handle (small line on the right side of the ring)
    handle_x = door_cx + door_r + door_r * 0.05
    handle_w = door_r * 0.08
    handle_h = door_r * 0.35
    handle_color = (160, 165, 160) if not is_mono else (180, 180, 180)
    draw.rounded_rectangle([
        handle_x, door_cy - handle_h / 2,
        handle_x + handle_w, door_cy + handle_h / 2
    ], radius=handle_w / 2, fill=handle_color)


def generate_foreground(size):
    """Generate foreground layer (transparent bg + washing machine)"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_washing_machine(draw, size)
    return img


def generate_background(size):
    """Generate background layer (solid green)"""
    img = Image.new("RGB", (size, size), BG_COLOR)
    return img


def generate_monochrome(size):
    """Generate monochrome layer (white silhouette on transparent)"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_washing_machine(draw, size, fg_color=(255, 255, 255), is_mono=True)
    return img


def generate_legacy(size):
    """Generate legacy launcher icon (green bg + machine, with rounded corners)"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded square background
    r = size * 0.2
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG_COLOR)

    # Draw machine
    draw_washing_machine(draw, size)
    return img


def generate_legacy_round(size):
    """Generate round legacy icon"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Circle background
    draw.ellipse([0, 0, size - 1, size - 1], fill=BG_COLOR)

    # Draw machine
    draw_washing_machine(draw, size)
    return img


def save_webp(img, path):
    """Save image as WebP"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # Convert RGBA to RGB if needed for WebP
    if img.mode == "RGBA":
        # For foreground/monochrome, keep RGBA
        img.save(path, "WEBP", quality=90)
    else:
        img.save(path, "WEBP", quality=90)
    print(f"  -> {path} ({img.size[0]}x{img.size[1]})")


def main():
    print("Generating app icons...")

    # Adaptive icon layers
    for folder, size in ADAPTIVE_SIZES.items():
        out_dir = os.path.join(RES, folder)

        # Foreground
        fg = generate_foreground(size)
        save_webp(fg, os.path.join(out_dir, "ic_launcher_foreground.webp"))

        # Background
        bg = generate_background(size)
        save_webp(bg, os.path.join(out_dir, "ic_launcher_background.webp"))

        # Monochrome
        mono = generate_monochrome(size)
        save_webp(mono, os.path.join(out_dir, "ic_launcher_monochrome.webp"))

    # Legacy icons
    for folder, size in LEGACY_SIZES.items():
        out_dir = os.path.join(RES, folder)

        # Standard
        legacy = generate_legacy(size)
        save_webp(legacy, os.path.join(out_dir, "ic_launcher.webp"))

        # Round
        round_icon = generate_legacy_round(size)
        save_webp(round_icon, os.path.join(out_dir, "ic_launcher_round.webp"))

    print("\nDone! Rebuild the app to see the new icon:")
    print("  npx react-native run-android")


if __name__ == "__main__":
    main()
