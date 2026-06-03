"""
make_subset.py
==============
"잘 나온 사진" 파일명 목록만 주면, 그 이미지 + 짝꿍 라벨(.txt)을 새 폴더로 복사하고
data.yaml까지 만들어 주는 스크립트. (촬영 품질별 분리 평가용)

파일명은 부분만 줘도 됨(예: "_538_15" 만 줘도 그걸 포함하는 파일을 찾아 복사).
확장자/해시(.rf.xxxx)까지 정확히 안 적어도 매칭됨.

사용
----
1) 잘 나온 사진 파일명을 한 줄에 하나씩 텍스트 파일로 저장 (예: good_list.txt)
      _538_15
      KakaoTalk_20260601_215356538_03
      ...
   또는 --names 로 콤마구분 직접 전달.

2) 실행:
   python make_subset.py \
       --src ./test_0602.v1i.yolov8 \
       --list good_list.txt \
       --out ./split_eval/good

그러면 ./split_eval/good/{train/images, train/labels, data.yaml} 생성됨.
이후 평가는 평소대로:
   python eval_real_final.py --real-data ./split_eval/good \
       --names-yaml ./Augmented_CareLabel_Dataset/data.yaml \
       --split all --conf 0.25 --match-iou 0.5 --out runs/good
"""

import argparse
import shutil
from pathlib import Path

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def find_split_root(src: Path):
    """src 안에서 images 폴더가 있는 split(train/valid/test)을 찾아 반환."""
    for s in ("train", "valid", "val", "test"):
        if (src / s / "images").is_dir():
            return src / s
    # src 바로 아래에 images/labels가 있는 경우도 허용
    if (src / "images").is_dir():
        return src
    raise FileNotFoundError(f"{src} 안에서 images 폴더를 못 찾음")


def main():
    ap = argparse.ArgumentParser(description="파일명 목록으로 서브셋 폴더 생성")
    ap.add_argument("--src", required=True, help="원본 dataset 루트 (data.yaml 위치)")
    ap.add_argument("--out", required=True, help="만들 서브셋 폴더 (예: ./split_eval/good)")
    ap.add_argument("--list", default=None, help="파일명 목록 텍스트 (한 줄에 하나)")
    ap.add_argument("--names", default=None, help="콤마로 구분한 파일명들 (목록파일 대신)")
    ap.add_argument("--move", action="store_true",
                    help="복사 대신 이동 (원본에서 빼고 싶을 때, 기본은 복사)")
    args = ap.parse_args()

    src = Path(args.src)
    out = Path(args.out)
    split = find_split_root(src)
    img_dir = split / "images"
    lbl_dir = split / "labels"

    # 찾을 파일명 키워드 모으기
    keys = []
    if args.list:
        keys += [l.strip() for l in Path(args.list).read_text(encoding="utf-8").splitlines()
                 if l.strip() and not l.strip().startswith("#")]
    if args.names:
        keys += [k.strip() for k in args.names.split(",") if k.strip()]
    if not keys:
        raise SystemExit("파일명을 --list 또는 --names 로 줘야 함")

    # 원본 이미지 전체 목록
    all_imgs = [p for p in img_dir.iterdir() if p.suffix.lower() in IMG_EXTS]

    out_img = out / "train" / "images"
    out_lbl = out / "train" / "labels"
    out_img.mkdir(parents=True, exist_ok=True)
    out_lbl.mkdir(parents=True, exist_ok=True)

    op = shutil.move if args.move else shutil.copy2

    matched, missing, no_label = [], [], []
    used = set()
    for key in keys:
        # key를 파일명에 포함하는 이미지 찾기 (해시/확장자 무시)
        cands = [p for p in all_imgs if key in p.name and p.name not in used]
        if not cands:
            missing.append(key)
            continue
        for ip in cands:
            used.add(ip.name)
            op(str(ip), str(out_img / ip.name))
            lp = lbl_dir / f"{ip.stem}.txt"
            if lp.exists():
                op(str(lp), str(out_lbl / lp.name))
            else:
                no_label.append(ip.name)
            matched.append(ip.name)

    # data.yaml 복사 (클래스 이름 그대로 가져옴)
    src_yaml = src / "data.yaml"
    if src_yaml.exists():
        shutil.copy2(str(src_yaml), str(out / "data.yaml"))

    # 결과 보고
    print(f"[✓] {len(matched)}장 {'이동' if args.move else '복사'} 완료 → {out_img.resolve()}")
    if no_label:
        print(f"[!] 라벨(.txt) 없던 이미지 {len(no_label)}장: {no_label}")
    if missing:
        print(f"[!] 매칭 실패한 키워드 {len(missing)}개 (파일명 확인): {missing}")
    print(f"[i] data.yaml: {(out/'data.yaml').resolve()}")
    print(f"\n다음 단계:")
    print(f"  python eval_real_final.py --real-data {out} \\")
    print(f"    --names-yaml ./Augmented_CareLabel_Dataset/data.yaml \\")
    print(f"    --split all --conf 0.25 --match-iou 0.5 --out runs/good")


if __name__ == "__main__":
    main()