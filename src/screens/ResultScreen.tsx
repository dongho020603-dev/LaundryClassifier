import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {SYMBOLS, CATEGORY_ORDER, CATEGORY_LABEL} from '../data/laundrySymbolData';
import {
  categorize,
  countByStatus,
  mainSubBody,
  sortedForDisplay,
  buildSteps,
  detectWarnings,
  proCareBanners,
  statusToState,
  getOverallState,
  STATE_COLORS,
  StateType,
} from '../data/laundryLogic';

interface DetectionResult {
  label: string;
  confidence: number;
  classId: number;
}

interface ResultScreenProps {
  imageUri: string;
  detections: DetectionResult[];
  onBackToHome: () => void;
  onRetake: () => void;
}

export default function ResultScreen({
  detections,
  onBackToHome,
  onRetake,
}: ResultScreenProps) {
  const [view, setView] = useState<'summary' | 'detail'>('summary');

  const labels = useMemo(
    () => detections.map(d => d.label).filter(l => SYMBOLS[l]),
    [detections],
  );

  const counts = useMemo(() => countByStatus(labels), [labels]);
  const msb = useMemo(() => mainSubBody(labels), [labels]);
  const {grouped} = useMemo(() => categorize(labels), [labels]);
  const overallState = useMemo(() => getOverallState(counts), [counts]);
  const sortedLabels = useMemo(() => sortedForDisplay(labels), [labels]);
  const steps = useMemo(() => buildSteps(labels), [labels]);
  const warnings = useMemo(() => detectWarnings(labels), [labels]);
  const banners = useMemo(() => proCareBanners(labels), [labels]);

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  if (view === 'detail') {
    return (
      <SafeAreaView style={s.container}>
        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setView('summary')} style={s.backArrow}>
            <Text style={s.backArrowText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>상세 가이드</Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
          {/* 카운트 서브헤더 */}
          <View style={s.countRow}>
            {counts['금지'] > 0 && (
              <View style={[s.countBadge, {backgroundColor: STATE_COLORS.forbidden.bg}]}>
                <Text style={[s.countText, {color: STATE_COLORS.forbidden.border}]}>
                  금지 {counts['금지']}
                </Text>
              </View>
            )}
            {counts['주의'] > 0 && (
              <View style={[s.countBadge, {backgroundColor: STATE_COLORS.caution.bg}]}>
                <Text style={[s.countText, {color: STATE_COLORS.caution.border}]}>
                  주의 {counts['주의']}
                </Text>
              </View>
            )}
            {counts['안전'] > 0 && (
              <View style={[s.countBadge, {backgroundColor: STATE_COLORS.safe.bg}]}>
                <Text style={[s.countText, {color: STATE_COLORS.safe.border}]}>
                  안전 {counts['안전']}
                </Text>
              </View>
            )}
            {counts['전문케어'] > 0 && (
              <View style={[s.countBadge, {backgroundColor: STATE_COLORS.pro.bg}]}>
                <Text style={[s.countText, {color: STATE_COLORS.pro.border}]}>
                  전문케어 {counts['전문케어']}
                </Text>
              </View>
            )}
          </View>

          {/* 세탁 항목 리스트 */}
          <Text style={s.sectionTitle}>세탁 항목</Text>
          {sortedLabels.map((label, idx) => {
            const sym = SYMBOLS[label];
            const state = statusToState(sym.status, sym.isPro);
            const colors = STATE_COLORS[state];
            const catLabel = CATEGORY_LABEL[sym.category] || sym.category;
            return (
              <View key={idx} style={[s.itemCard, {borderLeftColor: colors.border}]}>
                <View style={s.itemHeader}>
                  <Text style={s.itemCat}>{catLabel}</Text>
                  <View style={[s.tagPill, {backgroundColor: colors.bg}]}>
                    <Text style={[s.tagText, {color: colors.border}]}>{colors.tag}</Text>
                  </View>
                </View>
                <Text style={s.itemTitle}>{sym.card}</Text>
                <Text style={s.itemBody}>{sym.interp}</Text>
                {sym.recommend && (
                  <Text style={s.itemRecommend}>{sym.recommend}</Text>
                )}
                {sym.warning && (
                  <Text style={[s.itemWarning, {color: colors.border}]}>{sym.warning}</Text>
                )}
              </View>
            );
          })}

          {/* 주의 조합 경고 */}
          {warnings.length > 0 && (
            <>
              <Text style={s.sectionTitle}>주의 사항</Text>
              {warnings.map((w, idx) => {
                const sevColor = w.severity === '심각도 높음'
                  ? STATE_COLORS.forbidden.border
                  : w.severity === '심각도 중간'
                    ? STATE_COLORS.caution.border
                    : '#6b7280';
                return (
                  <View key={idx} style={[s.warnCard, {borderLeftColor: sevColor}]}>
                    <View style={s.warnHeader}>
                      <Text style={[s.warnTitle, {color: sevColor}]}>
                        조합 {w.code} · {w.title}
                      </Text>
                      <Text style={[s.warnSev, {color: sevColor}]}>{w.severity}</Text>
                    </View>
                    <Text style={s.warnBody}>{w.body}</Text>
                  </View>
                );
              })}
            </>
          )}

          {/* 전문 케어 안내 */}
          {banners.length > 0 && (
            <>
              <Text style={s.sectionTitle}>전문 케어 안내</Text>
              {banners.map((b, idx) => (
                <View key={idx} style={[s.proCard, {borderLeftColor: STATE_COLORS.pro.border}]}>
                  <Text style={s.proSubTitle}>{b.subTitle}</Text>
                  <Text style={s.proBody}>{b.body}</Text>
                  <Text style={s.proCards}>{b.cards.join(', ')}</Text>
                </View>
              ))}
            </>
          )}

          {/* 추천 세탁 순서 */}
          {steps.length > 0 && (
            <>
              <Text style={s.sectionTitle}>이렇게 빨아주세요</Text>
              {steps.map((step, idx) => (
                <View key={idx} style={s.stepRow}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{idx + 1}</Text>
                  </View>
                  <View style={s.stepContent}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepBody}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* 하단 버튼 */}
          <View style={s.footerButtons}>
            <TouchableOpacity style={s.btnSecondary} onPress={onRetake}>
              <Text style={s.btnSecondaryText}>다시 찍기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnPrimary} onPress={onBackToHome}>
              <Text style={s.btnPrimaryText}>홈으로</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 화면 1: 결과 요약 ──
  const overallColors = STATE_COLORS[overallState];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        {/* 상단 분석 결과 */}
        <Text style={s.dimLabel}>분석 결과</Text>

        <Text style={s.mainMent}>{msb.main}</Text>

        <Text style={s.dateInfo}>
          {today} · 기호 {labels.length}개 인식
        </Text>

        {/* 상태 뱃지 */}
        {counts['금지'] > 0 && (
          <View style={[s.statusBadge, {backgroundColor: STATE_COLORS.forbidden.bg}]}>
            <View style={[s.statusDot, {backgroundColor: STATE_COLORS.forbidden.border}]} />
            <Text style={[s.statusBadgeText, {color: STATE_COLORS.forbidden.border}]}>
              금지 {counts['금지']}
            </Text>
          </View>
        )}
        {counts['금지'] === 0 && counts['주의'] > 0 && (
          <View style={[s.statusBadge, {backgroundColor: STATE_COLORS.caution.bg}]}>
            <View style={[s.statusDot, {backgroundColor: STATE_COLORS.caution.border}]} />
            <Text style={[s.statusBadgeText, {color: STATE_COLORS.caution.border}]}>
              주의 {counts['주의']}
            </Text>
          </View>
        )}

        {/* 서브 메시지 박스 */}
        <View style={[s.msgBox, {borderLeftColor: overallColors.border}]}>
          <Text style={s.msgBoxTitle}>{msb.sub}</Text>
          <Text style={s.msgBoxBody}>{msb.body}</Text>
        </View>

        {/* 4 카드 그리드: 물세탁 / 표백 / 건조 / 다림질 */}
        <View style={s.cardGrid}>
          {(['세탁', '표백', '건조', '다림질'] as const).map(cat => {
            const catLabel = CATEGORY_LABEL[cat];
            const items = grouped[cat] || [];
            let chosen: string | null = null;
            let state: StateType = 'safe';

            if (items.length > 0) {
              const sorted = [...items].sort(
                (a, b) =>
                  (SYMBOLS[a] ? ({'금지': 0, '주의': 1, '안전': 2} as any)[SYMBOLS[a].status] : 9) -
                  (SYMBOLS[b] ? ({'금지': 0, '주의': 1, '안전': 2} as any)[SYMBOLS[b].status] : 9),
              );
              chosen = sorted[0];
              const sym = SYMBOLS[chosen];
              state = statusToState(sym.status, sym.isPro);
            }

            const colors = STATE_COLORS[state];
            const sym = chosen ? SYMBOLS[chosen] : null;

            return (
              <View key={cat} style={[s.categoryCard, {backgroundColor: colors.bg}]}>
                <View style={[s.cardDot, {backgroundColor: colors.border}]} />
                <Text style={s.cardCatLabel}>{catLabel}</Text>
                <Text style={[s.cardValue, {color: colors.border}]}>
                  {sym ? sym.value : '정보 없음'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 전문 케어 배너 */}
        {banners.map((b, idx) => (
          <View key={idx} style={s.proBanner}>
            <Text style={s.proBannerSub}>{b.subTitle}</Text>
            <Text style={s.proBannerBody}>{b.body}</Text>
          </View>
        ))}

        {/* 하단 버튼 */}
        <View style={s.footerButtons}>
          <TouchableOpacity style={s.btnSecondary} onPress={onRetake}>
            <Text style={s.btnSecondaryText}>다시 찍기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => setView('detail')}>
            <Text style={s.btnPrimaryText}>상세 보기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fafafa'},
  scroll: {flex: 1},
  scrollInner: {padding: 22, paddingBottom: 40},

  // 헤더 (상세)
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backArrow: {paddingRight: 12},
  backArrowText: {fontSize: 22, color: '#333', fontWeight: '600'},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#1a1614', letterSpacing: -0.3},

  // 요약 상단
  dimLabel: {fontSize: 13, color: '#999', marginBottom: 6},
  mainMent: {fontSize: 26, fontWeight: '800', color: '#1a1614', letterSpacing: -0.5, marginBottom: 6},
  dateInfo: {fontSize: 12, color: '#999', marginBottom: 14},

  statusBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 16,
  },
  statusDot: {width: 8, height: 8, borderRadius: 4, marginRight: 6},
  statusBadgeText: {fontSize: 13, fontWeight: '600'},

  // 서브 메시지 박스
  msgBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18,
    borderLeftWidth: 4, marginBottom: 20,
    elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08, shadowRadius: 2,
  },
  msgBoxTitle: {fontSize: 15, fontWeight: '700', color: '#1a1614', marginBottom: 6},
  msgBoxBody: {fontSize: 13, color: '#555', lineHeight: 20},

  // 4 카드 그리드
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginBottom: 18,
  },
  categoryCard: {
    width: '48%' as any, borderRadius: 14, padding: 16, minHeight: 100,
    flexGrow: 1, flexBasis: '46%',
  },
  cardDot: {width: 10, height: 10, borderRadius: 5, marginBottom: 12, alignSelf: 'flex-end'},
  cardCatLabel: {fontSize: 12, color: '#777', marginBottom: 4},
  cardValue: {fontSize: 15, fontWeight: '700'},

  // 전문케어 배너
  proBanner: {
    backgroundColor: '#2e4a73', borderRadius: 14, padding: 18, marginBottom: 18,
  },
  proBannerSub: {fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6},
  proBannerBody: {fontSize: 13, color: '#cdd8e6', lineHeight: 20},

  // 하단 버튼
  footerButtons: {flexDirection: 'row', gap: 12, marginTop: 10},
  btnSecondary: {
    flex: 1, paddingVertical: 16, borderRadius: 12,
    borderWidth: 2, borderColor: '#7C3AED', alignItems: 'center',
  },
  btnSecondaryText: {color: '#7C3AED', fontSize: 15, fontWeight: '600'},
  btnPrimary: {
    flex: 1, paddingVertical: 16, borderRadius: 12,
    backgroundColor: '#7C3AED', alignItems: 'center',
  },
  btnPrimaryText: {color: '#fff', fontSize: 15, fontWeight: '600'},

  // ── 상세 가이드 ──
  countRow: {flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap'},
  countBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
  countText: {fontSize: 12, fontWeight: '600'},

  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: '#1a1614',
    marginBottom: 12, marginTop: 8, letterSpacing: -0.3,
  },

  // 항목 카드
  itemCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 10, borderLeftWidth: 4,
    elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  itemHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  itemCat: {fontSize: 12, color: '#999'},
  tagPill: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999},
  tagText: {fontSize: 11, fontWeight: '600'},
  itemTitle: {fontSize: 15, fontWeight: '700', color: '#1a1614', marginBottom: 6},
  itemBody: {fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 4},
  itemRecommend: {fontSize: 13, color: '#333', lineHeight: 20, marginBottom: 4},
  itemWarning: {fontSize: 13, fontWeight: '500', lineHeight: 20},

  // 주의 조합
  warnCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 10, borderLeftWidth: 4,
    elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  warnHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  warnTitle: {fontSize: 14, fontWeight: '700', flex: 1},
  warnSev: {fontSize: 11, fontWeight: '600'},
  warnBody: {fontSize: 13, color: '#555', lineHeight: 20},

  // 전문 케어 카드 (상세)
  proCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 10, borderLeftWidth: 4,
    elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  proSubTitle: {fontSize: 15, fontWeight: '700', color: '#2e4a73', marginBottom: 6},
  proBody: {fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 4},
  proCards: {fontSize: 12, color: '#999'},

  // 추천 세탁 순서
  stepRow: {flexDirection: 'row', marginBottom: 14},
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2d8d6f', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginTop: 2,
  },
  stepNumText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  stepContent: {flex: 1},
  stepTitle: {fontSize: 14, fontWeight: '700', color: '#1a1614', marginBottom: 4},
  stepBody: {fontSize: 13, color: '#555', lineHeight: 20},
});
