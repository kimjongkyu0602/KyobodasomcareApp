import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import { WebView } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';

import { SPLASH_MAX_MS, START_URL, TABS, TABS_ENABLED, USER_AGENT_SUFFIX, type TabItem } from './config';
import NetworkError from './components/NetworkError';
import ProgressBar from './components/ProgressBar';
import TabBar from './components/TabBar';
import { buildDispatchScript, handleBridgeMessage, INJECTED_BEFORE_LOAD, type BridgeRequest } from './lib/bridge';
import { downloadAndShare } from './lib/download';
import { cachedPushInfo, registerForPush, urlFromNotification } from './lib/push';
import { checkForUpdate } from './lib/updateCheck';
import { activeTabIndex, isInternalUrl, resolveUrl, schemeOf } from './lib/url';

// 웹 첫 화면이 뜰 때까지 네이티브 스플래시(흰 배경 + 로고)를 유지합니다.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

/** 웹뷰 안에서 그대로 열어도 되는 스킴 */
const WEB_SCHEMES = new Set(['http', 'https', 'about', 'data', 'blob', 'javascript']);

/** 무시해도 되는 웹뷰 오류 코드 (요청 취소, 다운로드/외부 앱 전환으로 인한 중단 등) */
const IGNORED_ERROR_CODES = new Set([-999, 101, 102, 204]);

function openExternally(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('알림', '이 링크를 열 수 있는 앱이 없습니다.');
  });
}

/** 콜드 스타트(앱이 꺼진 상태)에서 푸시를 눌러 앱이 열렸다면 그 주소로 시작합니다. */
function initialUrl(): string {
  try {
    const url = urlFromNotification(Notifications.getLastNotificationResponse()?.notification);
    if (url) {
      Notifications.clearLastNotificationResponse();
      return resolveUrl(url);
    }
  } catch {
    // 무시
  }
  return START_URL;
}

