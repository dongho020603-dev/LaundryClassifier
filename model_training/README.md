# 세탁 기호 인식 모델 학습 파이프라인

YOLOv8 기반 세탁 케어라벨 기호(38종) 검출 모델의 데이터 생성 → 학습 → 양자화 → 평가
전체 파이프라인. 온디바이스(Android, TFLite) 배포를 목표로 한다.

## 디렉토리 / 사전 준비

```
source_symbols/                 # 38종 기호 PNG (투명 배경). 클래스명 = 파일명
Augmented_CareLabel_Dataset/    # 생성되는 학습 데이터셋 (images/, labels/, data.yaml)
korean_font.ttf                 # 라벨 텍스트 렌더용 한글 폰트 (실행 경로에 필요)
```

환경(conda 예시):

```bash
conda create -n yolov8 python=3.10 -y
conda activate yolov8
pip install ultralytics roboflow pillow numpy pyyaml
# (선택) onnx onnxruntime-gpu tf-keras  # TFLite 변환용
```

클래스 인덱스는 `sorted(source_symbols의 png 파일명)` 순서로 결정된다. 모든 생성/평가
스크립트가 동일 규칙을 쓰므로, 같은 `source_symbols` 폴더를 유지하면 인덱스가 어긋나지 않는다.

---

## 1. 데이터 생성 (Generating)

실제 사진을 충분히 확보하기 어려워, 기호 PNG를 바탕으로 합성 학습 데이터를 생성한다.
생성 시 이미지와 YOLO 라벨(.txt)이 함께 만들어진다.

### 1-1. 기본 생성

```bash
python generate_dataset.py
```

- `TOTAL_IMAGES_TO_GENERATE`(기본 10000)장을 `Augmented_CareLabel_Dataset/`에 생성.
- 적용 증강: 기호 미세 회전·색상 변형, 밝기/노출, 블러, 센서 노이즈, 동적 간격,
  배경·텍스트 난수화.
- 반전(flip)·90° 회전은 기호 의미가 바뀌므로 사용하지 않는다.

### 1-2. 다양성 보강 생성 (선택, 권장)

실사 평가에서 작게 찍힘·기울어짐·흐림·저조도 환경의 미검출이 확인되어, 해당 분포를
보강하는 생성기. 기존 데이터셋에 **덮어쓰지 않고 추가**한다 (`var_label_*` 접두어).

```bash
python generate_dataset_aug2.py --num 10000
```

- 기호 크기 18~80px(작은 쪽 비중↑), 회전 ±15°, 원근 왜곡, 명암/대비 지터,
  세로·다열 혼합 배치, JPEG 압축열화·반사 하이라이트 등 추가.
- 배경: 밝은 라벨 70% / 중간 20% / 어두운(명암 반전) 10%.
- 시작 시 기존 `data.yaml`과 클래스 순서 일치를 검사하므로 안전하게 합쳐진다.

---

## 2. 모델 학습 (Training)

```bash
python train.py
```

- `yolov8n.pt`에서 시작, `Augmented_CareLabel_Dataset/data.yaml`로 학습.
- 주요 설정: `epochs=50, imgsz=640, batch=16, fliplr=0.0, flipud=0.0`.
- 결과: `runs/detect/laundry_project/<name>/weights/best.pt`.
- 중단 시 이어서 학습: `python resume_train.py` (내부에서 `last.pt`, `resume=True`).

---

## 3. 양자화 / TFLite 변환 (Quantization)

온디바이스 추론을 위해 INT8 양자화 TFLite로 변환한다.

```bash
python export.py
```

- 산출물: `.../weights/best_saved_model/best_int8.tflite` (약 3.2 MB).
- **INT8 calibration에는 반드시 학습 데이터를 지정**한다(`data=...`). 미지정 시
  무관한 기본 데이터로 보정되어 정밀도가 떨어진다.
- 메모리 부족(OOM) 시 calibration 표본을 줄인다(`fraction=0.1`).

---

## 4. 성능 평가 (지표)

### 4-1. 합성 검증

