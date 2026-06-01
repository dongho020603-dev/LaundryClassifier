import os
import random
import glob
from PIL import Image, ImageDraw

def generate_synthetic_images(symbol_dir, output_dir, num_images=100):
    """
    세탁 기호 이미지를 조합하여 640x640 크기의 합성 라벨 이미지를 생성함.
    """
    os.makedirs(output_dir, exist_ok=True)

    # 기호 이미지 로드 (.png 형식 가정)
    symbol_paths = glob.glob(os.path.join(symbol_dir, '*.png'))
    if not symbol_paths:
        print("지정된 경로에 기호 이미지가 존재하지 않음.")
        return

    symbol_pool = []
    
    canvas_size = 640
    symbol_size = 80  # 기호 하나의 크기 (픽셀)
    spacing = 25      # 기호 간격
    
    for img_idx in range(num_images):
        # 1. 640x640 배경 생성 (실제 라벨지와 유사한 미색/밝은 회색)
        bg_color = (random.randint(230, 255), random.randint(230, 255), random.randint(230, 255))
        canvas = Image.new('RGB', (canvas_size, canvas_size), bg_color)
        draw = ImageDraw.Draw(canvas)
        
        # 2. 상/하단 의미 없는 텍스트 모사 (랜덤 길이의 회색 사각형 블록)
        # 상단 영역: y=100 ~ 200, 하단 영역: y=450 ~ 550
        y_positions = [100, 130, 160, 480, 510, 540]
        for y_pos in y_positions:
            # 한 줄에 3~5개의 '단어' 블록 생성
            num_words = random.randint(3, 5)
            curr_x = random.randint(50, 100)
            
            for _ in range(num_words):
                word_length = random.randint(30, 100)
                if curr_x + word_length > canvas_size - 50:
                    break
                draw.rectangle([curr_x, y_pos, curr_x + word_length, y_pos + 12], fill=(120, 120, 120))
                curr_x += word_length + random.randint(10, 30)

        # 3. 삽입할 기호 개수 랜덤 선택 (3 ~ 6개)
        num_symbols = random.randint(3, 6)
        selected_symbols = []
        
        # 기호 균등 분포(Uniform Distribution)를 위한 Pool 로직
        for _ in range(num_symbols):
            if not symbol_pool:
                symbol_pool = symbol_paths.copy()
                random.shuffle(symbol_pool)  # Pool이 비면 전체를 다시 섞어서 채움
            selected_symbols.append(symbol_pool.pop())

        # 4. 기호들을 이미지 정중앙에 배치하기 위한 좌표 연산
        total_width = (num_symbols * symbol_size) + (spacing * (num_symbols - 1))
        start_x = (canvas_size - total_width) // 2
        start_y = (canvas_size - symbol_size) // 2

        # 5. 캔버스에 기호 삽입
        current_x = start_x
        for sym_path in selected_symbols:
            # 투명 배경(Alpha)을 보존하며 이미지 로드 및 리사이즈
            sym_img = Image.open(sym_path).convert("RGBA")
            sym_img = sym_img.resize((symbol_size, symbol_size), Image.Resampling.LANCZOS)
            
            # 마스크를 사용하여 배경 위에 병합
            canvas.paste(sym_img, (current_x, start_y), mask=sym_img)
            
            current_x += symbol_size + spacing

        # 6. 결과 이미지 저장
        img_filename = f"synthetic_label_{img_idx:04d}.jpg"
        canvas.save(os.path.join(output_dir, img_filename), quality=95)

    print(f"총 {num_images}장의 합성 이미지 생성 완료. (경로: {output_dir})")

if __name__ == "__main__":
    # 첫 번째 사진들이 존재하는 디렉토리 경로
    SYMBOL_DIR = './source_symbols' 
    
    # 생성된 이미지가 저장될 디렉토리 경로
    OUTPUT_DIR = './synthetic_images'
    
    # 생성할 이미지 장수 지정
    generate_synthetic_images(SYMBOL_DIR, OUTPUT_DIR, num_images=100)