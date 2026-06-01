import os
import random
import glob
import string
import time
from PIL import Image, ImageDraw, ImageFont

# -----------------------------------------------------------------------------
# 더미 텍스트 생성기
# -----------------------------------------------------------------------------

def generate_random_string(min_len=3, max_len=15, use_digits=True):
    length = random.randint(min_len, max_len)
    chars = string.ascii_uppercase
    if use_digits:
        chars += string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def generate_brand_name():
    parts = random.randint(1, 3)
    name = " ".join(generate_random_string(3, 8, use_digits=False) for _ in range(parts))
    return name

def generate_country_code():
    countries = ["KOREA", "CHINA", "VIETNAM", "MYANMAR", "ITALY", "FRANCE"]
    return random.choice(countries)

def generate_size_code():
    if random.random() < 0.5:
        return generate_random_string(3, 6)
    else:
        height = random.randint(150, 190)
        waist = random.randint(60, 100)
        suffix = random.choice(["A", "B", "C"])
        return f"{height}/{waist}{suffix}"

def generate_material_string():
    materials_kr = ["섬유혼용률", "겉감", "안감", "충전재", "배색"]
    materials_en = ["Material", "Outer shell", "Lining", "Filling", "Color combination"]
    materials_list_kr = ["면", "폴리에스터", "나일론", "울", "캐시미어", "실크"]
    materials_list_en = ["COTTON", "POLYESTER", "NYLON", "WOOL", "CASHMERE", "SILK"]

    num_materials = random.randint(1, 3)
    parts = []
    
    for _ in range(num_materials):
        if random.random() < 0.6: # 한글 위주
            mat = random.choice(materials_kr)
            mat_item = random.choice(materials_list_kr)
            perc = random.randint(10, 100)
            parts.append(f"{mat} {mat_item} {perc}%")
        else: # 영문 위주
            mat = random.choice(materials_en)
            mat_item = random.choice(materials_list_en)
            perc = random.randint(10, 100)
            parts.append(f"{mat} {mat_item} {perc}%")
    
    return " / ".join(parts)

def generate_care_instruction_line():
    kr_patterns = ["취급시 주의사항", "세탁시 주의", "건조시 주의", "다림질시 주의", "드라이클리닝시 주의"]
    en_patterns = ["CARE INSTRUCTIONS", "WASHING INSTRUCTIONS", "DRYING INSTRUCTIONS", "IRONING INSTRUCTIONS", "DRY CLEANING INSTRUCTIONS"]
    
    if random.random() < 0.7:
        return random.choice(kr_patterns)
    else:
        return random.choice(en_patterns)

# -----------------------------------------------------------------------------
# 메인 생성 함수
# -----------------------------------------------------------------------------

