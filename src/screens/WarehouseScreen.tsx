import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import {Colors, Radius, Spacing, Typography} from '../theme/tokens';

interface WarehouseScreenProps {
  onBack: () => void;
}

type Pill = 'c1' | 'c2' | 'c3' | 'c0';
type ChipStatus = 'safe' | 'caution' | 'forbidden' | 'pro';

interface Cloth {
  name: string;
  thumb: string;
  pill: Pill;
  quote?: string;
  chips?: {text: string; status: ChipStatus}[];
  tags: string[];
}

interface Group {
  label: string;
  icon: string;
  iconBg: string;
  pill: Pill;
  items: Cloth[];
}

// ── Mock 데이터 (나중에 AsyncStorage로 교체) ──
const MOCK_GROUPS: Group[] = [
  {
    label: '세탁소에 맡길 옷',
    icon: '🏪',
    iconBg: Colors.caseIcon2,
    pill: 'c2',
    items: [
      {name: '작년에 산 청바지', thumb: '👖', pill: 'c2', quote: '"드라이클리닝 해주세요"', tags: ['pro_dry']},
      {name: '3년 전에 산 청바지', thumb: '👖', pill: 'c2', quote: '"섬세 드라이클리닝으로 약하게 해주세요"', tags: ['pro_dry_mild']},
    ],
  },
  {
    label: '세탁 자유',
    icon: '⇄',
    iconBg: Colors.caseIcon3,
    pill: 'c3',
    items: [
      {
        name: '니트 스웨터', thumb: '🧥', pill: 'c3',
        tags: ['wash_hand', 'bleach_no', 'nat_flat', 'pro_dry_mild'],
        chips: [
          {text: '손빨래', status: 'caution'},
          {text: '표백 금지', status: 'forbidden'},
          {text: '눕혀', status: 'caution'},
          {text: '약하게', status: 'pro'},
        ],
      },
      {
        name: '캐시미어 가디건', thumb: '🧥', pill: 'c3',
        tags: ['wash_30', 'bleach_no', 'nat_line', 'pro_dry'],
        chips: [
          {text: '30°C', status: 'caution'},
          {text: '표백 금지', status: 'forbidden'},
          {text: '걸기', status: 'caution'},
          {text: '드라이', status: 'pro'},
        ],
      },
      {
        name: '정장 셔츠', thumb: '👔', pill: 'c3',
        tags: ['wash_40', 'bleach_any', 'nat_line', 'pro_dry'],
        chips: [
          {text: '40°C', status: 'safe'},
          {text: '표백', status: 'safe'},
          {text: '걸기', status: 'caution'},
          {text: '드라이', status: 'pro'},
        ],
      },
    ],
  },
  {
    label: '집에서 빨 옷',
    icon: '⌂',
    iconBg: Colors.caseIcon1,
    pill: 'c1',
    items: [
      {
        name: '면 티셔츠', thumb: '👕', pill: 'c1',
        tags: ['wash_60', 'bleach_any', 'tumble_yes', 'iron_200'],
        chips: [
          {text: '60°C', status: 'safe'},
          {text: '표백', status: 'safe'},
          {text: '건조기', status: 'safe'},
          {text: '●●● 200°', status: 'safe'},
        ],
      },
      {
        name: '데일리 후드티', thumb: '👕', pill: 'c1',
        tags: ['wash_30', 'bleach_any', 'tumble_yes', 'iron_150'],
        chips: [
          {text: '30°C', status: 'caution'},
          {text: '표백', status: 'safe'},
          {text: '건조기', status: 'safe'},
          {text: '●● 150°', status: 'safe'},
        ],
      },
      {
        name: '양말 묶음', thumb: '🧦', pill: 'c1',
        tags: ['wash_60', 'bleach_any', 'tumble_yes', 'iron_no'],
        chips: [
          {text: '60°C', status: 'safe'},
          {text: '표백', status: 'safe'},
          {text: '건조기', status: 'safe'},
          {text: '다림질 금지', status: 'forbidden'},
        ],
      },
    ],
  },
];

