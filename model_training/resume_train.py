from ultralytics import YOLO

def main():
    model = YOLO('./runs/detect/laundry_project/test_run_v2/weights/last.pt')
    model.train(
        resume=True,
        workers=2,        # ★ 워커 줄여 deadlock 회피 (WSL 핵심)
    )

if __name__ == '__main__':
    main()