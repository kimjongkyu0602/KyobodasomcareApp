# 교보다솜케어 헬스케어서비스 iOS 앱 (React Native / Expo)

웹사이트(`https://www.kyobodasomcare.com`)를 앱 화면 전체에 띄우는 **하이브리드 앱 껍데기**입니다.
화면과 기능은 웹에서 구현하고, 앱은 심사와 사용성에 필요한 네이티브 기능(푸시, Face ID, 하단 탭, 스플래시 등)만 담당합니다.

> 이전 SwiftUI 네이티브 버전은 `swift-native` 브랜치에 그대로 보관돼 있습니다.

- 번들 ID: `com.kyobodasomcare.app` / 팀 ID: `V388NH26FH`
- 앱 이름: `교보다솜케어 헬스케어서비스` / 버전 `1.0.0` (빌드 `2`)
- Expo SDK 58 · React Native 0.88 · TypeScript

## 폴더 구조

```
app.config.ts          앱 이름, 번들 ID, 버전, 권한 문구, 개인정보 매니페스트, 플러그인 설정
index.ts               앱 시작점
assets/icon.png        1024x1024 앱 아이콘 (스플래시 로고로도 사용)
src/config.ts          ★ 자주 바꾸는 설정값 (시작 주소, 내부 도메인, 탭 메뉴 등)
src/App.tsx            메인 화면 (웹뷰 + 하단 탭 + 오류 화면 + 푸시 처리)
src/components/        NetworkError(네트워크 오류 화면), TabBar(하단 탭), ProgressBar(로딩 바)
src/lib/bridge.ts      웹 ↔ 앱 브리지
src/lib/push.ts        푸시 알림 (APNs 기기 토큰)
src/lib/biometric.ts   Face ID
src/lib/updateCheck.ts App Store 새 버전 확인
src/lib/download.ts    파일 다운로드 → 공유 시트
src/lib/url.ts         내부/외부 링크 판별, 탭 선택 계산
ios/                   (git 에 없음) `npx expo prebuild` 로 자동 생성되는 Xcode 프로젝트
```

### ios/ 폴더를 git 에 올리지 않는 이유
Expo의 CNG(Continuous Native Generation) 방식으로, `ios/` 는 `app.config.ts` 와 플러그인 설정으로부터
`npx expo prebuild` 가 매번 똑같이 만들어 냅니다. 네이티브 설정은 `ios/` 를 직접 고치지 말고
`app.config.ts` 를 고친 뒤 prebuild 를 다시 실행하세요. (직접 고친 내용은 prebuild 때 지워집니다)

## 처음 설치 (맥)

이 맥에는 아래 도구가 사용자 폴더에 설치돼 있습니다. (`~/.zprofile` 에 PATH 설정 완료)
- Node.js LTS: `~/.local/node`
- Ruby 3.4 (Homebrew portable-ruby): `~/.local/ruby`, gem 설치 위치 `~/.local/gems`
- CocoaPods: `~/.local/gems/bin/pod`

새 터미널을 열면 바로 `node`, `npm`, `pod` 를 쓸 수 있습니다.

## 실행 / 빌드

```bash
cd ~/Developer/KyobodasomcareApp
npm install                                  # 패키지 설치
npx expo prebuild --platform ios --clean     # ios/ 폴더 생성 (pod install 포함)
open ios/*.xcworkspace                       # Xcode 로 열기 (.xcodeproj 가 아니라 .xcworkspace)
```

Xcode에서 기기를 고르고 ▶ 실행하거나, 터미널에서 바로 실행할 수도 있습니다.

```bash
npx expo run:ios                 # 시뮬레이터 (개발 모드, Metro 서버 필요)
npx expo run:ios --device        # 케이블로 연결한 아이폰
npx expo run:ios --configuration Release
```

### App Store Connect 업로드
가장 쉬운 방법은 스크립트입니다. (업로드는 하지 않고 IPA 파일만 만듭니다)
```bash
./scripts/build-ipa.sh      # → build/export/app.ipa (Apple Distribution 서명, 푸시 production)
```
만든 IPA 는 Transporter 앱이나 Xcode Organizer 로 올립니다.

> 참고: 팀에 등록된 테스트 기기가 없으면 Xcode 의 Product > Archive 가
> "Your team has no devices from which to generate a provisioning profile" 오류로 실패합니다.
> 스크립트는 서명 없이 Archive 한 뒤 Export 단계에서 배포용으로 서명해 이 문제를 피합니다.
> 아이폰을 한 번 케이블로 연결해 팀에 등록하면 아래 Xcode 방법도 그대로 쓸 수 있습니다.

Xcode 로 직접 하는 경우:
1. `app.config.ts` 의 `ios.buildNumber` 를 1 올립니다. (업로드마다 달라야 함)
2. `npx expo prebuild --platform ios --clean`
3. Xcode에서 `ios/*.xcworkspace` 열기 → 기기 `Any iOS Device (arm64)` → Product > Archive → Distribute App → App Store Connect

