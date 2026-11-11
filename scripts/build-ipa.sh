#!/bin/zsh
# App Store 용 IPA 를 만듭니다. (업로드는 하지 않음)
# 결과: build/export/app.ipa  (Apple Distribution 서명, aps-environment=production)
#
# 이 팀에는 아직 등록된 테스트 기기가 없어 Xcode 자동 서명으로 바로 Archive 하면
# "Your team has no devices..." 오류가 납니다. 그래서
#   1) 서명 없이 Archive → 2) 푸시 엔타이틀먼트를 넣어 임시 서명 → 3) Export 단계에서
#   Xcode 가 App Store 배포 인증서/프로필로 다시 서명하는 순서로 진행합니다.
# 아이폰을 한 번 연결해 팀에 등록한 뒤에는 Xcode 의 Product > Archive 를 그대로 써도 됩니다.
set -euo pipefail
source ~/.zprofile
cd "$(dirname "$0")/.."

npx expo prebuild --platform ios --clean
rm -rf build/app.xcarchive build/export

xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath build \
  -archivePath build/app.xcarchive CODE_SIGNING_ALLOWED=NO archive

APP=build/app.xcarchive/Products/Applications/app.app
codesign -f -s - --entitlements ios/app/app.entitlements "$APP"

cat > build/ExportOptions.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>export</string>
<key>teamID</key><string>V388NH26FH</string>
<key>signingStyle</key><string>automatic</string>
<key>manageAppVersionAndBuildNumber</key><false/>
<key>uploadSymbols</key><true/>
</dict></plist>
PLIST

xcodebuild -exportArchive -archivePath build/app.xcarchive -exportPath build/export \
  -exportOptionsPlist build/ExportOptions.plist -allowProvisioningUpdates

echo "완료: build/export/app.ipa"
echo "업로드는 Xcode Organizer(Window > Organizer) 또는 Transporter 앱으로 하세요."
