from ultralytics import YOLO

def main():
    # 학습 후 변환된 INT8 TFLite 모델 경로 지정
    tflite_model_path = './runs/detect/laundry_project/test_run_v16/weights/best_saved_model/best_int8.tflite'

    # TFLite 모델 로드 (자동으로 TFLite 백엔드 사용)
    model = YOLO(tflite_model_path)

    # 테스트할 폴더 또는 이미지 경로 지정
    img_path = '/home/dslee/capstone_project/test'

    # 추론 수행 및 결과 저장 (save=True)
    # conf=0.25: 신뢰도 25% 이상 객체 탐지
    results = model.predict(source=img_path, save=True, conf=0.25)
    
    print("\n[ 추론 완료 ] 결과가 runs/detect/predict 디렉토리(또는 설정된 경로)에 저장됨.")

if __name__ == '__main__':
    main()