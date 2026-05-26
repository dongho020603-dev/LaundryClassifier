import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SYMBOLS} from '../data/laundrySymbolData';
import {
  countByStatus,
  mainSubBody,
  buildSteps,
  detectWarnings,
  proCareBanners,
  getOverallState,
  StateType,
} from '../data/laundryLogic';
import NativeLaundryYOLO, {Detection} from '../services/NativeLaundryYOLO';
import ImageProcessingService, {
  ResizedImageInfo,
} from '../services/imageProcessingService';

// ─── 타입 ────────────────────────────────────────────────

interface DetectionResult {
  label: string;
  confidence: number;
  classId: number;
  bbox?: number[];
}

interface ResultScreenProps {
  imageUri: string;
  onBackToHome: () => void;
  onRetake: () => void;
  onSaveToCloset?: (labels: string[], overallState: string) => void;
}

// ─── 상수 ────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_DISPLAY_SIZE = SCREEN_WIDTH - 40;
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

const BANNER_CONFIG: Record<
  string,
  {bg: string; text: string; message: string}
> = {
  forbidden: {
    bg: '#c8472b',
    text: '#fff',
    message: '세탁소에 맡겨야 하는 옷이에요',
  },
  caution: {
    bg: '#8B7355',
    text: '#fff',
    message: '조심해서 빨아야 하는 옷이에요',
  },
  safe: {
    bg: '#e8f3ee',
    text: '#2d8d6f',
    message: '집에서 빨아도 되는 옷이에요',
  },
  pro: {
    bg: '#2e4a73',
    text: '#fff',
    message: '전문 세탁이 필요한 옷이에요',
  },
};

// ─── 컴포넌트 ────────────────────────────────────────────

