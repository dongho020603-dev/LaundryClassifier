# LaundryClassifier - YOLOv8 TFLite 포팅 계획서

## 📋 프로젝트 개요

**목표**: YOLOv8 TFLite 모델(best_int8.tflite)을 React Native 앱에 포팅하여 세탁 기호 실시간 인식 구현

**기술 스택**:
- React Native 0.80.1 + TypeScript
- YOLOv8 INT8 Quantized Model (28 classes)
- Native Android Module (Kotlin)
- TensorFlow Lite Interpreter API

---

## ✅ 완료된 작업 (Phase -1)

### 1. 라이브러리 통일 (KIDURIN 기준)

**문제점**:
- 잘못된 라이브러리 사용으로 640x853 이미지 생성
- 90도 회전 이슈 발생
- 리사이징 실패

**해결**:
```json
// package.json - KIDURIN과 동일한 버전으로 변경
{
  "dependencies": {
    "react-native-image-resizer": "^1.4.5",      // ✅ (기존: @bam.tech fork)
    "react-native-vision-camera": "^4.7.1",      // ✅ (기존: react-native-camera-kit)
    "react-native-worklets-core": "^1.6.2"       // ✅ (새로 추가)
  }
}
```

### 2. 카메라 구현 (CameraScreen.tsx)

**특징**:
- `react-native-vision-camera` 사용
- 1:1 비율 카메라 프리뷰 (CAMERA_SIZE = SCREEN_WIDTH - 40)
- `takeSnapshot()` 방식으로 촬영 (quality: 85)
- 가이드라인 UI (좌/우 브래킷)

**핵심 코드**:
```typescript
const result = await cameraRef.current.takeSnapshot({
  quality: 85, // KIDURIN과 동일한 품질
});
```

### 3. 이미지 전처리 (imageProcessingService.ts)

**기능**: 정확히 640x640 이미지 생성

**핵심 설정**:
```typescript
const resizedImage = await ImageResizer.createResizedImage(
  cleanUri,
  640,                   // Target width
  640,                   // Target height
  'JPEG',                // Output format
  85,                    // Quality: 85%
  0,                     // Rotation: 0°
  undefined,             // Output path: auto-generated
  false,                 // Keep metadata: false (KIDURIN 설정)
  {
    mode: 'cover',       // 중앙 크롭하여 640x640 생성
    onlyScaleDown: false
  }
);
```

### 4. 모델 디버깅 화면 (ModelDebugScreen.tsx)

**기능**:
- 리사이징된 640x640 이미지 표시
- 전처리 정보 표시 (크기, 파일 사이즈, 형식)
- 모델 정보 표시 (현재는 "대기 중" 상태)
- "다시 촬영" / "결과 확인" 버튼

**현재 상태**: 모델 연결 전 단계, UI만 완성

---

## 🎯 현재 단계: Phase 0 - Python 모델 분석

### 목적
Native Android 구현 전에 모델의 정확한 입출력 구조를 파악

### 작업 내용

**1. 생성된 파일**: `analyze_tflite_model.py`

**2. 주요 기능**:
- ✅ TFLite 모델 로드 및 메타데이터 분석
- ✅ Input/Output tensor 상세 정보 출력
  - Shape (예: [1, 3, 640, 640])
  - dtype (Float32 or INT8/UINT8)
  - Quantization parameters (scale, zero_point)
- ✅ 이미지 전처리 (640x640 리사이징, 정규화)
- ✅ INT8 양자화 처리
- ✅ 추론 실행
- ✅ 후처리 (NMS 적용)
- ✅ 결과 시각화 (바운딩 박스 그리기)

**3. 사용 방법**:
```bash
# 스크립트 내 경로 설정
MODEL_PATH = './best_int8.tflite'
TEST_IMAGE_DIR = '/home/dslee/capstone_project/test'

# 실행
python analyze_tflite_model.py

# 결과: ./tflite_results/ 폴더에 저장
```

**4. 예상 출력 정보**:
```
INPUT TENSOR DETAILS:
  Name: serving_default_images:0
  Shape: [1, 3, 640, 640]
  Type: uint8
  Quantization:
    Scale: 0.003921568859368563
    Zero Point: 0

OUTPUT TENSOR DETAILS:
  Name: StatefulPartitionedCall:0
  Shape: [1, 33, 8400] 또는 [1, 8400, 33]
  Type: uint8
  Quantization:
    Scale: 0.xxxx
    Zero Point: xxx
```

**5. 다음 단계**:
- [ ] best_int8.tflite 모델 확보
- [ ] 스크립트 실행하여 모델 구조 확인
- [ ] 클래스 이름 매핑 (현재는 class_0 ~ class_27 임시)
- [ ] 테스트 이미지로 검출 결과 확인

