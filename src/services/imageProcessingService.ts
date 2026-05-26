import ImageResizer from 'react-native-image-resizer';

export interface ResizedImageInfo {
  uri: string;
  width: number;
  height: number;
  size: number; // 파일 크기 (bytes)
}

class ImageProcessingService {
  /**
   * 이미지를 640x640으로 리사이징 (YOLO 모델 입력용)
   * @param imageUri 원본 이미지 URI
   * @returns 리사이징된 이미지 정보
   */
  static async resizeImageTo640x640(imageUri: string): Promise<ResizedImageInfo> {
    try {
      // file:// 프로토콜 제거
      const cleanUri = imageUri.replace('file://', '');

      // KIDURIN과 동일한 방식: mode 'cover'로 중앙 크롭하여 정확히 640x640 생성
      // EXIF 자동 회전 처리 포함
      const resizedImage = await ImageResizer.createResizedImage(
        cleanUri,
        640,                   // Target width: 640px (YOLO model expects 640x640)
        640,                   // Target height: 640px (YOLO model expects 640x640)
        'JPEG',                // Output format: JPEG
        85,                    // Quality: 85% (preserves analysis quality)
        0,                     // Rotation: 0° (EXIF handled automatically)
        undefined,             // Output path: auto-generated
        false,                 // Keep metadata: false (EXIF rotation already applied)
        {
          mode: 'cover',       // Resizing mode: 'cover' (aspect ratio maintained, crops if needed)
          onlyScaleDown: false // Allow upscaling: false
        }
      );

      return {
        uri: resizedImage.uri,
        width: 640,  // KIDURIN 방식: 항상 640 반환
        height: 640,
        size: resizedImage.size || 0,
      };
    } catch (error) {
      console.error('Image resizing error:', error);
      throw new Error('이미지 리사이징 실패');
    }
  }

  /**
   * 이미지 크기 정보를 읽기 쉬운 형식으로 변환
   * @param bytes 바이트 단위 크기
   * @returns 포맷된 문자열 (예: "1.2 MB")
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export default ImageProcessingService;
