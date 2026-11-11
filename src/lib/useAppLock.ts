import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { APP_LOCK_AFTER_MS } from '../config';
import { getAppLockEnabled, setAppLockEnabled } from './settings';

export type LockToggleResult = 'ok' | 'cancel' | 'unavailable';

/** 인증할 방법이 아예 없을 때 나오는 오류 (이때는 잠그지 않습니다) */
const NO_AUTH_ERRORS = new Set(['not_enrolled', 'passcode_not_set', 'not_available']);

/**
 * 생체인증(Face ID) 앱 잠금
 * - 켜져 있으면 앱을 처음 열 때, 그리고 APP_LOCK_AFTER_MS 이상 백그라운드에 있다가 돌아올 때 잠급니다.
 * - 인증은 Face ID 실패 시 기기 암호로 대신할 수 있습니다. (disableDeviceFallback: false)
 * - 기기 암호·Face ID 가 모두 없어 인증할 방법이 없으면 잠금을 풀고 설정을 끕니다. (사용자가 갇히지 않도록)
 */
export function useAppLock() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const enabledRef = useRef(false);
  const backgroundAt = useRef<number | null>(null);
  const authBusy = useRef(false);

  const applyEnabled = useCallback(async (v: boolean) => {
    enabledRef.current = v;
    setEnabled(v);
    await setAppLockEnabled(v);
  }, []);

  useEffect(() => {
    getAppLockEnabled().then((v) => {
      enabledRef.current = v;
      setEnabled(v);
      if (v) setLocked(true);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
      } else if (state === 'active') {
        const at = backgroundAt.current;
        backgroundAt.current = null;
        if (enabledRef.current && at !== null && Date.now() - at >= APP_LOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(async () => {
    if (authBusy.current) return;
    authBusy.current = true;
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        await applyEnabled(false);
        setLocked(false);
        return;
      }
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: '앱 잠금 해제',
        cancelLabel: '취소',
        fallbackLabel: '암호 입력',
        disableDeviceFallback: false,
      });
      if (r.success) {
        setLocked(false);
      } else if (NO_AUTH_ERRORS.has(r.error)) {
        await applyEnabled(false);
        setLocked(false);
      }
    } catch {
      // 화면의 '잠금 해제' 버튼으로 다시 시도할 수 있습니다.
    } finally {
      authBusy.current = false;
    }
  }, [applyEnabled]);

  // 잠기면 인증 창을 한 번 바로 띄웁니다. (취소하면 버튼으로 다시 시도)
  useEffect(() => {
    if (locked && AppState.currentState === 'active') unlock();
  }, [locked, unlock]);

  /** 설정 화면에서 잠금을 켜고 끕니다. 켤 때는 인증이 실제로 되는지 먼저 확인합니다. */
  const setLockEnabled = useCallback(
    async (v: boolean): Promise<LockToggleResult> => {
      if (v) {
        try {
          const level = await LocalAuthentication.getEnrolledLevelAsync();
          if (level === LocalAuthentication.SecurityLevel.NONE) return 'unavailable';
          const r = await LocalAuthentication.authenticateAsync({
            promptMessage: '앱 잠금을 켜려면 인증해 주세요',
            cancelLabel: '취소',
            fallbackLabel: '암호 입력',
            disableDeviceFallback: false,
          });
          if (!r.success) return NO_AUTH_ERRORS.has(r.error) ? 'unavailable' : 'cancel';
        } catch {
          return 'unavailable';
        }
      }
      await applyEnabled(v);
      return 'ok';
    },
    [applyEnabled],
  );

  return { ready, enabled, locked, unlock, setLockEnabled };
}
