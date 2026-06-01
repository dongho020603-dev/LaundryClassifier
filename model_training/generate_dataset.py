import os
import random
import glob
import string
import time
import shutil
import yaml
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

# --- 설정 및 초기화 ---
SYMBOL_SOURCE_DIR = './source_symbols' 
DATASET_ROOT_DIR = './Augmented_CareLabel_Dataset'
TOTAL_IMAGES_TO_GENERATE = 10000  # 증강이 포함되므로 데이터 수를 늘림
TRAIN_RATIO = 0.8 
CANVAS_SIZE = 640
SYMBOL_BASE_SIZE = 65

def setup_directories():
    if os.path.exists(DATASET_ROOT_DIR):
        shutil.rmtree(DATASET_ROOT_DIR)
    for split in ['train', 'val']:
        os.makedirs(os.path.join(DATASET_ROOT_DIR, 'images', split), exist_ok=True)
        os.makedirs(os.path.join(DATASET_ROOT_DIR, 'labels', split), exist_ok=True)

def get_class_mapping():
    paths = glob.glob(os.path.join(SYMBOL_SOURCE_DIR, '*.png'))
    class_names = sorted([os.path.splitext(os.path.basename(p))[0] for p in paths])
    return {name: i for i, name in enumerate(class_names)}, class_names

def generate_text_line():
    kr_patterns = ["취급시 주의사항", "제조년월: 2024.05", "섬유혼용률", "겉감 폴리에스터 100%", "세탁시 탈색 주의"]
    en_patterns = ["CARE INSTRUCTIONS", "MADE IN KOREA", "100% COTTON", "WASH INSIDE OUT", "DO NOT BLEACH"]
    if random.random() < 0.6:
        chars = string.ascii_uppercase + string.digits
        return random.choice(kr_patterns) + " " + ''.join(random.choice(chars) for _ in range(random.randint(0, 5)))
    else:
        return random.choice(en_patterns)

# --- Bounding Box Level Augmentation ---
def augment_symbol(img):
    """기호 레벨 증강: 미세 회전, 배경 투명화 및 색상 변형 (Numpy 벡터화 적용)"""
    img = img.convert("RGBA")
    
    # 미세 회전 (Rotation: -10도 ~ 10도)
    angle = random.uniform(-10, 10)
    img = img.rotate(angle, resample=Image.BICUBIC, expand=False)
    
    # Numpy 배열 변환
    img_arr = np.array(img)
    
    # 흰색(또는 밝은 회색) 배경 픽셀을 찾는 마스크 생성 (R, G, B 모두 200 초과)
    white_mask = (img_arr[:, :, 0] > 200) & (img_arr[:, :, 1] > 200) & (img_arr[:, :, 2] > 200)
    
    # 1. 흰색 배경의 Alpha 채널(투명도)을 0으로 만들어 투명화
    img_arr[white_mask, 3] = 0
    
    # 2. 배경이 아닌 기호 부분의 색상을 미세하게 변형 (짙은 회색톤)
    sym_gray = random.randint(0, 80)
    img_arr[~white_mask, 0] = sym_gray # R
    img_arr[~white_mask, 1] = sym_gray # G
    img_arr[~white_mask, 2] = sym_gray # B
    
    return Image.fromarray(img_arr)

