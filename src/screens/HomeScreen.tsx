import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

interface HomeScreenProps {
  onOpenCamera: () => void;
  onOpenCloset: () => void;
}

function FeatureRow({
  icon,
  title,
  body,
  badge,
}: {
  icon: string;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <View style={styles.featureText}>
        <View style={styles.featureTitleRow}>
          <Text style={styles.featureTitle}>{title}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen({onOpenCamera, onOpenCloset}: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 앱 아이콘 */}
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>{'👕'}</Text>
        </View>

        {/* 앱 이름 */}
        <Text style={styles.title}>빨래야호</Text>

        {/* 서브텍스트 */}
        <Text style={styles.subtitle}>
          {'세탁 라벨을 비추면\n어떻게 빨아야 할지 알려드려요'}
        </Text>

        {/* 기능 안내 */}
        <View style={styles.featureSection}>
          <FeatureRow
            icon="🏷️"
            title="라벨 인식"
            body="38개 세탁 기호 자동 분석"
          />
          <FeatureRow
            icon="📋"
            title="빨래법 안내"
            body="1~4단계로 정리된 가이드"
          />
          <FeatureRow
            icon="👔"
            title="옷장 보관"
            body="내 옷의 세탁법을 저장"
          />
        </View>
      </View>

      {/* 하단 버튼 */}
      <View style={styles.bottomArea}>
        <TouchableOpacity style={styles.greenButton} onPress={onOpenCamera}>
          <Text style={styles.greenButtonText}>라벨 촬영하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closetButton} onPress={onOpenCloset}>
          <Text style={styles.closetButtonText}>내 옷장 보기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#333',
    marginTop: 16,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  featureSection: {
    width: '100%',
    marginTop: 40,
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIconText: {
    fontSize: 20,
  },
  featureText: {
    marginLeft: 14,
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  featureBody: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999',
    marginTop: 2,
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#999',
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greenButton: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  greenButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  closetButton: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  closetButtonText: {
    color: '#555',
    fontSize: 15,
    fontWeight: '600',
  },
});
