import os
import random
import glob
import string
import time
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

# --- 텍스트 생성기 ---
def generate_random_string(min_len=3, max_len=15, use_digits=True):
    length = random.randint(min_len, max_len)
    chars = string.ascii_uppercase
    if use_digits:
        chars += string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def generate_text_line():
    kr_patterns = ["취급시 주의사항", "제조년월: 2024.03", "섬유혼용률", "겉감 폴리에스터 100%", "안감 나일론 100%", "세탁시 탈색 주의", "단독 세탁 요망", "판매원: (주)에이아이"]
    en_patterns = ["CARE INSTRUCTIONS", "MADE IN KOREA", "100% COTTON", "WASH INSIDE OUT", "DO NOT BLEACH", "DRY CLEANING INSTRUCTIONS", "DRYING INSTRUCTIONS"]
    if random.random() < 0.6:
        return random.choice(kr_patterns) + " " + generate_random_string(0, 5)
    else:
        return random.choice(en_patterns) + " " + generate_random_string(0, 5)

def remove_white_background(img):
    """기호 이미지의 흰색 배경을 투명하게 만들고, 기호(검은색)의 색상을 미세하게 변형함"""
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []
    
    # 기호 색상 미세 변형 (완전 검은색이 아닌 짙은 쥐색, 먹색 등으로 랜덤화)
    sym_gray = random.randint(0, 60) 
    
    for item in datas:
        # 흰색(또는 밝은 회색) 픽셀을 투명 처리
        if item[0] > 210 and item[1] > 210 and item[2] > 210:
            new_data.append((255, 255, 255, 0))
        else:
            # 기호 부분의 색상 덮어쓰기
            new_data.append((sym_gray, sym_gray, sym_gray, item[3]))
    img.putdata(new_data)
    return img