# --- Image Level Augmentation ---
def apply_image_augmentations(img):
    """최종 생성된 캔버스 전체에 적용하는 증강 (Blur, Noise, Brightness)"""
    # 1. Brightness / Exposure (밝기 및 노출 증강)
    if random.random() < 0.5:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(random.uniform(0.6, 1.4)) # 0.6(어둡게) ~ 1.4(밝게)

    # 2. Blur / Motion Blur 모사 (카메라 초점 흐림 증강)
    if random.random() < 0.4:
        # 가우시안 블러 (초점 나감) 또는 박스 블러 (흔들림 모사)
        blur_radius = random.uniform(0.5, 2.0)
        if random.random() < 0.5:
            img = img.filter(ImageFilter.GaussianBlur(blur_radius))
        else:
            img = img.filter(ImageFilter.BoxBlur(blur_radius))

    # 3. Camera Sensor Noise (저조도 노이즈 증강)
    if random.random() < 0.3:
        img_arr = np.array(img)
        # 가우시안 노이즈 생성
        noise = np.random.normal(0, random.uniform(5, 15), img_arr.shape).astype(np.int16)
        noisy_arr = np.clip(img_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(noisy_arr)

    return img

# --- 메인 생성 로직 ---
def create_dataset():
    setup_directories()
    class_map, class_names = get_class_mapping()
    
    font_path = "korean_font.ttf"
    font_title = ImageFont.truetype(font_path, 22)
    font_main = ImageFont.truetype(font_path, 16)
    font_small = ImageFont.truetype(font_path, 12)
    
    for img_idx in range(TOTAL_IMAGES_TO_GENERATE):
        is_narrow = random.random() < 0.35
        is_dense = random.random() < 0.4

        tag_width = random.randint(180, 290) if is_narrow else random.randint(350, 520)
        tag_height = random.randint(480, 630)

        base_color = random.randint(230, 248)
        tag_canvas = Image.new('RGB', (tag_width, tag_height), (base_color, base_color, base_color))
        tag_draw = ImageDraw.Draw(tag_canvas)

        num_symbols_to_pick = random.randint(3, 8)
        picked_symbol_paths = [random.choice(list(class_map.keys())) for _ in range(num_symbols_to_pick)]
        
        rows = []
        current_row, current_w = [], 0
        spacing = random.randint(10, 25)
        
        for sym_name in picked_symbol_paths:
            if current_w + SYMBOL_BASE_SIZE > tag_width - 30 and current_row:
                rows.append(current_row)
                current_row = [sym_name]
                current_w = SYMBOL_BASE_SIZE + spacing
            else:
                current_row.append(sym_name)
                current_w += SYMBOL_BASE_SIZE + spacing
        if current_row: rows.append(current_row)

        total_symbol_height = len(rows) * (SYMBOL_BASE_SIZE + 10)
        symbol_start_y_on_tag = (tag_height - total_symbol_height) // 2 + random.randint(-40, 40)
        
        tag_paste_x = (CANVAS_SIZE - tag_width) // 2 + random.randint(-25, 25)
        tag_paste_y = (CANVAS_SIZE - tag_height) // 2 + random.randint(-25, 25)

        yolo_labels = []

        curr_y_on_tag = symbol_start_y_on_tag
        for row in rows:
            row_w = (len(row) * SYMBOL_BASE_SIZE) + ((len(row) - 1) * spacing)
            curr_x_on_tag = (tag_width - row_w) // 2
            
            for sym_name in row:
                sym_p = os.path.join(SYMBOL_SOURCE_DIR, sym_name + '.png')
                sym_img = Image.open(sym_p)
                
                # [적용] 기호 레벨 증강
                sym_img = augment_symbol(sym_img) 
                
                cur_sz = SYMBOL_BASE_SIZE + random.randint(-5, 5)
                sym_img = sym_img.resize((cur_sz, cur_sz), Image.Resampling.LANCZOS)
                
                final_x_on_tag = curr_x_on_tag + random.randint(-6, 6)
                final_y_on_tag = curr_y_on_tag + random.randint(-6, 6)
                
                tag_canvas.paste(sym_img, (final_x_on_tag, final_y_on_tag), mask=sym_img)
                
                # YOLO 좌표 계산
                abs_x_min = final_x_on_tag + tag_paste_x
                abs_y_min = final_y_on_tag + tag_paste_y
                yolo_cx = (abs_x_min + (cur_sz / 2)) / CANVAS_SIZE
                yolo_cy = (abs_y_min + (cur_sz / 2)) / CANVAS_SIZE
                yolo_w = cur_sz / CANVAS_SIZE
                yolo_h = cur_sz / CANVAS_SIZE
                
                class_id = class_map[sym_name]
                yolo_labels.append(f"{class_id} {yolo_cx:.6f} {yolo_cy:.6f} {yolo_w:.6f} {yolo_h:.6f}")
                
                curr_x_on_tag += SYMBOL_BASE_SIZE + spacing
            curr_y_on_tag += SYMBOL_BASE_SIZE + 10

        # --- 텍스트 그리기 ---
        symbol_end_y_on_tag = curr_y_on_tag
        text_color = (random.randint(15, 65), random.randint(15, 65), random.randint(15, 65))
        
        def draw_text_block(limit_y, is_top=True):
            y = random.randint(15, 40) if is_top else symbol_end_y_on_tag + random.randint(15, 40)
            limit = symbol_start_y_on_tag - 15 if is_top else tag_height - 15
            num_lines = random.randint(10, 25) if is_dense else random.randint(2, 7)
            line_space = random.randint(1, 7) if is_dense else random.randint(14, 28)

            for _ in range(num_lines):
                if y > limit: break
                sel_font = random.choice([font_title, font_main, font_small])
                text = generate_text_line()
                x = random.randint(5, 18) if is_narrow else random.randint(10, tag_width // 4)
                tag_draw.text((x, y), text, fill=text_color, font=sel_font)
                bbox = sel_font.getbbox(text)
                y += (bbox[3] - bbox[1] if bbox else 15) + line_space

        draw_text_block(symbol_start_y_on_tag, is_top=True)
        draw_text_block(symbol_end_y_on_tag, is_top=False)

        # --- 최종 캔버스 조립 및 이미지 증강 적용 ---
        bg_val = random.randint(35, 75)
        canvas = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), (bg_val, bg_val, bg_val))
        canvas.paste(tag_canvas, (tag_paste_x, tag_paste_y))

        # [적용] 전체 이미지 레벨 증강 (Blur, Noise, Brightness)
        canvas = apply_image_augmentations(canvas)

        # --- 저장 ---
        split = 'train' if random.random() < TRAIN_RATIO else 'val'
        file_prefix = f"aug_label_{img_idx:05d}"
        
        canvas.save(os.path.join(DATASET_ROOT_DIR, 'images', split, file_prefix + '.jpg'), quality=90)
        with open(os.path.join(DATASET_ROOT_DIR, 'labels', split, file_prefix + '.txt'), 'w') as f:
            f.write('\n'.join(yolo_labels))

    yaml_path = os.path.join(DATASET_ROOT_DIR, 'data.yaml')
    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump({
            'path': os.path.abspath(DATASET_ROOT_DIR),
            'train': 'images/train', 'val': 'images/val',
            'nc': len(class_names), 'names': class_names
        }, f, allow_unicode=True, default_flow_style=False)
    
    print(f"증강 완료 데이터셋 생성 종료. 총 {TOTAL_IMAGES_TO_GENERATE}장.")

if __name__ == "__main__":
    create_dataset()