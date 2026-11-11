import * as LocalAuthentication from 'expo-local-authentication';

/** Face ID / Touch ID 사용 가능 여부 */
export async function biometricAvailable() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const types = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];
    const type = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'faceId'
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? 'touchId'
        : 'none';
    return { available: hasHardware && enrolled, hasHardware, enrolled, type };
  } catch (e) {
    return { available: false, hasHardware: false, enrolled: false, type: 'none', error: String(e) };
  }
}

/** Face ID 인증을 실행합니다. 성공하면 success: true */
export async function biometricAuth(reason?: string) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason || '본인 확인을 위해 인증해 주세요.',
      cancelLabel: '취소',
      fallbackLabel: '암호 입력',
      disableDeviceFallback: false,
    });
    return result.success ? { success: true } : { success: false, error: result.error };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
