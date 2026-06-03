# export.py
from ultralytics import YOLO

def main():
    # v2 학습 결과
    model = YOLO('./runs/detect/laundry_project/test_run_v2/weights/best.pt')

    print("TFLite(INT8) 변환 시작...")
    model.export(
        format='tflite',
        int8=True,
        data='./Augmented_CareLabel_Dataset/data.yaml',  # ★ 세탁라벨 데이터로 calibration
    )
    print("TFLite 변환 완료")

if __name__ == '__main__':
    main()