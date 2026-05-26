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
import {Colors, Radius, Spacing, Typography} from '../theme/tokens';

interface SaveScreenProps {
  labels: string[];
  onClose: () => void;
  onSaved?: () => void;
}

type ChipStatus = 'safe' | 'caution' | 'forbidden' | 'pro';
type Chip = {text: string; status: ChipStatus};

const CATEGORIES = ['상의', '하의', '아우터', '기타'] as const;

function labelToChip(label: string): Chip | null {
  if (label === 'do_not_wash') return {text: '물세탁 금지', status: 'forbidden'};
  if (label === 'wash_by_hand') return {text: '손빨래', status: 'caution'};
  const m = label.match(/^washing_(normal|mild|very_mild)_(\d+)/);
  if (m) {
    const level = m[1];
    const temp = m[2];
    const suffix = level === 'normal' ? '표준' : level === 'mild' ? '약함' : '매우 약함';
    return {text: `${temp}°C ${suffix}`, status: level === 'normal' ? 'safe' : 'caution'};
  }

  if (label === 'do_not_bleach') return {text: '표백 금지', status: 'forbidden'};
  if (label === 'bleach_any') return {text: '표백', status: 'safe'};
  if (label === 'bleach_oxygen_only') return {text: '산소계 표백', status: 'caution'};

  if (label === 'tumble_dry_normal') return {text: '건조기', status: 'safe'};
  if (label === 'tumble_dry_mild') return {text: '건조기 약함', status: 'caution'};
  if (label === 'do_not_tumble_dry') return {text: '건조기 금지', status: 'forbidden'};

  if (label.startsWith('line_dry')) return {text: label.includes('shade') ? '그늘 걸기' : '걸기', status: 'caution'};
  if (label.startsWith('flat_dry')) return {text: label.includes('shade') ? '그늘 눕혀' : '눕혀', status: 'caution'};
  if (label.startsWith('drip_')) return {text: '탈수X 자연건조', status: 'caution'};

  if (label === 'iron_200c') return {text: '●●● 200°', status: 'safe'};
  if (label === 'iron_150c') return {text: '●● 150°', status: 'safe'};
  if (label === 'iron_110c') return {text: '● 110°', status: 'caution'};
  if (label === 'do_not_iron') return {text: '다림질 금지', status: 'forbidden'};

  if (label === 'dry_clean_perc_normal') return {text: '드라이클리닝 (P)', status: 'pro'};
  if (label === 'dry_clean_perc_mild') return {text: '드라이 약하게', status: 'pro'};
  if (label === 'dry_clean_hc_normal') return {text: '드라이클리닝 (F)', status: 'pro'};
  if (label === 'dry_clean_hc_mild') return {text: '드라이 F 약하게', status: 'pro'};
  if (label === 'do_not_dry_clean') return {text: '드라이 금지', status: 'forbidden'};
  if (label === 'wet_clean_normal') return {text: '웨트클리닝 (W)', status: 'pro'};
  if (label === 'wet_clean_mild' || label === 'wet_clean_very_mild') return {text: '웨트 약하게', status: 'pro'};
  if (label === 'do_not_wet_clean') return {text: '웨트 금지', status: 'forbidden'};

  return null;
}

