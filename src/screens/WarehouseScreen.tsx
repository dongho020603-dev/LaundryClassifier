import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
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
      {name: '작년에 산 청바지', thumb: '👖', pill: 'c2', quote: '"드라이클리닝 해주세요"'},
      {name: '3년 전에 산 청바지', thumb: '👖', pill: 'c2', quote: '"섬세 드라이클리닝으로 약하게 해주세요"'},
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
        chips: [
          {text: '손빨래', status: 'caution'},
          {text: '표백 금지', status: 'forbidden'},
          {text: '눕혀', status: 'caution'},
          {text: '약하게', status: 'pro'},
        ],
      },
      {
        name: '캐시미어 가디건', thumb: '🧥', pill: 'c3',
        chips: [
          {text: '30°C', status: 'caution'},
          {text: '표백 금지', status: 'forbidden'},
          {text: '걸기', status: 'caution'},
          {text: '드라이', status: 'pro'},
        ],
      },
      {
        name: '정장 셔츠', thumb: '👔', pill: 'c3',
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
        chips: [
          {text: '60°C', status: 'safe'},
          {text: '표백', status: 'safe'},
          {text: '건조기', status: 'safe'},
          {text: '●●● 200°', status: 'safe'},
        ],
      },
      {
        name: '데일리 후드티', thumb: '👕', pill: 'c1',
        chips: [
          {text: '30°C', status: 'caution'},
          {text: '표백', status: 'safe'},
          {text: '건조기', status: 'safe'},
          {text: '●● 150°', status: 'safe'},
        ],
      },
      {
        name: '양말 묶음', thumb: '🧦', pill: 'c1',
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

export default function WarehouseScreen({onBack}: WarehouseScreenProps) {
  const [activeCounter, setActiveCounter] = useState<Pill>('c1');
  const [activeFilter, setActiveFilter] = useState('전체');

  const total = COUNTERS.reduce((sum, c) => sum + c.count, 0);

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

        {/* 필터 칩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersRow}>
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

        {/* 그룹별 옷 카드 */}
        {MOCK_GROUPS.map(group => (
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

  // ── 카운터 ──
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
  counterActive: {
    backgroundColor: Colors.ctaBlack,
    borderColor: Colors.ctaBlack,
  },
  counterNum: {fontSize: 18, fontWeight: '800', color: Colors.textSecondary, lineHeight: 22},
  counterLabel: {fontSize: 11, color: Colors.textSecondary, marginTop: 2},
  counterTextActive: {color: Colors.surface},

  // ── 필터 ──
  filtersRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    gap: 8,
  },
  filter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterActive: {
    backgroundColor: Colors.ctaBlack,
    borderColor: Colors.ctaBlack,
  },
  filterText: {fontSize: 12, color: Colors.textSecondary},
  filterTextActive: {color: Colors.surface, fontWeight: '700'},

  // ── 그룹 ──
  group: {paddingHorizontal: Spacing.md},
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: 4,
  },
  groupIcon: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  groupIconText: {fontSize: 11, color: Colors.surface, fontWeight: '700'},
  groupTitle: {fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3},

  // ── 카드 ──
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
  cardThumb: {
    width: 50, height: 50,
    borderRadius: 12,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardThumbText: {fontSize: 26},
  cardBody: {flex: 1, minWidth: 0},
  cardRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardName: {flex: 1, ...Typography.bodyBold, color: Colors.textPrimary},
  cardPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginLeft: 8,
  },
  cardPillText: {fontSize: 11, fontWeight: '700'},
  cardQuote: {fontSize: 13, color: Colors.case3.text, marginTop: 4},
  cardChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6},
  cardChip: {paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill},
  cardChipText: {fontSize: 11, fontWeight: '600'},
});