## 설정값 (`src/config.ts`)

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `START_URL` | `https://www.kyobodasomcare.com` | 앱을 열면 처음 보여줄 주소 |
| `INTERNAL_HOSTS` | `['kyobodasomcare.com']` | 앱 안에서 열 도메인 (하위 도메인 포함). 그 외 링크는 Safari |
| `USER_AGENT_SUFFIX` | `KDCHealthcareApp/iOS` | User-Agent 끝에 붙는 값. 웹에서 앱 접속 판별용 |
| `CUSTOMER_CENTER` | `1588-7524` | 더보기 '고객센터 전화'와 브리지 `call` 의 기본 번호 (번호는 이 한 곳만 바꾸면 됨) |
| `CONTACT_PATH` | `/CSCT0010M.do?menuId=CS0403` | 더보기 '문의하기' |
| `SERVICE_INFO_PATH` | `/HCCT0010M.do?menuId=CS0201` | 더보기 '서비스안내' |
| `PRIVACY_POLICY_URL` / `TERMS_URL` | `''` | 비어 있으면 웹 첫 화면 하단의 약관 팝업(`viewBottom`)을 띄움. **웹팀이 고정 주소를 만들면 여기에 입력** |
| `APP_LOCK_AFTER_MS` | 5분 | 생체인증 잠금: 이 시간 이상 백그라운드에 있다 돌아오면 다시 잠금 |
| `TABS_ENABLED` | `true` | 하단 탭 메뉴 표시 여부 |
| `TABS` | 홈 `/`, 건강검진 `/ReMd0020/REMD0020M.do`, 건강정보 `/HcCi0010/HCCI0010M.do`, 마이페이지(나의서비스) `/HcIt0010/HCIT0010R.do`, 더보기(네이티브) | 웹 메뉴의 실제 주소 (menuId 쿼리 포함). 건강검진·건강정보·마이페이지는 로그인 필요. `native: 'more'` 탭은 네이티브 화면 |
| `SPLASH_MAX_MS` | `3000` | 스플래시 최대 표시 시간 |

웹 쪽에서 앱 접속 판별 예시:
```js
const isApp = /KDCHealthcareApp\/iOS/.test(navigator.userAgent) || !!window.kdcApp;
// 앱 안에서는 하단 탭이 네이티브로 있으므로 웹의 하단 메뉴는 숨기는 것을 권장합니다.
```

## 네이티브 화면 (웹 화면 아님)
- **첫 실행 안내** (`src/components/Onboarding.tsx`): 서비스 소개 / 건강검진·상담 예약 / 알림 안내 3장, 건너뛰기·다음. 한 번만 표시(AsyncStorage `kdc.onboardingDone`). 알림 권한은 마지막 장의 **알림 받기**를 눌렀을 때만 요청하고, "알림 없이 시작하기"로 건너뛸 수 있음. 이미 권한을 정한 기기에서는 "시작하기"만 표시
- **더보기 탭** (`src/components/MoreScreen.tsx`)
  - 알림 받기: 현재 iOS 권한 상태 표시. 켜기 → (처음이면) 권한 요청, 이미 거부했으면 iOS 설정 안내. 끄기 → iOS 설정 안내 (앱에서 직접 끌 수 없음)
  - 생체인증(Face ID) 잠금: 켤 때 인증을 한 번 확인한 뒤 저장. 켜져 있으면 앱 실행 시와 5분 이상 백그라운드 후 돌아올 때 잠금 화면 + Face ID. Face ID 실패 시 **기기 암호**로 해제 가능. Face ID·기기 암호가 모두 없으면 잠그지 않고 설정을 끔 (사용자가 갇히지 않도록)
  - 고객센터 전화, 문의하기, 서비스안내, 보고 있던 화면 공유(iOS 공유 시트), 캐시 삭제(웹 캐시·웹 저장소 삭제, **쿠키는 유지되어 로그인 유지**), 개인정보처리방침, 이용약관, 앱 버전(빌드)
- **잠금 화면** (`src/components/AppLockScreen.tsx`), 잠금 로직 `src/lib/useAppLock.ts`