const COUNTERS: {label: string; count: number; pill: Pill}[] = [
  {label: '집에서', count: 7, pill: 'c1'},
  {label: '세탁 자유', count: 3, pill: 'c3'},
  {label: '세탁소', count: 2, pill: 'c2'},
  {label: '못 빨아요', count: 0, pill: 'c0'},
];

const FILTERS = ['전체', '함께 빨기', '주의 필요'];

// ── 세부 필터 카테고리 ──
type FilterCategory = 'wash' | 'bleach' | 'dry' | 'iron' | 'pro';

const FILTER_DEFS: {key: FilterCategory; title: string; tags: {id: string; label: string}[]}[] = [
  {
    key: 'wash',
    title: '물세탁',
    tags: [
      {id: 'wash_95', label: '95°C'},
      {id: 'wash_60', label: '60°C'},
      {id: 'wash_40', label: '40°C'},
      {id: 'wash_30', label: '30°C'},
      {id: 'wash_hand', label: '손빨래'},
      {id: 'wash_no', label: '금지'},
    ],
  },
  {
    key: 'bleach',
    title: '표백',
    tags: [
      {id: 'bleach_any', label: '표백 OK'},
      {id: 'bleach_oxygen', label: '산소계만'},
      {id: 'bleach_no', label: '금지'},
    ],
  },
  {
    key: 'dry',
    title: '건조',
    tags: [
      {id: 'tumble_yes', label: '건조기 OK'},
      {id: 'tumble_no', label: '건조기 금지'},
      {id: 'nat_line', label: '걸기'},
      {id: 'nat_flat', label: '눕혀'},
      {id: 'nat_shade', label: '그늘'},
    ],
  },
  {
    key: 'iron',
    title: '다림질',
    tags: [
      {id: 'iron_200', label: '●●● 200°'},
      {id: 'iron_150', label: '●● 150°'},
      {id: 'iron_110', label: '● 110°'},
      {id: 'iron_no', label: '금지'},
    ],
  },
  {
    key: 'pro',
    title: '전문 케어',
    tags: [
      {id: 'pro_dry', label: '드라이'},
      {id: 'pro_dry_mild', label: '드라이 약하게'},
      {id: 'pro_wet', label: '웨트'},
      {id: 'pro_no', label: '금지'},
    ],
  },
];

// 같은 카테고리 = OR, 카테고리 간 = AND
function matchesFilters(itemTags: string[], active: Set<string>): boolean {
  if (active.size === 0) return true;
  for (const cat of FILTER_DEFS) {
    const catActive = cat.tags.map(t => t.id).filter(id => active.has(id));
    if (catActive.length === 0) continue;
    if (!catActive.some(id => itemTags.includes(id))) return false;
  }
  return true;
}

