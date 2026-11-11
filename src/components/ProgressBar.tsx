import { StyleSheet, View } from 'react-native';
import { BRAND_COLOR } from '../config';

/** 웹 페이지 로딩 진행 막대 (상단) */
export default function ProgressBar({ progress }: { progress: number }) {
  if (progress <= 0 || progress >= 1) return null;
  return (
    <View pointerEvents="none" style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 10 },
  fill: { height: 2, backgroundColor: BRAND_COLOR },
});