## 회원가입 숨김·차단 (기존 회원 전용 앱)
- 이 앱은 교보다솜케어 기존 회원·제휴 고객 전용이라 앱에서 계정을 만들 수 없게 합니다. (App Store 5.1.1(v): 계정을 만들 수 있으면 앱 안 계정 삭제가 필수)
- `src/lib/signupGuard.ts`: 모든 웹 페이지에 스크립트를 넣어 **링크·버튼**(a, button, onclick 등) 중 글자가 회원가입 관련이거나 주소가 회원가입 주소인 것을 숨기고, 가입 권유 짧은 문구도 숨깁니다. 화면이 바뀌어도 다시 검사(MutationObserver). 약관 본문의 '회원가입' 같은 일반 글자는 건드리지 않습니다.
- 회원가입 주소로 이동하려 하면 막고 "이 앱은 교보다솜케어 기존 회원 전용입니다" 안내 후 로그인 화면(`/login.do`)으로 보냅니다.
- 숨길 글자·보호할 글자(로그인, 본인확인, 인증, 찾기, 탈퇴)·주소 패턴은 `src/config.ts` 의 `SIGNUP_GUARD` 에서 바꿉니다.
- 2026-11-11 사이트 확인: 회원가입은 로그인 화면 하단 버튼 → `/UsSb0010/USSB0010M.do` → `/UsSb0011/USSB0011M.do` 뿐입니다.

## 앱 동작 요약
- 로그인 쿠키/세션 유지 (`sharedCookiesEnabled`), 스와이프 뒤로 가기, 당겨서 새로고침, 상단 로딩 바, 동영상 인라인 재생
- 우리 도메인 링크는 앱 안에서, 다른 도메인 링크를 **누르면** Safari 로 열림 (리다이렉트·결제창 이동은 앱 안에서 유지)
- `tel:` `mailto:` `sms:` 및 기타 앱 스킴(결제·본인인증 앱 등)은 해당 앱으로 연결
- 링크 `target="_blank"`: 우리 도메인은 같은 화면에서, 다른 도메인은 Safari
- 스크립트 `window.open`: 앱 안의 **팝업 웹뷰**(상단 "닫기" 버튼)로 열림. `window.opener` / `postMessage` / `window.close()` 가 그대로 동작하므로 휴대폰 본인확인(mobile-ok)·간편인증(ez-iok) 로그인 창이 앱에서 정상 동작합니다. 팝업 안의 앱 스킴(PASS·카카오·토스 등)은 해당 앱으로 연결
  - 구현: `patches/react-native-webview+14.0.1.patch` (patch-package, `npm install` 시 자동 적용). react-native-webview 버전을 올리면 패치를 다시 만들어야 합니다.
- 웹의 `alert` / `confirm` / `prompt` 는 iOS 기본 팝업으로 표시 (버튼: 확인/취소)
- `<input type="file">` 사진/카메라/파일 업로드 (위치 정보는 사용하는 화면이 없어 권한을 넣지 않았습니다)
- 네트워크 오류 시 "네트워크 연결 오류" 화면, 인터넷이 다시 연결되면 자동 새로고침
- 서버 오류(5xx) 시 "일시적인 오류가 발생했습니다" 화면 + 다시 시도
- 앱을 열면 아이콘 배지 숫자 초기화
- 웹 프로세스가 종료되면(메모리 부족 등) 자동 다시 로드
- 첫 화면이 뜨면 App Store 새 버전 확인 ("새 버전이 있습니다" → 업데이트/나중에). 알림 권한 창은 자동으로 띄우지 않음 (온보딩 마지막 장 / 더보기 / 웹 브리지 `requestPushPermission` 에서만 요청). 이미 허용된 기기는 실행 시 토큰을 받아 웹에 전달
- 파일 다운로드(Content-Disposition: attachment 등) → 앱이 받은 뒤 공유 시트(파일에 저장/공유) 표시
  - 제한: `blob:` / `data:` 주소 다운로드는 지원하지 않습니다. 웹에서는 일반 https 다운로드 주소를 써 주세요.

## 웹 ↔ 앱 브리지 (웹 개발팀용)

앱은 페이지가 열리기 전에 `window.kdcApp` 을 넣어 줍니다.

### 1) Promise 방식 (권장)
```js
if (window.kdcApp) {
  const info = await window.kdcApp.request('getAppInfo');
  // { action:'getAppInfo', platform:'ios', appVersion:'1.0.0', buildNumber:'2', bundleId, osVersion, deviceModel, userAgentSuffix }

  const push = await window.kdcApp.request('getPushToken');
  // { action:'getPushToken', token:'<APNs 기기 토큰 hex>', type:'apns', expoToken:null, permission:'granted' }

  const bio = await window.kdcApp.request('biometricAvailable');
  // { available:true, hasHardware:true, enrolled:true, type:'faceId' | 'touchId' | 'none' }

  const auth = await window.kdcApp.request('biometricAuth', { reason: '간편 로그인을 위해 인증해 주세요.' });
  // { success:true } 또는 { success:false, error:'user_cancel' ... }

  await window.kdcApp.request('openExternal', { url: 'https://example.com' }); // Safari/다른 앱으로 열기
  await window.kdcApp.request('call', { number: '1588-7524' });               // 전화 (번호 생략 시 고객센터)
  await window.kdcApp.request('requestPushPermission');                       // 알림 권한 다시 요청
}
```

