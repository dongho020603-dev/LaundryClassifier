import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import {SYMBOLS} from '../data/laundrySymbolData';
import {
  getClosetItems,
  deleteClosetItem,
  ClosetItem,
} from '../services/closetStorage';

interface ClosetScreenProps {
  onBack: () => void;
}

// 케이스 매핑: HTML 프로토타입 기준
function getCaseInfo(item: ClosetItem) {
  const hasPro = item.labels.some(l => SYMBOLS[l]?.isPro);
  const hasDoNotWash = item.labels.includes('do_not_wash');
  const hasDoNotDryClean =
    item.labels.includes('do_not_dry_clean') &&
    item.labels.includes('do_not_wet_clean');

  // 케이스 0: 물세탁 금지 + 드라이 금지 + 웨트 금지
  if (hasDoNotWash && hasDoNotDryClean) {
    return {case: 0, label: '못 빨아요', color: '#3D2E1A', bg: '#EEEAE3'};
  }
  // 케이스 2: 물세탁 금지 + 전문케어 있음
  if (hasDoNotWash && hasPro) {
    return {case: 2, label: '세탁소', color: '#3B82F6', bg: '#DBEAFE'};
  }
  // 케이스 3: 물세탁 가능 + 전문케어도 있음
  if (!hasDoNotWash && hasPro) {
    return {case: 3, label: '세탁 자유', color: '#854F0B', bg: '#F5EBDA'};
  }
  // 케이스 1: 물세탁 가능, 전문케어 없음
  return {case: 1, label: '집에서', color: '#3B6D11', bg: '#EAF3DE'};
}

const CASE_ORDER = [2, 3, 1, 0];
const CASE_TITLES: Record<number, {title: string; sub: string}> = {
  2: {title: '세탁소에 맡길 옷', sub: '집에서 빨면 안 돼요'},
  3: {title: '세탁 자유', sub: '집 또는 세탁소'},
  1: {title: '집에서 빨 옷', sub: '평소처럼 빨면 돼요'},
  0: {title: '못 빨아요', sub: '겉면만 닦아주세요'},
};

