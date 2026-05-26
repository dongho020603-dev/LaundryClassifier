import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, requestCameraPermissionsAsync } from 'expo-camera';
import { useRouter } from 'expo-router';

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });
      router.push({ pathname: '/analysis', params: { photoUri: photoData.uri } });
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>카메라 권한 요청 중...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>카메라 권한이 필요합니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView style={styles.camera} ratio="1:1" ref={cameraRef} />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.guideBox} />
        <Text style={styles.guideText}>물티슈, 세탁물 크기를 정방형 안에 맞춰주세요.</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={() => router.push('/result') /* 추후 갤러리 이동으로 변경 */}>
          <Text style={styles.galleryText}>보관함</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureCircle} />
        </TouchableOpacity>
        <View style={styles.spacing} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  guideBox: {
    width: '80%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    opacity: 0.9,
  },
  guideText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  controls: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  galleryButton: {
    width: 72,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  galleryText: {
    color: '#fff',
    fontSize: 12,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  spacing: {
    width: 72,
    height: 48,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  messageText: {
    color: '#fff',
    fontSize: 18,
  },
});