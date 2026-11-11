import { Alert, Linking } from 'react-native';
import * as Application from 'expo-application';
import { APP_STORE_LOOKUP_URL } from '../config';

/** "1.2.10" 과 "1.2.9" 같은 버전 문자열을 비교합니다. a 가 크면 양수 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** App Store 에 새 버전이 있으면 업데이트 안내 팝업을 띄웁니다. 실패하면 조용히 넘어갑니다. */
export async function checkForUpdate(): Promise<void> {
  try {
    const current = Application.nativeApplicationVersion;
    if (!current) return;
    const res = await fetch(APP_STORE_LOOKUP_URL, { cache: 'no-store' } as RequestInit);
    if (!res.ok) return;
    const json = (await res.json()) as { resultCount?: number; results?: { version?: string; trackViewUrl?: string }[] };
    const store = json.results?.[0];
    if (!store?.version || !store.trackViewUrl) return;
    if (compareVersions(store.version, current) <= 0) return;
    const storeUrl = store.trackViewUrl;
    Alert.alert('새 버전이 있습니다', `최신 버전(${store.version})으로 업데이트해 주세요.`, [
      { text: '나중에', style: 'cancel' },
      { text: '업데이트', onPress: () => Linking.openURL(storeUrl).catch(() => {}) },
    ]);
  } catch {
    // 네트워크 오류 등은 무시합니다.
  }
}
