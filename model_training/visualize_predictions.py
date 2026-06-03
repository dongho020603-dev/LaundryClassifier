"""
visualize_predictions.py
========================
실제 사진에 대해 모델 추론 결과를 "눈으로 확인"하기 위한 시각화 스크립트.

각 이미지에 다음을 겹쳐 그려서 저장한다:
  - 정답(GT) 박스 + 예측(Pred) 박스를 매칭 상태별 색으로 구분
      초록 = 정탐(TP, 위치·클래스 모두 맞음)
      주황 = 오인식(겹치는데 클래스 틀림)
      빨강 = 미검출(GT인데 모델이 못 잡음)  ← recall 새는 지점
      파랑 = 배경 오탐(GT 없는데 모델이 검출)
  - 좌상단 범례 + 이미지별 요약(TP/오인식/미검출/오탐)

eval_real_final.py 와 동일한 모델/매칭 기준을 쓰므로 숫자가 일치한다.
"""

import argparse
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

COLORS = {
    "tp":     (40, 200, 80),    # 초록
    "mis":    (255, 160, 0),    # 주황
    "missed": (235, 40, 40),    # 빨강
    "fp":     (40, 120, 255),   # 파랑
}
LEGEND = [("tp", "TP 정탐"), ("mis", "오인식"),
          ("missed", "미검출(놓침)"), ("fp", "배경오탐")]


def load_yaml(p):
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def names_to_dict(n):
    if isinstance(n, dict):
        return {int(k): str(v) for k, v in n.items()}
    return {i: str(x) for i, x in enumerate(n)}


def find_splits(root):
    out = {}
    for s in ("train", "valid", "val", "test"):
        d = root / s / "images"
        if d.is_dir() and any(d.iterdir()):
            out["valid" if s == "val" else s] = d
    return out


def iou(a, b):
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    ua = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def read_gt(lp, w, h, remap):
    out = []
    if not lp.exists():
        return out
    for line in lp.read_text().splitlines():
        p = line.split()
        if len(p) < 5:
            continue
        old = int(float(p[0]))
        if old not in remap:
            continue
        cx, cy, bw, bh = map(float, p[1:5])
        out.append((remap[old],
                    [(cx-bw/2)*w, (cy-bh/2)*h, (cx+bw/2)*w, (cy+bh/2)*h]))
    return out


def match_for_viz(gts, preds, thr):
    """greedy(IoU) 1:1 배정 후 GT/Pred 각각의 상태 라벨 반환."""
    pairs = []
    for gi, (gc, gb) in enumerate(gts):
        for pi, (pc, pcf, pb) in enumerate(preds):
            v = iou(gb, pb)
            if v >= thr:
                pairs.append((v, gi, pi))
    pairs.sort(reverse=True)
    g_used, p_used = {}, {}
    for v, gi, pi in pairs:
        if gi in g_used or pi in p_used:
            continue
        same = gts[gi][0] == preds[pi][0]
        g_used[gi] = "tp" if same else "mis"
        p_used[pi] = "tp" if same else "mis"
    gt_status = [g_used.get(i, "missed") for i in range(len(gts))]
    pred_status = [p_used.get(i, "fp") for i in range(len(preds))]
    return gt_status, pred_status


_FONT_PATH = None   # main()에서 설정 (한글 지원 폰트)


def _font(size):
    cands = []
    if _FONT_PATH:
        cands.append(_FONT_PATH)
    cands += ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "DejaVuSans-Bold.ttf", "arial.ttf"]
    for f in cands:
        try:
            return ImageFont.truetype(f, size)
        except Exception:
            continue
    return ImageFont.load_default()


def draw(img_path, gts, gt_status, preds, pred_status, names, out_path, summary):
    im = Image.open(img_path).convert("RGB")
    W, H = im.size
    dr = ImageDraw.Draw(im)
    lw = max(2, int(min(W, H) / 300))
    fs = max(13, int(min(W, H) / 45))
    font = _font(fs)

    def box(b, color, text, on_top=True):
        x1, y1, x2, y2 = [int(v) for v in b]
        dr.rectangle([x1, y1, x2, y2], outline=color, width=lw)
        tb = dr.textbbox((0, 0), text, font=font)
        tw, th = tb[2]-tb[0], tb[3]-tb[1]
        ty = y1 - th - 4 if (on_top and y1 - th - 4 > 0) else y1 + 2
        dr.rectangle([x1, ty, x1+tw+6, ty+th+4], fill=color)
        dr.text((x1+3, ty+2), text, fill=(255, 255, 255), font=font)

    # GT 먼저(아래), 예측 위에
    for (cls, b), st in zip(gts, gt_status):
        if st == "tp":          # TP는 예측 쪽에서 그리므로 GT는 생략(겹침 방지)
            continue
        box(b, COLORS[st], f"GT {names[cls]}", on_top=False)
    for (cls, conf, b), st in zip(preds, pred_status):
        box(b, COLORS[st], f"{names[cls]} {conf:.2f}", on_top=True)

    # 범례 + 요약
    pad = 6
    lines = [summary]
    ly = pad
    dr.rectangle([0, 0, W, fs+pad*2], fill=(0, 0, 0))
    dr.text((pad, pad), summary, fill=(255, 255, 255), font=_font(max(12, fs-2)))
    lx = pad
    legend_y = fs + pad*3
    for key, label in LEGEND:
        dr.rectangle([lx, legend_y, lx+14, legend_y+14], fill=COLORS[key])
        dr.text((lx+18, legend_y), label, fill=COLORS[key], font=_font(max(11, fs-3)))
        lx += 18 + dr.textlength(label, font=_font(max(11, fs-3))) + 18

    im.save(out_path)


