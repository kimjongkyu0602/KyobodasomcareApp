import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/** 앱이 켜져 있을 때도 알림 배너를 보여줍니다. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushTokenInfo = {
  /** APNs 기기 토큰 (서버에서 APNs 로 직접 보낼 때 사용) */
  token: string | null;
  type: 'apns';
  /** Expo 푸시 서비스 토큰 (EAS projectId 가 설정된 경우에만 값이 있음) */
  expoToken: string | null;
  /** 알림 권한 상태: granted | denied | undetermined */
  permission: string;
  error?: string;
};

let cached: PushTokenInfo | null = null;

/** 알림 권한을 요청하고 APNs 기기 토큰을 가져옵니다. */
export async function registerForPush(askPermission = true): Promise<PushTokenInfo> {
  const info: PushTokenInfo = { token: null, type: 'apns', expoToken: null, permission: 'undetermined' };
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain && askPermission) {
      perm = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
    }
    info.permission = perm.status;
    console.log('[KDC] 알림 권한 상태:', perm.status);
    if (!perm.granted) {
      cached = info;
      return info;
    }
    const device = await Notifications.getDevicePushTokenAsync();
    info.token = typeof device.data === 'string' ? device.data : JSON.stringify(device.data);
    // 디버그 확인용: Metro 터미널(npx expo start) 또는 Xcode 콘솔에 APNs 기기 토큰이 찍힙니다.
    console.log('[KDC] APNs device token:', info.token);

    // 선택 사항: Expo 푸시 서비스를 쓰려면 app.config.ts 의 extra.eas.projectId 를 설정하세요.
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (projectId) {
      try {
        info.expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch {
        // Expo 토큰은 선택 사항이므로 실패해도 무시합니다.
      }
    }
  } catch (e) {
    info.error = String(e instanceof Error ? e.message : e);
    console.warn('[KDC] 푸시 토큰을 가져오지 못했습니다:', info.error);
  }
  cached = info;
  return info;
}

/**
 * 토큰이 바뀌었을 때(addPushTokenListener) 새 토큰을 저장합니다.
 * 주의: 리스너 안에서 getDevicePushTokenAsync 를 다시 부르면 무한 반복되므로 받은 값만 저장합니다.
 */
export function updateCachedToken(data: unknown): PushTokenInfo {
  const token = typeof data === 'string' ? data : JSON.stringify(data);
  const prev = cached ?? { token: null, type: 'apns' as const, expoToken: null, permission: 'granted' };
  if (prev.token !== token) console.log('[KDC] APNs device token (변경됨):', token);
  cached = { ...prev, token, error: undefined };
  return cached;
}

/** 마지막으로 받은 토큰 정보 (아직 없으면 null) */
export function cachedPushInfo(): PushTokenInfo | null {
  return cached;
}

/** 알림 데이터에서 열 주소(data.url)를 꺼냅니다. */
export function urlFromNotification(n: Notifications.Notification | undefined | null): string | null {
  // 1) Expo 형식: 페이로드의 "body": { "url": ... } 가 content.data 로 들어옵니다.
  const fromData = n?.request?.content?.data?.url;
  if (typeof fromData === 'string' && fromData.length > 0) return fromData;
  // 2) APNs 직접 발송: 페이로드 최상위 "url" (iOS 는 trigger.payload 에 원본 전체가 들어 있음)
  const trigger = n?.request?.trigger as { type?: string; payload?: Record<string, unknown> } | null | undefined;
  const fromPayload = trigger?.payload?.url;
  return typeof fromPayload === 'string' && fromPayload.length > 0 ? fromPayload : null;
}
