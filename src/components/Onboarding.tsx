import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_COLOR } from '../config';
import { getPushPermissionStatus } from '../lib/push';

type IconName = keyof typeof Ionicons.glyphMap;

type Slide = { key: string; icon: IconName | 'logo'; title: string; body: string };

const SLIDES: Slide[] = [
  {
    key: 'intro',
    icon: 'logo',
    title: '교보다솜케어\n헬스케어서비스',
    body: '건강검진, 건강정보, 나의 서비스를\n한 곳에서 편리하게 이용하세요.',
  },
  {
    key: 'reserve',
    icon: 'calendar-outline',
    title: '건강검진·상담 예약',
    body: '건강검진 신청과 상담 예약을\n앱에서 간편하게 진행할 수 있습니다.',
  },
  {
    key: 'push',
    icon: 'notifications-outline',
    title: '알림 안내',
    body: '예약 안내와 건강 소식을 알림으로 받아 보세요.\n알림은 언제든 더보기 탭에서 바꿀 수 있습니다.',
  },
];

type Props = {
  onFinish: () => void;
  /** 알림 권한 요청 (마지막 장의 '알림 받기' 버튼을 눌렀을 때만) */
  onRequestPush: () => Promise<void>;
};

/** 첫 실행 안내 (한 번만 표시) */
export default function Onboarding({ onFinish, onRequestPush }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const [push, setPush] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [busy, setBusy] = useState(false);
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    getPushPermissionStatus().then(setPush);
  }, []);

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  const askPush = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRequestPush();
    } finally {
      setBusy(false);
      onFinish();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.topBar}>
        {!last && (
          <Pressable accessibilityRole="button" onPress={onFinish} hitSlop={12}>
            <Text style={styles.skip}>건너뛰기</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
        {SLIDES.map((s) => (
          <View key={s.key} style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              {s.icon === 'logo' ? (
                <Image source={require('../../assets/icon.png')} style={styles.logo} />
              ) : (
                <Ionicons name={s.icon} size={72} color={BRAND_COLOR} />
              )}
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.buttons}>
        {!last ? (
          <PrimaryButton title="다음" onPress={() => goTo(index + 1)} />
        ) : push === 'undetermined' ? (
          <>
            <PrimaryButton title="알림 받기" onPress={askPush} disabled={busy} />
            <Pressable accessibilityRole="button" onPress={onFinish} style={styles.secondary} hitSlop={8}>
              <Text style={styles.secondaryText}>알림 없이 시작하기</Text>
            </Pressable>
          </>
        ) : (
          <PrimaryButton title="시작하기" onPress={onFinish} />
        )}
      </View>
    </View>
  );
}

function PrimaryButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primary, (pressed || disabled) && { opacity: 0.8 }]}>
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: '#FFFFFF' },
  topBar: { height: 48, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20 },
  skip: { fontSize: 15, color: '#8E8E93' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#EEF7EC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 120, height: 120, borderRadius: 24 },
  title: { marginTop: 36, fontSize: 24, lineHeight: 32, fontWeight: '700', color: '#222222', textAlign: 'center' },
  body: { marginTop: 14, fontSize: 16, lineHeight: 24, color: '#666666', textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4, backgroundColor: '#D1D1D6' },
  dotActive: { width: 20, backgroundColor: BRAND_COLOR },
  buttons: { paddingHorizontal: 24, minHeight: 104 },
  primary: { height: 52, borderRadius: 10, backgroundColor: BRAND_COLOR, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  secondary: { marginTop: 14, alignItems: 'center' },
  secondaryText: { fontSize: 15, color: '#8E8E93' },
});
