import os
import random
import glob
import string
from PIL import Image, ImageDraw, ImageFont

def generate_noise_text(length=None):
    """의미 없는 알파벳+숫자 조합의 노이즈 텍스트 생성"""
    if length is None:
        length = random.randint(10, 40)
    letters_and_digits = string.ascii_letters + string.digits
    return ''.join(random.choice(letters_and_digits) for i in range(length))

def create_laundry_tag_synthetic_dataset(symbol_dir, output_dir, num_images=100):
    os.makedirs(output_dir, exist_ok=True)

    # 1. 기호 이미지 로드 및 유효성 검사
    symbol_paths = glob.glob(os.path.join(symbol_dir, '*.png'))
    if not symbol_paths:
        print(f"Error: {symbol_dir} 경로에 .png 기호 이미지가 없습니다.")
        return

    canvas_size = 640
    # 줄 바꿈을 고려하여 기호 크기를 살짝 줄임
    symbol_draw_size = 75 
    symbol_pool = []

    print(f"{num_images}장의 이미지를 생성을 시작합니다...")

    for img_idx in range(num_images):
        # 2. 배경 생성 (옷감을 모사하기 위해 약간 어두운 회색/베이지색 사용)
        base_bg_color = (random.randint(40, 60), random.randint(40, 60), random.randint(40, 60))
        canvas = Image.new('RGB', (canvas_size, canvas_size), base_bg_color)
        draw = ImageDraw.Draw(canvas)

        # 3. 실제 흰색 라벨(Tag) 영역 생성 및 랜덤 배치
        # 가로 비율(긴 라벨 모사)과 전체적인 위치를 랜덤하게 결정
        tag_width = random.randint(350, 480) 
        tag_height = canvas_size - random.randint(60, 150) # 위아래 여백을 다르게
        tag_x = (canvas_size - tag_width) // 2 + random.randint(-20, 20)
        tag_y = random.randint(30, 80) # 상단 여백 랜덤
        
        tag_canvas = Image.new('RGB', (tag_width, tag_height), (250, 250, 250)) # 꽉 찬 흰색이 아닌 약간 미색
        tag_draw = ImageDraw.Draw(tag_canvas)

        # 4. 흰색 라벨 내부에 노이즈 텍스트 막 적기 (상단 및 하단)
        # 폰트 로드 (기본 폰트 사용, 가독성을 위해 크기 랜덤화)
        try:
            # 리눅스/맥/윈도우 공통적으로 존재하는 폰트 시도, 없으면 기본 폰트
            font_paths = ["Arial.ttf", "arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
            target_font = None
            for fp in font_paths:
                if os.path.exists(fp) or any(os.path.exists(os.path.join(p, fp)) for p in os.environ.get('PATH', '').split(os.pathsep)):
                     target_font_path = fp
                     break
            else:
                target_font_path = None # Fail back

            if target_font_path:
                text_font_main = ImageFont.truetype(target_font_path, random.randint(14, 20))
                text_font_small = ImageFont.truetype(target_font_path, random.randint(10, 14))
            else:
                text_font_main = ImageFont.load_default()
                text_font_small = ImageFont.load_default()
        except:
            text_font_main = ImageFont.load_default()
            text_font_small = ImageFont.load_default()

        # 상단 텍스트 랜덤하게 몇 줄 적기
        text_y = random.randint(10, 30)
        for _ in range(random.randint(2, 4)):
            tag_draw.text((random.randint(10, 50), text_y), generate_noise_text(), fill=(50, 50, 50), font=text_font_small)
            text_y += random.randint(15, 25)

        # 5. 기호 선택 및 줄 바꿈 로직 계산
        num_symbols = random.randint(3, 8) # 기호 개수 3~8개로 확대
        
        # 기호 균등 풀(Pool) 관리
        current_symbols = []
        for _ in range(num_symbols):
            if not symbol_pool:
                symbol_pool = symbol_paths.copy()
                random.shuffle(symbol_pool)
            current_symbols.append(symbol_pool.pop())

        # 줄 바꿈 결정
        symbols_line1 = []
        symbols_line2 = []
        
        if num_symbols < 6:
            symbols_line1 = current_symbols
        else:
            # 6개 이상일 때 램덤하게 줄 바꿈 (예: 6개지만 1줄로, 6개지만 2줄로)
            if random.random() < 0.3: # 30% 확률로 6개 이상이어도 한 줄 배치
                symbols_line1 = current_symbols
            else:
                # 중간 지점을 기준으로 나누되, 랜덤하게 나눔
                split_point = random.randint(3, num_symbols - 2)
                symbols_line1 = current_symbols[:split_point]
                symbols_line2 = current_symbols[split_point:]

        # 6. 기호 실제 배치 (정중앙 기반 랜덤 변위 추가)
        line_height_space = tag_height // 2 # 2줄일 때 대략적 칸 나눔
        spacing = random.randint(15, 30) # 기호 간 간격도 랜덤

        # 기호 배치 Y축 기준점 랜덤화
        central_y_base = tag_height // 2
        
        def paste_symbols_on_line(symbols, draw_y_base, line_canvas, line_draw):
            total_w = (len(symbols) * symbol_draw_size) + (spacing * (len(symbols) - 1))
            curr_x = (tag_width - total_w) // 2 
            
            for sym_p in symbols:
                sym_img = Image.open(sym_p).convert("RGBA")
                # 기호 크기도 아주 살짝 랜덤하게 리사이즈
                current_sym_size = symbol_draw_size + random.randint(-5, 5)
                sym_img = sym_img.resize((current_sym_size, current_sym_size), Image.Resampling.LANCZOS)
                
                # *** 핵심 요구사항: 위치 정중앙 고정 안 함. 랜덤 변위(Jitter) 추가 ***
                jitter_x = random.randint(-15, 15)
                jitter_y = random.randint(-12, 12)
                
                final_x = curr_x + jitter_x
                final_y = draw_y_base - (current_sym_size // 2) + jitter_y
                
                line_canvas.paste(sym_img, (final_x, final_y), mask=sym_img)
                curr_x += symbol_draw_size + spacing

        if not symbols_line2:
            # 1줄 배치: 라벨 영역 정중앙 기준 배치
            paste_symbols_on_line(symbols_line1, central_y_base + random.randint(-10, 10), tag_canvas, tag_draw)
        else:
            # 2줄 배치: 상단/하단 칸 정중앙 기준 배치
            line1_y_base = line_height_space // 2 + 30 # 상단 노이즈 텍스트 고려
            line2_y_base = tag_height - (line_height_space // 2) - 30 # 하단 노이즈 텍스트 고려
            paste_symbols_on_line(symbols_line1, line1_y_base + random.randint(-10, 10), tag_canvas, tag_draw)
            paste_symbols_on_line(symbols_line2, line2_y_base + random.randint(-10, 10), tag_canvas, tag_draw)

        # 7. 라벨 하단 노이즈 텍스트 적기
        text_y_bottom = tag_height - random.randint(50, 80)
        for _ in range(random.randint(2, 4)):
            tag_draw.text((random.randint(10, 50), text_y_bottom), generate_noise_text(), fill=(60, 60, 60), font=text_font_small)
            text_y_bottom += random.randint(15, 25)

        # 8. 최종 배경캔버스에 라벨 병합
        canvas.paste(tag_canvas, (tag_x, tag_y))

        # 9. 이미지 저장
        img_filename = f"synthetic_complex_label_{img_idx:04d}.jpg"
        canvas.save(os.path.join(output_dir, img_filename), quality=95)

        if (img_idx + 1) % 100 == 0:
            print(f"{img_idx + 1}/{num_images}장 생성 완료...")

    print(f"총 {num_images}장의 합성 이미지 생성 완료. (경로: {output_dir})")

if __name__ == "__main__":
    # 개별 기호 이미지(.png, 투명배경 권장)가 있는 폴더
    SYMBOL_DIR = './source_symbols' 
    
    # 생성된 이미지를 저장할 폴더
    OUTPUT_DIR = './synthetic_complex_images'
    
    # 더 많은 사진 생성 (예: 1000장)
    create_laundry_tag_synthetic_dataset(SYMBOL_DIR, OUTPUT_DIR, num_images=100)