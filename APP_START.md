# 🚀 LaundryClassifier - 앱 시작 가이드

Metro CLI 방식으로 직접 빌드하는 방법입니다. (Expo 없이)

---

## 📋 사전 준비

1. **Android 기기 연결 확인**
   ```powershell
   adb devices
   ```
   기기가 `device` 상태여야 합니다.

2. **USB 디버깅 권한 승인**
   - 기기에서 나타난 팝업에서 "허용" 선택
   - 다시 확인: `adb devices`

---

## 🎯 앱 시작 프로세스

### **STEP 1️⃣: Metro 번들러 시작**

**터미널 1 (지속적으로 실행 유지)**

```powershell
cd 'C:\Users\tjehd\capstone\LaundryClassifier'
npm start
```

**기대 결과:**
```
Welcome to React Native v0.81
Starting dev server on http://localhost:8081

Welcome to Metro v0.83.3
INFO  Dev server ready. Press Ctrl+C to exit.
```

✅ Metro가 포트 **8081**에서 실행되면, 이 터미널은 **그대로 유지합니다.**

---

### **STEP 2️⃣: 앱 빌드 & 설치**

**터미널 2 (새로운 파워셸)**

```powershell
cd 'C:\Users\tjehd\capstone\LaundryClassifier\android'
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot'
./gradlew app:installDebug
```

**기대 결과:**
```
BUILD SUCCESSFUL in 1m 17s
Installed on 1 device.
```

✅ 빌드 완료 후 앱이 기기에 설치됩니다.

---

### **STEP 3️⃣: ADB 포트 포워딩 (필수!)**

**이 단계를 빠뜨리면 앱이 빨간 에러 화면으로 뜹니다!**

```powershell
adb reverse tcp:8081 tcp:8081
```

**기대 결과:**
```
8081
```

이 명령은 Android 기기의 localhost:8081 요청을 PC의 localhost:8081(Metro 서버)로 연결해줍니다.
USB 케이블로 연결된 경우 반드시 필요합니다.

> **주의:** adb kill-server를 실행하거나 USB를 재연결하면 이 설정이 초기화됩니다. 그때마다 다시 실행해야 합니다.

---

### **STEP 4️⃣: 앱 실행**

```powershell
adb shell am start -n com.anonymous.LaundryClassifier/.MainActivity
```

앱이 자동으로 실행되지 않았을 경우 위 명령으로 수동 실행합니다.
또는 기기에서 앱 아이콘을 직접 터치해도 됩니다.

✅ 홈 화면이 정상적으로 표시되면 성공입니다.

---

## 🎮 개발 및 디버깅

### **Metro 터미널 단축키**

| 키 | 기능 |
|---|---|
| `r` | 앱 리로드 |
| `d` | DevTools 열기 |
| `j` | 디버거 열기 |
| `q` | Metro 종료 |

### **파일 수정 후 리로드**

소스 코드를 수정했을 때:
1. 파일 저장
2. Metro 터미널에서 `r` 키 누르기
3. 기기에서 앱이 자동 리로드됨

---

## ⚠️ 문제 해결

### **포트 8081이 이미 사용 중입니다**

```powershell
netstat -ano | findstr ":8081"
# 나온 PID 번호로 프로세스 종료
Stop-Process -Id <PID> -Force
```

### **앱이 흰색 화면으로만 보입니다**

1. Metro 터미널에서 `r` 키로 리로드
2. 또는 기기에서 앱을 강제 종료 후 다시 실행
3. `adb logcat` 로그 확인

### **연결된 기기가 없습니다 (No connected targets)**

```powershell
# 기기 재연결
adb disconnect
adb connect <device_ip>:5555

# 또는 USB 재연결
```

---

## 📱 기기 정보

```
기기명: SM-A908N
상태: Android 12
포트: 8081 (Metro)
```

---

## 🔧 유용한 명령어

```powershell
# 기기 로그 확인 (에러만)
adb logcat *:E

# 기기 로그 확인 (React Native JS)
adb logcat -s ReactNativeJS:V

# 앱 강제 종료
adb shell am force-stop com.anonymous.LaundryClassifier

# 앱 재실행
adb shell am start -n com.anonymous.LaundryClassifier/.MainActivity
```

---

## 📝 빠른 참조

```
1. Metro 시작:
   cd LaundryClassifier && npm start

2. 앱 빌드:
   cd android && $env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot' && ./gradlew app:installDebug

3. 포트 포워딩 (필수!):
   adb reverse tcp:8081 tcp:8081

4. 앱 실행:
   adb shell am start -n com.anonymous.LaundryClassifier/.MainActivity

5. 리로드:
   Metro 터미널에서 'r' 키
```

---

**작성일:** 2026-04-13
**마지막 업데이트:** 2026-05-04 - adb reverse 포트 포워딩 필수 단계 추가
