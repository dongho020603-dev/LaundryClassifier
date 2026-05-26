import React, {useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';

interface CameraScreenProps {
  onPhotoTaken: (uri: string) => void;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAMERA_SIZE = SCREEN_WIDTH - 40;

export default function CameraScreen({
  onPhotoTaken,
  onClose,
}: CameraScreenProps) {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('오류', '카메라가 준비되지 않았습니다.');
      return;
    }

    try {
      // KIDURIN 방식: takeSnapshot으로 고품질 촬영
      const result = await cameraRef.current.takeSnapshot({
        quality: 85, // KIDURIN과 동일한 품질 (85%)
      });
      onPhotoTaken(result.path);
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('촬영 실패', '사진을 촬영할 수 없습니다.');
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text>카메라 권한이 필요합니다.</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>카메라를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 상단 여백 */}
      <View style={styles.topSpacer} />

      {/* 1:1 카메라 영역 - KIDURIN 방식 */}
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={true}
          photo={true}
          resizeMode="cover"
        />
        {/* 가이드라인 */}
        <View style={styles.guidelineContainer}>
          <View style={styles.leftBracket} />
          <View style={styles.rightBracket} />
        </View>
      </View>

      {/* 하단 여백 */}
      <View style={styles.bottomSpacer} />

      {/* 상단 닫기 버튼 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      {/* 촬영 가이드 */}
      <View style={styles.guideContainer}>
        <Text style={styles.guideTitle}>촬영방법</Text>
        <Text style={styles.guideText}>세탁기호를 가이드라인 안에 위치시켜 주세요</Text>
        <Text style={styles.guideText}>빛 반사와 그림자에 유의해주세요</Text>
      </View>

      {/* 하단 촬영 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleTakePhoto}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSpacer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bottomSpacer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cameraContainer: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    overflow: 'hidden',
    borderRadius: 20,
    alignSelf: 'center',
  },
  camera: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
  },
  guidelineContainer: {
    position: 'absolute',
    left: CAMERA_SIZE / 8,
    top: CAMERA_SIZE / 3,
    width: (CAMERA_SIZE * 3) / 4,
    height: CAMERA_SIZE / 3,
  },
  leftBracket: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 30,
    height: CAMERA_SIZE / 3,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  rightBracket: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 30,
    height: CAMERA_SIZE / 3,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    paddingTop: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#999',
    fontSize: 28,
    fontWeight: '300',
  },
  guideContainer: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    marginTop: -(CAMERA_SIZE / 2 + 170),
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 20,
    zIndex: 5,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  guideText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(124,58,237,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#7C3AED',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
  },
});
