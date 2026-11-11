import type { ExpoConfig } from 'expo/config';

/**
 * 앱 설정 (Expo Continuous Native Generation)
 * ios/ 폴더는 이 파일을 기준으로 `npx expo prebuild` 가 자동 생성합니다.
 * 네이티브 설정을 바꿀 때는 ios/ 를 직접 수정하지 말고 이 파일을 수정한 뒤 prebuild 를 다시 실행하세요.
 */
const config: ExpoConfig = {
  name: '교보다솜케어 헬스케어서비스', // 홈 화면/설정에 보이는 앱 이름
  slug: 'kyobodasomcare-app',
  scheme: 'kdcapp', // 커스텀 URL 스킴 (kdcapp://)
  version: '1.0.0', // App Store 표시 버전 (CFBundleShortVersionString)
  orientation: 'portrait',
  icon: './assets/icon.png', // 1024x1024 앱 아이콘 (투명 배경 없음)
  userInterfaceStyle: 'light',
  platforms: ['ios'],
  ios: {
    bundleIdentifier: 'com.kyobodasomcare.app',
    appleTeamId: 'V388NH26FH',
    buildNumber: '2', // 업로드할 때마다 1씩 올려야 함 (1번은 Swift 버전으로 이미 업로드됨)
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDisplayName: '교보다솜케어 헬스케어서비스',
      CFBundleDevelopmentRegion: 'ko',
      NSCameraUsageDescription: '서류·사진 업로드를 위해 카메라에 접근합니다.',
      NSPhotoLibraryUsageDescription: '서류·사진 업로드를 위해 사진 보관함에 접근합니다.',
      NSLocationWhenInUseUsageDescription: '병원검색에서 주변 병원을 찾기 위해 현재 위치를 사용합니다.',
      NSFaceIDUsageDescription: 'Face ID로 간편하게 로그인하기 위해 사용합니다.',
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['0A2A.1', '3B52.1', 'C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
      ],
    },
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff', // 흰 배경 + 로고
        image: './assets/icon.png',
        imageWidth: 200,
      },
    ],
    [
      'expo-notifications',
      {
        enableRemoteNotifications: true, // aps-environment 엔타이틀먼트 추가 (APNs)
        enableBackgroundRemoteNotifications: true, // UIBackgroundModes: remote-notification
      },
    ],
    [
      'expo-local-authentication',
      { faceIDPermission: 'Face ID로 간편하게 로그인하기 위해 사용합니다.' },
    ],
  ],
};

export default config;