### 2) 메시지 방식 (직접 postMessage)
```js
window.kdcAppOnMessage = function (msg) {
  // 앱이 보내는 모든 응답/이벤트가 여기로 옵니다: { action, callbackId?, ...결과 }
  if (msg.action === 'pushToken') {
    // 페이지가 로드될 때마다 앱이 자동으로 보내 주는 푸시 토큰
    // 로그인 상태라면 서버에 { userId, token: msg.token, platform: 'ios' } 를 저장하세요.
  }
};
window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'getPushToken' }));
```

| action | 보내는 값 | 응답 |
| --- | --- | --- |
| `getPushToken` | - | `token`, `type:'apns'`, `expoToken`, `permission` |
| `requestPushPermission` | - | 위와 같음 |
| `biometricAvailable` | - | `available`, `hasHardware`, `enrolled`, `type` |
| `biometricAuth` | `reason` (선택) | `success`, `error` |
| `openExternal` | `url` | `success` |
| `call` | `number` (선택) | `success` |
| `getAppInfo` | - | `platform`, `appVersion`, `buildNumber`, `bundleId`, `osVersion`, `deviceModel` |
| (자동) `pushToken` | - | 페이지 로드마다 앱 → 웹으로 전송 |

## 푸시 알림

- 앱은 **APNs 기기 토큰**을 사용합니다 (Expo 푸시 서비스 아님). 서버가 APNs 로 직접 보냅니다.
- 개발 빌드(Xcode 실행)는 APNs **sandbox**, TestFlight/App Store 빌드는 **production** 서버를 써야 합니다.
- 페이로드 예시 (APNs HTTP/2, `apns-topic: com.kyobodasomcare.app`):
```json
{
  "aps": { "alert": { "title": "예약 확정", "body": "3월 12일 오전 10시 상담이 확정되었습니다." }, "sound": "default" },
  "url": "/reservation/detail?id=123"
}
```
  - `url` (선택): 알림을 누르면 앱이 이 주소를 엽니다. `/경로` 또는 전체 주소 모두 가능. 앱이 꺼져 있을 때도 동작합니다.
  - 최상위 `"url"` 또는 `"body": { "url": "..." }` 둘 다 인식합니다.
- 맥에서 테스트 발송: `node ~/.kdc-tools/send-push.mjs <기기토큰> "제목" "내용" [url] [--prod]`
  (키 파일은 `~/.kdc-secrets/AuthKey_WJDBC4ZJK4.p8`, 저장소에는 절대 넣지 않음)
- 앱이 켜져 있을 때도 배너가 표시됩니다.
- (선택) Expo 푸시 서비스를 쓰려면 EAS 프로젝트를 만들고 `app.config.ts` 의 `extra.eas.projectId` 를 넣으면 `expoToken` 도 채워집니다.

## 심사 점검표

[docs/REVIEW_CHECKLIST.md](docs/REVIEW_CHECKLIST.md) 참고 (앱/웹팀/담당자 할 일 구분).

## 남은 수동 작업

1. **APNs 인증 키 발급**: Apple Developer > Certificates, IDs & Profiles > Keys 에서 + → "Apple Push Notifications service (APNs)" 체크 → `.p8` 다운로드 (한 번만 받을 수 있음). Key ID, 팀 ID(`V388NH26FH`)와 함께 서버팀에 전달. `.p8` 은 git 에 올리지 마세요.
2. **App ID 푸시 기능**: Identifiers > `com.kyobodasomcare.app` 에서 Push Notifications 가 켜져 있는지 확인 (Xcode 자동 서명이 보통 켜 줍니다).
3. **서버 발송**: 웹 로그인 시 브리지로 받은 토큰을 회원과 연결해 저장하고, APNs 로 발송하는 서버 기능 구현.
4. **탭 경로**: 웹에 '병원검색'·'심리케어'·'마이페이지' 메뉴가 생기면 `src/config.ts` 의 `TABS` 를 바꿔 주세요. 웹팀 확인 필요: 로그아웃 상태에서 `/HcCi0010/HCCI0010M.do`(건강정보)는 로그인 화면이 아니라 오류 페이지가 뜹니다 (다른 회원 메뉴는 로그인으로 이동).
5. **심사 준비 (웹/App Store Connect)**
   - 앱 안에서 **회원 탈퇴** 기능 (필수, 가이드라인 5.1.1(v))
   - **개인정보처리방침 URL** (App Store Connect 입력 + 웹 안에서 접근 가능)
   - **앱 개인정보 항목**(수집 데이터) 작성
   - **심사용 테스트 계정** (ID/비밀번호, 본인인증이 필요하면 우회 방법 안내)
   - 의료·건강 정보 관련 문구/면책 고지 확인
