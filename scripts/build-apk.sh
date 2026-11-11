#!/usr/bin/env bash
# 안드로이드 APK 빌드 스크립트 (디버그 / 서명 안 된 릴리스)
# 사용법: scripts/build-apk.sh [debug|release|all]   (기본: debug)
# 필요: JDK 17, Android SDK (ANDROID_HOME), Node — 자세한 내용은 ANDROID_BUILD.md
set -euo pipefail

MODE="${1:-debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ~/.zprofile 에 넣어 둔 JAVA_HOME / ANDROID_HOME 이 없으면 기본 위치를 씁니다.
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdk-17/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

command -v java >/dev/null || { echo "java 를 찾을 수 없습니다. JAVA_HOME=$JAVA_HOME"; exit 1; }
[ -d "$ANDROID_HOME/platforms" ] || { echo "Android SDK 를 찾을 수 없습니다. ANDROID_HOME=$ANDROID_HOME"; exit 1; }

echo "▶ 의존성 설치 (patch-package 포함)"
npm install --no-audit --no-fund

echo "▶ android/ 프로젝트 생성 (expo prebuild)"
CI=1 npx expo prebuild --platform android --clean --no-install

cd android
case "$MODE" in
  debug)   ./gradlew assembleDebug ;;
  release) ./gradlew assembleRelease ;;
  all)     ./gradlew assembleDebug assembleRelease ;;
  *) echo "알 수 없는 모드: $MODE (debug|release|all)"; exit 1 ;;
esac

echo "▶ 만들어진 APK"
find app/build/outputs/apk -name "*.apk" -exec ls -lh {} \;