def main():
    ap = argparse.ArgumentParser(description="실제 사진 추론 결과 시각화")
    ap.add_argument(
        "--model",
        default="./runs/detect/laundry_project/test_run_v16/weights/best_saved_model/best_int8.tflite")
    ap.add_argument("--real-data", required=True)
    ap.add_argument("--names-yaml", default=None)
    ap.add_argument("--split", default="all")
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--conf", type=float, default=0.25)
    ap.add_argument("--nms-iou", type=float, default=0.7)
    ap.add_argument("--match-iou", type=float, default=0.5)
    ap.add_argument("--out", default="runs/real_eval_final/vis")
    ap.add_argument("--mode", default="both", choices=["both", "pred"],
                    help="both=GT+예측 겹쳐(권장), pred=예측만")
    ap.add_argument("--font", default="./korean_font.ttf",
                    help="범례·요약 한글용 폰트 (기본: 프로젝트의 korean_font.ttf)")
    args = ap.parse_args()

    global _FONT_PATH
    if Path(args.font).exists():
        _FONT_PATH = args.font
    else:
        print(f"[!] 한글 폰트 {args.font} 없음 → 범례 한글이 깨질 수 있음 "
              f"(--font 로 경로 지정 가능)")

    model = YOLO(args.model)
    names = (names_to_dict(load_yaml(args.names_yaml)["names"])
             if args.names_yaml else names_to_dict(model.names))
    name2idx = {v.strip().lower(): k for k, v in names.items()}

    root = Path(args.real_data)
    real_names = names_to_dict(load_yaml(root / "data.yaml")["names"])
    remap = {ri: name2idx[rn.strip().lower()]
             for ri, rn in real_names.items() if rn.strip().lower() in name2idx}

    splits = find_splits(root)
    if args.split != "all":
        tgt = "valid" if args.split == "val" else args.split
        splits = {tgt: splits[tgt]}

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    imgs = []
    for d in splits.values():
        for ip in sorted(d.iterdir()):
            if ip.suffix.lower() in IMG_EXTS:
                imgs.append((ip, d.parent / "labels" / f"{ip.stem}.txt"))

    print(f"[i] {len(imgs)}장 시각화 → {out_dir.resolve()}")
    tot = dict(tp=0, mis=0, missed=0, fp=0)
    for ip, lp in imgs:
        res = model.predict(ip, imgsz=args.imgsz, conf=args.conf,
                            iou=args.nms_iou, verbose=False)[0]
        h, w = res.orig_shape
        gts = read_gt(lp, w, h, remap)
        preds = []
        if res.boxes is not None and len(res.boxes):
            xy = res.boxes.xyxy.cpu().numpy()
            cl = res.boxes.cls.cpu().numpy().astype(int)
            cf = res.boxes.conf.cpu().numpy()
            preds = [(int(cl[i]), float(cf[i]), xy[i].tolist()) for i in range(len(cl))]

        if args.mode == "pred":
            gts = []
        gt_st, pr_st = match_for_viz(gts, preds, args.match_iou)

        c = dict(tp=0, mis=0, missed=0, fp=0)
        for s in gt_st:
            if s == "missed":
                c["missed"] += 1
        for s in pr_st:
            c[s] += 1
        for k in tot:
            tot[k] += c[k]
        summary = (f"{ip.name}   TP {c['tp']} / 오인식 {c['mis']} / "
                   f"미검출 {c['missed']} / 오탐 {c['fp']}")
        draw(ip, gts, gt_st, preds, pr_st, names, out_dir / f"{ip.stem}_vis.jpg", summary)

    print(f"[✓] 완료. 합계 → TP {tot['tp']} / 오인식 {tot['mis']} / "
          f"미검출 {tot['missed']} / 오탐 {tot['fp']}")
    print(f"    저장 위치: {out_dir.resolve()}")


if __name__ == "__main__":
    main()