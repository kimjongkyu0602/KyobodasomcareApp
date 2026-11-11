# 안드로이드 APK 빌드 안내

이 저장소는 iOS 기준으로 만든 하이브리드(WebView) 앱 껍데기입니다.
안드로이드는 **APK 를 빌드할 수 있는 환경과 최소 설정까지만** 되어 있습니다.
안드로이드 기능 작업(푸시·생체인증·스토어 출시 등)은 이 문서 아래쪽 "안드로이드 담당자 참고"를 보고 진행해 주세요.

## 1. 필요한 것 (모두 사용자 계정 아래 설치, sudo/Homebrew 사용 안 함)

| 항목 | 버전 | 위치 |
| --- | --- | --- |
| Node.js | 프로젝트에서 쓰는 버전 | `~/.local/node` |
| JDK | Temurin 17 (macOS arm64) | `~/.local/jdk-17` (`JAVA_HOME=~/.local/jdk-17/Contents/Home`) |
| Android SDK | cmdline-tools(latest), platform-tools | `~/Library/Android/sdk` |
| SDK Platform | `platforms;android-37.0` (compileSdk 37) | |
| Build-Tools | `build-tools;37.0.0` | |
| NDK | `ndk;27.1.12297006` | |
| CMake | `cmake;3.22.1` | |

RN 0.88 / Expo SDK 58 기준: minSdk 24, targetSdk 36, compileSdk 37, AGP 9.2.1, Gradle 9.4.1.
(버전 기준: `node_modules/react-native/gradle/libs.versions.toml`)

다른 Mac 에서 새로 설치할 때 (예시):

```sh
# JDK 17
mkdir -p ~/.local/dl ~/.local/jdk-17 && cd ~/.local/dl
curl -sSL -o jdk17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse"
tar -xzf jdk17.tar.gz -C ~/.local/jdk-17 --strip-components=1

# Android cmdline-tools (최신 zip 이름은 https://dl.google.com/android/repository/repository2-3.xml 에서 확인)
curl -sSL -o clt.zip https://dl.google.com/android/repository/commandlinetools-mac-15641748_latest.zip
mkdir -p ~/Library/Android/sdk/cmdline-tools && unzip -q clt.zip -d /tmp/clt
mv /tmp/clt/cmdline-tools ~/Library/Android/sdk/cmdline-tools/latest

# 라이선스 동의 + 패키지 설치 (아래 환경 변수 설정 후)
yes | sdkmanager --licenses
sdkmanager --install "platform-tools" "platforms;android-37.0" "build-tools;37.0.0" "ndk;27.1.12297006" "cmake;3.22.1"
```

## 2. 환경 변수 (`~/.zprofile` 에 추가되어 있음)

```sh
# >>> KDC Android build env >>>
export JAVA_HOME="$HOME/.local/jdk-17/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
# <<< KDC Android build env <<<
```

확인: `java -version` (17.x), `sdkmanager --list_installed`, `adb version`

## 3. 빌드 방법

가장 간단한 방법:

```sh
scripts/build-apk.sh          # 디버그 APK
scripts/build-apk.sh release  # 릴리스 APK (현재는 디버그 키로 서명됨 — 아래 주의)
scripts/build-apk.sh all      # 둘 다
```

직접 실행할 때:

```sh
npm install                                        # patch-package 도 함께 적용됨
npx expo prebuild --platform android --clean       # android/ 폴더 생성 (git 에 올리지 않음)
cd android
./gradlew assembleDebug                            # 디버그
./gradlew assembleRelease                          # 릴리스
```

기기에 설치: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
디버그 APK 는 Metro(`npx expo start`)에 연결해서 JS 를 불러오고, 릴리스 APK 는 JS 번들이 APK 안에 들어 있어 단독 실행됩니다.

## 4. APK 위치

- 디버그: `android/app/build/outputs/apk/debug/app-debug.apk`
- 릴리스: `android/app/build/outputs/apk/release/app-release.apk`

### 빌드 확인 결과 (2026-11-11, MacBook Pro arm64)

- `assembleDebug` 성공 — `app-debug.apk` 약 145MB (모든 CPU ABI + 디버그 심볼 포함)
- `assembleRelease` 성공 — `app-release.apk` 약 68MB, **디버그 키(CN=Android Debug)로 서명**
- 릴리스 APK 권한: INTERNET, USE_BIOMETRIC, USE_FINGERPRINT, VIBRATE, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, RECEIVE_BOOT_COMPLETED, POST_NOTIFICATIONS, WAKE_LOCK, READ_APP_BADGE (+ 런처 배지용 제조사 권한). `usesCleartextTraffic=false` 확인.
  디버그 APK 에는 개발 메뉴용 SYSTEM_ALERT_WINDOW, ACCESS_LOCAL_NETWORK 가 추가로 들어갑니다(정상).
