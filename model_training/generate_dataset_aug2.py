"""
generate_dataset_aug2.py
========================
기존 dataset에 "추가"하는 다양성 보강 generator.
어둠은 양념 정도(약 10%)만 쓰고, 핵심은 기호 변형·크기·위치·노이즈의 다양성.

실사 미검출의 주원인이 "작게 찍힘 / 기울어짐 / 흐림 / 위치 제각각"이라는 분석에 맞춤:
  1) 기호 크기   : 18~80px 넓게 랜덤 (작은 쪽 비중↑) — 기존 65 고정 탈피
  2) 기호 변형   : 회전 ±15°, 원근 왜곡(천 휘어짐), 명암/대비 지터,
                   가끔 잉크 번짐/긁힘 — 인쇄·촬영 변형 모사
  3) 위치/배치   : 세로·가로·2~4열 혼합, 간격/정렬 흔들기, 기호 블록 위치 치우침
  4) 노이즈      : 블러, 센서 노이즈, JPEG 압축열화, 국소 반사 하이라이트
  5) 배경        : 밝은 라벨 70% / 중간톤 20% / 어두운(반전) 10%

안전장치 (기존과 동일):
  - 클래스 인덱스: sorted(source_symbols) — 기존 generate_dataset.py 와 동일. 시작 시 검사.
  - 덮어쓰기 금지: 'var_label_*' 접두어로 기존 폴더에 "추가"만. data.yaml 미변경.
  - 박스: 회전/왜곡 후 '실제 기호 픽셀(alpha)' 기준으로 타이트하게 계산.
  - 상하/좌우 반전·90도 회전은 기호 의미 변질이라 사용 안 함.

사용:
  python generate_dataset_aug2.py --num 10000
"""

import argparse
import glob
import io
import os
import random
import string

import numpy as np
import yaml
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

SYMBOL_SOURCE_DIR = "./source_symbols"
DATASET_ROOT_DIR = "./Augmented_CareLabel_Dataset"
CANVAS_SIZE = 640
FONT_PATH = "korean_font.ttf"
TRAIN_RATIO = 0.8


# --------------------------------------------------------------------------- #
def get_class_mapping():
    paths = glob.glob(os.path.join(SYMBOL_SOURCE_DIR, "*.png"))
    class_names = sorted([os.path.splitext(os.path.basename(p))[0] for p in paths])
    return {name: i for i, name in enumerate(class_names)}, class_names


def verify_against_existing_yaml(class_names):
    yp = os.path.join(DATASET_ROOT_DIR, "data.yaml")
    if not os.path.exists(yp):
        print("[!] 기존 data.yaml 없음 → generate_dataset.py로 기존 dataset부터 만들 것.")
        return
    existing = yaml.safe_load(open(yp, encoding="utf-8"))["names"]
    if isinstance(existing, dict):
        existing = [existing[k] for k in sorted(existing)]
    if list(existing) != list(class_names):
        raise SystemExit(
            "[X] 클래스 순서 불일치! 같은 source_symbols 폴더를 써야 함.\n"
            f"    기존: {existing}\n    이번: {class_names}\n    중단함.")
    print(f"[✓] 클래스 순서 일치 ({len(class_names)}개). 안전하게 추가 가능.")


def gen_text():
    kr = ["취급시 주의사항", "제조년월: 2024.05", "섬유혼용률",
          "겉감 폴리에스터 100%", "세탁시 탈색 주의", "단독세탁 요망"]
    en = ["CARE INSTRUCTIONS", "MADE IN ITALY", "100% COTTON",
          "WASH INSIDE OUT", "DO NOT BLEACH", "MACHINE WASH COLD"]
    base = random.choice(kr if random.random() < 0.5 else en)
    tail = "".join(random.choice(string.ascii_uppercase + string.digits)
                   for _ in range(random.randint(0, 4)))
    return (base + " " + tail).strip()


# --------------------------------------------------------------------------- #
def perspective_warp(img):
    """약한 원근 왜곡(천이 휘어 보이는 효과). 투명 RGBA 유지."""
    w, h = img.size
    m = random.uniform(0.05, 0.18)
    j = lambda d: random.uniform(-m, m) * d
    quad = [j(w), j(h), j(w), h + j(h), w + j(w), h + j(h), w + j(w), j(h)]
    return img.transform((w, h), Image.QUAD, quad, resample=Image.BICUBIC)


