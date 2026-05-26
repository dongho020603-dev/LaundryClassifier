import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import ImageProcessingService from '../services/imageProcessingService';
import NativeLaundryYOLO, {Detection} from '../services/NativeLaundryYOLO';
import {
  classifyCase,
  buildCase0,
  buildCase1,
  buildCase2,
  buildCase3,
  CaseType,
  Case1Content,
  Case2Content,
} from '../data/laundryLogic';
import {Colors, Radius, Spacing, Typography} from '../theme/tokens';
import SaveScreen from './SaveScreen';

interface ResultScreenProps {
  imageUri: string;
  onBackToHome: () => void;
  onRetake: () => void;
}

interface DetectionResult {
  label: string;
  confidence: number;
  classId: number;
  bbox?: number[];
}

const CLASS_NAMES: Record<number, string> = {
  0: 'bleach_any', 1: 'bleach_oxygen_only', 2: 'do_not_bleach',
  3: 'do_not_dry_clean', 4: 'do_not_iron', 5: 'do_not_tumble_dry',
  6: 'do_not_wash', 7: 'do_not_wet_clean', 8: 'drip_flat_dry',
  9: 'drip_flat_dry_shade', 10: 'drip_line_dry', 11: 'drip_line_dry_shade',
  12: 'dry_clean_hc_mild', 13: 'dry_clean_hc_normal', 14: 'dry_clean_perc_mild',
  15: 'dry_clean_perc_normal', 16: 'flat_dry', 17: 'flat_dry_shade',
  18: 'iron_110c', 19: 'iron_150c', 20: 'iron_200c',
  21: 'line_dry', 22: 'line_dry_shade', 23: 'tumble_dry_mild',
  24: 'tumble_dry_normal', 25: 'wash_by_hand', 26: 'washing_mild_30',
  27: 'washing_mild_40', 28: 'washing_mild_60', 29: 'washing_normal_30',
  30: 'washing_normal_40', 31: 'washing_normal_60', 32: 'washing_normal_95',
  33: 'washing_very_mild_30', 34: 'washing_very_mild_40',
  35: 'wet_clean_mild', 36: 'wet_clean_normal', 37: 'wet_clean_very_mild',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const MODEL_INPUT_SIZE = 640;
const ANALYSIS_IMG_SIZE = SCREEN_WIDTH - Spacing.lg * 2;
const BBOX_PALETTE = Colors.bboxPalette;

export default function ResultScreen({
  imageUri,
  onBackToHome,
  onRetake,
}: ResultScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [resizedUri, setResizedUri] = useState<string | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [tab, setTab] = useState<'result' | 'analysis'>('result');
  const [showSave, setShowSave] = useState(false);

  // ── 추론 파이프라인 (마운트 시 1회) ──
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        try {
          await NativeLaundryYOLO.loadModel();
        } catch (e) {
          console.warn('Model load warning:', e);
        }

        const resized = await ImageProcessingService.resizeImageTo640x640(imageUri);
        setResizedUri(resized.uri);

        const t0 = Date.now();
        const out = await NativeLaundryYOLO.detect(resized.uri);
        setInferenceMs(out.inferenceTime || Date.now() - t0);

        const mapped: DetectionResult[] = out.detections.map((d: Detection) => ({
          label: CLASS_NAMES[d.classId] || `class_${d.classId}`,
          confidence: d.confidence,
          classId: d.classId,
          bbox: d.bbox,
        }));
        setDetections(mapped);
      } catch (e: any) {
        console.error('Inference error:', e);
        setError(e.message || '분석에 실패했어요');
      } finally {
        setLoading(false);
      }
    })();
  }, [imageUri]);

  const labels = useMemo(() => detections.map(d => d.label), [detections]);
  const caseType: CaseType = useMemo(() => classifyCase(labels), [labels]);

  const handleSave = () => setShowSave(true);

  // ── 로딩 ──
  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <Header onBack={onBackToHome} />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.ctaGreen} />
          <Text style={s.loadingText}>세탁 기호를 분석하고 있어요</Text>
          <Text style={s.loadingSub}>잠시만 기다려 주세요</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── 에러 / 검출 없음 ──
  if (error || detections.length === 0) {
    return (
      <SafeAreaView style={s.root}>
        <Header onBack={onBackToHome} />
        <View style={s.loadingWrap}>
          <Text style={s.emptyEmoji}>🤔</Text>
          <Text style={s.loadingText}>
            {error || '세탁 기호를 찾지 못했어요'}
          </Text>
          <Text style={s.loadingSub}>다시 촬영해 주세요</Text>
          <TouchableOpacity style={s.retakeBtn} onPress={onRetake} activeOpacity={0.85}>
            <Text style={s.retakeBtnText}>다시 촬영</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 저장 모달 ──
  if (showSave) {
    return <SaveScreen labels={labels} onClose={() => setShowSave(false)} />;
  }

  // ── 정상 결과 ──
  return (
    <SafeAreaView style={s.root}>
      <Header onBack={onBackToHome} />

      {/* 탭 바 */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, tab === 'result' && s.tabActive]}
          onPress={() => setTab('result')}
          activeOpacity={0.7}>
          <Text style={[s.tabText, tab === 'result' && s.tabTextActive]}>결과</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'analysis' && s.tabActive]}
          onPress={() => setTab('analysis')}
          activeOpacity={0.7}>
          <Text style={[s.tabText, tab === 'analysis' && s.tabTextActive]}>
            분석 ({detections.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'result' ? (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
          {caseType === 'C0' && <Case0View />}
          {caseType === 'C1' && <Case1View labels={labels} />}
          {caseType === 'C2' && <Case2View labels={labels} />}
          {caseType === 'C3' && <Case3View labels={labels} />}

          <TouchableOpacity style={s.saveBtn} activeOpacity={0.85} onPress={handleSave}>
            <Text style={s.saveBtnIcon}>🔖</Text>
            <Text style={s.saveBtnText}>옷장에 저장</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <AnalysisView
          imgUri={resizedUri || imageUri}
          detections={detections}
          inferenceMs={inferenceMs}
          onRetake={onRetake}
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════
function Header({onBack}: {onBack: () => void}) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.6}>
        <Text style={s.backBtnText}>‹</Text>
      </TouchableOpacity>
      <Text style={s.headerTitle}>인식 결과</Text>
      <View style={s.backBtn} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// 케이스 0 · 못 빨아요
// ═══════════════════════════════════════════════════════════
function Case0View() {
  const c = buildCase0();
  return (
    <>
      <View style={[s.diagCard, {backgroundColor: Colors.case0.bg}]}>
        <Text style={s.diagIcon}>✕</Text>
        <Text style={[s.diagLabel, {color: Colors.case0.text}]}>진단 결과</Text>
        <Text style={[s.diagTitle, {color: Colors.case0.text}]}>{c.diagnostic}</Text>
        <Text style={[s.diagSub, {color: Colors.case0.text}]}>{c.subline}</Text>
      </View>

      <Section title={c.reasonTitle}>
        <Text style={s.bodyText}>{c.reasonBody}</Text>
      </Section>

      <Section title={c.stepsTitle}>
        {c.steps.map((st, i) => (
          <StepRow key={i} num={i + 1} title={st.title} body={st.body} />
        ))}
      </Section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 케이스 1 · 집에서
// ═══════════════════════════════════════════════════════════
function Case1View({labels}: {labels: string[]}) {
  const c = buildCase1(labels);
  return (
    <>
      <View style={[s.diagCard, {backgroundColor: Colors.case1.bgFrom}]}>
        <Text style={s.diagIcon}>⌂</Text>
        <Text style={[s.diagLabel, {color: Colors.case1.text}]}>진단 결과</Text>
        <Text style={[s.diagTitle, {color: Colors.case1.text}]}>{c.diagnostic}</Text>
        <Text style={[s.diagSub, {color: Colors.case1.text}]}>{c.subline}</Text>
      </View>

      <Section title={c.stepsTitle}>
        {c.steps.map((st, i) => (
          <StepRow
            key={i}
            num={i + 1}
            title={st.title}
            body={st.body}
            highlight={st.highlight === 'red'}
          />
        ))}
      </Section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 케이스 2 · 세탁소만
// ═══════════════════════════════════════════════════════════
function Case2View({labels}: {labels: string[]}) {
  const c = buildCase2(labels);
  return (
    <>
      <View style={[s.diagCard, {backgroundColor: Colors.case2.bg}]}>
        <Text style={[s.diagIcon, {color: Colors.case2.text}]}>⌂</Text>
        <Text style={[s.diagLabel, {color: Colors.case2.text, opacity: 0.85}]}>진단 결과</Text>
        <Text style={[s.diagTitle, {color: Colors.case2.text}]}>{c.diagnostic}</Text>
        <Text style={[s.diagSub, {color: Colors.case2.text, opacity: 0.9}]}>{c.subline}</Text>
      </View>

      {/* 경고 박스 */}
      <View style={s.warnBox}>
        <Text style={s.warnTitle}>{c.forbidTitle}</Text>
        {c.forbids.map((f, i) => (
          <Text key={i} style={s.warnItem}>• {f}</Text>
        ))}
      </View>

      <LaundryGuideCard
        title={c.guideTitle}
        steps={c.guideSteps}
        cost={c.estCost}
        time={c.estTime}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 케이스 3 · 세탁 자유 (탭 전환)
// ═══════════════════════════════════════════════════════════
function Case3View({labels}: {labels: string[]}) {
  const c = buildCase3(labels);
  const [method, setMethod] = useState<1 | 2>(1);

  return (
    <>
      <View style={[s.diagCard, {backgroundColor: Colors.case3.bgFrom}]}>
        <Text style={[s.diagIcon, {color: Colors.case3.text}]}>⇄</Text>
        <Text style={[s.diagLabel, {color: Colors.case3.text}]}>진단 결과</Text>
        <Text style={[s.diagTitle, {color: Colors.case3.text}]}>{c.diagnostic}</Text>
        <Text style={[s.diagSub, {color: Colors.case3.text}]}>{c.subline}</Text>

        {/* 방법 1 / 방법 2 토글 */}
        <View style={s.methodToggle}>
          <TouchableOpacity
            style={[s.methodPill, method === 1 && s.methodPillActive]}
            onPress={() => setMethod(1)}
            activeOpacity={0.7}>
            <Text style={s.methodNum}>방법 1</Text>
            <Text style={s.methodLabel}>집에서 빨기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.methodPill, method === 2 && s.methodPillActive]}
            onPress={() => setMethod(2)}
            activeOpacity={0.7}>
            <Text style={s.methodNum}>방법 2</Text>
            <Text style={s.methodLabel}>세탁소에 맡기기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {method === 1 ? (
        <Section title={c.tabHome.stepsTitle}>
          {c.tabHome.steps.map((st, i) => (
            <StepRow
              key={i}
              num={i + 1}
              title={st.title}
              body={st.body}
              highlight={st.highlight === 'red'}
            />
          ))}
        </Section>
      ) : (
        <LaundryGuideCard
          title={c.tabLaundry.guideTitle}
          steps={c.tabLaundry.guideSteps}
          cost={c.tabLaundry.estCost}
          time={c.tabLaundry.estTime}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 분석 탭 (이전 ModelDebugScreen 내용)
// ═══════════════════════════════════════════════════════════
function AnalysisView({
  imgUri,
  detections,
  inferenceMs,
  onRetake,
}: {
  imgUri: string;
  detections: DetectionResult[];
  inferenceMs: number | null;
  onRetake: () => void;
}) {
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
      <View style={s.analysisImgBox}>
        <Image source={{uri: imgUri}} style={s.analysisImg} resizeMode="contain" />
        {detections.map((d, i) => {
          if (!d.bbox || d.bbox.length < 4) return null;
          const scale = ANALYSIS_IMG_SIZE / MODEL_INPUT_SIZE;
          const x = d.bbox[0] * scale;
          const y = d.bbox[1] * scale;
          const w = (d.bbox[2] - d.bbox[0]) * scale;
          const h = (d.bbox[3] - d.bbox[1]) * scale;
          const color = BBOX_PALETTE[d.classId % BBOX_PALETTE.length];
          return (
            <React.Fragment key={i}>
              <View style={[s.bbox, {left: x, top: y, width: w, height: h, borderColor: color}]} />
              <View style={[s.bboxTag, {left: x, top: Math.max(0, y - 18), backgroundColor: color}]}>
                <Text style={s.bboxTagText}>{d.label}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <View style={s.analysisMeta}>
        <Text style={s.analysisMetaItem}>
          기호 <Text style={s.analysisMetaStrong}>{detections.length}개</Text> 인식
        </Text>
        {inferenceMs !== null && (
          <Text style={s.analysisMetaItem}>
            추론 <Text style={s.analysisMetaStrong}>{inferenceMs}ms</Text>
          </Text>
        )}
      </View>

      <Section title="검출된 기호">
        {detections.map((d, i) => (
          <View key={i} style={s.detRow}>
            <View style={[s.detDot, {backgroundColor: BBOX_PALETTE[d.classId % BBOX_PALETTE.length]}]} />
            <Text style={s.detLabel}>{d.label}</Text>
            <Text style={s.detConf}>{(d.confidence * 100).toFixed(1)}%</Text>
          </View>
        ))}
      </Section>

      <TouchableOpacity style={s.retakeBtnAlt} onPress={onRetake} activeOpacity={0.85}>
        <Text style={s.retakeBtnAltText}>다시 촬영</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════
// 공통 컴포넌트
// ═══════════════════════════════════════════════════════════
function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionMark}>≡</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StepRow({
  num,
  title,
  body,
  highlight,
}: {
  num: number;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <View style={s.stepRow}>
      <View style={s.stepNum}>
        <Text style={s.stepNumText}>{num}</Text>
      </View>
      <View style={s.stepText}>
        <Text style={[s.stepTitle, highlight && s.stepTitleHi]}>{title}</Text>
        {body ? <Text style={[s.stepBody, highlight && s.stepBodyHi]}>{body}</Text> : null}
      </View>
    </View>
  );
}

function LaundryGuideCard({
  title,
  steps,
  cost,
  time,
}: {
  title: string;
  steps: Case2Content['guideSteps'];
  cost: string;
  time: string;
}) {
  return (
    <>
      <Section title={title}>
        {steps.map((st, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>{i + 1}</Text>
            </View>
            <View style={s.stepText}>
              <Text style={s.stepTitle}>{st.title}</Text>
              {st.body ? <Text style={s.stepBody}>{st.body}</Text> : null}
              {st.quote && (
                <View style={s.quoteBox}>
                  <Text style={s.quoteText}>"{st.quote}"</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </Section>

      <View style={s.estBox}>
        <View style={s.estCol}>
          <Text style={s.estLabel}>예상 비용</Text>
          <Text style={s.estValue}>{cost}</Text>
        </View>
        <View style={s.estDivider} />
        <View style={s.estCol}>
          <Text style={s.estLabel}>소요 기간</Text>
          <Text style={s.estValue}>{time}</Text>
        </View>
      </View>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 스타일
// ═══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg},

  // 헤더
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  backBtnText: {fontSize: 28, color: Colors.textPrimary, marginTop: -4},
  headerTitle: {...Typography.titleMd, color: Colors.textPrimary},

  // 탭 바
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: Colors.textPrimary},
  tabText: {...Typography.body, color: Colors.textMuted, fontWeight: '600'},
  tabTextActive: {color: Colors.textPrimary, fontWeight: '700'},

  scroll: {flex: 1},
  scrollInner: {padding: Spacing.lg, paddingBottom: Spacing.xxl},

  // ── 로딩 / 에러 ──
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    ...Typography.titleMd,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
  },
  loadingSub: {
    ...Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  emptyEmoji: {fontSize: 56, marginBottom: Spacing.sm},
  retakeBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.ctaBlack,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  retakeBtnText: {color: Colors.surface, ...Typography.button},

  // ── 진단 카드 ──
  diagCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  diagIcon: {fontSize: 26, color: Colors.textPrimary, marginBottom: 6},
  diagLabel: {
    ...Typography.bodyBold,
    fontSize: 15,
    marginBottom: 6,
  },
  diagTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  diagSub: {
    ...Typography.body,
    fontSize: 13,
  },

  // ── 경고 박스 (case 2) ──
  warnBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  warnTitle: {
    ...Typography.bodyBold,
    color: Colors.warningText,
    marginBottom: 6,
  },
  warnItem: {
    ...Typography.body,
    color: Colors.warningText,
    marginBottom: 2,
  },

  // ── 방법 토글 (case 3) ──
  methodToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  methodPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: Radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
  },
  methodPillActive: {
    backgroundColor: Colors.case3.textSub,
  },
  methodNum: {fontSize: 10, fontWeight: '700', color: Colors.case3.text},
  methodLabel: {fontSize: 12, fontWeight: '700', color: Colors.case3.text},

  // ── 섹션 ──
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionMark: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginRight: 6,
  },
  sectionTitle: {...Typography.bodyBold, color: Colors.textPrimary},

  bodyText: {...Typography.body, color: Colors.textSecondary},

  // ── 단계 ──
  stepRow: {flexDirection: 'row', marginBottom: Spacing.sm},
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.case1.bgTo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.case1.text,
  },
  stepText: {flex: 1},
  stepTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  stepBody: {...Typography.caption, color: Colors.textSecondary, marginTop: 2},
  stepTitleHi: {color: Colors.warningStrong},
  stepBodyHi: {color: Colors.warningStrong},

  // ── 인용구 (case 2) ──
  quoteBox: {
    backgroundColor: Colors.chipPro.bg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: 6,
    alignItems: 'center',
  },
  quoteText: {
    ...Typography.bodyBold,
    color: Colors.chipPro.text,
    fontSize: 13,
  },

  // ── 비용/시간 ──
  estBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  estCol: {flex: 1},
  estDivider: {width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.sm},
  estLabel: {...Typography.caption, color: Colors.textMuted, marginBottom: 4},
  estValue: {...Typography.bodyBold, color: Colors.textPrimary},

  // ── 저장 버튼 ──
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.ctaBlack,
    borderRadius: Radius.pill,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  saveBtnIcon: {fontSize: 18, color: Colors.surface, marginRight: 8},
  saveBtnText: {...Typography.button, color: Colors.surface},

  // ── 분석 탭 ──
  analysisImgBox: {
    width: ANALYSIS_IMG_SIZE,
    height: ANALYSIS_IMG_SIZE,
    backgroundColor: '#000',
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  analysisImg: {width: '100%', height: '100%'},
  bbox: {position: 'absolute', borderWidth: 2},
  bboxTag: {
    position: 'absolute',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  bboxTagText: {color: '#fff', fontSize: 10, fontWeight: '700'},

  analysisMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  analysisMetaItem: {...Typography.caption, color: Colors.textMuted},
  analysisMetaStrong: {color: Colors.textPrimary, fontWeight: '700'},

  detRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detDot: {width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm},
  detLabel: {flex: 1, ...Typography.body, color: Colors.textPrimary, fontSize: 13},
  detConf: {...Typography.bodyBold, color: Colors.ctaGreen},

  retakeBtnAlt: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
  },
  retakeBtnAltText: {...Typography.button, color: Colors.textPrimary},
});
