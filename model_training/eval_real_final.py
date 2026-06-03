"""
eval_real_final.py
==================
실제 사진(Roboflow에서 라벨링 완료)에 대한 "최종 성능 평가" 스크립트.

포스터 카드와 동일한 지표를 뽑는다 (38-class macro mAP는 의도적으로 안 씀):
  1) 클래스 커버리지     : 38개 중 몇 개 클래스가 실제 사진에 출현했는지 + 총 instance 수
  2) 라벨 단위 완전 해석 : 이미지(=옷 라벨) 한 장을 "전부 정확히" 읽은 비율 (제품 KPI)
  3) 기호 단위 micro     : 모든 검출을 한 풀에 모아 Precision / Recall / F1 (IoU 0.5 고정)
  4) 오류 분해           : 오인식(겹치는데 클래스 틀림) / 미검출(아예 못 잡음) / 배경 오탐
  + 혼동 행렬(confusion matrix) PNG 자동 저장

* 평가 모델은 배포 대상인 양자화 TFLite(best_int8.tflite)를 기본으로 받는다.
* Roboflow 새 프로젝트는 클래스 순서가 학습 때와 다를 수 있으므로,
  GT 라벨의 class id를 "모델 클래스 순서"에 맞춰 이름 기준으로 재매핑한다.
* 원본 dataset은 수정하지 않는다 (모든 처리는 메모리에서).
"""

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np
import yaml
from ultralytics import YOLO

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


# ----------------------------------------------------------------------------- #
def load_yaml(p):
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def names_to_dict(names):
    if isinstance(names, dict):
        return {int(k): str(v) for k, v in names.items()}
    return {i: str(n) for i, n in enumerate(names)}


def find_splits(root):
    splits = {}
    for s in ("train", "valid", "val", "test"):
        d = root / s / "images"
        if d.is_dir() and any(d.iterdir()):
            splits["valid" if s == "val" else s] = d
    return splits


def iou_xyxy(a, b):
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def read_gt(label_path, w, h, remap):
    """YOLO 라벨(normalized cxcywh) → 모델 인덱스로 remap된 [(cls, [x1,y1,x2,y2])] (픽셀)."""
    boxes = []
    if not label_path.exists():
        return boxes
    with open(label_path, "r", encoding="utf-8") as f:
        for line in f:
            p = line.split()
            if len(p) < 5:
                continue
            old = int(float(p[0]))
            if old not in remap:        # 모델에 없는 클래스는 평가에서 제외
                continue
            cls = remap[old]
            cx, cy, bw, bh = map(float, p[1:5])
            x1 = (cx - bw / 2) * w
            y1 = (cy - bh / 2) * h
            x2 = (cx + bw / 2) * w
            y2 = (cy + bh / 2) * h
            boxes.append((cls, [x1, y1, x2, y2]))
    return boxes


def match_image(gts, preds, thr):
    """
    클래스-무관 IoU 기준 greedy 1:1 배정으로 GT↔예측 매칭.
    gts:   [(cls, box)]
    preds: [(cls, conf, box)]
    반환:  dict (tp, mis, missed, fp_bg) + assignment 목록(혼동행렬용)
    """
    pairs = []
    for gi, (gc, gb) in enumerate(gts):
        for pi, (pc, pcf, pb) in enumerate(preds):
            v = iou_xyxy(gb, pb)
            if v >= thr:
                pairs.append((v, gi, pi))
    pairs.sort(reverse=True)
    g_used, p_used, assign = set(), set(), []
    for v, gi, pi in pairs:
        if gi in g_used or pi in p_used:
            continue
        g_used.add(gi)
        p_used.add(pi)
        assign.append((gi, pi))

    tp = mis = 0
    confusion = []   # (gt_cls, pred_cls)
    for gi, pi in assign:
        gc = gts[gi][0]
        pc = preds[pi][0]
        confusion.append((gc, pc))
        if gc == pc:
            tp += 1
        else:
            mis += 1
    missed = len(gts) - len(g_used)        # 미검출 (GT인데 아무것도 안 겹침)
    fp_bg = len(preds) - len(p_used)       # 배경 오탐
    missed_gt = [gts[gi][0] for gi in range(len(gts)) if gi not in g_used]
    bg_pred = [preds[pi][0] for pi in range(len(preds)) if pi not in p_used]
    img_ok = (missed == 0 and fp_bg == 0 and mis == 0)
    return dict(tp=tp, mis=mis, missed=missed, fp_bg=fp_bg, img_ok=img_ok,
                confusion=confusion, missed_gt=missed_gt, bg_pred=bg_pred)


