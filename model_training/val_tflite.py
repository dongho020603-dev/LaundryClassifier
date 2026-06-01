from ultralytics import YOLO

def main():
    # export.py 실행 로그를 바탕으로 확인된 최종 TFLite 모델 경로 지정
    tflite_model_path = './runs/detect/laundry_project/test_run_v16/weights/best_saved_model/best_int8.tflite'

    # TFLite 모델 로드
    model = YOLO(tflite_model_path)

    # 검증(Validation) 실행
    results = model.val(
        data='/home/dslee/capstone_project/Augmented_CareLabel_Dataset/data.yaml',
        imgsz=640,   # train.py의 imgsz와 동일하게 설정
        batch=16,    # GPU 메모리 및 train.py 환경에 맞춰 16으로 설정
        split='val', # 검증 데이터셋 활용
        plots=True   # 혼동 행렬 및 PR Curve 등 시각화 자료 생성
    )

    # 성능 평가 지표 출력
    print("\n[ TFLite INT8 Validation Results ]")
    print(f"mAP@0.5      : {results.box.map50:.4f}")
    print(f"mAP@0.5:0.95 : {results.box.map:.4f}")

if __name__ == '__main__':
    main()