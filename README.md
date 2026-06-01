# LaundryClassifier

On-Device AI 기반 세탁 기호 분류 앱 (React Native + YOLOv8n TFLite)

카메라로 세탁 라벨을 촬영하면, 디바이스에서 직접 AI 추론을 수행하여 38개 세탁 기호를 인식하고 맞춤형 세탁 가이드를 제공합니다.

---

## 주요 기능

- 카메라 촬영 또는 갤러리에서 이미지 선택
- YOLOv8n INT8 모델을 이용한 On-Device 세탁 기호 인식 (38개 클래스)
- Bounding Box 시각화 및 신뢰도 표시
- 세탁 가이드 결과 화면 (요약 + 상세 2화면 구조)
  - 메인 멘트 자동 결정 (8가지 조건 트리)
  - 추천 세탁 방법 5단계 자동 생성
  - 8가지 주의 조합 경고 (A~H) 자동 감지
  - 전문 케어 배너 (드라이클리닝/웨트클리닝)

---

## 기술 스택

| 항목 | 사양 |
|------|------|
| 프레임워크 | React Native 0.80.1 (CLI) |
| 언어 | TypeScript + Kotlin |
| AI 모델 | YOLOv8n INT8 양자화 (`best_int8.tflite`) |
| 추론 엔진 | TensorFlow Lite 2.14.0 |
| 카메라 | react-native-vision-camera 4.7.1 |
| 타겟 | Android 7.0+ (API 24+) |

---

## 사전 요구 사항

아래 항목이 모두 설치되어 있어야 합니다.

| 항목 | 버전 | 설치 방법 |
|------|------|-----------|
| Node.js | 20.x LTS | https://nodejs.org |
| JDK | 17 (Eclipse Adoptium 권장) | https://adoptium.net |
| Android Studio | 최신 | https://developer.android.com/studio |
| Android SDK | API 35 | Android Studio > SDK Manager |
| Android SDK Build-Tools | 35.0.0 | Android Studio > SDK Manager |

### 환경 변수 설정 (Windows)

```powershell
# 시스템 환경 변수에 추가 (경로는 본인 환경에 맞게 수정)
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk
```

Path에 추가:
```
%JAVA_HOME%\bin
%ANDROID_HOME%\platform-tools
```

---

## 빌드 및 실행 방법

### 1단계: 프로젝트 클론 및 의존성 설치

```bash
git clone https://github.com/dongho020603-dev/LaundryClassifier.git
cd LaundryClassifier
npm install
```

### 2단계: Android 디바이스 준비

1. **USB 디버깅 활성화**
   - 설정 > 휴대전화 정보 > 소프트웨어 정보 > 빌드 번호 7번 탭
   - 설정 > 개발자 옵션 > USB 디버깅 켜기

2. **USB로 PC에 연결 후 확인**
   ```powershell
   adb devices
   ```
   `device`로 표시되면 정상입니다. `unauthorized`면 디바이스에서 "USB 디버깅 허용"을 탭하세요.

### 3단계: 앱 빌드 및 설치

```powershell
# JAVA_HOME 설정 (환경 변수에 이미 등록했으면 생략 가능)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"

# 빌드 및 디바이스 설치
cd android
.\gradlew.bat app:installDebug
```

빌드 성공 시:
```
BUILD SUCCESSFUL in XXs
Installing APK 'app-debug.apk' on '<디바이스명>'
Installed on 1 device.
```

### 4단계: Metro 번들러 시작

**새 터미널을 열고:**
```powershell
cd LaundryClassifier
npm start
```

정상 출력:
```
Welcome to React Native v0.80
Starting dev server on http://localhost:8081
INFO  Dev server ready.
```

### 5단계: ADB 포트 포워딩 (중요!)

**또 다른 터미널 또는 같은 터미널에서:**
```powershell
adb reverse tcp:8081 tcp:8081
```

> **주의:** USB 케이블을 뽑았다 다시 꽂거나, PC를 재부팅하면 이 명령을 매번 다시 실행해야 합니다.

### 6단계: 앱 실행

- 디바이스에서 "LaundryClassifier" 앱 아이콘을 탭하거나:
```powershell
adb shell am start -n com.anonymous.LaundryClassifier/.MainActivity
```

---

## 개발 시 참고

### 코드 수정 후 반영

| 변경 대상 | 반영 방법 |
|-----------|-----------|
| `.tsx`, `.ts` 파일 (JS 코드) | Metro에서 `r` 키 또는 디바이스 흔들기 > Reload (빌드 불필요) |
| `.kt`, `.gradle`, `AndroidManifest.xml` (네이티브) | `.\gradlew.bat app:installDebug` 재빌드 필요 |

### 자주 발생하는 문제

| 문제 | 원인 | 해결 |
|------|------|------|
| "Unable to load script from assets" | 포트 포워딩 안 됨 | `adb reverse tcp:8081 tcp:8081` |
| `EADDRINUSE :::8081` | 이전 Metro 프로세스 남아있음 | `netstat -ano \| findstr :8081` 후 해당 PID 종료 |
| 앱 실행 즉시 크래시 | 네이티브 라이브러리 문제 | `.\gradlew.bat clean` 후 재빌드 |
| `adb: no devices found` | USB 연결 끊김 | `adb kill-server && adb start-server` 후 재연결 |

---

## 프로젝트 구조

```
LaundryClassifier/
├── android/                          # Android 네이티브
│   └── app/src/main/
│       ├── assets/models/
│       │   └── best_int8.tflite      # YOLOv8n INT8 모델
│       └── java/.../LaundryClassifier/
│           ├── LaundryYOLOModule.kt   # TFLite 추론 모듈
│           ├── LaundryYOLOPackage.kt  # 패키지 등록
│           ├── MainActivity.kt
│           └── MainApplication.kt
├── src/
│   ├── App.tsx                        # 메인 (4화면 전환)
│   ├── data/
│   │   ├── laundrySymbolData.ts       # 38개 기호 데이터
│   │   └── laundryLogic.ts            # 조합 로직/멘트 결정
│   ├── screens/
│   │   ├── HomeScreen.tsx             # 홈 (카메라/갤러리)
│   │   ├── CameraScreen.tsx           # 촬영 (Vision Camera)
│   │   ├── ModelDebugScreen.tsx       # 추론 + bbox 시각화
│   │   └── ResultScreen.tsx           # 세탁 가이드 결과
│   └── services/
│       ├── NativeLaundryYOLO.ts       # Native Bridge
│       └── imageProcessingService.ts  # 이미지 전처리
├── index.js                           # Entry point
├── package.json
└── babel.config.js
```

---

## 앱 화면 흐름

```
HomeScreen > CameraScreen > ModelDebugScreen > ResultScreen
  (메인)       (촬영)        (추론+시각화)     (세탁 가이드)
     |
  갤러리 선택 > ModelDebugScreen > ResultScreen
```

---

## 개발자

- 앱 개발자 : **서동호**
- 모델 개발자 : **이동수**
- Ui 설계 담당자 : **우시헌**

---

## 라이선스

이 프로젝트는 캡스톤 디자인 과제로 개발되었습니다.
