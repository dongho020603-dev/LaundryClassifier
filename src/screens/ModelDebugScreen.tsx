import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ImageProcessingService, {ResizedImageInfo} from '../services/imageProcessingService';
import NativeLaundryYOLO, {Detection} from '../services/NativeLaundryYOLO';

interface DetectionResult {
  label: string;
  confidence: number;
  classId: number;
  bbox?: number[];
}

interface ModelDebugScreenProps {
  imageUri: string;
  onContinue: (detections: DetectionResult[]) => void;
  onRetake: () => void;
  onResizedImageReady?: (uri: string) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_DISPLAY_SIZE = SCREEN_WIDTH - 40; // padding 20 each side
const MODEL_INPUT_SIZE = 640;

const BBOX_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
  '#00FFFF', '#FFA500', '#800080', '#008000', '#FF69B4',
];

const CLASS_NAMES: Record<number, string> = {
  0: 'bleach_any',
  1: 'bleach_oxygen_only',
  2: 'do_not_bleach',
  3: 'do_not_dry_clean',
  4: 'do_not_iron',
  5: 'do_not_tumble_dry',
  6: 'do_not_wash',
  7: 'do_not_wet_clean',
  8: 'drip_flat_dry',
  9: 'drip_flat_dry_shade',
  10: 'drip_line_dry',
  11: 'drip_line_dry_shade',
  12: 'dry_clean_hc_mild',
  13: 'dry_clean_hc_normal',
  14: 'dry_clean_perc_mild',
  15: 'dry_clean_perc_normal',
  16: 'flat_dry',
  17: 'flat_dry_shade',
  18: 'iron_110c',
  19: 'iron_150c',
  20: 'iron_200c',
  21: 'line_dry',
  22: 'line_dry_shade',
  23: 'tumble_dry_mild',
  24: 'tumble_dry_normal',
  25: 'wash_by_hand',
  26: 'washing_mild_30',
  27: 'washing_mild_40',
  28: 'washing_mild_60',
  29: 'washing_normal_30',
  30: 'washing_normal_40',
  31: 'washing_normal_60',
  32: 'washing_normal_95',
  33: 'washing_very_mild_30',
  34: 'washing_very_mild_40',
  35: 'wet_clean_mild',
  36: 'wet_clean_normal',
  37: 'wet_clean_very_mild',
};