# ----------------------------------------------------------------------------- #
def run(args):
    model = YOLO(args.model)

    # ----- 정답 기준 클래스 순서(=모델 출력 순서) 확보 ----------------------- #
    if args.names_yaml:
        model_names = names_to_dict(load_yaml(args.names_yaml)["names"])
    else:
        model_names = names_to_dict(model.names)
    nc = len(model_names)
    print(f"[i] 모델 클래스 수: {nc}")
    print(f"[i] (참고) 클래스 순서 확인용 일부: "
          f"{[model_names[i] for i in sorted(model_names)[:5]]} ...")

    real_root = Path(args.real_data)
    real_cfg = load_yaml(real_root / "data.yaml")
    real_names = names_to_dict(real_cfg["names"])

    # ----- 이름 기준 remap (Roboflow 순서 → 모델 순서) ----------------------- #
    name2model = {v.strip().lower(): k for k, v in model_names.items()}
    remap, unmatched = {}, []
    for ri, rn in real_names.items():
        key = rn.strip().lower()
        if key in name2model:
            remap[ri] = name2model[key]
        else:
            unmatched.append(rn)
    if unmatched:
        print(f"[!] 모델에 없어 평가 제외되는 dataset 클래스: {unmatched}")

    # ----- 평가할 이미지 수집 ------------------------------------------------ #
    splits = find_splits(real_root)
    if not splits:
        raise FileNotFoundError(f"{real_root} 에서 images 폴더를 못 찾음")
    if args.split != "all":
        tgt = "valid" if args.split == "val" else args.split
        splits = {tgt: splits[tgt]}
    print(f"[i] 사용 split: {list(splits.keys())}")

    image_paths = []
    for img_dir in splits.values():
        for ip in sorted(img_dir.iterdir()):
            if ip.suffix.lower() in IMG_EXTS:
                image_paths.append((ip, img_dir.parent / "labels" / f"{ip.stem}.txt"))
    n_img = len(image_paths)
    print(f"[i] 평가 이미지 수: {n_img}\n[i] 추론 시작...\n")

    # ----- 이미지별 추론 + 매칭 ---------------------------------------------- #
    gt_counter = Counter()
    TP = FP = FN = MIS = MISSED = FPBG = 0
    img_ok = 0
    n_eval = 0          # 실제 평가에 포함된 이미지 수
    n_unlabeled = 0     # 라벨(GT)이 하나도 없는 이미지 수
    per_image = []
    conf_pairs = []
    fail_examples = []

    for ip, lp in image_paths:
        # 라벨 파일이 없거나 비어있으면(=Roboflow unannotated) GT가 0개가 됨.
        # 이런 이미지는 "진짜 배경"이 아니라 "라벨 안 단 실사"일 가능성이 높아서
        # --skip-unlabeled 켜면 평가에서 제외한다(권장: 사실은 라벨을 마저 다는 것).
        gts_norm = read_gt(lp, 1, 1, remap)  # 존재 여부만 먼저 확인(좌표 무의미)
        if not gts_norm:
            n_unlabeled += 1
            if args.skip_unlabeled:
                continue

        res = model.predict(ip, imgsz=args.imgsz, conf=args.conf,
                            iou=args.nms_iou, verbose=False)[0]
        h, w = res.orig_shape
        gts = read_gt(lp, w, h, remap)
        n_eval += 1
        for c, _ in gts:
            gt_counter[c] += 1

        preds = []
        if res.boxes is not None and len(res.boxes):
            xyxy = res.boxes.xyxy.cpu().numpy()
            cls = res.boxes.cls.cpu().numpy().astype(int)
            cf = res.boxes.conf.cpu().numpy()
            preds = [(int(cls[i]), float(cf[i]), xyxy[i].tolist())
                    for i in range(len(cls))]

        m = match_image(gts, preds, args.match_iou)
        TP += m["tp"]; MIS += m["mis"]; MISSED += m["missed"]; FPBG += m["fp_bg"]
        conf_pairs.extend(m["confusion"])
        for gc in m["missed_gt"]:
            conf_pairs.append((gc, -1))      # -1 = 배경(미검출)
        for pc in m["bg_pred"]:
            conf_pairs.append((-1, pc))      # 배경 오탐
        if m["img_ok"]:
            img_ok += 1
        elif len(fail_examples) < 20:
            fail_examples.append({
                "image": ip.name, "n_gt": len(gts), "n_pred": len(preds),
                "misclass": m["mis"], "missed": m["missed"], "fp_bg": m["fp_bg"]})
        per_image.append((ip.name, m["img_ok"]))

    FP = MIS + FPBG          # 오탐 = 오인식 + 배경오탐
    FN = MIS + MISSED        # 미탐 = 오인식(정답클래스 못맞춤) + 완전미검출
    precision = TP / (TP + FP) if (TP + FP) else 0.0
    recall = TP / (TP + FN) if (TP + FN) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    present = sorted(gt_counter.keys())
    absent = [i for i in sorted(model_names) if i not in gt_counter]
    total_inst = sum(gt_counter.values())

    # ----- 콘솔 리포트 (포스터 카드 구성 그대로) ----------------------------- #
    print("=" * 60)
    print(" 실제 사진 예비 평가 결과")
    print("=" * 60)
    if n_unlabeled:
        if args.skip_unlabeled:
            print(f"[i] 라벨 없는 이미지 {n_unlabeled}장은 평가에서 제외함 "
                  f"(--skip-unlabeled)")
        else:
            print(f"[!] 라벨(GT) 없는 이미지 {n_unlabeled}장이 '배경'으로 포함됨.")
            print(f"    → 이 이미지들의 검출은 전부 배경 오탐(FP)으로 잡혀 "
                  f"Precision·완전해석률이 낮아짐.")
            print(f"    → 라벨을 마저 달거나 --skip-unlabeled 옵션을 쓸 것.\n")
    print(f"[클래스 커버리지]")
    print(f"  - 출현: {len(present)} / {nc} 클래스   (미출현 {len(absent)}개 = 평가 불가)")
    print(f"  - 총 instance: {total_inst} 개   (평가 이미지 {n_eval} 장)")
    print(f"\n[라벨 단위 완전 해석]  ★ 제품 KPI")
    rate = img_ok / n_eval * 100 if n_eval else 0
    print(f"  - {rate:.0f}%   ({img_ok} / {n_eval} 장 전부 정확)")
    print(f"\n[기호 단위 micro · IoU {args.match_iou} · conf {args.conf}]")
    print(f"  - Precision : {precision:.3f}")
    print(f"  - Recall    : {recall:.3f}")
    print(f"  - F1        : {f1:.3f}")
    print(f"  - (TP={TP}, FP={FP}, FN={FN})")
    print(f"\n[오류 분해]")
    print(f"  - 오인식(클래스 혼동) : {MIS} 건")
    print(f"  - 미검출(완전 누락)   : {MISSED} 건")
    print(f"  - 배경 오탐(허위 검출): {FPBG} 건")
    if absent:
        print(f"\n[미출현 클래스 {len(absent)}개 — 평가 제외]")
        print("  " + ", ".join(model_names[i] for i in absent))
    print("=" * 60)
    print("※ 소규모·불균형 set의 경향성 지표이며 정밀 측정값이 아님.")
    print("※ '오인식' 중 KS→ISO 오인식 건수는 실패 이미지를 직접 확인해 분류할 것.")

    # ----- 혼동 행렬 PNG ----------------------------------------------------- #
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    _plot_confusion(conf_pairs, present, model_names, out_dir / "real_confusion_matrix.png")

    # ----- 결과 저장 --------------------------------------------------------- #
    result = {
        "evaluated_at": datetime.now().isoformat(timespec="seconds"),
        "model": str(args.model),
        "real_dataset": str(real_root.resolve()),
        "splits": list(splits.keys()),
        "conf_threshold": args.conf,
        "match_iou": args.match_iou,
        "n_images": n_img,
        "n_evaluated": n_eval,
        "n_unlabeled": n_unlabeled,
        "skip_unlabeled": args.skip_unlabeled,
        "coverage": {
            "classes_present": len(present),
            "classes_total": nc,
            "classes_absent": len(absent),
            "total_instances": total_inst,
            "present_class_names": [model_names[i] for i in present],
            "absent_class_names": [model_names[i] for i in absent],
        },
        "label_level_success_rate": rate,
        "label_level_success_count": f"{img_ok}/{n_img}",
        "micro": {"precision": precision, "recall": recall, "f1": f1,
                  "TP": TP, "FP": FP, "FN": FN},
        "errors": {"misclassification": MIS, "missed": MISSED, "background_fp": FPBG},
        "failed_image_examples": fail_examples,
    }
    with open(out_dir / "real_eval_final.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    _write_md(out_dir / "real_eval_final.md", result)

    print(f"\n[✓] 저장 완료: {out_dir.resolve()}")
    print("    - real_eval_final.json        (전체 수치 / 포스터 숫자 교체용)")
    print("    - real_eval_final.md          (보고서용 표)")
    print("    - real_confusion_matrix.png   (KS↔ISO 오인식 패턴 확인용)")
    return result


# ----------------------------------------------------------------------------- #
def _plot_confusion(pairs, present, names, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    labels = present + [-1]                  # 마지막은 배경
    idx = {c: i for i, c in enumerate(labels)}
    n = len(labels)
    M = np.zeros((n, n), dtype=int)
    for gc, pc in pairs:
        if gc in idx and pc in idx:
            M[idx[gc], idx[pc]] += 1
    tick = [names[c] if c != -1 else "background" for c in labels]

    fig_w = max(6, n * 0.5)
    fig, ax = plt.subplots(figsize=(fig_w, fig_w))
    ax.imshow(M, cmap="Blues")
    ax.set_xticks(range(n)); ax.set_yticks(range(n))
    ax.set_xticklabels(tick, rotation=90, fontsize=7)
    ax.set_yticklabels(tick, fontsize=7)
    ax.set_xlabel("Predicted"); ax.set_ylabel("Ground Truth")
    ax.set_title("Real-photo Confusion Matrix")
    thr = M.max() / 2 if M.max() else 1
    for i in range(n):
        for j in range(n):
            if M[i, j]:
                ax.text(j, i, M[i, j], ha="center", va="center", fontsize=6,
                        color="white" if M[i, j] > thr else "black")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def _write_md(path, r):
    c = r["coverage"]; mi = r["micro"]; e = r["errors"]
    L = []
    L.append("# 실제 사진 예비 평가 (Pilot Real-world Evaluation)\n")
    L.append(f"- 평가 시각: {r['evaluated_at']}")
    L.append(f"- 모델: `{r['model']}`")
    L.append(f"- 이미지: {r['n_images']} 장  ·  conf={r['conf_threshold']}  ·  IoU={r['match_iou']}\n")
    L.append("## 클래스 커버리지")
    L.append(f"- {c['classes_present']} / {c['classes_total']} 출현 "
             f"(미출현 {c['classes_absent']}개 = 평가 불가) · 총 {c['total_instances']} instance\n")
    L.append("## 라벨 단위 완전 해석 (제품 KPI)")
    L.append(f"- **{r['label_level_success_rate']:.0f}%** "
             f"({r['label_level_success_count']} 장 전부 정확)\n")
    L.append("## 기호 단위 micro 지표")
    L.append("| Precision | Recall | F1 | TP | FP | FN |")
    L.append("|---|---|---|---|---|---|")
    L.append(f"| {mi['precision']:.3f} | {mi['recall']:.3f} | {mi['f1']:.3f} "
             f"| {mi['TP']} | {mi['FP']} | {mi['FN']} |\n")
    L.append("## 오류 분해")
    L.append("| 오인식(클래스 혼동) | 미검출(완전 누락) | 배경 오탐 |")
    L.append("|---|---|---|")
    L.append(f"| {e['misclassification']} | {e['missed']} | {e['background_fp']} |\n")
    if c["absent_class_names"]:
        L.append(f"## 미출현 클래스 ({c['classes_absent']}개)\n")
        L.append("> 실제 사진에 안 나온 클래스 → 이번 평가 제외.\n")
        L.append(", ".join(c["absent_class_names"]))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


# ----------------------------------------------------------------------------- #
def parse_args():
    p = argparse.ArgumentParser(description="실제 사진 최종 성능 평가")
    p.add_argument(
        "--model",
        default="./runs/detect/laundry_project/test_run_v16/weights/best_saved_model/best_int8.tflite",
        help="평가할 모델 (기본: 배포용 INT8 TFLite). best.pt 도 가능")
    p.add_argument("--real-data", required=True,
                   help="Roboflow에서 받은 실제 사진 dataset 루트 (data.yaml 위치)")
    p.add_argument("--names-yaml", default=None,
                   help="클래스 순서 기준 data.yaml (권장: 학습에 쓴 "
                        "Augmented_CareLabel_Dataset/data.yaml). 미지정 시 모델 메타데이터 사용")
    p.add_argument("--split", default="all", help="all / test / valid / train")
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--conf", type=float, default=0.25, help="검출 신뢰도 임계값")
    p.add_argument("--nms-iou", type=float, default=0.7, help="NMS IoU (예측 단계)")
    p.add_argument("--match-iou", type=float, default=0.5,
                   help="TP 판정 IoU 임계값 (포스터: 0.5)")
    p.add_argument("--skip-unlabeled", action="store_true",
                   help="라벨(GT) 없는 이미지를 평가에서 제외 "
                        "(Roboflow unannotated 이미지가 배경 오탐으로 잡히는 것 방지)")
    p.add_argument("--out", default="runs/real_eval_final")
    return p.parse_args()


if __name__ == "__main__":
    run(parse_args())