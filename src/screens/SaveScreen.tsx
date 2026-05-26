import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import {SYMBOLS} from '../data/laundrySymbolData';
import {saveClosetItem, ClosetItem} from '../services/closetStorage';

type Category = '상의' | '하의' | '아우터' | '기타';

interface SaveScreenProps {
  labels: string[];
  overallState: string;
  onSaved: () => void;
  onBack: () => void;
}

export default function SaveScreen({
  labels,
  overallState,
  onSaved,
  onBack,
}: SaveScreenProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '옷 이름을 입력해 주세요.');
      return;
    }
    if (!category) {
      Alert.alert('알림', '카테고리를 선택해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const item: ClosetItem = {
        id: Date.now().toString(),
        name: name.trim(),
        category,
        memo: memo.trim(),
        labels,
        overallState,
        savedAt: new Date().toISOString(),
      };
      await saveClosetItem(item);
      Alert.alert('저장 완료', '옷장에 저장했어요.', [
        {text: '확인', onPress: onSaved},
      ]);
    } catch (err) {
      Alert.alert('오류', '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  const categories: Category[] = ['상의', '하의', '아우터', '기타'];

  return (
    <SafeAreaView style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backButton}>
          <Text style={s.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>옷장에 저장</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollInner}
        keyboardShouldPersistTaps="handled">
        {/* 인식된 세탁 정보 */}
        <View style={s.infoCard}>
          <Text style={s.infoLabel}>인식된 세탁 정보</Text>
          <View style={s.chipWrap}>
            {labels.map((label, idx) => {
              const sym = SYMBOLS[label];
              if (!sym) return null;
              const chipStyle =
                sym.status === '금지'
                  ? s.chipForbidden
                  : sym.status === '주의'
                  ? s.chipCaution
                  : sym.isPro
                  ? s.chipPro
                  : s.chipSafe;
              return (
                <View key={idx} style={[s.chip, chipStyle]}>
                  <Text style={s.chipText}>{sym.value}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 옷 이름 */}
        <Text style={s.fieldLabel}>옷 이름</Text>
        <TextInput
          style={s.textInput}
          placeholder="예 : 검정 후드 집업"
          placeholderTextColor="#bbb"
          value={name}
          onChangeText={setName}
          maxLength={30}
        />

        {/* 카테고리 */}
        <Text style={s.fieldLabel}>카테고리</Text>
        <View style={s.categoryGrid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                s.categoryBtn,
                category === cat && s.categoryBtnActive,
              ]}
              onPress={() => setCategory(cat)}>
              <Text
                style={[
                  s.categoryBtnText,
                  category === cat && s.categoryBtnTextActive,
                ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 메모 */}
        <Text style={s.fieldLabel}>메모</Text>
        <TextInput
          style={[s.textInput, s.memoInput]}
          placeholder="예 : 작년 겨울에 산 옷"
          placeholderTextColor="#bbb"
          value={memo}
          onChangeText={setMemo}
          maxLength={100}
          multiline
        />
      </ScrollView>

      {/* 저장 버튼 */}
      <View style={s.bottomArea}>
        <TouchableOpacity
          style={[s.saveButton, saving && {opacity: 0.6}]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={s.saveButtonText}>
            {saving ? '저장 중...' : '저장하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F2EB'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F5F2EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {fontSize: 24, color: '#1F1F1D'},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#1F1F1D'},

  scroll: {flex: 1},
  scrollInner: {padding: 20, paddingBottom: 40},

  // 인식 정보
  infoCard: {
    backgroundColor: '#F5EFE0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555550',
    marginBottom: 10,
  },
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipSafe: {
    backgroundColor: '#EAF3DE',
    borderColor: '#D0E4B8',
  },
  chipCaution: {
    backgroundColor: '#FAEEDA',
    borderColor: '#E8D7B7',
  },
  chipForbidden: {
    backgroundColor: '#FCEBEB',
    borderColor: '#F0C5C5',
  },
  chipPro: {
    backgroundColor: '#E6F1FB',
    borderColor: '#B5D4F4',
  },
  chipText: {fontSize: 12, fontWeight: '600', color: '#1F1F1D'},

  // 필드
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1F1D',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFCF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1F1F1D',
    marginBottom: 20,
  },
  memoInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // 카테고리
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryBtn: {
    width: '47%' as any,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DFCF',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  categoryBtnActive: {
    backgroundColor: '#1F1F1D',
    borderColor: '#1F1F1D',
  },
  categoryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555550',
  },
  categoryBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // 하단
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    backgroundColor: '#F5F2EB',
  },
  saveButton: {
    backgroundColor: '#1F1F1D',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {color: '#fff', fontSize: 17, fontWeight: '700'},
});