---

## 🚀 앞으로의 포팅 계획

### Phase 1: Native Android Module 구조 생성

**작업 내용**:
1. Kotlin 파일 생성:
   - `android/app/src/main/java/com/laundryclassifier/LaundryYOLOModule.kt`
   - `android/app/src/main/java/com/laundryclassifier/LaundryYOLOPackage.kt`

2. ReactPackage 등록:
   - `MainApplication.kt` 수정

**예상 코드 구조**:
```kotlin
class LaundryYOLOModule(reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "LaundryYOLO"

  private var interpreter: Interpreter? = null
  private val INPUT_SIZE = 640
  private val NUM_CLASSES = 28
  private val CONF_THRESHOLD = 0.5f
  private val IOU_THRESHOLD = 0.45f

  @ReactMethod
  fun loadModel(promise: Promise) { }

  @ReactMethod
  fun runInference(imagePath: String, promise: Promise) { }
}
```

---

### Phase 2: 모델 파일 배치

**작업 내용**:
1. 디렉토리 생성: `android/app/src/main/assets/models/`
2. 모델 복사: `best_int8.tflite` → `models/` 폴더
3. 빌드 설정 확인 (`android/app/build.gradle`)

**확인 사항**:
```gradle
android {
  // assets 폴더가 포함되는지 확인
  sourceSets {
    main {
      assets.srcDirs = ['src/main/assets']
    }
  }
}
```

---

### Phase 3: 모델 로딩 및 초기화

**작업 내용**:
1. TFLite Interpreter 초기화
2. Gradle dependency 추가

**Gradle 설정** (`android/app/build.gradle`):
```gradle
dependencies {
  implementation 'org.tensorflow:tensorflow-lite:2.14.0'
  implementation 'org.tensorflow:tensorflow-lite-support:0.4.4'
}
```

**Kotlin 구현**:
```kotlin
@ReactMethod
fun loadModel(promise: Promise) {
  try {
    val modelFile = loadModelFile("models/best_int8.tflite")
    val options = Interpreter.Options().apply {
      setNumThreads(4)
    }
    interpreter = Interpreter(modelFile, options)

    // 입출력 텐서 정보 확인
    val inputShape = interpreter!!.getInputTensor(0).shape()
    val outputShape = interpreter!!.getOutputTensor(0).shape()

    Log.d(TAG, "Model loaded - Input: ${inputShape.contentToString()}")
    Log.d(TAG, "Model loaded - Output: ${outputShape.contentToString()}")

    promise.resolve("Model loaded successfully")
  } catch (e: Exception) {
    promise.reject("LOAD_ERROR", e.message)
  }
}

private fun loadModelFile(modelPath: String): MappedByteBuffer {
  val fileDescriptor = reactApplicationContext.assets.openFd(modelPath)
  val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
  val fileChannel = inputStream.channel
  return fileChannel.map(
    FileChannel.MapMode.READ_ONLY,
    fileDescriptor.startOffset,
    fileDescriptor.declaredLength
  )
}
```

---

### Phase 4: 전처리 구현 (이미지 → ByteBuffer)

**핵심**: INT8 양자화 + RGB 순서 처리

**중요 포인트** (사용자 경험 기반):
- ⚠️ **BGR이 아닌 RGB 순서 사용** (OpenCV의 BGR과 혼동 주의)
- ⚠️ **단일 640x640 이미지 파이프라인** (좌표계 불일치 방지)
- ⚠️ **JS Bridge 최소화** (Native에서 모든 처리)