export default function ResultScreen({
  imageUri,
  onBackToHome,
  onRetake,
  onSaveToCloset,
}: ResultScreenProps) {
  // 추론 상태
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resizedImage, setResizedImage] = useState<ResizedImageInfo | null>(
    null,
  );
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'result' | 'analysis'>('result');
  const [methodTab, setMethodTab] = useState<'home' | 'pro'>('home');

  // ── 추론 파이프라인 ──
  useEffect(() => {
    runInference();
  }, [imageUri]);

  const runInference = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. 모델 로드
      try {
        await NativeLaundryYOLO.loadModel();
      } catch (loadErr) {
        console.warn('Model load warning:', loadErr);
      }

      // 2. 640x640 리사이징
      const resized =
        await ImageProcessingService.resizeImageTo640x640(imageUri);
      setResizedImage(resized);

      // 3. YOLO 추론
      const startTime = Date.now();
      const result = await NativeLaundryYOLO.detect(resized.uri);
      const elapsed = Date.now() - startTime;
      setInferenceTime(result.inferenceTime || elapsed);

      // 4. Detection → DetectionResult 변환
      const detectionResults: DetectionResult[] = result.detections.map(
        (det: Detection) => ({
          label: CLASS_NAMES[det.classId] || `class_${det.classId}`,
          confidence: det.confidence,
          classId: det.classId,
          bbox: det.bbox,
        }),
      );
      setDetections(detectionResults);
    } catch (err: any) {
      console.error('Inference error:', err);
      setError(err.message || '이미지 처리 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 파생 데이터 ──
  const labels = useMemo(
    () => detections.map(d => d.label).filter(l => SYMBOLS[l]),
    [detections],
  );
  const counts = useMemo(() => countByStatus(labels), [labels]);
  const overallState = useMemo(() => getOverallState(counts), [counts]);
  const msb = useMemo(() => mainSubBody(labels), [labels]);
  const steps = useMemo(() => buildSteps(labels), [labels]);
  const warnings = useMemo(() => detectWarnings(labels), [labels]);
  const banners = useMemo(() => proCareBanners(labels), [labels]);

  const hasHomeWash = steps.length > 0;
  const hasProCare = banners.length > 0;
  const banner = BANNER_CONFIG[overallState] || BANNER_CONFIG.safe;

  // ── 로딩 화면 ──
  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={s.loadingText}>세탁 라벨을 분석하고 있어요...</Text>
          <Text style={s.loadingSubText}>잠시만 기다려 주세요</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── 에러 화면 ──
  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <Text style={s.errorTitle}>분석에 실패했어요</Text>
          <Text style={s.errorBody}>{error}</Text>
          <TouchableOpacity style={s.retryButton} onPress={onRetake}>
            <Text style={s.retryButtonText}>다시 촬영하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 빈 결과 ──
  if (labels.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <Text style={s.errorTitle}>세탁 기호를 찾지 못했어요</Text>
          <Text style={s.errorBody}>
            라벨이 잘 보이도록 다시 촬영해 주세요
          </Text>
          <TouchableOpacity style={s.retryButton} onPress={onRetake}>
            <Text style={s.retryButtonText}>다시 촬영하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 탭1: 인식 결과 ──
  const renderResultTab = () => {
    // 방법 토글이 필요한지 결정
    const showMethodToggle = hasHomeWash && hasProCare;

    // 현재 보여줄 섹션 결정
    const showHomeContent =
      !showMethodToggle || methodTab === 'home' ? hasHomeWash : false;
    const showProContent =
      !showMethodToggle || methodTab === 'pro' ? hasProCare : false;

    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        {/* 진단 배너 */}
        <View style={[s.diagnosticBanner, {backgroundColor: banner.bg}]}>
          <Text style={[s.bannerMessage, {color: banner.text}]}>
            {banner.message}
          </Text>
          <Text
            style={[s.bannerSub, {color: banner.text, opacity: 0.85}]}>
            {msb.sub}
          </Text>
          <Text
            style={[s.bannerBody, {color: banner.text, opacity: 0.7}]}>
            {msb.body}
          </Text>
        </View>

        {/* 방법 토글 */}
        {showMethodToggle && (
          <View style={s.methodToggle}>
            <TouchableOpacity
              style={[
                s.methodTab,
                methodTab === 'home' && s.methodTabActive,
              ]}
              onPress={() => setMethodTab('home')}>
              <Text
                style={[
                  s.methodTabText,
                  methodTab === 'home' && s.methodTabTextActive,
                ]}>
                집에서 빨기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.methodTab,
                methodTab === 'pro' && s.methodTabActive,
              ]}
              onPress={() => setMethodTab('pro')}>
              <Text
                style={[
                  s.methodTabText,
                  methodTab === 'pro' && s.methodTabTextActive,
                ]}>
                세탁소에 맡기기
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 경고 박스 */}
        {warnings.length > 0 && showHomeContent && (
          <View style={s.warningBox}>
            <Text style={s.warningTitle}>절대 하면 안 돼요</Text>
            {warnings.map((w, idx) => (
              <View key={idx} style={s.warningItem}>
                <Text style={s.warningItemTitle}>• {w.title}</Text>
                <Text style={s.warningItemBody}>{w.body}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 이렇게 빨아주세요 */}
        {showHomeContent && steps.length > 0 && (
          <View style={s.stepsSection}>
            <Text style={s.sectionTitle}>이렇게 빨아주세요</Text>
            {steps.map((step, idx) => (
              <View key={idx} style={s.stepRow}>
                <View style={s.stepNumCircle}>
                  <Text style={s.stepNumText}>{idx + 1}</Text>
                </View>
                <View style={s.stepContent}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 세탁소 안내 */}
        {(showProContent || (!showMethodToggle && hasProCare)) &&
          banners.map((b, idx) => (
            <View key={idx} style={s.proSection}>
              <Text style={s.sectionTitle}>세탁소에 이렇게 말해주세요</Text>

              {/* 단계 1 */}
              <View style={s.proStep}>
                <View style={s.proStepNum}>
                  <Text style={s.proStepNumText}>1</Text>
                </View>
                <View style={s.proStepContent}>
                  <Text style={s.proStepTitle}>동네 세탁소로 가져가기</Text>
                  <Text style={s.proStepBody}>
                    가까운 세탁소에 옷을 가져가 주세요
                  </Text>
                </View>
              </View>

              {/* 단계 2 */}
              <View style={s.proStep}>
                <View style={s.proStepNum}>
                  <Text style={s.proStepNumText}>2</Text>
                </View>
                <View style={s.proStepContent}>
                  <Text style={s.proStepTitle}>이렇게 말해주세요</Text>
                  {/* 말풍선 */}
                  <View style={s.speechBubble}>
                    <Text style={s.speechBubbleText}>
                      "{b.subTitle} 해주세요"
                    </Text>
                  </View>
                </View>
              </View>

              {/* 비용/기간 */}
              <View style={s.proInfoBox}>
                <View style={s.proInfoRow}>
                  <Text style={s.proInfoLabel}>예상 비용</Text>
                  <Text style={s.proInfoValue}>5,000~12,000원</Text>
                </View>
                <View style={s.proInfoRow}>
                  <Text style={s.proInfoLabel}>예상 기간</Text>
                  <Text style={s.proInfoValue}>2~3일</Text>
                </View>
              </View>
            </View>
          ))}

        {/* 옷장에 저장 버튼 */}
        <View style={s.saveButtonContainer}>
          <TouchableOpacity
            style={s.saveButton}
            onPress={() =>
              onSaveToCloset
                ? onSaveToCloset(labels, overallState)
                : Alert.alert('알림', '옷장 보관 기능은 향후 업데이트 예정이에요.')
            }>
            <Text style={s.saveButtonText}>옷장에 저장</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ── 탭2: 라벨 분석 ──
  const renderAnalysisTab = () => {
    const scale = IMAGE_DISPLAY_SIZE / MODEL_INPUT_SIZE;

    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        {/* 이미지 + bbox 오버레이 */}
        <View style={s.imageContainer}>
          {resizedImage && (
            <View style={{width: '100%', height: '100%'}}>
              <Image
                source={{uri: resizedImage.uri}}
                style={s.analysisImage}
                resizeMode="contain"
              />
              {detections.map((det, idx) => {
                if (!det.bbox || det.bbox.length < 4) return null;
                const x1 = det.bbox[0] * scale;
                const y1 = det.bbox[1] * scale;
                const bw = (det.bbox[2] - det.bbox[0]) * scale;
                const bh = (det.bbox[3] - det.bbox[1]) * scale;
                const color = BBOX_COLORS[det.classId % BBOX_COLORS.length];
                return (
                  <View
                    key={idx}
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
                );
              })}
            </View>
          )}
        </View>

        {/* 검출 라벨 리스트 */}
        <View style={s.detectionCard}>
          <Text style={s.detectionCardTitle}>검출 결과</Text>
          {detections.map((det, idx) => {
            const color = BBOX_COLORS[det.classId % BBOX_COLORS.length];
            return (
              <View key={idx} style={s.detectionRow}>
                <View style={[s.detectionDot, {backgroundColor: color}]} />
                <Text style={s.detectionLabel}>{det.label}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── 메인 렌더링 ──
  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBackToHome} style={s.backButton}>
          <Text style={s.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>인식 결과</Text>
        <View style={{width: 40}} />
      </View>

      {/* 탭 바 */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'result' && s.tabActive]}
          onPress={() => setActiveTab('result')}>
          <Text
            style={[s.tabText, activeTab === 'result' && s.tabTextActive]}>
            인식 결과
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'analysis' && s.tabActive]}
          onPress={() => setActiveTab('analysis')}>
          <Text
            style={[
              s.tabText,
              activeTab === 'analysis' && s.tabTextActive,
            ]}>
            라벨 분석
          </Text>
        </TouchableOpacity>
      </View>

      {/* 탭 콘텐츠 */}
      {activeTab === 'result' ? renderResultTab() : renderAnalysisTab()}
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  scroll: {flex: 1},
  scrollInner: {paddingBottom: 40},

  // 로딩 / 에러
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
  },
  loadingSubText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  errorBody: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {fontSize: 24, color: '#333'},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#333'},

  // 탭 바
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {flex: 1, paddingVertical: 14, alignItems: 'center'},
  tabActive: {borderBottomWidth: 2, borderBottomColor: '#333'},
  tabText: {fontSize: 14, fontWeight: '500', color: '#999'},
  tabTextActive: {color: '#333', fontWeight: '700'},

  // 진단 배너
  diagnosticBanner: {
    borderRadius: 16,
    padding: 24,
    margin: 20,
    marginBottom: 0,
  },
  bannerMessage: {fontSize: 20, fontWeight: '800', lineHeight: 28},
  bannerSub: {fontSize: 14, marginTop: 8},
  bannerBody: {fontSize: 13, marginTop: 6, lineHeight: 20},

  // 방법 토글
  methodToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  methodTabActive: {
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  methodTabText: {fontSize: 13, fontWeight: '500', color: '#999'},
  methodTabTextActive: {color: '#333', fontWeight: '700'},

  // 경고 박스
  warningBox: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  warningItem: {marginTop: 8},
  warningItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },
  warningItemBody: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginTop: 2,
  },

  // 단계 섹션
  stepsSection: {marginHorizontal: 20, marginTop: 24},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 16,
  },
  stepRow: {flexDirection: 'row', marginBottom: 18},
  stepNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {color: '#fff', fontSize: 14, fontWeight: '700'},
  stepContent: {marginLeft: 14, flex: 1},
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  stepBody: {fontSize: 13, color: '#666', lineHeight: 20},

  // 세탁소 안내
  proSection: {marginHorizontal: 20, marginTop: 24},
  proStep: {flexDirection: 'row', marginBottom: 16},
  proStepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2e4a73',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  proStepNumText: {color: '#fff', fontSize: 14, fontWeight: '700'},
  proStepContent: {marginLeft: 14, flex: 1},
  proStepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  proStepBody: {fontSize: 13, color: '#666', lineHeight: 20},

  // 말풍선
  speechBubble: {
    backgroundColor: '#f0f4f8',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dce3eb',
  },
  speechBubbleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2e4a73',
    textAlign: 'center',
  },

  // 비용/기간
  proInfoBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  proInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  proInfoLabel: {fontSize: 13, color: '#999'},
  proInfoValue: {fontSize: 13, fontWeight: '600', color: '#333'},

  // 하단 저장 버튼
  saveButtonContainer: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  saveButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {color: '#fff', fontSize: 17, fontWeight: '700'},

  // ── 분석 탭 ──
  imageContainer: {
    width: IMAGE_DISPLAY_SIZE,
    height: IMAGE_DISPLAY_SIZE,
    alignSelf: 'center',
    marginTop: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  analysisImage: {width: '100%', height: '100%'},
  detectionCard: {
    margin: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
  },
  detectionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  detectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  detectionLabel: {fontSize: 14, fontWeight: '500', color: '#333'},
});
