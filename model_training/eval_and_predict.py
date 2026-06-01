from ultralytics import YOLO

def main():
    # 1. 학습이 완료된 최적 가중치 파일 로드
    model_path = './runs/detect/laundry_project/test_run_v16/weights/best.pt'
    model = YOLO(model_path)

    # 2. Roboflow 데이터셋의 YAML 파일 경로 지정
    # 실제 환경의 data.yaml 경로로 수정 필요
    yaml_path = '/home/dslee/capstone_project/capstone.v5i.yolov8/data.yaml'
    
    print("=== 모델 검증 및 클래스별 정확도 측정 시작 ===")
    
    # 3. 모델 평가 (Validation)
    # split='test' : test set에 대한 평가 수행
    # plots=True : PR Curve, Confusion Matrix 등 평가 지표 그래프를 자동 생성 및 저장
    # save_json=True : 평가 결과를 JSON 형태로 저장 (필요 시 활용)
    metrics = model.val(data=yaml_path, split='test', plots=True)
    
    # ultralytics의 val 출력 로직에 의해 터미널에 클래스별 mAP, Precision, Recall이 자동 출력됨.
    # 추가로 전체 지표를 명시적으로 확인하고 싶다면 아래와 같이 접근 가능함.
    print("\n=== 전체 테스트 셋 검증 지표 요약 ===")
    print(f"mAP50: {metrics.box.map50:.4f}")
    print(f"mAP50-95: {metrics.box.map:.4f}")

    print("\n=== 테스트 이미지 Batch 예측 및 결과 저장 시작 ===")
    
    # 4. 테스트 이미지 디렉토리 경로 지정
    test_images_path = '/home/dslee/capstone_project/capstone.v5i.yolov8/test/images'

    # 5. 추론 수행 및 결과 이미지 저장
    # 폴더 경로를 전달하면 디렉토리 내 모든 이미지에 대해 Batch 추론을 수행함
    results = model.predict(source=test_images_path, save=True, conf=0.25)
    
    print("모든 처리가 완료됨. 결과(클래스별 지표 그래프 및 예측 이미지)는 runs/detect 폴더 내 최신 디렉토리에서 확인 가능함.")

if __name__ == '__main__':
    main()