**구현**:
```kotlin
private fun preprocessImage(imagePath: String): ByteBuffer {
  // 1. 이미지 로드 (640x640은 JS에서 이미 리사이징됨)
  val bitmap = BitmapFactory.decodeFile(imagePath)

  // 2. 정확히 640x640인지 검증
  if (bitmap.width != INPUT_SIZE || bitmap.height != INPUT_SIZE) {
    throw IllegalArgumentException(
      "Image must be ${INPUT_SIZE}x${INPUT_SIZE}, got ${bitmap.width}x${bitmap.height}"
    )
  }

  // 3. ByteBuffer 준비 (INT8: 1 byte per value)
  val inputBuffer = ByteBuffer.allocateDirect(
    1 * 3 * INPUT_SIZE * INPUT_SIZE
  ).apply {
    order(ByteOrder.nativeOrder())
  }

  // 4. Pixel 추출 및 양자화
  // Phase 0 분석 결과에 따라 scale, zero_point 설정
  // 예시: scale = 0.003921568 (1/255), zero_point = 0
  val scale = 0.003921568f  // Python 분석 결과로 대체 필요
  val zeroPoint = 0         // Python 분석 결과로 대체 필요

  val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
  bitmap.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)

  // 5. RGB 순서로 변환 및 양자화
  // YOLO 입력 순서: [Batch, Channels(RGB), Height, Width]
  for (c in 0 until 3) {  // R, G, B 채널
    for (y in 0 until INPUT_SIZE) {
      for (x in 0 until INPUT_SIZE) {
        val pixel = pixels[y * INPUT_SIZE + x]

        // RGB 추출 (OpenCV의 BGR이 아님!)
        val channelValue = when (c) {
          0 -> (pixel shr 16) and 0xFF  // Red
          1 -> (pixel shr 8) and 0xFF   // Green
          2 -> pixel and 0xFF            // Blue
          else -> 0
        }

        // 정규화: [0, 255] → [0.0, 1.0]
        val normalized = channelValue / 255.0f

        // INT8 양자화: float_value / scale + zero_point
        val quantized = (normalized / scale + zeroPoint).toInt()
          .coerceIn(0, 255)
          .toByte()

        inputBuffer.put(quantized)
      }
    }
  }

  inputBuffer.rewind()
  return inputBuffer
}
```

---

### Phase 5: 추론 실행

**구현**:
```kotlin
private fun runModelInference(inputBuffer: ByteBuffer): Array<FloatArray> {
  // Output shape: [1, 33, 8400] (Phase 0 분석 결과로 조정 필요)
  // 33 = 4(bbox) + 28(classes) + 1(objectness) 또는 다른 구조
  val outputBuffer = Array(1) { Array(33) { FloatArray(8400) } }

  // 추론 실행
  interpreter?.run(inputBuffer, outputBuffer)

  return outputBuffer[0]  // [33, 8400]
}
```

---

### Phase 6: 후처리 구현 (NMS + 좌표 매핑)

**중요 포인트**:
- ⚠️ **좌표계 통일**: 모든 좌표를 640x640 기준으로 유지
- ⚠️ **신뢰도 필터링**: CONF_THRESHOLD = 0.5
- ⚠️ **NMS 적용**: IOU_THRESHOLD = 0.45

**구현**:
```kotlin
data class Detection(
  val bbox: FloatArray,     // [x1, y1, x2, y2] - 640x640 기준
  val confidence: Float,
  val classId: Int,
  val className: String
)

private fun postprocess(
  output: Array<FloatArray>,
  confThreshold: Float,
  iouThreshold: Float
): List<Detection> {
  // 1. Output 파싱
  // Format: [x_center, y_center, width, height, class_scores...]
  // Shape: [33, 8400] → 8400개의 예측 박스

  val boxes = mutableListOf<Detection>()
  val numBoxes = output[0].size  // 8400

  for (i in 0 until numBoxes) {
    // 각 박스의 최대 클래스 점수와 인덱스
    var maxScore = 0f
    var maxClassId = 0

    for (c in 0 until NUM_CLASSES) {
      val score = output[4 + c][i]  // class scores start at index 4
      if (score > maxScore) {
        maxScore = score
        maxClassId = c
      }
    }

    // 신뢰도 필터링
    if (maxScore < confThreshold) continue

    // 박스 좌표 추출 (640x640 기준)
    val xCenter = output[0][i]
    val yCenter = output[1][i]
    val width = output[2][i]
    val height = output[3][i]

    // [x_center, y_center, w, h] → [x1, y1, x2, y2]
    val x1 = xCenter - width / 2
    val y1 = yCenter - height / 2
    val x2 = xCenter + width / 2
    val y2 = yCenter + height / 2

    boxes.add(Detection(
      bbox = floatArrayOf(x1, y1, x2, y2),
      confidence = maxScore,
      classId = maxClassId,
      className = CLASS_NAMES[maxClassId]
    ))
  }

  // 2. NMS 적용
  return applyNMS(boxes, iouThreshold)
}

private fun applyNMS(
  boxes: List<Detection>,
  iouThreshold: Float
): List<Detection> {
  // 신뢰도 내림차순 정렬
  val sortedBoxes = boxes.sortedByDescending { it.confidence }.toMutableList()
  val keep = mutableListOf<Detection>()

  while (sortedBoxes.isNotEmpty()) {
    val current = sortedBoxes.removeAt(0)
    keep.add(current)

    // IoU 계산하여 중복 제거
    sortedBoxes.removeAll { box ->
      calculateIoU(current.bbox, box.bbox) > iouThreshold
    }
  }

  return keep
}

private fun calculateIoU(box1: FloatArray, box2: FloatArray): Float {
  val x1 = maxOf(box1[0], box2[0])
  val y1 = maxOf(box1[1], box2[1])
  val x2 = minOf(box1[2], box2[2])
  val y2 = minOf(box1[3], box2[3])

  val intersection = maxOf(0f, x2 - x1) * maxOf(0f, y2 - y1)

  val area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
  val area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
  val union = area1 + area2 - intersection

  return intersection / (union + 1e-6f)
}

companion object {
  private val CLASS_NAMES = arrayOf(
    // Phase 0 분석 후 실제 클래스 이름으로 대체
    "bleach_no", "bleach_yes", "dry_flat", "dry_hang",
    // ... 28개 클래스
  )
}
```

