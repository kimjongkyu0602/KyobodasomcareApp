import AsyncStorage from '@react-native-async-storage/async-storage';

/** 앱 안에만 저장하는 설정값 (민감 정보 아님) */
const KEYS = {
  onboardingDone: 'kdc.onboardingDone',
  appLockEnabled: 'kdc.appLockEnabled',
} as const;

async function getBool(key: string, fallback = false): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

async function setBool(key: string, value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value ? '1' : '0');
  } catch {
    // 저장 실패는 무시합니다. (다음 실행 때 기본값으로 동작)
  }
}

/** 첫 실행 안내(온보딩)를 이미 봤는지 */
export const getOnboardingDone = () => getBool(KEYS.onboardingDone);
export const setOnboardingDone = () => setBool(KEYS.onboardingDone, true);

/** 생체인증(Face ID) 앱 잠금 사용 여부 */
export const getAppLockEnabled = () => getBool(KEYS.appLockEnabled);
export const setAppLockEnabled = (v: boolean) => setBool(KEYS.appLockEnabled, v);