- 처음 빌드는 Gradle 이 의존성(약 2GB)을 내려받아 10~20분 걸립니다. 네트워크가 느리면 다운로드 중 멈춘 것처럼 보일 수 있는데,
  오래 멈추면 `./gradlew --stop` 후 다시 실행하면 이어서 받습니다.

## 5. 설정 위치

- `android/` 는 `npx expo prebuild` 가 `app.config.ts` 를 기준으로 **매번 새로 만드는 폴더**입니다. `.gitignore` 에 들어 있으며 직접 수정해도 다음 prebuild 때 사라집니다.
- 안드로이드 설정은 `app.config.ts` 의 `android` 항목과 config plugin 으로 바꿔 주세요.
  - 패키지명 `com.kyobodasomcare.app`, `versionCode` 2 (Play 업로드 때마다 +1)
  - 적응형 아이콘: `assets/icon.png` + 흰색 배경
  - 앱 이름: `교보다솜케어 헬스케어서비스`
  - 정식 매니페스트에 `usesCleartextTraffic="false"` (http 차단). 디버그 빌드만 Metro 연결 때문에 `true`.
  - 권한: 앱이 직접 넣는 것은 `INTERNET` 뿐. `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` 는 막아 둠.
    라이브러리가 자동으로 넣는 권한: `POST_NOTIFICATIONS`·`RECEIVE_BOOT_COMPLETED` 등(expo-notifications), `USE_BIOMETRIC`·`USE_FINGERPRINT`(expo-local-authentication), `VIBRATE` 등.
- 서명 키(keystore), `google-services.json` 등 비밀 파일은 **저장소에 올리지 마세요.** (`*.jks`, `*.keystore` 는 .gitignore 에 있음)

## 6. 안드로이드 담당자 참고 (현재 iOS 에서만 처리된 부분)

1. **앱 잠금(생체인증)**: `src/lib/biometric.ts`, `src/lib/useAppLock.ts`, `src/components/MoreScreen.tsx`, `AppLockScreen.tsx`.
   expo-local-authentication 은 안드로이드 지문/얼굴 인식도 지원하지만, 화면 문구가 "Face ID", "iPhone 설정" 기준이라 `Platform.OS` 로 문구를 나눠야 합니다. 안드로이드 기기에서 동작 확인 필요.
2. **푸시 알림**: `src/lib/push.ts` 는 iOS APNs 토큰 기준입니다. 안드로이드는 Firebase(FCM) 프로젝트 생성, `google-services.json` (`android.googleServicesFile`), 알림 채널, Android 13+ 알림 권한 요청, 서버에 FCM 토큰 전달 방식을 정해야 합니다.
3. **팝업 로그인(본인인증)**: `patches/react-native-webview+14.0.1.patch` 는 **iOS 파일(apple/RNCWebViewImpl.m)만 수정**합니다. 안드로이드 빌드에는 영향이 없습니다.
   iOS 에서는 `window.open` 팝업(mobile-ok / ez-iok 간편인증·휴대폰 본인확인)을 별도 웹뷰로 띄우고 "닫기" 바를 붙였습니다. 안드로이드는 `setSupportMultipleWindows` / `onOpenWindow` 동작과 `intent://`·카카오/PASS 등 앱 스킴 처리를 따로 확인해야 합니다.
4. **파일 다운로드**: iOS 는 WKDownload 패치로 첨부파일(POST 포함)을 받아 공유 시트로 엽니다. 안드로이드는 react-native-webview 기본 다운로드(DownloadManager) 동작과 POST 다운로드 가능 여부를 확인해야 합니다.
5. **JS 대화상자**: iOS 는 확인/취소 버튼을 한국어로 바꿨습니다. 안드로이드는 기기 언어를 따릅니다.
6. **하단 탭바·안전 영역·뒤로가기**: 탭바 모양은 iOS 기준입니다. 안드로이드 하드웨어 뒤로가기 버튼(웹뷰 뒤로가기 / 더보기 닫기), edge-to-edge 화면 확인 필요.
7. **회원가입 차단 / 온보딩 / 더보기 / 오류 화면**은 JS 로 되어 있어 안드로이드에서도 동작해야 하지만 실기기 확인은 하지 않았습니다.

## 7. 아직 안 된 것

- **릴리스 서명 키(upload keystore) 없음.** 지금 `assembleRelease` 결과물은 Expo 템플릿 기본값에 따라 **디버그 키로 서명**되어 있어 Play 스토어에 올릴 수 없습니다.
  업로드 키 생성 → `~/.gradle/gradle.properties` 등 저장소 밖에 비밀번호 보관 → config plugin 으로 `signingConfigs.release` 연결이 필요합니다. (Play 앱 서명 사용 권장)
- Play Console 앱 등록, AAB(`./gradlew bundleRelease`) 빌드, 개인정보 / 데이터 보안 양식, 대상 연령 등 스토어 설정.
- 안드로이드 실기기·에뮬레이터 테스트.