---

### Phase 7: JavaScript Bridge 구현

**작업 내용**:
1. TypeScript 타입 정의
2. Native Module 래퍼 생성

**파일**: `src/services/NativeLaundryYOLO.ts`

```typescript
import { NativeModules } from 'react-native';

interface LaundryYOLOModule {
  loadModel(): Promise<string>;
  runInference(imagePath: string): Promise<Detection[]>;
}

interface Detection {
  bbox: number[];      // [x1, y1, x2, y2] - 640x640 좌표계
  confidence: number;
  classId: number;
  className: string;
}

const { LaundryYOLO } = NativeModules;

class NativeLaundryYOLO {
  /**
   * 모델 로드 (앱 시작 시 1회 호출)
   */
  static async loadModel(): Promise<void> {
    try {
      const result = await LaundryYOLO.loadModel();
      console.log('Model loaded:', result);
    } catch (error) {
      console.error('Model load failed:', error);
      throw error;
    }
  }

  /**
   * YOLO 추론 실행
   * @param imagePath 640x640 리사이징된 이미지 경로
   * @returns Detection 배열 (640x640 좌표계 기준)
   */
  static async detect(imagePath: string): Promise<Detection[]> {
    try {
      // Native로 전달 (file:// 프로토콜 제거)
      const cleanPath = imagePath.replace('file://', '');
      const detections = await LaundryYOLO.runInference(cleanPath);

      console.log(`Detected ${detections.length} objects`);
      return detections;
    } catch (error) {
      console.error('Inference failed:', error);
      throw error;
    }
  }
}

export default NativeLaundryYOLO;
export type { Detection };
```

---

### Phase 8: ModelDebugScreen 통합

**작업 내용**:
1. 모델 추론 호출
2. 결과 표시 (바운딩 박스 시각화는 Phase 9)

**수정**: `src/screens/ModelDebugScreen.tsx`

```typescript
import NativeLaundryYOLO, { Detection } from '../services/NativeLaundryYOLO';

export default function ModelDebugScreen({ imageUri, onContinue, onRetake }) {
  const [isResizing, setIsResizing] = useState(true);
  const [isInferencing, setIsInferencing] = useState(false);
  const [resizedImage, setResizedImage] = useState<ResizedImageInfo | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resizeAndInfer();
  }, [imageUri]);

  const resizeAndInfer = async () => {
    try {
      setIsResizing(true);
      setError(null);

      // 1. 리사이징
      const resized = await ImageProcessingService.resizeImageTo640x640(imageUri);
      setResizedImage(resized);
      setIsResizing(false);

      // 2. 추론
      setIsInferencing(true);
      const results = await NativeLaundryYOLO.detect(resized.uri);
      setDetections(results);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      Alert.alert('오류', '이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsResizing(false);
      setIsInferencing(false);
    }
  };

  // UI: 검출 결과 표시
  return (
    // ...
    {detections.length > 0 && (
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>검출 결과</Text>
        {detections.map((det, idx) => (
          <View key={idx} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{det.className}:</Text>
            <Text style={styles.infoValue}>
              {(det.confidence * 100).toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    )}
  );
}
```

---

### Phase 9: 바운딩 박스 시각화 (선택사항)

**방법 1**: React Native Canvas 사용
```bash
npm install react-native-canvas
```

**방법 2**: Native에서 그린 이미지 반환
```kotlin
@ReactMethod
fun runInferenceWithVisualization(
  imagePath: String,
  promise: Promise
) {
  // 추론 + 바운딩 박스 그리기
  // 결과 이미지 경로 반환
}
```

**방법 3**: SVG Overlay 사용
```bash
npm install react-native-svg
```

---

## ⚠️ 핵심 주의사항 (사용자 경험 기반)