export default function WarehouseScreen({onBack}: WarehouseScreenProps) {
  const [activeCounter, setActiveCounter] = useState<Pill>('c1');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const total = COUNTERS.reduce((sum, c) => sum + c.count, 0);

  const filteredGroups = useMemo(() => {
    return MOCK_GROUPS
      .map(g => ({...g, items: g.items.filter(it => matchesFilters(it.tags, activeFilters))}))
      .filter(g => g.items.length > 0);
  }, [activeFilters]);

  const toggleFilter = (id: string) => {
    const next = new Set(activeFilters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActiveFilters(next);
  };

  const resetFilters = () => setActiveFilters(new Set());
  const applyFilters = () => setSheetOpen(false);

  const pillStyle = (p: Pill) => {
    switch (p) {
      case 'c1': return Colors.pillCase1;
      case 'c2': return Colors.pillCase2;
      case 'c3': return Colors.pillCase3;
      case 'c0': return Colors.pillCase0;
    }
  };

  const pillText = (p: Pill) => {
    switch (p) {
      case 'c1': return '집에서';
      case 'c2': return '세탁소';
      case 'c3': return '세탁 자유';
      case 'c0': return '못 빨아요';
    }
  };

  const chipColors = (status: ChipStatus) => {
    switch (status) {
      case 'safe':      return Colors.chipSafe;
      case 'caution':   return Colors.chipCaution;
      case 'forbidden': return {bg: '#F2DAD5', text: Colors.warningText};
      case 'pro':       return Colors.chipPro;
    }
  };

  const detailBtnEmpty = activeFilters.size === 0;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.6}>
          <Text style={s.iconBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>내 옷장</Text>
        <Text style={s.headerMeta}>전체 {total}벌</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        {/* 케이스 카운터 */}
        <View style={s.counters}>
          {COUNTERS.map(c => {
            const active = activeCounter === c.pill;
            return (
              <TouchableOpacity
                key={c.pill}
                style={[s.counter, active && s.counterActive]}
                onPress={() => setActiveCounter(c.pill)}
                activeOpacity={0.75}>
                <Text style={[s.counterNum, active && s.counterTextActive]}>{c.count}</Text>
                <Text style={[s.counterLabel, active && s.counterTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 필터 칩 + 세부 필터 버튼 */}
        <View style={s.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtersInner}>
            {FILTERS.map(f => {
              const active = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[s.filter, active && s.filterActive]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.7}>
                  <Text style={[s.filterText, active && s.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[s.detailBtn, detailBtnEmpty && s.detailBtnEmpty]}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.7}>
            <Text style={[s.detailBtnIcon, detailBtnEmpty && s.detailBtnTextEmpty]}>⚙</Text>
            <Text style={[s.detailBtnText, detailBtnEmpty && s.detailBtnTextEmpty]}>세부 필터</Text>
            {!detailBtnEmpty && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{activeFilters.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 그룹별 옷 카드 */}
        {filteredGroups.length === 0 && (
          <Text style={s.emptyState}>조건에 맞는 옷이 없어요</Text>
        )}
        {filteredGroups.map(group => (
          <View key={group.label} style={s.group}>
            <View style={s.groupHeader}>
              <View style={[s.groupIcon, {backgroundColor: group.iconBg}]}>
                <Text style={s.groupIconText}>{group.icon}</Text>
              </View>
              <Text style={s.groupTitle}>
                {group.label} · {group.items.length}벌
              </Text>
            </View>

            {group.items.map((it, idx) => {
              const pc = pillStyle(it.pill);
              return (
                <View key={idx} style={s.card}>
                  <View style={s.cardThumb}>
                    <Text style={s.cardThumbText}>{it.thumb}</Text>
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.cardRow1}>
                      <Text style={s.cardName} numberOfLines={1}>{it.name}</Text>
                      <View style={[s.cardPill, {backgroundColor: pc.bg}]}>
                        <Text style={[s.cardPillText, {color: pc.text}]}>{pillText(it.pill)}</Text>
                      </View>
                    </View>
                    {it.quote && <Text style={s.cardQuote}>{it.quote}</Text>}
                    {it.chips && (
                      <View style={s.cardChips}>
                        {it.chips.map((ch, ci) => {
                          const cc = chipColors(ch.status);
                          return (
                            <View key={ci} style={[s.cardChip, {backgroundColor: cc.bg}]}>
                              <Text style={[s.cardChipText, {color: cc.text}]}>{ch.text}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* ── 세부 필터 바텀시트 ── */}
      <Modal
        visible={sheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetOpen(false)}>
        <TouchableOpacity
          style={s.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSheetOpen(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>세부 필터</Text>
              <TouchableOpacity onPress={() => setSheetOpen(false)} style={s.sheetClose}>
                <Text style={s.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.sheetBody} contentContainerStyle={s.sheetBodyInner}>
              {FILTER_DEFS.map(cat => (
                <View key={cat.key}>
                  <Text style={s.catTitle}>{cat.title}</Text>
                  <View style={s.catChips}>
                    {cat.tags.map(t => {
                      const active = activeFilters.has(t.id);
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[s.fChip, active && s.fChipActive]}
                          onPress={() => toggleFilter(t.id)}
                          activeOpacity={0.7}>
                          <Text style={[s.fChipText, active && s.fChipTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={s.sheetFooter}>
              <TouchableOpacity style={s.sheetReset} onPress={resetFilters} activeOpacity={0.85}>
                <Text style={s.sheetResetText}>초기화</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetApply} onPress={applyFilters} activeOpacity={0.85}>
                <Text style={s.sheetApplyText}>적용</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg},

  header: {
    height: 52,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  iconBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  iconBtnText: {fontSize: 28, color: Colors.textPrimary, marginTop: -4},
  headerTitle: {...Typography.titleMd, color: Colors.textPrimary, marginLeft: 4},
  headerMeta: {...Typography.caption, color: Colors.textMuted, marginLeft: Spacing.sm},

  scroll: {flex: 1},
  scrollInner: {paddingBottom: Spacing.xxl},

  // 카운터
  counters: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  counter: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  counterActive: {backgroundColor: Colors.ctaBlack, borderColor: Colors.ctaBlack},
  counterNum: {fontSize: 18, fontWeight: '800', color: Colors.textSecondary, lineHeight: 22},
  counterLabel: {fontSize: 11, color: Colors.textSecondary, marginTop: 2},
  counterTextActive: {color: Colors.surface},

  // 필터 row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  filtersInner: {gap: 8, paddingRight: 4},
  filter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterActive: {backgroundColor: Colors.ctaBlack, borderColor: Colors.ctaBlack},
  filterText: {fontSize: 12, color: Colors.textSecondary},
  filterTextActive: {color: Colors.surface, fontWeight: '700'},

  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ctaBlack,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    gap: 5,
  },
  detailBtnEmpty: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailBtnIcon: {fontSize: 12, color: Colors.surface, fontWeight: '700'},
  detailBtnText: {fontSize: 12, fontWeight: '700', color: Colors.surface},
  detailBtnTextEmpty: {color: Colors.textPrimary},
  badge: {
    backgroundColor: Colors.ctaGreen,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {fontSize: 10, fontWeight: '700', color: Colors.surface},

  // 빈 상태
  emptyState: {
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
    color: Colors.textMuted,
    fontSize: 13,
  },

  // 그룹
  group: {paddingHorizontal: Spacing.md},
  groupHeader: {flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm + 2, paddingHorizontal: 4},
  groupIcon: {width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 8},
  groupIconText: {fontSize: 11, color: Colors.surface, fontWeight: '700'},
  groupTitle: {fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3},

  // 카드
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardThumb: {width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center'},
  cardThumbText: {fontSize: 26},
  cardBody: {flex: 1, minWidth: 0},
  cardRow1: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6},
  cardName: {flex: 1, ...Typography.bodyBold, color: Colors.textPrimary},
  cardPill: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill, marginLeft: 8},
  cardPillText: {fontSize: 11, fontWeight: '700'},
  cardQuote: {fontSize: 13, color: Colors.case3.text, marginTop: 4},
  cardChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6},
  cardChip: {paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill},
  cardChipText: {fontSize: 11, fontWeight: '600'},

  // ── 시트 ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderStrong,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg + 2,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sheetTitle: {fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: Colors.textPrimary},
  sheetClose: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  sheetCloseText: {fontSize: 18, color: Colors.textSecondary},
  sheetBody: {maxHeight: 460},
  sheetBodyInner: {paddingHorizontal: Spacing.lg + 2, paddingBottom: Spacing.md},

  catTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  catChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  fChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  fChipActive: {backgroundColor: Colors.ctaBlack, borderColor: Colors.ctaBlack},
  fChipText: {fontSize: 12, color: Colors.textPrimary},
  fChipTextActive: {color: Colors.surface, fontWeight: '700'},

  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.lg + 2,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sheetReset: {
    flex: 1,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetResetText: {fontSize: 14, fontWeight: '700', color: Colors.textPrimary},
  sheetApply: {
    flex: 1.4,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ctaBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyText: {fontSize: 14, fontWeight: '700', color: Colors.surface},
});