export default function ModelDebugScreen({
  imageUri,
  onContinue,
  onRetake,
  onResizedImageReady,
}: ModelDebugScreenProps) {
  const [isResizing, setIsResizing] = useState(true);
  const [isInferencing, setIsInferencing] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [resizedImage, setResizedImage] = useState<ResizedImageInfo | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processImage();
  }, [imageUri]);

  const processImage = async () => {
    try {
      setIsResizing(true);
      setError(null);

      // 1. 모델 로드
      setModelLoading(true);
      try {
        await NativeLaundryYOLO.loadModel();
        console.log('Model loaded successfully');
      } catch (loadErr) {
        console.warn('Model load warning:', loadErr);
      }
      setModelLoading(false);

      // 2. 640x640 리사이징
      const resized = await ImageProcessingService.resizeImageTo640x640(imageUri);
      setResizedImage(resized);
      if (onResizedImageReady) {
        onResizedImageReady(resized.uri);
      }
      setIsResizing(false);

      // 3. YOLO 추론
      setIsInferencing(true);
      const startTime = Date.now();

      const result = await NativeLaundryYOLO.detect(resized.uri);

      const elapsed = Date.now() - startTime;
      setInferenceTime(result.inferenceTime || elapsed);

      const detectionResults: DetectionResult[] = result.detections.map((det: Detection) => ({
        label: CLASS_NAMES[det.classId] || `class_${det.classId}`,
        confidence: det.confidence,
        classId: det.classId,
        bbox: det.bbox,
      }));

      setDetections(detectionResults);
    } catch (err: any) {
      console.error('Process error:', err);
      setError(err.message || '이미지 처리 실패');
      Alert.alert('오류', `이미지 처리 중 오류가 발생했습니다.\n${err.message || ''}`);
    } finally {
      setIsResizing(false);
      setIsInferencing(false);
      setModelLoading(false);
    }
  };

  const isProcessing = isResizing || isInferencing || modelLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>모델 디버깅</Text>
        <Text style={styles.headerSubtitle}>Model Visualization</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 이미지 + bbox 오버레이 */}
        <View style={styles.imageContainer}>
          {isResizing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>이미지 리사이징 중...</Text>
            </View>
          ) : resizedImage ? (
            <View style={{width: '100%', height: '100%'}}>
              <Image
                source={{uri: resizedImage.uri}}
                style={styles.image}
                resizeMode="contain"
              />
              {/* bbox 오버레이 */}
              {detections.length > 0 && !isInferencing && detections.map((det, idx) => {
                if (!det.bbox || det.bbox.length < 4) return null;
                const scale = IMAGE_DISPLAY_SIZE / MODEL_INPUT_SIZE;
                const x1 = det.bbox[0] * scale;
                const y1 = det.bbox[1] * scale;
                const bw = (det.bbox[2] - det.bbox[0]) * scale;
                const bh = (det.bbox[3] - det.bbox[1]) * scale;
                const color = BBOX_COLORS[det.classId % BBOX_COLORS.length];
                return (
                  <React.Fragment key={idx}>
                    <View
                      style={{
                        position: 'absolute',
                        left: x1,
                        top: y1,
                        width: bw,
                        height: bh,
                        borderWidth: 2,
                        borderColor: color,
                      }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        left: x1,
                        top: Math.max(0, y1 - 18),
                        backgroundColor: color,
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 2,
                      }}>
                      <Text style={{color: '#fff', fontSize: 10, fontWeight: '700'}}>
                        {det.classId} {CLASS_NAMES[det.classId] || ''}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>이미지 로드 실패</Text>
            </View>
          )}
        </View>

        {/* 전처리 정보 */}
        {resizedImage && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>전처리 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>리사이징:</Text>
              <Text style={styles.infoValueSuccess}>완료</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>입력 크기:</Text>
              <Text style={styles.infoValue}>{resizedImage.width}x{resizedImage.height}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>파일 크기:</Text>
              <Text style={styles.infoValue}>
                {ImageProcessingService.formatFileSize(resizedImage.size)}
              </Text>
            </View>
          </View>
        )}

        {/* YOLO 추론 상태 */}
        {isInferencing && (
          <View style={styles.infoCard}>
            <View style={styles.inferenceLoading}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.inferenceLoadingText}>YOLOv8 모델 분석 중...</Text>
            </View>
          </View>
        )}

        {/* 검출 결과 */}
        {detections.length > 0 && !isInferencing && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>검출 결과</Text>
            {inferenceTime !== null && (
              <Text style={styles.inferenceTimeText}>추론 시간: {inferenceTime}ms</Text>
            )}
            {detections.map((det, idx) => (
              <View key={idx} style={styles.detectionRow}>
                <Text style={styles.detectionLabel}>{det.label}</Text>
                <Text style={styles.detectionScore}>
                  {(det.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 모델 상태 */}
        {error && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>오류</Text>
            <Text style={styles.debugText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.retakeButton]}
          onPress={onRetake}
          disabled={isProcessing}
        >
          <Text style={styles.retakeButtonText}>다시 촬영</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.continueButton, isProcessing && styles.disabledButton]}
          onPress={() => onContinue(detections)}
          disabled={isProcessing || detections.length === 0}
        >
          <Text style={styles.continueButtonText}>결과 확인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
    flex: 1,
  },
  infoValueSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f44336',
  },
  inferenceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  inferenceLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
  },
  inferenceTimeText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  detectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detectionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  detectionScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.5,
  },
  debugCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  debugText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#856404',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  retakeButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#7C3AED',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
