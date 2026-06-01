import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import {SYMBOLS, CATEGORY_ORDER} from '../data/laundrySymbolData';
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

  if (hasDoNotWash && hasDoNotDryClean) {
    return {case: 0, label: '못 빨아요', color: '#3D2E1A', bg: '#EEEAE3'};
  }
  if (hasDoNotWash && hasPro) {
    return {case: 2, label: '세탁소', color: '#3B82F6', bg: '#DBEAFE'};
  }
  if (!hasDoNotWash && hasPro) {
    return {case: 3, label: '세탁 자유', color: '#854F0B', bg: '#F5EBDA'};
  }
  return {case: 1, label: '집에서', color: '#3B6D11', bg: '#EAF3DE'};
}

const CASE_ORDER = [2, 3, 1, 0];
const CASE_TITLES: Record<number, {title: string; sub: string}> = {
  2: {title: '세탁소에 맡길 옷', sub: '집에서 빨면 안 돼요'},
  3: {title: '세탁 자유', sub: '집 또는 세탁소'},
  1: {title: '집에서 빨 옷', sub: '평소처럼 빨면 돼요'},
  0: {title: '못 빨아요', sub: '겉면만 닦아주세요'},
};

// 카테고리별 심볼 목록 (필터 모달용)
const FILTER_CATEGORIES = CATEGORY_ORDER.map(cat => ({
  key: cat,
  symbols: Object.entries(SYMBOLS)
    .filter(([_, info]) => info.category === cat)
    .map(([key, info]) => ({
      key,
      card: info.card,
      status: info.status,
      isPro: info.isPro,
    })),
}));

// 심볼 status → 배경색
const STATUS_BG: Record<string, string> = {
  '안전': '#EAF3DE',
  '주의': '#FAEEDA',
  '금지': '#FCEBEB',
};

