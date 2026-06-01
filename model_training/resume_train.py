# resume_train.py
from ultralytics import YOLO

def main():
    model = YOLO('/home/dslee/capstone_project/runs/detect/laundry_project/test_run_v16/weights/last.pt')
    
    # workers를 4 또는 2로 대폭 낮추어 메모리/데드락 병목 방지
    results = model.train(resume=True, workers=4)

if __name__ == '__main__':
    main()