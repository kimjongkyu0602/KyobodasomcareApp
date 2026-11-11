import { Alert } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * 웹에서 파일 다운로드가 발생하면 앱 임시 폴더에 받은 뒤 공유 시트(저장/공유)를 띄웁니다.
 * 웹뷰 로그인 쿠키는 sharedCookiesEnabled 로 공유 쿠키 저장소에 동기화되므로
 * 일반적인 로그인 세션 파일은 같이 받아집니다. (blob:/data: 주소는 지원하지 않음)
 */
export async function downloadAndShare(url: string): Promise<void> {
  if (!/^https?:/i.test(url)) {
    Alert.alert('알림', '이 형식의 파일은 앱에서 바로 받을 수 없습니다.');
    return;
  }
  try {
    const dir = new Directory(Paths.cache, 'downloads');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = await File.downloadFileAsync(url, dir, { idempotent: true });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri);
    } else {
      Alert.alert('알림', '파일을 저장했지만 공유 기능을 사용할 수 없습니다.');
    }
  } catch (e) {
    Alert.alert('알림', '파일을 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
