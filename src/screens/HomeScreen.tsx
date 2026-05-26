import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {Colors, Radius, Spacing, Typography, Shadow} from '../theme/tokens';

interface HomeScreenProps {
  onOpenCamera: () => void;
  onOpenWarehouse: () => void;
}

const FEATURES = [
  {
    icon: '📷',
    title: '라벨 인식',
    sub: '38개 세탁 기호 자동 분석',
  },
  {
    icon: '🧺',
    title: '빨래법 안내',
    sub: '1·4단계로 정리된 가이드',
  },
  {
    icon: '👕',
    title: '옷장 보관',
    sub: '내 옷의 세탁법을 저장',
  },
];

export default function HomeScreen({
  onOpenCamera,
  onOpenWarehouse,
}: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 로고 + 타이틀 */}
        <View style={styles.heroBlock}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>▢</Text>
          </View>
          <Text style={styles.title}>빨래해</Text>
          <Text style={styles.tagline}>
            세탁 라벨을 비추면{'\n'}어떻게 빨아야 할지 알려드려요
          </Text>
        </View>

        {/* 핵심 기능 3개 */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaBlock}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            activeOpacity={0.85}
            onPress={onOpenCamera}>
            <Text style={styles.btnPrimaryIcon}>📷</Text>
            <Text style={styles.btnPrimaryText}>라벨 촬영하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            activeOpacity={0.85}
            onPress={onOpenWarehouse}>
            <Text style={styles.btnSecondaryText}>내 옷장 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.surface},
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    justifyContent: 'space-between',
  },

  // 로고 영역
  heroBlock: {alignItems: 'center', marginTop: Spacing.xl},
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: Radius.lg,
    borderWidth: 2.5,
    borderColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoIcon: {fontSize: 48, color: Colors.textPrimary, marginTop: -4},
  title: {
    ...Typography.titleXl,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // 기능 리스트
  featureList: {gap: Spacing.lg, paddingHorizontal: Spacing.md},
  featureRow: {flexDirection: 'row', alignItems: 'center'},
  featureIcon: {fontSize: 26, marginRight: Spacing.md, width: 32, textAlign: 'center'},
  featureText: {flex: 1},
  featureTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureSub: {
    ...Typography.caption,
    color: Colors.textMuted,
  },

  // CTA
  ctaBlock: {gap: Spacing.sm},
  btn: {
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnPrimary: {
    backgroundColor: Colors.ctaGreen,
    ...Shadow.cta,
  },
  btnPrimaryIcon: {fontSize: 18, marginRight: 8},
  btnPrimaryText: {
    ...Typography.button,
    color: Colors.surface,
  },
  btnSecondary: {
    backgroundColor: Colors.ctaBlue,
  },
  btnSecondaryText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