export default function ClosetScreen({onBack}: ClosetScreenProps) {
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [filter, setFilter] = useState<'all' | number>('all');

  const loadItems = useCallback(async () => {
    const data = await getClosetItems();
    setItems(data);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = (item: ClosetItem) => {
    Alert.alert('삭제', `"${item.name}"을(를) 삭제할까요?`, [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteClosetItem(item.id);
          loadItems();
        },
      },
    ]);
  };

  // 케이스별 그룹화
  const grouped: Record<number, ClosetItem[]> = {0: [], 1: [], 2: [], 3: []};
  items.forEach(item => {
    const ci = getCaseInfo(item);
    grouped[ci.case].push(item);
  });

  // 필터 적용
  const visibleCases =
    filter === 'all'
      ? CASE_ORDER
      : CASE_ORDER.filter(c => c === filter);

  // 카운트
  const totalCount = items.length;
  const caseCounts = {
    1: grouped[1].length,
    2: grouped[2].length,
    3: grouped[3].length,
    0: grouped[0].length,
  };

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backButton}>
          <Text style={s.backText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>내 옷장</Text>
        <View style={{width: 40}} />
      </View>

      {/* 요약 카운트 */}
      <View style={s.summaryRow}>
        <Text style={s.summaryTotal}>전체 {totalCount}벌</Text>
        <View style={s.pillRow}>
          <TouchableOpacity
            style={[s.pill, s.pillC1, filter === 1 && s.pillSelected]}
            onPress={() => setFilter(filter === 1 ? 'all' : 1)}>
            <Text style={s.pillNum1}>{caseCounts[1]}</Text>
            <Text style={s.pillLabel1}>집에서</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, s.pillC3, filter === 3 && s.pillSelected]}
            onPress={() => setFilter(filter === 3 ? 'all' : 3)}>
            <Text style={s.pillNum3}>{caseCounts[3]}</Text>
            <Text style={s.pillLabel3}>세탁 자유</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, s.pillC2, filter === 2 && s.pillSelected]}
            onPress={() => setFilter(filter === 2 ? 'all' : 2)}>
            <Text style={s.pillNum2}>{caseCounts[2]}</Text>
            <Text style={s.pillLabel2}>세탁소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, s.pillC0, filter === 0 && s.pillSelected]}
            onPress={() => setFilter(filter === 0 ? 'all' : 0)}>
            <Text style={s.pillNum0}>{caseCounts[0]}</Text>
            <Text style={s.pillLabel0}>못 빨아요</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 리스트 */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        {totalCount === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>아직 저장된 옷이 없어요</Text>
            <Text style={s.emptySub}>
              세탁 라벨을 촬영하고 옷장에 저장해 보세요
            </Text>
          </View>
        )}

        {visibleCases.map(caseNum => {
          const caseItems = grouped[caseNum];
          if (caseItems.length === 0) return null;
          const caseTitle = CASE_TITLES[caseNum];
          const ci = getCaseInfo(caseItems[0]);

          return (
            <View key={caseNum}>
              {/* 그룹 헤더 */}
              <View style={s.groupHeader}>
                <View style={[s.groupDot, {backgroundColor: ci.color}]} />
                <View style={{flex: 1}}>
                  <Text style={s.groupTitle}>{caseTitle.title}</Text>
                  <Text style={s.groupSub}>
                    {caseItems.length}벌 · {caseTitle.sub}
                  </Text>
                </View>
              </View>

              {/* 옷 카드들 */}
              {caseItems.map(item => {
                const itemCase = getCaseInfo(item);
                return (
                  <View key={item.id} style={s.clothCard}>
                    <View style={s.clothRow}>
                      <View
                        style={[s.clothThumb, {backgroundColor: ci.bg}]}>
                        <Text style={s.clothThumbCat}>{item.category}</Text>
                      </View>
                      <View style={s.clothInfo}>
                        <View style={s.clothNameRow}>
                          <Text style={s.clothName}>{item.name}</Text>
                          <View
                            style={[
                              s.casePill,
                              {
                                backgroundColor:
                                  itemCase.case === 2
                                    ? '#3B82F6'
                                    : itemCase.bg,
                              },
                            ]}>
                            <Text
                              style={[
                                s.casePillText,
                                {
                                  color:
                                    itemCase.case === 2
                                      ? '#fff'
                                      : itemCase.color,
                                },
                              ]}>
                              {itemCase.label}
                            </Text>
                          </View>
                        </View>
                        {/* 심볼 칩 */}
                        <View style={s.symbolStrip}>
                          {item.labels.slice(0, 4).map((label, idx) => {
                            const sym = SYMBOLS[label];
                            if (!sym) return null;
                            const chipStyle =
                              sym.status === '금지'
                                ? s.sForbidden
                                : sym.status === '주의'
                                ? s.sCaution
                                : sym.isPro
                                ? s.sPro
                                : s.sSafe;
                            return (
                              <View
                                key={idx}
                                style={[s.symbolChip, chipStyle]}>
                                <Text style={s.symbolChipText}>
                                  {sym.value}
                                </Text>
                              </View>
                            );
                          })}
                          {item.labels.length > 4 && (
                            <Text style={s.moreText}>
                              +{item.labels.length - 4}
                            </Text>
                          )}
                        </View>
                        {item.memo ? (
                          <Text style={s.clothMemo} numberOfLines={1}>
                            {item.memo}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => handleDelete(item)}>
                        <Text style={s.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F2EB'},

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5DFCF',
  },
  backButton: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  backText: {fontSize: 24, color: '#1F1F1D'},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#1F1F1D'},

  // 요약
  summaryRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5DFCF',
  },
  summaryTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888780',
    marginBottom: 8,
  },
  pillRow: {flexDirection: 'row', gap: 6},
  pill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pillSelected: {
    borderWidth: 2,
    borderColor: '#1F1F1D',
  },
  pillC1: {backgroundColor: '#EAF3DE'},
  pillC3: {backgroundColor: '#F5EBDA'},
  pillC2: {backgroundColor: '#3B82F6'},
  pillC0: {backgroundColor: '#EEEAE3'},
  pillNum1: {fontSize: 18, fontWeight: '700', color: '#3B6D11'},
  pillLabel1: {fontSize: 9, fontWeight: '600', color: '#3B6D11', marginTop: 2},
  pillNum3: {fontSize: 18, fontWeight: '700', color: '#854F0B'},
  pillLabel3: {fontSize: 9, fontWeight: '600', color: '#854F0B', marginTop: 2},
  pillNum2: {fontSize: 18, fontWeight: '700', color: '#fff'},
  pillLabel2: {fontSize: 9, fontWeight: '600', color: '#B5D4F4', marginTop: 2},
  pillNum0: {fontSize: 18, fontWeight: '700', color: '#3D2E1A'},
  pillLabel0: {fontSize: 9, fontWeight: '600', color: '#3D2E1A', marginTop: 2},

  // 스크롤
  scroll: {flex: 1},
  scrollInner: {padding: 12, paddingBottom: 40},

  // 빈 상태
  emptyState: {alignItems: 'center', paddingTop: 80},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#1F1F1D', marginBottom: 8},
  emptySub: {fontSize: 13, color: '#888780', textAlign: 'center'},

  // 그룹 헤더
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  groupTitle: {fontSize: 13, fontWeight: '600', color: '#1F1F1D'},
  groupSub: {fontSize: 10, color: '#888780', marginTop: 1},

  // 옷 카드
  clothCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#E5DFCF',
  },
  clothRow: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  clothThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clothThumbIcon: {fontSize: 24},
  clothInfo: {flex: 1},
  clothNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  clothName: {fontSize: 13, fontWeight: '600', color: '#1F1F1D'},
  casePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  casePillText: {fontSize: 9, fontWeight: '700'},

  // 심볼 칩
  symbolStrip: {flexDirection: 'row', flexWrap: 'wrap', gap: 3},
  symbolChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  symbolChipText: {fontSize: 10, fontWeight: '600'},
  sSafe: {backgroundColor: '#EAF3DE'},
  sCaution: {backgroundColor: '#FAEEDA'},
  sForbidden: {backgroundColor: '#FCEBEB'},
  sPro: {backgroundColor: '#E6F1FB'},
  moreText: {fontSize: 10, color: '#888780', alignSelf: 'center'},

  clothMemo: {
    fontSize: 10,
    color: '#888780',
    marginTop: 4,
  },
  clothThumbCat: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F1F1D',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f5f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    color: '#A32D2D',
    fontWeight: '600',
  },
});
