import { Linking } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { CUSTOMER_CENTER, USER_AGENT_SUFFIX } from '../config';
import { biometricAuth, biometricAvailable } from './biometric';
import { cachedPushInfo, registerForPush } from './push';

/**
 * 웹 → 앱 브리지
 *
 * 웹에서 보내는 메시지 형식 (JSON 문자열):
 *   window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'getPushToken', callbackId: '1' }))
 * 또는 앱이 넣어 주는 도우미 함수:
 *   const res = await window.kdcApp.request('getPushToken')
 *
 * 앱 → 웹 응답:
 *   window.kdcAppOnMessage({ action, callbackId?, ...결과 })
 */

export type BridgeRequest = { action?: string; callbackId?: string | number; [key: string]: unknown };
export type BridgeResponse = { action: string; callbackId?: string | number; [key: string]: unknown };

/** 웹뷰에 넣을 응답 스크립트를 만듭니다. */
export function buildDispatchScript(payload: BridgeResponse): string {
  const json = JSON.stringify(payload).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `(function(m){try{if(window.__kdcAppDispatch){window.__kdcAppDispatch(m);}else if(window.kdcAppOnMessage){window.kdcAppOnMessage(m);}}catch(e){}})(${json});true;`;
}

function phoneUrl(raw: unknown): string {
  const num = (typeof raw === 'string' && raw.trim() ? raw : CUSTOMER_CENTER).replace(/[^0-9+]/g, '');
  return `tel:${num}`;
}

/** 브리지 액션을 처리하고 결과 객체를 돌려줍니다. (내부용 액션은 null) */
export async function handleBridgeMessage(msg: BridgeRequest): Promise<BridgeResponse | null> {
  const action = typeof msg.action === 'string' ? msg.action : '';
  const base = { action, ...(msg.callbackId !== undefined ? { callbackId: msg.callbackId } : {}) };
  switch (action) {
    case 'getPushToken': {
      const info = cachedPushInfo() ?? (await registerForPush(false));
      return { ...base, ...info };
    }
    case 'requestPushPermission': {
      const info = await registerForPush(true);
      return { ...base, ...info };
    }
    case 'biometricAvailable':
      return { ...base, ...(await biometricAvailable()) };
    case 'biometricAuth':
      return { ...base, ...(await biometricAuth(typeof msg.reason === 'string' ? msg.reason : undefined)) };
    case 'openExternal': {
      const url = typeof msg.url === 'string' ? msg.url : '';
      try {
        await Linking.openURL(url);
        return { ...base, success: true };
      } catch (e) {
        return { ...base, success: false, error: String(e) };
      }
    }
    case 'call': {
      try {
        await Linking.openURL(phoneUrl(msg.number));
        return { ...base, success: true };
      } catch (e) {
        return { ...base, success: false, error: String(e) };
      }
    }
    case 'getAppInfo':
      return {
        ...base,
        platform: 'ios',
        appVersion: Application.nativeApplicationVersion,
        buildNumber: Application.nativeBuildVersion,
        bundleId: Application.applicationId,
        osVersion: Device.osVersion,
        deviceModel: Device.modelName,
        userAgentSuffix: USER_AGENT_SUFFIX,
      };
    default:
      return { ...base, success: false, error: `unknown action: ${action}` };
  }
}

/**
 * 페이지가 열리기 전에 웹뷰에 넣는 스크립트
 * - window.kdcApp.request(action, params) : Promise 로 결과를 받는 도우미
 * - window.kdcApp.isApp = true
 * - SPA 주소 변경(pushState 등)을 앱에 알려 하단 탭 선택 표시를 맞춤
 */
export const INJECTED_BEFORE_LOAD = `
(function () {
  if (window.kdcApp && window.kdcApp.__installed) { return; }
  var pending = {};
  var seq = 0;
  function send(obj) {
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
  }
  window.__kdcAppDispatch = function (m) {
    if (m && m.callbackId !== undefined && pending[m.callbackId]) {
      var cb = pending[m.callbackId];
      delete pending[m.callbackId];
      cb(m);
    }
    if (typeof window.kdcAppOnMessage === 'function') { window.kdcAppOnMessage(m); }
  };
  window.kdcApp = {
    __installed: true,
    isApp: true,
    platform: 'ios',
    postMessage: function (obj) { send(obj); },
    request: function (action, params) {
      return new Promise(function (resolve) {
        var id = 'kdc_' + (++seq);
        pending[id] = resolve;
        var msg = Object.assign({}, params || {}, { action: action, callbackId: id });
        send(msg);
      });
    }
  };
  function notify() { send({ action: '__urlChange', url: location.href }); }
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function () { var r = orig.apply(this, arguments); setTimeout(notify, 0); return r; };
  });
  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', notify);
})();
true;
`;
