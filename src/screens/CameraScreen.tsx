import React, {useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {launchImageLibrary} from 'react-native-image-picker';
import {Colors, Radius, Spacing, Typography} from '../theme/tokens';

interface CameraScreenProps {
  onPhotoTaken: (uri: string) => void;
  onImageSelected: (uri: string) => void;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_SIZE = SCREEN_WIDTH - Spacing.lg * 2;

export default function CameraScreen({
  onPhotoTaken,
  onImageSelected,
  onClose,
}: CameraScreenProps) {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  React.useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const handleShutter = async () => {
    if (!cameraRef.current) {
      Alert.alert('오류', '카메라가 준비되지 않았어요');
      return;
    }
    try {
      const result = await cameraRef.current.takeSnapshot({quality: 85});
      onPhotoTaken(result.path);
    } catch (e) {
      console.error('Photo capture error:', e);
      Alert.alert('촬영 실패', '사진을 촬영할 수 없어요');
    }
  };

  const handleGallery = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.85}, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('갤러리 오류', res.errorMessage || '');
        return;
      }
      const uri = res.assets?.[0]?.uri;
      if (uri) onImageSelected(uri);
    });
  };

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>카메라 권한이 필요해요</Text>
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>카메라를 찾을 수 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* 상단 바 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.6}
          onPress={onClose}>
          <Text style={styles.iconBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>라벨 촬영</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* 카메라 프리뷰 (1:1) */}
      <View style={styles.previewWrap}>
        <View style={styles.preview}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true}
            resizeMode="cover"
          />

          {/* 4-corner guide brackets */}
          <View style={[styles.bracket, styles.bracketTL]} />
          <View style={[styles.bracket, styles.bracketTR]} />
          <View style={[styles.bracket, styles.bracketBL]} />
          <View style={[styles.bracket, styles.bracketBR]} />
        </View>
      </View>

      {/* 하단 가이드 + 컨트롤 */}
      <View style={styles.bottomArea}>
        <Text style={styles.hintMain}>세탁 라벨을 사각형 안에 맞춰 주세요</Text>
        <Text style={styles.hintSub}>빛 반사와 그림자에 주의해 주세요</Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.galleryBtn}
            activeOpacity={0.7}
            onPress={handleGallery}>
            <Text style={styles.galleryIcon}>🖼️</Text>
            <Text style={styles.galleryLabel}>갤러리</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterOuter}
            activeOpacity={0.8}
            onPress={handleShutter}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* spacer 우측 (좌우 균형) */}
          <View style={styles.galleryBtn} />
        </View>
      </View>
    </View>
  );
}

const SHUTTER = 76;

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.surface},

  // ── 상단 바 ──
  topBar: {
    height: 56,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {fontSize: 30, color: Colors.textPrimary, marginTop: -4},
  topTitle: {
    ...Typography.titleMd,
    color: Colors.textPrimary,
  },

  // ── 프리뷰 ──
  previewWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  bracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.cameraGuide,
  },
  bracketTL: {top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8},
  bracketTR: {top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8},
  bracketBL: {bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8},
  bracketBR: {bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8},

  // ── 하단 ──
  bottomArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    justifyContent: 'space-between',
  },
  hintMain: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  hintSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  galleryBtn: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryIcon: {fontSize: 26, marginBottom: 2},
  galleryLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
  },

  shutterOuter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    backgroundColor: 'rgba(91,200,98,0.18)',
    borderWidth: 4,
    borderColor: Colors.ctaGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: SHUTTER - 22,
    height: SHUTTER - 22,
    borderRadius: (SHUTTER - 22) / 2,
    backgroundColor: Colors.ctaGreen,
  },

  // ── fallback ──
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  fallbackText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