def transform_symbol(img, dark_bg):
    """
    기호 1개 전처리: 배경 투명화 → 색/대비 지터 → 회전 → (가끔)원근왜곡 → (가끔)긁힘.
    dark_bg=True 면 밝은 기호(반전), 아니면 짙은 기호.
    반환: 처리된 RGBA 이미지.
    """
    img = img.convert("RGBA")
    a = np.array(img)
    white = (a[:, :, 0] > 200) & (a[:, :, 1] > 200) & (a[:, :, 2] > 200)
    a[white, 3] = 0

    if dark_bg:
        val = random.randint(170, 255)          # 밝은 기호
    else:
        val = random.randint(0, 95)             # 짙은 기호 (대비 지터 포함)
    # 약간의 색 흔들림 (완전 단색 회피)
    jitter = lambda: max(0, min(255, val + random.randint(-12, 12)))
    a[~white, 0] = jitter()
    a[~white, 1] = jitter()
    a[~white, 2] = jitter()
    # 일부 픽셀 알파를 낮춰 '흐리게 인쇄/바램' 모사
    if random.random() < 0.3:
        faded = (~white) & (np.random.random(white.shape) < random.uniform(0.1, 0.35))
        a[faded, 3] = (a[faded, 3] * random.uniform(0.3, 0.7)).astype(np.uint8)

    img = Image.fromarray(a)
    img = img.rotate(random.uniform(-15, 15), resample=Image.BICUBIC, expand=True)
    if random.random() < 0.4:
        img = perspective_warp(img)
    # 긁힘/번짐: 투명 선 몇 개 그어 기호 일부 지움
    if random.random() < 0.2:
        d = ImageDraw.Draw(img)
        for _ in range(random.randint(1, 3)):
            w, h = img.size
            d.line([random.randint(0, w), random.randint(0, h),
                    random.randint(0, w), random.randint(0, h)],
                   fill=(0, 0, 0, 0), width=random.randint(1, 3))
    return img


def alpha_bbox(rgba):
    """RGBA에서 불투명 픽셀의 bounding box (x1,y1,x2,y2). 없으면 None."""
    a = np.array(rgba)
    ys, xs = np.where(a[:, :, 3] > 10)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def image_noise(img):
    """캔버스 전체 노이즈/블러/반사/압축열화."""
    # 밝기/대비 약한 지터 (대부분은 밝게 유지)
    if random.random() < 0.5:
        img = ImageEnhance.Brightness(img).enhance(random.uniform(0.75, 1.25))
    if random.random() < 0.35:
        img = ImageEnhance.Contrast(img).enhance(random.uniform(0.75, 1.2))
    # 블러 (초점/흔들림)
    if random.random() < 0.45:
        r = random.uniform(0.4, 2.0)
        img = img.filter(ImageFilter.GaussianBlur(r) if random.random() < 0.5
                         else ImageFilter.BoxBlur(r))
    # 국소 반사 하이라이트
    if random.random() < 0.3:
        d = ImageDraw.Draw(img, "RGBA")
        for _ in range(random.randint(1, 2)):
            cx, cy = random.randint(0, CANVAS_SIZE), random.randint(0, CANVAS_SIZE)
            rw, rh = random.randint(40, 150), random.randint(30, 110)
            d.ellipse([cx - rw, cy - rh, cx + rw, cy + rh],
                      fill=(255, 255, 255, random.randint(30, 90)))
    # 센서 노이즈
    if random.random() < 0.4:
        arr = np.array(img).astype(np.int16)
        noise = np.random.normal(0, random.uniform(5, 16), arr.shape).astype(np.int16)
        img = Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8))
    # JPEG 압축열화
    if random.random() < 0.35:
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=random.randint(35, 70))
        buf.seek(0)
        img = Image.open(buf).convert("RGB")
    return img


# --------------------------------------------------------------------------- #
def pick_symbol_size():
    """작은 쪽에 비중을 둔 크기 분포 (18~80px)."""
    r = random.random()
    if r < 0.45:
        return random.randint(18, 38)     # 작게 (미검출 주범) 비중↑
    if r < 0.8:
        return random.randint(38, 60)     # 중간
    return random.randint(60, 80)         # 크게


