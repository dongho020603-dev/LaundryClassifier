from ultralytics import YOLO

def main():
    # 경량화된 Nano 모델 가중치 로드
    model = YOLO('yolov8n.pt')

    # 하이퍼파라미터 설정 및 학습 개시
    results = model.train(
        data='/home/dslee/capstone_project/Augmented_CareLabel_Dataset/data.yaml', # 위에서 설정한 절대 경로 입력
        epochs=50,
        imgsz=640,
        batch=16,
        device=0, # 할당된 단일 GPU 사용
        project='laundry_project',
        name='test_run_v2',

        # [필수] YOLO 자체 반전 증강 비활성화 (기호 의미 변질 방지)
        fliplr=0.0, 
        flipud=0.0
    )

if __name__ == '__main__':
    main()