### 1. 좌표계 불일치 문제
**문제**: 이전 프로젝트에서 YOLO(640x640) vs 색상 추출(1024x1024) 불일치로 고생

**해결책**:
- ✅ **단일 640x640 이미지 파이프라인 사용**
- ✅ 모든 좌표를 640x640 기준으로 유지
- ✅ 디스플레이용 스케일링은 UI 레이어에서만 처리

### 2. BGR vs RGB 순서
**문제**: OpenCV는 BGR, JavaScript/React Native는 RGB

**해결책**:
- ✅ **Native에서 RGB 순서로 처리**
- ✅ OpenCV 사용 시 `cvtColor(BGR2RGB)` 필수
- ⚠️ 우리는 Bitmap 직접 사용 → RGB가 기본

### 3. 메모리 및 성능
**문제**: 여러 이미지 복사본 + JS Bridge 오버헤드

**해결책**:
- ✅ **Native에서 완전한 파이프라인 구현**
- ✅ JS ↔ Native 왕복 최소화
- ✅ 단일 이미지로 모든 처리 완료

### 4. INT8 양자화
**문제**: 양자화 파라미터 불일치 시 정확도 저하

**해결책**:
- ✅ **Phase 0에서 정확한 scale/zero_point 확인**
- ✅ Python 결과와 Native 결과 비교 검증
- ✅ 동일한 테스트 이미지로 교차 검증

---

## 📊 체크리스트

### Phase 0: Python 분석 ✅ (완료)
- [x] `analyze_tflite_model.py` 작성
- [ ] best_int8.tflite 모델 확보
- [ ] 모델 입출력 구조 분석
- [ ] 양자화 파라미터 확인
- [ ] 테스트 이미지 추론 결과 확인

### Phase 1: Native Module 구조
- [ ] LaundryYOLOModule.kt 생성
- [ ] LaundryYOLOPackage.kt 생성
- [ ] MainApplication.kt 수정
- [ ] Android 빌드 확인

### Phase 2: 모델 배치
- [ ] assets/models/ 폴더 생성
- [ ] best_int8.tflite 복사
- [ ] build.gradle 설정 확인

### Phase 3: 모델 로딩
- [ ] TFLite dependency 추가
- [ ] loadModel() 구현
- [ ] 초기화 테스트

### Phase 4: 전처리
- [ ] preprocessImage() 구현
- [ ] INT8 양자화 적용
- [ ] RGB 순서 확인

### Phase 5: 추론
- [ ] runInference() 구현
- [ ] 출력 버퍼 설정
- [ ] 추론 실행 테스트

### Phase 6: 후처리
- [ ] postprocess() 구현
- [ ] NMS 구현
- [ ] 클래스 이름 매핑

### Phase 7: JS Bridge
- [ ] NativeLaundryYOLO.ts 작성
- [ ] TypeScript 타입 정의
- [ ] Promise 에러 핸들링

### Phase 8: UI 통합
- [ ] ModelDebugScreen 수정
- [ ] 검출 결과 표시
- [ ] 로딩 상태 관리

### Phase 9: 시각화 (선택)
- [ ] 바운딩 박스 그리기
- [ ] 결과 이미지 표시

---

## 🔍 검증 방법

### 1. 단위 테스트
```kotlin
// Phase 0 Python 결과와 비교
val pythonDetections = listOf(
  Detection([100f, 150f, 200f, 250f], 0.87f, 0, "bleach_no")
)

val nativeDetections = runInference(testImagePath)

// 좌표 오차 < 5px, 신뢰도 오차 < 0.05
assert(areDetectionsSimilar(pythonDetections, nativeDetections))
```

### 2. 통합 테스트
- [ ] 동일한 테스트 이미지로 Python vs Native 결과 비교
- [ ] 10개 이상 이미지로 정확도 검증
- [ ] 성능 측정 (추론 시간 < 200ms 목표)

### 3. 엣지 케이스
- [ ] 검출 실패 (신뢰도 낮음)
- [ ] 다중 객체 검출
- [ ] 겹치는 객체 (NMS 검증)

---

## 📝 다음 작업

1. **즉시**: Phase 0 완료
   - best_int8.tflite 확보
   - Python 스크립트 실행
   - 모델 구조 문서화

2. **이후**: Phase 1-3 (Native Module 기본 구조)
   - Kotlin 파일 생성
   - 모델 로딩 확인

3. **마지막**: Phase 4-9 (전체 파이프라인)
   - 전처리 → 추론 → 후처리
   - UI 통합
   - 테스트 및 최적화

---

**작성일**: 2026-04-29
**버전**: 1.0
**참고**: KIDURIN 프로젝트 분석 기반