def create(num_images):
    class_map, class_names = get_class_mapping()
    verify_against_existing_yaml(class_names)
    for split in ("train", "val"):
        os.makedirs(os.path.join(DATASET_ROOT_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_ROOT_DIR, "labels", split), exist_ok=True)

    font_main = ImageFont.truetype(FONT_PATH, 15)
    font_small = ImageFont.truetype(FONT_PATH, 11)
    sym_names = list(class_map.keys())

    for idx in range(num_images):
        # 배경 모드: 밝음 70 / 중간 20 / 어두움 10
        r = random.random()
        if r < 0.7:
            tag_base = random.randint(215, 248); dark_bg = False
        elif r < 0.9:
            tag_base = random.randint(120, 200); dark_bg = False
        else:
            tag_base = random.randint(12, 70); dark_bg = True

        is_narrow = random.random() < 0.4
        tag_w = random.randint(150, 250) if is_narrow else random.randint(300, 500)
        tag_h = random.randint(420, 630)
        tag = Image.new("RGB", (tag_w, tag_h),
                        tuple(max(0, min(255, tag_base + random.randint(-8, 8)))
                              for _ in range(3)))
        draw = ImageDraw.Draw(tag)
        txt_val = (random.randint(160, 230) if dark_bg
                   else random.randint(20, 80))
        txt_color = (txt_val, txt_val, txt_val)

        n = random.randint(3, 8)
        picked = [random.choice(sym_names) for _ in range(n)]

        # 배치: 세로(1열) / 가로 래핑 / 2~4열 혼합
        layout = random.random()
        if layout < 0.4:
            n_cols = 1
        elif layout < 0.7:
            n_cols = random.randint(2, 4)
        else:
            n_cols = max(1, (tag_w - 40) // (pick_symbol_size() + 20))
        n_cols = max(1, min(n_cols, n))

        base_sz = pick_symbol_size()
        gap = random.randint(6, 24)
        rows = [picked[i:i + n_cols] for i in range(0, len(picked), n_cols)]
        block_h = sum(base_sz + gap for _ in rows)
        # 블록 위치를 위/중앙/아래로 치우치게
        start_y = int(random.uniform(0.1, 0.7) * max(1, tag_h - block_h)) + 15

        tag_x = (CANVAS_SIZE - tag_w) // 2 + random.randint(-30, 30)
        tag_y = (CANVAS_SIZE - tag_h) // 2 + random.randint(-30, 30)

        labels = []
        y = start_y
        for row in rows:
            # 행마다 기호 크기 약간 다르게
            row_sz = max(16, base_sz + random.randint(-8, 8))
            rw = len(row) * row_sz + (len(row) - 1) * gap
            x = random.randint(8, max(10, tag_w - rw - 8)) if rw < tag_w - 16 \
                else (tag_w - rw) // 2
            for name in row:
                p = os.path.join(SYMBOL_SOURCE_DIR, name + ".png")
                s = transform_symbol(Image.open(p), dark_bg)
                sz = max(14, row_sz + random.randint(-3, 3))
                s = s.resize((sz, sz), Image.Resampling.LANCZOS)

                px = x + random.randint(-5, 5)
                py = y + random.randint(-5, 5)
                tag.paste(s, (px, py), mask=s)

                bb = alpha_bbox(s)
                if bb is None:
                    x += row_sz + gap
                    continue
                # 실제 기호 픽셀 기준 절대좌표 박스 (타이트)
                ax1 = px + bb[0] + tag_x
                ay1 = py + bb[1] + tag_y
                ax2 = px + bb[2] + tag_x
                ay2 = py + bb[3] + tag_y
                cx = (ax1 + ax2) / 2 / CANVAS_SIZE
                cy = (ay1 + ay2) / 2 / CANVAS_SIZE
                bw = (ax2 - ax1) / CANVAS_SIZE
                bh = (ay2 - ay1) / CANVAS_SIZE
                if bw <= 0 or bh <= 0:
                    x += row_sz + gap
                    continue
                labels.append(f"{class_map[name]} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")
                x += row_sz + gap
            y += row_sz + gap

        # 텍스트 (빽빽함 랜덤)
        dense = random.random() < 0.4
        ty = random.randint(10, 30)
        for _ in range(random.randint(8, 22) if dense else random.randint(2, 7)):
            if ty > tag_h - 18:
                break
            f = random.choice([font_main, font_small])
            draw.text((random.randint(5, max(8, tag_w // 3)), ty),
                      gen_text(), fill=txt_color, font=f)
            bb = f.getbbox("Ay")
            ty += (bb[3] - bb[1]) + (random.randint(2, 7) if dense
                                     else random.randint(12, 26))

        bg = random.randint(20, 90) if not dark_bg else random.randint(5, 35)
        canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), (bg, bg, bg))
        canvas.paste(tag, (tag_x, tag_y))
        canvas = image_noise(canvas)

        split = "train" if random.random() < TRAIN_RATIO else "val"
        prefix = f"var_label_{idx:05d}"
        canvas.save(os.path.join(DATASET_ROOT_DIR, "images", split, prefix + ".jpg"),
                    quality=90)
        with open(os.path.join(DATASET_ROOT_DIR, "labels", split, prefix + ".txt"),
                  "w") as f:
            f.write("\n".join(labels))

        if (idx + 1) % 500 == 0:
            print(f"  {idx+1}/{num_images} 생성...")

    print(f"[✓] 다양성 보강 데이터 {num_images}장을 {DATASET_ROOT_DIR} 에 '추가' 완료 "
          f"(기존 보존, data.yaml 미변경).")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--num", type=int, default=10000)
    ap.add_argument("--symbol-dir", default=SYMBOL_SOURCE_DIR)
    ap.add_argument("--dataset-dir", default=DATASET_ROOT_DIR)
    a = ap.parse_args()
    SYMBOL_SOURCE_DIR = a.symbol_dir
    DATASET_ROOT_DIR = a.dataset_dir
    create(a.num)