# --- 메인 생성기 ---
def create_advanced_synthetic_dataset(symbol_dir, output_dir, num_images=1000):
    os.makedirs(output_dir, exist_ok=True)
    symbol_paths = glob.glob(os.path.join(symbol_dir, '*.png'))
    if not symbol_paths:
        print("에러: 기호 이미지가 없음.")
        return

    canvas_size = 640
    symbol_base_size = 65

    # 폰트 설정 (반드시 실행 경로에 korean_font.ttf 가 있어야 함)
    font_path = "korean_font.ttf"
    try:
        font_huge_bold = ImageFont.truetype(font_path, random.randint(26, 32)) # 아주 크고 굵은 제목
        font_title = ImageFont.truetype(font_path, random.randint(20, 24))
        font_main = ImageFont.truetype(font_path, random.randint(14, 18))
        font_small = ImageFont.truetype(font_path, random.randint(10, 13))
    except IOError:
        print("경고: korean_font.ttf를 찾을 수 없어 기본 폰트를 사용함. 한글이 깨질 수 있음.")
        font_huge_bold = font_title = font_main = font_small = ImageFont.load_default()

    fonts = [font_huge_bold, font_title, font_main, font_small]
    
    start_time = time.time()
    
    for img_idx in range(num_images):
        # 1. 라벨(Tag) 스타일 및 크기 랜덤 결정
        is_narrow = random.random() < 0.35 # 35% 확률로 좁고 긴 케어라벨 형태
        is_dense = random.random() < 0.4   # 40% 확률로 텍스트가 빽빽함

        if is_narrow:
            tag_width = random.randint(180, 280)
            tag_height = random.randint(500, 620)
        else:
            tag_width = random.randint(350, 500)
            tag_height = random.randint(450, 620)

        # 2. 라벨 배경색 미세 랜덤화 (순백색 지양, 베이지/회색톤 섞임)
        base_color = random.randint(225, 245)
        label_color = (
            base_color + random.randint(-15, 10),
            base_color + random.randint(-15, 10),
            base_color + random.randint(-10, 15)
        )
        tag_canvas = Image.new('RGB', (tag_width, tag_height), label_color)
        tag_draw = ImageDraw.Draw(tag_canvas)

        # 3. 기호 동적 래핑(Wrapping) 배치 로직
        num_symbols = random.randint(3, 8)
        current_symbols = random.sample(symbol_paths, min(num_symbols, len(symbol_paths)))
        
        rows = []
        current_row = []
        current_w = 0
        spacing = random.randint(10, 20)
        
        # 좁은 라벨일 경우 자동으로 다음 줄로 넘어가도록 계산
        for sym in current_symbols:
            if current_w + symbol_base_size > tag_width - 40 and current_row:
                rows.append(current_row)
                current_row = [sym]
                current_w = symbol_base_size + spacing
            else:
                current_row.append(sym)
                current_w += symbol_base_size + spacing
        if current_row:
            rows.append(current_row)

        # 기호가 차지하는 총 높이 계산
        total_symbol_height = len(rows) * (symbol_base_size + 10)
        symbol_start_y = (tag_height - total_symbol_height) // 2 + random.randint(-30, 30)
        symbol_end_y = symbol_start_y + total_symbol_height

        # 기호 그리기
        curr_y = symbol_start_y
        for row in rows:
            row_w = (len(row) * symbol_base_size) + ((len(row) - 1) * spacing)
            curr_x = (tag_width - row_w) // 2
            
            for sym_p in row:
                sym_img = Image.open(sym_p)
                sym_img = remove_white_background(sym_img) # 배경 투명화 및 색상 변형
                
                size_jitter = random.randint(-4, 4)
                cur_sz = symbol_base_size + size_jitter
                sym_img = sym_img.resize((cur_sz, cur_sz), Image.Resampling.LANCZOS)
                
                x_pos = curr_x + random.randint(-5, 5)
                y_pos = curr_y + random.randint(-5, 5)
                
                tag_canvas.paste(sym_img, (x_pos, y_pos), mask=sym_img)
                curr_x += symbol_base_size + spacing
            curr_y += symbol_base_size + 10

        # 4. 텍스트 밀도 및 서식 적용 배치
        text_color = (random.randint(20, 60), random.randint(20, 60), random.randint(20, 60))
        
        def draw_text_block(start_y, end_y, is_top=True):
            if is_top:
                y = random.randint(15, 30)
                limit = symbol_start_y - 20
            else:
                y = symbol_end_y + random.randint(15, 30)
                limit = tag_height - 20

            # 빽빽함(Dense) 여부에 따라 줄 간격과 생성 횟수 조절
            num_lines = random.randint(8, 20) if is_dense else random.randint(2, 6)
            line_space = random.randint(2, 8) if is_dense else random.randint(15, 30)

            for _ in range(num_lines):
                if y > limit: break
                
                # 가끔 크고 굵은 글씨 랜덤 선택
                if random.random() < 0.15:
                    sel_font = font_huge_bold
                elif random.random() < 0.3:
                    sel_font = font_title
                elif is_dense:
                    sel_font = font_small
                else:
                    sel_font = random.choice([font_main, font_small])

                text = generate_text_line()
                
                # 텍스트가 라벨 너비를 넘지 않도록 중앙 정렬 근처에 배치
                x = random.randint(10, tag_width // 4) if not is_narrow else random.randint(5, 20)
                tag_draw.text((x, y), text, fill=text_color, font=sel_font)
                
                # 폰트 크기에 비례하여 y 좌표 증가
                bbox = sel_font.getbbox(text)
                fh = bbox[3] - bbox[1] if bbox else 15
                y += fh + line_space

        draw_text_block(0, symbol_start_y, is_top=True)
        draw_text_block(symbol_end_y, tag_height, is_top=False)

        # 5. 배경 캔버스 병합
        bg_color = (random.randint(40, 70), random.randint(40, 70), random.randint(40, 70))
        canvas = Image.new('RGB', (canvas_size, canvas_size), bg_color)
        
        paste_x = (canvas_size - tag_width) // 2 + random.randint(-20, 20)
        paste_y = (canvas_size - tag_height) // 2 + random.randint(-20, 20)
        canvas.paste(tag_canvas, (paste_x, paste_y))

        img_filename = f"advanced_label_{img_idx:04d}.jpg"
        canvas.save(os.path.join(output_dir, img_filename), quality=95)

        if (img_idx + 1) % 100 == 0:
            print(f"{img_idx + 1} / {num_images} 장 생성 완료...")

    print("생성 완료됨.")

if __name__ == "__main__":
    SYMBOL_DIR = './source_symbols' 
    OUTPUT_DIR = './synthetic_final_v4'
    create_advanced_synthetic_dataset(SYMBOL_DIR, OUTPUT_DIR, num_images=100)