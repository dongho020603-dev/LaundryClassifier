# export.py
from ultralytics import YOLO

def main():
    # 방금 학습이 완료된 최적 가중치(best.pt) 파일 로드
    # 경로가 test_run_v14로 생성되었음을 로그에서 확인하여 반영함
    model = YOLO('./runs/detect/laundry_project/test_run_v16/weights/best.pt')

    # 안드로이드 기기 내부 연산 최적화를 위한 TFLite (INT8 양자화) 포맷으로 변환
    print("TFLite 변환 시작...")
    model.export(format='tflite', int8=True)
    print("TFLite 변환 완료")

if __name__ == '__main__':
    main()