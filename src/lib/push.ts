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
    if (!perm.granted) {
      cached = info;
      return info;
    }
    const device = await Notifications.getDevicePushTokenAsync();
    info.token = typeof device.data === 'string' ? device.data : JSON.stringify(device.data);

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
  }
  cached = info;
  return info;
}

/** 마지막으로 받은 토큰 정보 (아직 없으면 null) */
export function cachedPushInfo(): PushTokenInfo | null {
  return cached;
}

/** 알림 데이터에서 열 주소(data.url)를 꺼냅니다. */
export function urlFromNotification(n: Notifications.Notification | undefined | null): string | null {
  const url = n?.request?.content?.data?.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}