export default function ClosetScreen({onBack}: ClosetScreenProps) {
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [filter, setFilter] = useState<'all' | number>('all');

  // 세부 필터
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(
    new Set(),
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

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

  // 세부 필터 토글
  const toggleSymbol = (key: string) => {
    setSelectedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedSymbols(new Set());
  };

  // 필터링된 아이템
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 케이스 필터
      if (filter !== 'all') {
        const ci = getCaseInfo(item);
        if (ci.case !== filter) return false;
      }
      // 세부 심볼 필터
      if (selectedSymbols.size > 0) {
        return [...selectedSymbols].some(sym => item.labels.includes(sym));
      }
      return true;
    });
  }, [items, filter, selectedSymbols]);

  // 케이스별 그룹화 (필터링된 아이템 기준)
  const grouped: Record<number, ClosetItem[]> = {0: [], 1: [], 2: [], 3: []};
  filteredItems.forEach(item => {
    const ci = getCaseInfo(item);
    grouped[ci.case].push(item);
  });

  const visibleCases =
    filter === 'all'
      ? CASE_ORDER
      : CASE_ORDER.filter(c => c === filter);

  // 전체 카운트 (필터 전)
  const totalCount = items.length;
  const allGrouped: Record<number, number> = {0: 0, 1: 0, 2: 0, 3: 0};
  items.forEach(item => {
    const ci = getCaseInfo(item);
    allGrouped[ci.case]++;
  });

  // 카테고리별 선택 개수
  const selectedCountByCategory = (cat: string) => {
    const catSymKeys = FILTER_CATEGORIES.find(c => c.key === cat)?.symbols.map(
      s => s.key,
    );
    if (!catSymKeys) return 0;
    return catSymKeys.filter(k => selectedSymbols.has(k)).length;
  };

  // 선택된 심볼의 card 이름 목록
  const selectedSymbolCards = useMemo(() => {
    return [...selectedSymbols].map(key => ({
      key,
      card: SYMBOLS[key]?.card || key,
    }));
  }, [selectedSymbols]);

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
            <Text style={s.pillNum1}>{allGrouped[1]}</Text>
            <Text style={s.pillLabel1}>집에서</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, s.pillC3, filter === 3 && s.pillSelected]}
            onPress={() => setFilter(filter === 3 ? 'all' : 3)}>
            <Text style={s.pillNum3}>{allGrouped[3]}</Text>
            <Text style={s.pillLabel3}>세탁 자유</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, s.pillC2, filter === 2 && s.pillSelected]}
            onPress={() => setFilter(filter === 2 ? 'all' : 2)}>
            <Text style={s.pillNum2}>{allGrouped[2]}</Text>
            <Text style={s.pillLabel2}>세탁소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, s.pillC0, filter === 0 && s.pillSelected]}
            onPress={() => setFilter(filter === 0 ? 'all' : 0)}>
            <Text style={s.pillNum0}>{allGrouped[0]}</Text>
            <Text style={s.pillLabel0}>못 빨아요</Text>
          </TouchableOpacity>

          {/* 세부 설정 버튼 */}
          <TouchableOpacity
            style={[
              s.filterButton,
              selectedSymbols.size > 0 && s.filterButtonActive,
            ]}
            onPress={() => setShowFilterModal(true)}>
            <Text
              style={[
                s.filterButtonIcon,
                selectedSymbols.size > 0 && s.filterButtonIconActive,
              ]}>
              ⚙
            </Text>
            {selectedSymbols.size > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeText}>{selectedSymbols.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 활성 필터 칩 */}
      {selectedSymbolCards.length > 0 && (
        <View style={s.activeFilterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.activeFilterScroll}>
            {selectedSymbolCards.map(({key, card}) => (
              <TouchableOpacity
                key={key}
                style={s.activeChip}
                onPress={() => toggleSymbol(key)}>
                <Text style={s.activeChipText}>{card}</Text>
                <Text style={s.activeChipX}> ✕</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.clearAllChip} onPress={resetFilters}>
              <Text style={s.clearAllText}>전체 해제</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* 리스트 */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        {filteredItems.length === 0 && totalCount > 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>조건에 맞는 옷이 없어요</Text>
            <Text style={s.emptySub}>필터를 조정해 보세요</Text>
          </View>
        )}
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

      {/* ── 세부 필터 모달 ── */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            {/* 모달 헤더 */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>세부 필터</Text>
              <View style={s.modalHeaderRight}>
                {selectedSymbols.size > 0 && (
                  <TouchableOpacity
                    style={s.resetBtn}
                    onPress={resetFilters}>
                    <Text style={s.resetBtnText}>초기화</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.closeBtn}
                  onPress={() => setShowFilterModal(false)}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 카테고리 아코디언 */}
            <ScrollView
              style={s.modalScroll}
              contentContainerStyle={s.modalScrollInner}>
              {FILTER_CATEGORIES.map(cat => {
                const isExpanded = expandedCategories.has(cat.key);
                const catSelectedCount = selectedCountByCategory(cat.key);

                return (
                  <View key={cat.key} style={s.catSection}>
                    {/* 카테고리 헤더 */}
                    <TouchableOpacity
                      style={s.catHeader}
                      onPress={() => toggleCategory(cat.key)}>
                      <View style={s.catHeaderLeft}>
                        <Text style={s.catHeaderText}>{cat.key}</Text>
                        <Text style={s.catHeaderCount}>
                          {cat.symbols.length}개
                        </Text>
                        {catSelectedCount > 0 && (
                          <View style={s.catBadge}>
                            <Text style={s.catBadgeText}>
                              {catSelectedCount}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.catArrow}>
                        {isExpanded ? '▾' : '▸'}
                      </Text>
                    </TouchableOpacity>

                    {/* 심볼 리스트 */}
                    {isExpanded &&
                      cat.symbols.map(sym => {
                        const isSelected = selectedSymbols.has(sym.key);
                        const bgColor = sym.isPro
                          ? '#E6F1FB'
                          : STATUS_BG[sym.status] || '#f5f5f5';

                        return (
                          <TouchableOpacity
                            key={sym.key}
                            style={[
                              s.symRow,
                              isSelected && {backgroundColor: bgColor},
                            ]}
                            onPress={() => toggleSymbol(sym.key)}>
                            <Text
                              style={[
                                s.symCheck,
                                isSelected && s.symCheckActive,
                              ]}>
                              {isSelected ? '✓' : '○'}
                            </Text>
                            <Text
                              style={[
                                s.symCard,
                                isSelected && s.symCardActive,
                              ]}>
                              {sym.card}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                );
              })}
            </ScrollView>

            {/* 하단 적용 버튼 */}
            <TouchableOpacity
              style={s.applyBtn}
              onPress={() => setShowFilterModal(false)}>
              <Text style={s.applyBtnText}>
                {selectedSymbols.size > 0
                  ? `${selectedSymbols.size}개 조건으로 필터`
                  : '전체 보기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  pillRow: {flexDirection: 'row', gap: 6, alignItems: 'center'},
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
  pillLabel1: {
    fontSize: 9,
    fontWeight: '600',
    color: '#3B6D11',
    marginTop: 2,
  },
  pillNum3: {fontSize: 18, fontWeight: '700', color: '#854F0B'},
  pillLabel3: {
    fontSize: 9,
    fontWeight: '600',
    color: '#854F0B',
    marginTop: 2,
  },
  pillNum2: {fontSize: 18, fontWeight: '700', color: '#fff'},
  pillLabel2: {
    fontSize: 9,
    fontWeight: '600',
    color: '#B5D4F4',
    marginTop: 2,
  },
  pillNum0: {fontSize: 18, fontWeight: '700', color: '#3D2E1A'},
  pillLabel0: {
    fontSize: 9,
    fontWeight: '600',
    color: '#3D2E1A',
    marginTop: 2,
  },

  // 세부 설정 버튼
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E5DFCF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1F1F1D',
  },
  filterButtonIcon: {
    fontSize: 18,
    color: '#888780',
  },
  filterButtonIconActive: {
    color: '#fff',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  // 활성 필터 칩
  activeFilterRow: {
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5DFCF',
    paddingVertical: 8,
  },
  activeFilterScroll: {
    paddingHorizontal: 14,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EBDA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#854F0B',
  },
  activeChipX: {
    fontSize: 11,
    color: '#854F0B',
    opacity: 0.6,
  },
  clearAllChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888780',
    textDecorationLine: 'underline',
  },

  // 스크롤
  scroll: {flex: 1},
  scrollInner: {padding: 12, paddingBottom: 40},

  // 빈 상태
  emptyState: {alignItems: 'center', paddingTop: 80},
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1D',
    marginBottom: 8,
  },
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
  clothThumbCat: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F1F1D',
  },
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

  // ── 모달 ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F5F2EB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5DFCF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1F1D',
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E5DFCF',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888780',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5DFCF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888780',
  },

  modalScroll: {flex: 1},
  modalScrollInner: {paddingBottom: 20},

  // 카테고리 섹션
  catSection: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5DFCF',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1F1D',
  },
  catHeaderCount: {
    fontSize: 12,
    color: '#888780',
  },
  catBadge: {
    backgroundColor: '#1F1F1D',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  catArrow: {
    fontSize: 14,
    color: '#888780',
  },

  // 심볼 행
  symRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingLeft: 36,
    gap: 10,
  },
  symCheck: {
    fontSize: 16,
    color: '#ccc',
    width: 24,
    textAlign: 'center',
  },
  symCheckActive: {
    color: '#1F1F1D',
    fontWeight: '700',
  },
  symCard: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  symCardActive: {
    color: '#1F1F1D',
    fontWeight: '600',
  },

  // 하단 적용 버튼
  applyBtn: {
    backgroundColor: '#1F1F1D',
    marginHorizontal: 20,
    marginBottom: 34,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
