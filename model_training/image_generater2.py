import os
import random
import glob
import string
from PIL import Image, ImageDraw, ImageFont

def generate_noise_text(min_len=5, max_len=30):
    """길이와 내용이 무작위인 노이즈 텍스트 생성"""
    length = random.randint(min_len, max_len)
    # 한글, 특수문자 등을 섞어 더 다양한 패턴을 만들 수도 있으나, 여기서는 영문+숫자+일부 기호 사용
    chars = string.ascii_letters + string.digits + " %-./"
    return ''.join(random.choice(chars) for _ in range(length))

def create_robust_synthetic_dataset(symbol_dir, output_dir, num_images=1000):
    os.makedirs(output_dir, exist_ok=True)

    symbol_paths = glob.glob(os.path.join(symbol_dir, '*.png'))
    if not symbol_paths:
        print(f"Error: {symbol_dir}에 이미지 파일이 없음.")
        return

    canvas_size = 640
    symbol_base_size = 75
    symbol_pool = []

    # 폰트 로드 (가급적 시스템 기본 폰트 활용)
    try:
        font_main = ImageFont.truetype("arial.ttf", random.randint(14, 22))
        font_small = ImageFont.truetype("arial.ttf", random.randint(10, 14))
    except:
        font_main = ImageFont.load_default()
        font_small = ImageFont.load_default()

    print("데이터 생성 시작...")

    for img_idx in range(num_images):
        # 1. 기호 개수 및 풀(Pool)에서 추출
        num_symbols = random.randint(3, 8)
        current_symbols = []
        for _ in range(num_symbols):
            if not symbol_pool:
                symbol_pool = symbol_paths.copy()
                random.shuffle(symbol_pool)
            current_symbols.append(symbol_pool.pop())

        # 2. 줄 바꿈 레이아웃 결정
        row1_symbols, row2_symbols = [], []
        if num_symbols < 6:
            row1_symbols = current_symbols
        else:
            if random.random() < 0.3:
                row1_symbols = current_symbols
            else:
                split_idx = random.randint(3, num_symbols - 2)
                row1_symbols = current_symbols[:split_idx]
                row2_symbols = current_symbols[split_idx:]

        # 3. 레이아웃에 따른 최소 필요 너비 및 높이 연산
        max_symbols_in_row = max(len(row1_symbols), len(row2_symbols))
        max_spacing = 35
        # 최대 기호 너비 합산 + 기호 간 최대 간격 합산
        required_width = (max_symbols_in_row * (symbol_base_size + 10)) + ((max_symbols_in_row - 1) * max_spacing)
        
        # 4. 흰색 라벨(Tag) 크기 동적 결정 (잘림 방지)
        # 필요 너비보다 무조건 크도록 패딩 부여
        tag_width = required_width + random.randint(40, 120)
        tag_height = random.randint(400, 600) # 라벨의 세로 길이는 넉넉하게 설정
        
        tag_canvas = Image.new('RGB', (tag_width, tag_height), (random.randint(240, 255), random.randint(240, 255), random.randint(240, 255)))
        tag_draw = ImageDraw.Draw(tag_canvas)

        # 5. 기호 렌더링 좌표 계산 (중앙부 근처에 배치)
        symbol_area_y_start = tag_height // 2 - random.randint(0, 50)
        
        def render_row(symbols, y_center):
            row_width = (len(symbols) * symbol_base_size) + ((len(symbols) - 1) * random.randint(15, max_spacing))
            start_x = (tag_width - row_width) // 2
            
            curr_x = start_x
            for sym_p in symbols:
                sym_img = Image.open(sym_p).convert("RGBA")
                size_jitter = random.randint(-8, 8)
                current_size = symbol_base_size + size_jitter
                sym_img = sym_img.resize((current_size, current_size), Image.Resampling.LANCZOS)
                
                # Jitter (무작위 변위) 추가
                j_x = random.randint(-10, 10)
                j_y = random.randint(-10, 10)
                
                x_pos = curr_x + j_x
                y_pos = y_center - (current_size // 2) + j_y
                
                tag_canvas.paste(sym_img, (x_pos, y_pos), mask=sym_img)
                curr_x += symbol_base_size + random.randint(15, max_spacing)

        if not row2_symbols:
            render_row(row1_symbols, symbol_area_y_start)
            symbol_area_y_end = symbol_area_y_start + symbol_base_size
        else:
            render_row(row1_symbols, symbol_area_y_start - 40)
            render_row(row2_symbols, symbol_area_y_start + 40)
            symbol_area_y_end = symbol_area_y_start + 40 + symbol_base_size

        # 6. 무작위 더미 텍스트 삽입 (기호 영역 침범 금지)
        # 상단 텍스트 (0 ~ symbol_area_y_start - 30 구간)
        top_text_density = random.randint(0, 8) # 0이면 상단 텍스트 없음
        curr_y = random.randint(10, 30)
        for _ in range(top_text_density):
            if curr_y > symbol_area_y_start - 40: break
            x_pos = random.randint(10, tag_width // 2)
            font_to_use = random.choice([font_main, font_small])
            tag_draw.text((x_pos, curr_y), generate_noise_text(), fill=(random.randint(20, 100),)*3, font=font_to_use)
            curr_y += random.randint(15, 30)

        # 하단 텍스트 (symbol_area_y_end + 30 ~ tag_height 구간)
        bottom_text_density = random.randint(1, 15) # 하단은 텍스트가 많을 확률 높임
        curr_y = symbol_area_y_end + random.randint(30, 50)
        for _ in range(bottom_text_density):
            if curr_y > tag_height - 30: break
            x_pos = random.randint(10, tag_width // 2)
            font_to_use = random.choice([font_main, font_small])
            tag_draw.text((x_pos, curr_y), generate_noise_text(), fill=(random.randint(20, 100),)*3, font=font_to_use)
            curr_y += random.randint(15, 30)

        # 7. 메인 캔버스(배경) 생성 및 라벨 합성
        bg_color = (random.randint(30, 80), random.randint(30, 80), random.randint(30, 80))
        canvas = Image.new('RGB', (canvas_size, canvas_size), bg_color)
        
        # 라벨을 배경 정중앙 근처에 배치하되 약간의 편차 적용
        paste_x = (canvas_size - tag_width) // 2 + random.randint(-15, 15)
        paste_y = (canvas_size - tag_height) // 2 + random.randint(-15, 15)
        canvas.paste(tag_canvas, (paste_x, paste_y))

        # 8. 최종 결과물 저장
        img_filename = f"synthetic_robust_{img_idx:04d}.jpg"
        canvas.save(os.path.join(output_dir, img_filename), quality=95)

        if (img_idx + 1) % 100 == 0:
            print(f"{img_idx + 1} / {num_images} 장 처리 완료...")

    print(f"완료됨. 총 {num_images}장 생성.")

if __name__ == "__main__":
    SYMBOL_DIR = './source_symbols' 
    OUTPUT_DIR = './synthetic_robust_images'
    
    create_robust_synthetic_dataset(SYMBOL_DIR, OUTPUT_DIR, num_images=100)