학습 종료 시 자동 출력되는 38클래스 mAP@0.5 / mAP@0.5:0.95로 형태·위치 학습 정도를 확인한다.
TFLite 모델 단독 검증은 `val_tflite.py` 참고.

### 4-2. 실사 평가 (실제 촬영 사진)

실제 케어라벨 사진(Roboflow에서 YOLOv8 형식으로 라벨링·내보내기)에 대한 평가.
합성 검증과 달리, 클래스 불균형·소규모 표본에 맞춰 micro 지표 중심으로 산출한다.

```bash
python eval_real_final.py \
  --model ./runs/detect/laundry_project/<name>/weights/best.pt \
  --real-data ./<roboflow_export_dir> \
  --names-yaml ./Augmented_CareLabel_Dataset/data.yaml \
  --split all --conf 0.25 --match-iou 0.5 --out runs/real_eval
```

출력/저장 지표:
- **클래스 커버리지**: 38개 중 실사에 출현한 클래스 수, 총 instance.
- **기호 단위 micro Precision / Recall / F1** (IoU 0.5, conf 고정).
- **오류 분해**: 오인식(클래스 혼동) / 미검출(완전 누락) / 배경 오탐.
- 결과 파일: `real_eval_final.json`, `real_eval_final.md`, `real_confusion_matrix.png`.

실사 프로젝트의 클래스 순서가 학습과 달라도 `--names-yaml` 기준으로 자동 정렬(remap)된다.

### 4-3. 추론 결과 시각화

각 사진에 정답(GT)·예측 박스를 매칭 상태별 색으로 겹쳐 그려 저장한다
(초록=정탐, 주황=오인식, 빨강=미검출, 파랑=배경오탐).

```bash
python visualize_predictions.py \
  --model ./runs/detect/laundry_project/<name>/weights/best.pt \
  --real-data ./<roboflow_export_dir> \
  --names-yaml ./Augmented_CareLabel_Dataset/data.yaml \
  --split all --conf 0.25 --match-iou 0.5 --out runs/vis
```

### 4-4. 촬영 품질별 분리 평가 (선택)

특정 파일명 목록으로 서브셋을 만들어(예: 정상 촬영 조건만) 조건별 성능을 비교한다.

```bash
python make_subset.py --src ./<roboflow_export_dir> --list good_list.txt --out ./split_eval/good
python eval_real_final.py --real-data ./split_eval/good \
  --names-yaml ./Augmented_CareLabel_Dataset/data.yaml --split all --out runs/good
```

---

## 평가 지표 정의

- **IoU**: 예측 박스와 정답 박스의 겹침 비율. 0.5 이상이면 정탐(TP)으로 간주.
- **Precision** = TP / (TP+FP) — 검출한 것 중 맞은 비율.
- **Recall** = TP / (TP+FN) — 실제 기호 중 찾아낸 비율.
- **micro-F1**: 전체 검출을 한 풀에 모아 계산한 Precision·Recall의 조화평균.
  클래스 불균형에 강건해 소규모 실사 평가에 적합.
- **mAP@0.5 / mAP@0.5:0.95**: 합성 검증에서 클래스별 AP의 평균(전자는 IoU 0.5 고정,
  후자는 0.5~0.95 평균으로 박스 정교함까지 평가).

## 스크립트 요약

| 파일 | 역할 |
|---|---|
| `generate_dataset.py` | 기본 합성 데이터 생성(이미지+라벨) |
| `generate_dataset_aug2.py` | 다양성 보강 데이터 생성(추가 모드) |
| `train.py` / `resume_train.py` | 학습 / 이어서 학습 |
| `export.py` | INT8 TFLite 양자화 변환 |
| `eval_real_final.py` | 실사 micro 지표 평가(+ JSON/MD/혼동행렬) |
| `visualize_predictions.py` | GT·예측 박스 시각화 |
| `make_subset.py` | 파일명 목록으로 평가 서브셋 생성 |
| `val_tflite.py` / `predict.py` | TFLite 검증 / 예측 |