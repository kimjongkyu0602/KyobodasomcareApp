import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLOR } from '../config';

type Props = { onRetry: () => void };

/** 네트워크 연결 오류 화면 (인터넷이 다시 연결되면 자동으로 새로고침됩니다) */
export default function NetworkError({ onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={64} color="#B0B0B0" />
      <Text style={styles.title}>네트워크 연결 오류</Text>
      <Text style={styles.message}>{'네트워크 연결 상태를 확인 후\n다시 시도해 주세요.'}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
        <Text style={styles.buttonText}>다시 시도</Text>
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
  title: { marginTop: 20, fontSize: 20, fontWeight: '700', color: '#222222' },
  message: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#666666', textAlign: 'center' },
  button: {
    marginTop: 28,
    minWidth: 160,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