function Main() {
  const webRef = useRef<ComponentRef<typeof WebView>>(null);
  const [sourceUrl, setSourceUrl] = useState<string>(initialUrl);
  const [webKey, setWebKey] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string>(sourceUrl);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const hasErrorRef = useRef(false);
  const lastUrlRef = useRef<string>(sourceUrl);
  const firstLoadDone = useRef(false);
  const splashHidden = useRef(false);

  const hideSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // 웹 로딩이 늦어도 최대 SPLASH_MAX_MS 후에는 스플래시를 닫습니다.
  useEffect(() => {
    const t = setTimeout(hideSplash, SPLASH_MAX_MS);
    return () => clearTimeout(t);
  }, [hideSplash]);

  const setError = useCallback((v: boolean) => {
    hasErrorRef.current = v;
    setHasError(v);
  }, []);

  /** 웹뷰를 처음부터 다시 띄웁니다. (오류 화면에서 다시 시도할 때) */
  const reloadFresh = useCallback(
    (url?: string) => {
      setError(false);
      setProgress(0);
      setSourceUrl(url ?? lastUrlRef.current ?? START_URL);
      setWebKey((k) => k + 1);
    },
    [setError],
  );

  /** 웹뷰를 주어진 주소로 이동합니다. */
  const navigate = useCallback(
    (url: string) => {
      lastUrlRef.current = url;
      if (hasErrorRef.current || !webRef.current) {
        reloadFresh(url);
        return;
      }
      webRef.current.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
    },
    [reloadFresh],
  );

  const inject = useCallback((script: string) => {
    webRef.current?.injectJavaScript(script);
  }, []);

  /** 푸시 토큰을 웹에 알려줍니다. (페이지가 로드될 때마다) */
  const injectPushToken = useCallback(() => {
    const info = cachedPushInfo();
    if (info) inject(buildDispatchScript({ action: 'pushToken', ...info }));
  }, [inject]);

  // 인터넷이 다시 연결되면 오류 화면에서 자동으로 새로고침합니다.
  useEffect(() => {
    let wasConnected: boolean | null = null;
    const unsub = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected && state.isInternetReachable !== false;
      if (connected && wasConnected === false && hasErrorRef.current) {
        reloadFresh();
      }
      wasConnected = connected;
    });
    return () => unsub();
  }, [reloadFresh]);

  // 앱이 켜져 있거나 백그라운드일 때 푸시를 누르면 data.url 로 이동합니다.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = urlFromNotification(response.notification);
      if (url) {
        navigate(resolveUrl(url));
        Notifications.clearLastNotificationResponse();
      }
    });
    const tokenSub = Notifications.addPushTokenListener(() => {
      registerForPush(false).then(injectPushToken).catch(() => {});
    });
    return () => {
      sub.remove();
      tokenSub.remove();
    };
  }, [navigate, injectPushToken]);

  const onLoadEnd = useCallback(() => {
    hideSplash();
    if (!firstLoadDone.current) {
      firstLoadDone.current = true;
      // 첫 화면이 뜬 뒤에 알림 권한을 요청하고, 새 버전을 확인합니다.
      registerForPush(true)
        .then(injectPushToken)
        .catch(() => {});
      checkForUpdate();
    } else {
      injectPushToken();
    }
  }, [hideSplash, injectPushToken]);

  const onError = useCallback(
    (e: WebViewErrorEvent) => {
      const { code } = e.nativeEvent;
      if (IGNORED_ERROR_CODES.has(code)) return;
      hideSplash();
      setError(true);
    },
    [hideSplash, setError],
  );

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    if (/^https?:/i.test(nav.url)) setCurrentUrl(nav.url);
  }, []);

  const onShouldStartLoadWithRequest = useCallback((req: ShouldStartLoadRequest) => {
    const { url } = req;
    const scheme = schemeOf(url);
    if (!WEB_SCHEMES.has(scheme)) {
      // tel:, mailto:, sms:, 결제/본인인증 앱 스킴 등은 해당 앱으로 넘깁니다.
      openExternally(url);
      return false;
    }
    if (scheme === 'http' || scheme === 'https') {
      if (req.isTopFrame && !isInternalUrl(url) && req.navigationType === 'click') {
        // 다른 사이트 링크를 누르면 Safari 로 엽니다.
        openExternally(url);
        return false;
      }
      if (req.isTopFrame) lastUrlRef.current = url;
    }
    return true;
  }, []);

  /** target="_blank" / window.open 처리: 우리 도메인은 같은 화면, 그 외는 Safari */
  const onOpenWindow = useCallback(
    (e: { nativeEvent: { targetUrl: string } }) => {
      const url = e.nativeEvent.targetUrl;
      if (!url) return;
      const scheme = schemeOf(url);
      if ((scheme === 'http' || scheme === 'https') && isInternalUrl(url)) {
        navigate(url);
      } else {
        openExternally(url);
      }
    },
    [navigate],
  );

  const onMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      let msg: BridgeRequest;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      if (msg.action === '__urlChange') {
        if (typeof msg.url === 'string') setCurrentUrl(msg.url);
        return;
      }
      const res = await handleBridgeMessage(msg);
      if (res) inject(buildDispatchScript(res));
    },
    [inject],
  );

  const onTabPress = useCallback((tab: TabItem) => navigate(resolveUrl(tab.path)), [navigate]);

  return (
    <SafeAreaView style={styles.root} edges={TABS_ENABLED ? ['top'] : ['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.webContainer}>
        <WebView
          key={webKey}
          ref={webRef}
          source={{ uri: sourceUrl }}
          style={styles.web}
          originWhitelist={['*']}
          // 로그인 쿠키/세션 유지
          sharedCookiesEnabled
          // 스와이프 뒤로/앞으로 가기, 당겨서 새로고침
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          // 동영상 인라인 재생
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          // 위치(병원검색), 파일 업로드(input type=file)
          geolocationEnabled
          allowFileAccess
          // 새 창(target=_blank)은 같은 화면에서
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically
          onOpenWindow={onOpenWindow}
          allowsLinkPreview={false}
          applicationNameForUserAgent={USER_AGENT_SUFFIX}
          injectedJavaScriptBeforeContentLoaded={INJECTED_BEFORE_LOAD}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onNavigationStateChange={onNavigationStateChange}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          onLoadEnd={onLoadEnd}
          onError={onError}
          renderError={() => <View style={styles.blank} />}
          onMessage={onMessage}
          onFileDownload={(e) => downloadAndShare(e.nativeEvent.downloadUrl)}
          // 웹 프로세스가 메모리 부족 등으로 종료되면 다시 로드
          onContentProcessDidTerminate={() => webRef.current?.reload()}
        />
        <ProgressBar progress={progress} />
        {hasError && <NetworkError onRetry={() => reloadFresh()} />}
      </View>
      {TABS_ENABLED && TABS.length > 0 && (
        <TabBar tabs={TABS} activeIndex={activeTabIndex(currentUrl)} onPress={onTabPress} />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  webContainer: { flex: 1 },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  blank: { flex: 1, backgroundColor: '#FFFFFF' },
});
