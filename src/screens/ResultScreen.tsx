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
  buildSteps,
  detectWarnings,
  getOverallState,
  classifyCase,
  case1Subtype,
  getStoreDialogues,
  hasProOption,
  sortLabelsByCategory,
  type CaseType,
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
  preloadedLabels?: string[];  // 옷장에서 열 때: YOLO 스킵, labels 직접 전달
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

// 케이스별 배너 색상
const CASE_BANNER: Record<CaseType, {bg: string; text: string; icon: string}> = {
  case_0: {bg: '#6b7280', text: '#fff', icon: '⊘'},
  case_1: {bg: '#22c55e', text: '#fff', icon: '⌂'},
  case_2: {bg: '#2e4a73', text: '#fff', icon: '▣'},
  case_3: {bg: '#d4a574', text: '#fff', icon: '⇄'},
};

// ─── 컴포넌트 ────────────────────────────────────────────

export default function ResultScreen({
  imageUri,
  onBackToHome,
  onRetake,
  onSaveToCloset,
  preloadedLabels,
}: ResultScreenProps) {
  const isPreloaded = !!preloadedLabels && preloadedLabels.length > 0;

  // 추론 상태
  const [isLoading, setIsLoading] = useState(!isPreloaded);
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
    if (!isPreloaded) {
      runInference();
    }
  }, [imageUri]);

  const runInference = async () => {
    try {
      setIsLoading(true);
      setError(null);

      try {
        await NativeLaundryYOLO.loadModel();
      } catch (loadErr) {
        console.warn('Model load warning:', loadErr);
      }

      const resized =
        await ImageProcessingService.resizeImageTo640x640(imageUri);
      setResizedImage(resized);

      const startTime = Date.now();
      const result = await NativeLaundryYOLO.detect(resized.uri);
      const elapsed = Date.now() - startTime;
      setInferenceTime(result.inferenceTime || elapsed);

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
    () =>
      sortLabelsByCategory(
        isPreloaded
          ? preloadedLabels!
          : detections.map((d: DetectionResult) => d.label).filter((l: string) => SYMBOLS[l]),
      ),
    [detections, isPreloaded, preloadedLabels],
  );
  const counts = useMemo(() => countByStatus(labels), [labels]);
  const overallState = useMemo(
    () => getOverallState(counts, labels),
    [counts, labels],
  );
  const caseType = useMemo(() => classifyCase(labels), [labels]);
  const subtype = useMemo(() => case1Subtype(labels), [labels]);
  const steps = useMemo(() => buildSteps(labels), [labels]);
  const warnings = useMemo(() => detectWarnings(labels), [labels]);
  const storeDialogues = useMemo(() => getStoreDialogues(labels), [labels]);
  const proOption = useMemo(() => hasProOption(labels), [labels]);

  const caseBanner = CASE_BANNER[caseType];

  // ── 저장 핸들러 ──
  const handleSave = () => {
    if (onSaveToCloset) {
      onSaveToCloset(labels, overallState);
    } else {
      Alert.alert('알림', '옷장 보관 기능은 향후 업데이트 예정이에요.');
    }
  };

  // ── 로딩 화면 ──
  if (isLoading) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={st.loadingText}>세탁 라벨을 분석하고 있어요...</Text>
          <Text style={st.loadingSubText}>잠시만 기다려 주세요</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── 에러 화면 ──
  if (error) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.loadingContainer}>
          <Text style={st.errorTitle}>분석에 실패했어요</Text>
          <Text style={st.errorBody}>{error}</Text>
          <TouchableOpacity style={st.retryButton} onPress={onRetake}>
            <Text style={st.retryButtonText}>다시 촬영하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 빈 결과 ──
  if (labels.length === 0) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.loadingContainer}>
          <Text style={st.errorTitle}>세탁 기호를 찾지 못했어요</Text>
          <Text style={st.errorBody}>
            라벨이 잘 보이도록 다시 촬영해 주세요
          </Text>
          <TouchableOpacity style={st.retryButton} onPress={onRetake}>
            <Text style={st.retryButtonText}>다시 촬영하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 공용 하위 컴포넌트들
  // ══════════════════════════════════════════════════════════

  // 경고 박스 (케이스1, 케이스3 방법1에서 사용)
  const renderWarnings = () => {
    if (warnings.length === 0) return null;
    return (
      <View style={st.warningBox}>
        <Text style={st.warningTitle}>주의해야 할 조합이에요</Text>
        {warnings.map((w, idx) => (
          <View key={idx} style={st.warningItem}>
            <Text style={st.warningItemTitle}>• {w.title}</Text>
            <Text style={st.warningItemBody}>{w.body}</Text>
          </View>
        ))}
      </View>
    );
  };

  // 5단계 추천 (케이스1, 케이스3 방법1에서 사용)
  const renderSteps = () => {
    if (steps.length === 0) return null;
    return (
      <View style={st.stepsSection}>
        <Text style={st.sectionTitle}>이렇게 빨아주세요</Text>
        {steps.map((step, idx) => (
          <View key={idx} style={st.stepRow}>
            <View style={st.stepNumCircle}>
              <Text style={st.stepNumText}>{idx + 1}</Text>
            </View>
            <View style={st.stepContent}>
              <Text style={st.stepTitle}>{step.title}</Text>
              <Text style={st.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // 세탁소 안내 (케이스2, 케이스3 방법2에서 사용)
  const renderStoreGuide = () => {
    const hasMild = labels.some(l =>
      ['dry_clean_perc_mild', 'dry_clean_hc_mild', 'wet_clean_mild', 'wet_clean_very_mild'].includes(l),
    );
    return (
      <View style={st.storeSection}>
        <Text style={st.sectionTitle}>세탁소에 이렇게 맡기세요</Text>

        {/* 단계 1 */}
        <View style={st.proStep}>
          <View style={st.proStepNum}>
            <Text style={st.proStepNumText}>1</Text>
          </View>
          <View style={st.proStepContent}>
            <Text style={st.proStepTitle}>동네 세탁소로 가져가세요</Text>
            <Text style={st.proStepBody}>
              일반 드라이클리닝 가능한 곳이면 어디든 OK
            </Text>
          </View>
        </View>

        {/* 단계 2: 대사 인용구들 */}
        {storeDialogues.length > 0 && (
          <View style={st.proStep}>
            <View style={st.proStepNum}>
              <Text style={st.proStepNumText}>2</Text>
            </View>
            <View style={st.proStepContent}>
              <Text style={st.proStepTitle}>이렇게 말해주세요</Text>
              {storeDialogues.map((d, idx) => (
                <View key={idx}>
                  <View style={st.speechBubble}>
                    <Text style={st.speechBubbleText}>
                      "{d.dialogue}"
                    </Text>
                  </View>
                  {d.badge ? (
                    <Text style={st.badgeHint}>
                      라벨에서 {d.badge}를 가리키며 보여주면 더 확실해요
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 꼭 챙기세요 */}
        {hasMild && (
          <View style={st.mildWarning}>
            <Text style={st.mildWarningTitle}>꼭 챙기세요</Text>
            <Text style={st.mildWarningBody}>
              "약하게"를 말 안 하면 일반 강도로 처리돼요. 옷이 상할 수 있으니 꼭
              요청하세요.
            </Text>
          </View>
        )}

        {/* 비용/기간 */}
        <View style={st.proInfoBox}>
          <View style={st.proInfoRow}>
            <Text style={st.proInfoLabel}>예상 비용</Text>
            <Text style={st.proInfoValue}>5,000~12,000원</Text>
          </View>
          <View style={[st.proInfoRow, {marginBottom: 0}]}>
            <Text style={st.proInfoLabel}>예상 기간</Text>
            <Text style={st.proInfoValue}>2~3일</Text>
          </View>
        </View>
      </View>
    );
  };

  // 저장 버튼 (preloaded 모드에서는 숨김)
  const renderSaveButton = () => {
    if (isPreloaded) return null;
    return (
      <View style={st.saveButtonContainer}>
        <TouchableOpacity style={st.saveButton} onPress={handleSave}>
          <Text style={st.saveButtonText}>옷장에 저장</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ══════════════════════════════════════════════════════════
  // 케이스별 렌더링
  // ══════════════════════════════════════════════════════════

  // 케이스 0: 못 빨아요
  const renderCase0 = () => (
    <ScrollView style={st.scroll} contentContainerStyle={st.scrollInner}>
      {/* 진단 배너 */}
      <View style={[st.diagnosticBanner, {backgroundColor: caseBanner.bg}]}>
        <Text style={[st.bannerMessage, {color: caseBanner.text}]}>
          이 옷은 빨 수 없어요
        </Text>
        <Text style={[st.bannerSub, {color: caseBanner.text, opacity: 0.85}]}>
          겉면을 살살 닦아만 주세요
        </Text>
      </View>

      {/* 왜 빨 수 없나요? */}
      <View style={st.infoCard}>
        <Text style={st.infoCardTitle}>왜 빨 수 없나요?</Text>
        <Text style={st.infoCardBody}>
          물세탁, 드라이클리닝, 웨트클리닝이 모두 금지된 옷이에요. 어떤 방법으로
          빨아도 옷이 망가질 수 있어서 가정 세탁은 불가능합니다.
        </Text>
      </View>

      {/* 관리법 */}
      <View style={st.tipsCard}>
        <Text style={st.tipsCardTitle}>이렇게 관리하세요</Text>
        <Text style={st.tipsCardBody}>
          • 부드러운 천으로 표면 먼지나 얼룩을 살살 닦아내세요.{'\n'}•
          통풍이 잘 되는 곳에 보관하세요.{'\n'}• 비닐 커버는 피하고 부직포
          커버를 사용하세요.
        </Text>
      </View>

      {/* 큰 오염 */}
      <View style={st.noteCard}>
        <Text style={st.noteCardTitle}>큰 오염이 생겼다면</Text>
        <Text style={st.noteCardBody}>
          의류 복원 전문점에 문의해 보세요. 일반 세탁소에서는 처리가 어려울 수
          있어요.
        </Text>
      </View>

      {renderSaveButton()}
    </ScrollView>
  );

  // 케이스 1: 집에서 빨기
  const renderCase1 = () => {
    const proOpt = proOption;
    const proLabel = proOpt.hasDry && proOpt.hasWet
      ? '드라이클리닝과 웨트클리닝'
      : proOpt.hasDry
      ? '드라이클리닝'
      : '웨트클리닝';

    return (
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollInner}>
        {/* 진단 배너 */}
        <View style={[st.diagnosticBanner, {backgroundColor: caseBanner.bg}]}>
          <Text style={[st.bannerMessage, {color: caseBanner.text}]}>
            {subtype.main}
          </Text>
          <Text
            style={[st.bannerSub, {color: caseBanner.text, opacity: 0.85}]}>
            {subtype.sub}
          </Text>
        </View>

        {/* 경고 조합 */}
        {renderWarnings()}

        {/* 5단계 추천 */}
        {renderSteps()}

        {/* 드라이클리닝도 가능해요 (회색 정보 박스) */}
        {(proOpt.hasDry || proOpt.hasWet) && (
          <View style={st.proOptionInfo}>
            <Text style={st.proOptionTitle}>{proLabel}도 가능해요</Text>
            <Text style={st.proOptionBody}>
              더 깔끔하게 관리하고 싶으면 세탁소에 맡겨도 OK
            </Text>
          </View>
        )}

        {renderSaveButton()}
      </ScrollView>
    );
  };

  // 케이스 2: 세탁소만
  const renderCase2 = () => {
    // 빨강 경고: 절대 하면 안 돼요
    const forbidItems: string[] = ['세탁기에 넣지 마세요'];
    if (!labels.includes('wash_by_hand')) {
      forbidItems.push('손빨래도 금지 (물 자체가 옷에 영향을 줄 수 있어요)');
    }
    if (labels.includes('do_not_bleach')) {
      forbidItems.push('표백제 사용 금지');
    }
    if (labels.includes('do_not_tumble_dry')) {
      forbidItems.push('건조기 사용 금지');
    }
    if (labels.includes('do_not_iron')) {
      forbidItems.push('다림질 금지');
    }

    return (
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollInner}>
        {/* 진단 배너 */}
        <View style={[st.diagnosticBanner, {backgroundColor: caseBanner.bg}]}>
          <Text style={[st.bannerMessage, {color: caseBanner.text}]}>
            세탁소에 맡겨야 하는 옷이에요
          </Text>
          <Text
            style={[st.bannerSub, {color: caseBanner.text, opacity: 0.85}]}>
            집에서 빨면 옷이 망가질 수 있어요
          </Text>
        </View>

        {/* 빨강 경고 */}
        <View style={st.forbidBox}>
          <Text style={st.forbidTitle}>절대 하면 안 돼요</Text>
          {forbidItems.map((item, idx) => (
            <Text key={idx} style={st.forbidItem}>
              • {item}
            </Text>
          ))}
        </View>

        {/* 세탁소 안내 */}
        {renderStoreGuide()}

        {renderSaveButton()}
      </ScrollView>
    );
  };

  // 케이스 3: 선택 가능
  const renderCase3 = () => (
    <ScrollView style={st.scroll} contentContainerStyle={st.scrollInner}>
      {/* 진단 배너 */}
      <View style={[st.diagnosticBanner, {backgroundColor: caseBanner.bg}]}>
        <Text style={[st.bannerMessage, {color: caseBanner.text}]}>
          선택 가능한 옷이에요
        </Text>
        <Text style={[st.bannerSub, {color: caseBanner.text, opacity: 0.85}]}>
          집에서 빨거나, 세탁소에 맡겨도 돼요
        </Text>
      </View>

      {/* 방법 토글 */}
      <View style={st.methodToggle}>
        <TouchableOpacity
          style={[
            st.methodTab,
            methodTab === 'home' && st.methodTabActiveHome,
          ]}
          onPress={() => setMethodTab('home')}>
          <Text
            style={[
              st.methodTabText,
              methodTab === 'home' && st.methodTabTextActiveHome,
            ]}>
            방법 1 · 집에서
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            st.methodTab,
            methodTab === 'pro' && st.methodTabActivePro,
          ]}
          onPress={() => setMethodTab('pro')}>
          <Text
            style={[
              st.methodTabText,
              methodTab === 'pro' && st.methodTabTextActivePro,
            ]}>
            방법 2 · 세탁소
          </Text>
        </TouchableOpacity>
      </View>

      {/* 방법 1: 집에서 빨기 */}
      {methodTab === 'home' && (
        <>
          {renderWarnings()}
          {renderSteps()}
        </>
      )}

      {/* 방법 2: 세탁소에 맡기기 */}
      {methodTab === 'pro' && renderStoreGuide()}

      {renderSaveButton()}
    </ScrollView>
  );

  // ── 탭1: 인식 결과 (케이스별 디스패치) ──
  const renderResultTab = () => {
    switch (caseType) {
      case 'case_0':
        return renderCase0();
      case 'case_1':
        return renderCase1();
      case 'case_2':
        return renderCase2();
      case 'case_3':
        return renderCase3();
      default:
        return renderCase1();
    }
  };

  // ── 탭2: 라벨 분석 ──
  const renderAnalysisTab = () => {
    const scale = IMAGE_DISPLAY_SIZE / MODEL_INPUT_SIZE;

    return (
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollInner}>
        {/* 이미지 + bbox 오버레이 */}
        <View style={st.imageContainer}>
          {resizedImage && (
            <View style={{width: '100%', height: '100%'}}>
              <Image
                source={{uri: resizedImage.uri}}
                style={st.analysisImage}
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
        <View style={st.detectionCard}>
          <Text style={st.detectionCardTitle}>검출 결과</Text>
          {detections.map((det, idx) => {
            const color = BBOX_COLORS[det.classId % BBOX_COLORS.length];
            return (
              <View key={idx} style={st.detectionRow}>
                <View style={[st.detectionDot, {backgroundColor: color}]} />
                <Text style={st.detectionLabel}>{det.label}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── 메인 렌더링 ──
  return (
    <SafeAreaView style={st.container}>
      {/* 헤더 */}
      <View style={st.header}>
        <TouchableOpacity onPress={onBackToHome} style={st.backButton}>
          <Text style={st.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>
          {isPreloaded ? '세탁 정보' : '인식 결과'}
        </Text>
        <View style={{width: 40}} />
      </View>

      {/* 탭 바 (preloaded 모드에서는 숨김) */}
      {!isPreloaded && (
        <View style={st.tabBar}>
          <TouchableOpacity
            style={[st.tab, activeTab === 'result' && st.tabActive]}
            onPress={() => setActiveTab('result')}>
            <Text
              style={[st.tabText, activeTab === 'result' && st.tabTextActive]}>
              인식 결과
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tab, activeTab === 'analysis' && st.tabActive]}
            onPress={() => setActiveTab('analysis')}>
            <Text
              style={[
                st.tabText,
                activeTab === 'analysis' && st.tabTextActive,
              ]}>
              라벨 분석
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 탭 콘텐츠 */}
      {isPreloaded
        ? renderResultTab()
        : activeTab === 'result'
        ? renderResultTab()
        : renderAnalysisTab()}
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const st = StyleSheet.create({
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
  bannerSub: {fontSize: 14, marginTop: 8, lineHeight: 20},

  // ── 케이스 0 카드들 ──
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 18,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 8,
  },
  infoCardBody: {fontSize: 13, color: '#555', lineHeight: 20},

  tipsCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tipsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 8,
  },
  tipsCardBody: {fontSize: 13, color: '#555', lineHeight: 22},

  noteCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noteCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ca8a04',
    marginBottom: 8,
  },
  noteCardBody: {fontSize: 13, color: '#555', lineHeight: 20},

  // ── 경고 박스 (케이스1/3 방법1) ──
  warningBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 8,
  },
  warningItem: {marginTop: 8},
  warningItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    lineHeight: 20,
  },
  warningItemBody: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 18,
    marginTop: 2,
    opacity: 0.85,
  },

  // ── 케이스 2 빨강 금지 박스 ──
  forbidBox: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 20,
  },
  forbidTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  forbidItem: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 24,
  },

  // ── 단계 섹션 ──
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

  // ── 케이스 1 드라이클리닝 가능 정보 ──
  proOptionInfo: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 18,
  },
  proOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    marginBottom: 4,
  },
  proOptionBody: {fontSize: 13, color: '#999', lineHeight: 20},

  // ── 방법 토글 (케이스3) ──
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
  methodTabActiveHome: {
    backgroundColor: '#22c55e',
  },
  methodTabActivePro: {
    backgroundColor: '#2e4a73',
  },
  methodTabText: {fontSize: 13, fontWeight: '500', color: '#999'},
  methodTabTextActiveHome: {color: '#fff', fontWeight: '700'},
  methodTabTextActivePro: {color: '#fff', fontWeight: '700'},

  // ── 세탁소 안내 ──
  storeSection: {marginHorizontal: 20, marginTop: 24},
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
  badgeHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    marginLeft: 4,
  },

  // 꼭 챙기세요
  mildWarning: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  mildWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ca8a04',
    marginBottom: 4,
  },
  mildWarningBody: {fontSize: 13, color: '#92400e', lineHeight: 20},

  // 비용/기간
  proInfoBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  proInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  proInfoLabel: {fontSize: 13, color: '#999'},
  proInfoValue: {fontSize: 13, fontWeight: '600', color: '#333'},

  // ── 하단 저장 버튼 ──
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