export default function SaveScreen({labels, onClose, onSaved}: SaveScreenProps) {
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number] | null>(null);

  const chips = labels.map(labelToChip).filter((c): c is Chip => c !== null);

  const handleSave = () => {
    Alert.alert('저장 완료', '옷장에 저장됐어요.', [
      {
        text: '확인',
        onPress: () => {
          if (onSaved) onSaved();
          onClose();
        },
      },
    ]);
  };

  const chipStyle = (status: ChipStatus) => {
    switch (status) {
      case 'safe':      return {bg: 'rgba(255,255,255,0.7)', text: Colors.chipSafe.text};
      case 'caution':   return {bg: 'rgba(255,255,255,0.7)', text: Colors.chipCaution.text};
      case 'forbidden': return {bg: 'rgba(255,255,255,0.7)', text: Colors.warningText};
      case 'pro':       return {bg: 'rgba(255,255,255,0.7)', text: Colors.chipPro.text};
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.smHeader}>
        <TouchableOpacity style={s.iconBtn} onPress={onClose} activeOpacity={0.6}>
          <Text style={s.iconBtnText}>‹</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.smTitle}>옷장에 저장</Text>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        <View style={s.infoCard}>
          <Text style={s.infoCardTitle}>인식된 세탁 정보</Text>
          <View style={s.infoChips}>
            {chips.length === 0 ? (
              <Text style={s.emptyChip}>인식된 정보가 없어요</Text>
            ) : (
              chips.map((c, i) => {
                const cs = chipStyle(c.status);
                return (
                  <View key={i} style={[s.infoChip, {backgroundColor: cs.bg}]}>
                    <Text style={[s.infoChipText, {color: cs.text}]}>{c.text}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={s.photoRow}>
          <TouchableOpacity style={s.photoBtn} activeOpacity={0.7}>
            <View style={s.photoCircle}>
              <Text style={s.photoIcon}>📷</Text>
            </View>
            <Text style={s.photoLabel}>사진 촬영</Text>
          </TouchableOpacity>

          <View style={s.nameBlock}>
            <Text style={s.fieldLabel}>옷 이름</Text>
            <TextInput
              style={s.inputPill}
              placeholder="예 : 검정 후드 집업"
              placeholderTextColor={Colors.placeholder}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={s.fieldBlock}>
          <Text style={s.fieldTitle}>카테고리</Text>
          <View style={s.catGrid}>
            {CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[s.catPill, active && s.catPillActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}>
                  <Text style={[s.catPillText, active && s.catPillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.fieldBlock}>
          <Text style={s.fieldTitle}>메모</Text>
          <TextInput
            style={s.memoPill}
            placeholder="예 : 작년 겨울에 산 옷"
            placeholderTextColor={Colors.placeholder}
            value={memo}
            onChangeText={setMemo}
            textAlign="center"
          />
        </View>

        <TouchableOpacity style={s.saveConfirmBtn} activeOpacity={0.85} onPress={handleSave}>
          <Text style={s.saveConfirmText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.surface},

  smHeader: {height: 44, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center'},
  iconBtn: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  iconBtnText: {fontSize: 28, color: Colors.textPrimary, marginTop: -4},

  smTitle: {
    paddingHorizontal: Spacing.lg + 2,
    paddingBottom: Spacing.lg,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },

  scroll: {flex: 1},
  scrollInner: {paddingHorizontal: Spacing.lg + 2, paddingBottom: Spacing.xl},

  infoCard: {
    backgroundColor: Colors.case3.bg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5C4827',
    marginBottom: Spacing.sm,
  },
  infoChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  infoChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  infoChipText: {fontSize: 12, fontWeight: '600'},
  emptyChip: {fontSize: 12, color: Colors.textMuted, fontStyle: 'italic'},

  photoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: Spacing.xl,
  },
  photoBtn: {width: 64, alignItems: 'center'},
  photoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {fontSize: 24},
  photoLabel: {fontSize: 11, color: Colors.textSecondary, marginTop: 4},

  nameBlock: {flex: 1},
  fieldLabel: {fontSize: 13, color: Colors.textSecondary, marginBottom: 6},
  inputPill: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    fontSize: 13,
    color: Colors.textPrimary,
  },

  fieldBlock: {marginBottom: Spacing.xl},
  fieldTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  catGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  catPill: {
    width: '47%',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  catPillActive: {borderColor: Colors.ctaBlack, backgroundColor: Colors.ctaBlack},
  catPillText: {fontSize: 14, color: Colors.textPrimary},
  catPillTextActive: {color: Colors.surface, fontWeight: '700'},

  memoPill: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    fontSize: 13,
    color: Colors.textPrimary,
  },

  saveConfirmBtn: {
    backgroundColor: Colors.ctaBlack,
    borderRadius: Radius.pill,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  saveConfirmText: {color: Colors.surface, ...Typography.button},
});
