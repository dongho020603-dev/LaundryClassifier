from ultralytics import YOLO

def main():
    # 학습이 완료된 최적 가중치(best.pt) 파일 로드
    model = YOLO('./runs/detect/laundry_project/test_run_v16/weights/best.pt')

    # 테스트할 이미지 경로 지정 (실제 파일명으로 변경 필요)
    # 폴더 경로를 주면 폴더 내 모든 이미지를 한 번에 처리함
    # img_path = '/home/dslee/capstone_project/capstone.v4i.yolov8/train/images/원하는이미지.jpg' 
    img_path = '/home/dslee/capstone_project/test'

    # 추론 수행 및 결과 이미지 저장 (save=True)
    # conf=0.25: 모델의 확신도(Confidence)가 25% 이상인 객체만 표시
    results = model.predict(source=img_path, save=True, conf=0.25)

if __name__ == '__main__':
    main()