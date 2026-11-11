import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLOR } from '../config';

/** 생체인증 잠금 화면 (Face ID 실패 시 기기 암호로도 해제 가능) */
export default function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={styles.container} accessibilityViewIsModal>
      <Image source={require('../../assets/icon.png')} style={styles.logo} />
      <Ionicons name="lock-closed" size={28} color="#8E8E93" style={{ marginTop: 28 }} />
      <Text style={styles.title}>앱이 잠겨 있습니다</Text>
      <Text style={styles.message}>{'Face ID 또는 기기 암호로\n잠금을 해제해 주세요.'}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onUnlock}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
        <Text style={styles.buttonText}>잠금 해제</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: { width: 96, height: 96, borderRadius: 22 },
  title: { marginTop: 12, fontSize: 20, fontWeight: '700', color: '#222222' },
  message: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#666666', textAlign: 'center' },
  button: {
    marginTop: 28,
    minWidth: 180,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