def create_care_label_v3(symbol_dir, output_dir, num_images=1000):
    os.makedirs(output_dir, exist_ok=True)

    symbol_paths = glob.glob(os.path.join(symbol_dir, '*.png'))
    if not symbol_paths:
        print(f"Error: {symbol_dir}에 이미지 파일이 없습니다.")
        return

    canvas_size = 640
    symbol_base_size = 75
    symbol_pool = []
    
    # 폰트 로드 (다양한 크기와 두께)
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/nanum/NanumGothic.ttf", 
            "Arial.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/nanumgothic.ttf"
        ]
        
        target_font_path = None
        for fp in font_paths:
            if os.path.exists(fp):
                target_font_path = fp
                break
        
        if target_font_path:
            # 제목용 굵은 폰트 흉내
            font_title = ImageFont.truetype(target_font_path, 24, encoding="utf-8")
            font_main = ImageFont.truetype(target_font_path, 20, encoding="utf-8")
            font_small = ImageFont.truetype(target_font_path, 16, encoding="utf-8")
            font_tiny = ImageFont.truetype(target_font_path, 14, encoding="utf-8")
        else:
            print("Warning: Arial 또는 Nanum 폰트를 찾지 못했습니다. 기본 폰트를 사용합니다.")
            font_title = ImageFont.load_default()
            font_main = ImageFont.load_default()
            font_small = ImageFont.load_default()
            font_tiny = ImageFont.load_default()
            
    except:
        print("Error: 폰트 로딩 중 오류가 발생했습니다. 기본 폰트를 사용합니다.")
        font_title = ImageFont.load_default()
        font_main = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_tiny = ImageFont.load_default()

    # 기호 풀 초기화
    random.shuffle(symbol_paths)
    symbol_pool = symbol_paths.copy()

    start_time = time.time()
    print(f"이미지 생성을 시작합니다 ({num_images}장)...")

    for img_idx in range(num_images):
        # 1. 기호 개수 및 풀에서 추출 (균등 분포)
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
            # 6개 이상일 때 랜덤 줄 바꿈
            if random.random() < 0.3: # 30% 확률로 6개 이상이어도 한 줄
                row1_symbols = current_symbols
            else:
                split_idx = random.randint(3, num_symbols - 2)
                row1_symbols = current_symbols[:split_idx]
                row2_symbols = current_symbols[split_idx:]

        # 3. 레이아웃에 따른 필요 너비 계산
        max_symbols_in_row = max(len(row1_symbols), len(row2_symbols))
        max_spacing = 35
        symbol_block_width = (max_symbols_in_row * (symbol_base_size + 10)) + ((max_symbols_in_row - 1) * max_spacing)
        
        # 4. 흰색 라벨(Tag) 너비 동적 결정 (기호 포함 보장)
        tag_width = symbol_block_width + random.randint(40, 100)
        # 라벨 세로 길이는 넉넉하게 설정
        tag_height = random.randint(450, 650)
        
        # 라벨 캔버스 생성 및 약간 미색 배경색
        label_color = (random.randint(245, 255), random.randint(245, 255), random.randint(245, 255))
        tag_canvas = Image.new('RGB', (tag_width, tag_height), label_color)
        tag_draw = ImageDraw.Draw(tag_canvas)

        # 텍스트 색상 (짙은 회색)
        text_color = (random.randint(40, 70),)*3

        # 5. 기호 렌더링 좌표 계산 (중앙부 근처에 배치)
        symbol_area_y_center = tag_height // 2 - random.randint(0, 50)
        
        # 기호 영역의 상단/하단 경계 (텍스트 침범 방지용)
        symbol_area_y_start = symbol_area_y_center - (symbol_base_size // 2) - 20 # 상단 마진 추가
        symbol_area_y_end = symbol_area_y_center + (symbol_base_size // 2) + 20 # 하단 마진 추가

        def render_symbols_row(symbols, y_center):
            if not symbols: return
            
            row_width = (len(symbols) * symbol_base_size) + ((len(symbols) - 1) * max_spacing)
            start_x = (tag_width - row_width) // 2
            
            curr_x = start_x
            for sym_p in symbols:
                sym_img = Image.open(sym_p).convert("RGBA")
                size_jitter = random.randint(-5, 5)
                current_size = symbol_base_size + size_jitter
                sym_img = sym_img.resize((current_size, current_size), Image.Resampling.LANCZOS)
                
                # Jitter 범위를 늘려 테두리 밖으로 나가는 것 허용
                j_x = random.randint(-20, 20)
                j_y = random.randint(-15, 15)
                
                x_pos = curr_x + j_x
                y_pos = y_center - (current_size // 2) + j_y
                
                # 캔버스 테두리 밖으로 나가는 것 허용
                tag_canvas.paste(sym_img, (x_pos, y_pos), mask=sym_img)
                curr_x += symbol_base_size + max_spacing

        if not row2_symbols:
            render_symbols_row(row1_symbols, symbol_area_y_center)
        else:
            # 두 줄일 때 더 넓은 범위를 금지 구역으로 설정
            symbol_area_y_start = symbol_area_y_center - (symbol_base_size // 2) - 40 - 20 # 위 마진
            symbol_area_y_end = symbol_area_y_center + (symbol_base_size // 2) + 40 + 20 # 아래 마진
            
            render_symbols_row(row1_symbols, symbol_area_y_center - 40)
            render_symbols_row(row2_symbols, symbol_area_y_center + 40)

        # 6. 상단 텍스트 블록 생성 및 배치 (침범 금지: symbol_area_y_start 이전)
        curr_y = random.randint(15, 30)
        num_top_lines = random.randint(3, 7)
        for i in range(num_top_lines):
            if curr_y > symbol_area_y_start - 30: break 
            
            x_pos = random.randint(10, tag_width // 2)
            pattern_prob = random.random()
            if i == 0: # 브랜드명
                tag_draw.text((x_pos, curr_y), generate_brand_name(), fill=text_color, font=font_title)
            elif pattern_prob < 0.2: # 제조년월/호칭
                line_text = f"제조년월: 202{random.randint(2, 6)}.0{random.randint(1, 9)}"
                tag_draw.text((x_pos, curr_y), line_text, fill=text_color, font=font_tiny)
            elif pattern_prob < 0.4: # 판매원/수입원
                line_text = f"호칭: {generate_size_code()}"
                tag_draw.text((x_pos, curr_y), line_text, fill=text_color, font=font_tiny)
            elif pattern_prob < 0.6: # 혼용률
                line_text = generate_material_string()
                tag_draw.text((x_pos, curr_y), line_text, fill=text_color, font=font_tiny)
            elif pattern_prob < 0.8: # 원산지
                line_text = f"MADE IN {generate_country_code()}"
                tag_draw.text((x_pos, curr_y), line_text, fill=text_color, font=font_small)
            else: # 임의의 더미 텍스트
                tag_draw.text((x_pos, curr_y), generate_random_string(5, 20), fill=text_color, font=font_tiny)
                
            curr_y += random.randint(15, 30) 

        # 7. 하단 텍스트 블록 생성 및 배치 (침범 금지: symbol_area_y_end 이후)
        curr_y = symbol_area_y_end + random.randint(10, 30) 
        num_bottom_lines = random.randint(5, 12)
        
        for _ in range(num_bottom_lines):
            if curr_y > tag_height - 30: break
            
            x_pos = random.randint(10, tag_width // 2)
            if random.random() < 0.4:
                # 영문 instructions
                line_text = " / ".join(generate_care_instruction_line() for _ in range(random.randint(2, 4)))
                tag_draw.text((x_pos, curr_y), line_text, fill=text_color, font=font_tiny)
            else:
                tag_draw.text((x_pos, curr_y), generate_care_instruction_line(), fill=text_color, font=font_small)
            
            curr_y += random.randint(15, 30)

        # 8. 메인 캔버스(배경 옷감) 생성 및 라벨 합성
        bg_color = (random.randint(30, 80), random.randint(30, 80), random.randint(30, 80))
        canvas = Image.new('RGB', (canvas_size, canvas_size), bg_color)
        
        paste_x = (canvas_size - tag_width) // 2 + random.randint(-15, 15)
        paste_y = (canvas_size - tag_height) // 2 + random.randint(-15, 15)
        
        canvas.paste(tag_canvas, (paste_x, paste_y))

        # 9. 최종 결과물 저장
        img_filename = f"care_label_v3_{img_idx:04d}.jpg"
        canvas.save(os.path.join(output_dir, img_filename), quality=95)

        if (img_idx + 1) % 100 == 0:
            elapsed_time = time.time() - start_time
            print(f"{img_idx + 1} / {num_images} 장 생성 완료... (소요 시간: {elapsed_time:.1f}초)")

    print(f"이미지 생성이 완료되었습니다. 총 {num_images}장 생성.")

if __name__ == "__main__":
    # 개별 기호 이미지(.png, 배경 투명 권장)가 있는 폴더
    SYMBOL_DIR = './source_symbols' 
    
    # 생성된 이미지를 저장할 폴더
    OUTPUT_DIR = './synthetic_robust_images_v3'
    
    # 생성할 이미지 장수 지정 (예: 1500장)
    create_care_label_v3(SYMBOL_DIR, OUTPUT_DIR, num_images=100)