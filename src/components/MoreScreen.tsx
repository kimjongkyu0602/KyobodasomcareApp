import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { BRAND_COLOR, CONTACT_PATH, CUSTOMER_CENTER, SERVICE_INFO_PATH } from '../config';
import { getPushPermissionStatus } from '../lib/push';
import type { LockToggleResult } from '../lib/useAppLock';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  /** 웹 화면으로 돌아가 해당 주소를 엽니다. */
  onOpenWeb: (pathOrUrl: string) => void;
  /** 개인정보처리방침 / 이용약관 열기 */
  onOpenPolicy: (kind: 'privacy' | 'terms') => void;
  /** 보고 있던 웹 화면 주소 공유 */
  onShare: () => void;
  /** 웹뷰 캐시 삭제 (로그인 쿠키는 유지) */
  onClearCache: () => void;
  /** 알림 권한 요청 + 토큰 등록 */
  onRequestPush: () => Promise<void>;
  appLockEnabled: boolean;
  onToggleAppLock: (v: boolean) => Promise<LockToggleResult>;
};

function openSettings() {
  Linking.openSettings().catch(() => {});
}

/** 네이티브 '더보기' 화면 (설정·고객지원·앱 정보) */
export default function MoreScreen(props: Props) {
  const { onOpenWeb, onOpenPolicy, onShare, onClearCache, onRequestPush, appLockEnabled, onToggleAppLock } = props;
  const [push, setPush] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [lockBusy, setLockBusy] = useState(false);

  const refreshPush = useCallback(() => {
    getPushPermissionStatus().then(setPush);
  }, []);

  // 설정 앱에서 알림을 바꾸고 돌아오면 상태를 다시 읽습니다.
  useEffect(() => {
    refreshPush();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshPush();
    });
    return () => sub.remove();
  }, [refreshPush]);

  const onPushToggle = async (on: boolean) => {
    if (on) {
      if (push === 'undetermined') {
        await onRequestPush();
        refreshPush();
        return;
      }
      Alert.alert('알림이 꺼져 있습니다', 'iPhone 설정 > 알림에서 교보다솜케어 알림을 켤 수 있습니다.', [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: openSettings },
      ]);
    } else {
      Alert.alert('알림 끄기', '알림은 iPhone 설정에서 끌 수 있습니다.', [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: openSettings },
      ]);
    }
  };

  const onLockToggle = async (on: boolean) => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      const r = await onToggleAppLock(on);
      if (r === 'unavailable') {
        Alert.alert('사용할 수 없습니다', 'iPhone 설정에서 Face ID 또는 기기 암호를 먼저 설정해 주세요.');
      }
    } finally {
      setLockBusy(false);
    }
  };

  const callCenter = () => {
    Linking.openURL(`tel:${CUSTOMER_CENTER.replace(/[^0-9]/g, '')}`).catch(() => {
      Alert.alert('알림', '이 기기에서는 전화를 걸 수 없습니다.');
    });
  };

  const clearCache = () => {
    Alert.alert('캐시 삭제', '앱에 저장된 웹 화면 캐시를 삭제합니다.\n로그인 상태는 유지됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          onClearCache();
          Alert.alert('알림', '캐시를 삭제했습니다.');
        },
      },
    ]);
  };

  const version = `${Application.nativeApplicationVersion ?? '-'} (${Application.nativeBuildVersion ?? '-'})`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          더보기
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="앱 설정">
          <Row
            icon="notifications-outline"
            title="알림 받기"
            subtitle="알림을 받으려면 켜 주세요"
            right={<Switch value={push === 'granted'} onValueChange={onPushToggle} trackColor={{ true: BRAND_COLOR }} />}
          />
          <Row
            icon="scan-outline"
            title="생체인증(Face ID) 잠금"
            subtitle="앱을 열 때와 5분 이상 지나 돌아올 때 Face ID로 확인합니다. (기기 암호로도 해제 가능)"
            right={
              <Switch
                value={appLockEnabled}
                disabled={lockBusy}
                onValueChange={onLockToggle}
                trackColor={{ true: BRAND_COLOR }}
              />
            }
          />
        </Section>

        <Section title="고객 지원">
          <Row icon="call-outline" title="고객센터 전화" value={CUSTOMER_CENTER} onPress={callCenter} />
          <Row icon="chatbubble-ellipses-outline" title="문의하기" onPress={() => onOpenWeb(CONTACT_PATH)} chevron />
          <Row icon="grid-outline" title="서비스안내" onPress={() => onOpenWeb(SERVICE_INFO_PATH)} chevron />
        </Section>

        <Section title="기타">
          <Row icon="share-outline" title="보고 있던 화면 공유하기" onPress={onShare} chevron />
          <Row icon="trash-outline" title="캐시 삭제" subtitle="로그인 상태는 유지됩니다." onPress={clearCache} />
          <Row icon="shield-checkmark-outline" title="개인정보처리방침" onPress={() => onOpenPolicy('privacy')} chevron />
          <Row icon="document-text-outline" title="이용약관" onPress={() => onOpenPolicy('terms')} chevron />
          <Row icon="information-circle-outline" title="앱 버전" value={version} />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

type RowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
};

function Row({ icon, title, subtitle, value, right, chevron, onPress }: RowProps) {
  const body = (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color="#555555" style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color="#C7C7CC" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => pressed && { backgroundColor: '#F2F2F7' }}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: '#F2F2F7' },
  header: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#222222' },
  content: { paddingVertical: 12, paddingBottom: 32 },
  section: { marginTop: 12, paddingHorizontal: 16 },
  sectionTitle: { marginBottom: 6, marginLeft: 4, fontSize: 13, color: '#6D6D72' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  rowIcon: { marginRight: 12 },
  rowText: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 16, color: '#222222' },
  rowSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, color: '#8E8E93' },
  rowValue: { fontSize: 15, color: '#8E8E93', marginRight: 4 },
});
