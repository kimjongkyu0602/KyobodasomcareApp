import UIKit
import UserNotifications
import Combine

/// 푸시 권한·기기 토큰·알림으로 열 주소를 관리
@MainActor
final class PushManager: ObservableObject {
    static let shared = PushManager()

    /// APNs 기기 토큰(16진수 문자열). 웹에 전달해 서버에 저장하는 용도
    @Published var deviceToken: String?
    /// 알림을 눌러 열어야 할 주소. 웹뷰가 준비되면 열고 비움
    @Published var pendingURL: URL?

    private init() {}

    /// 권한이 없으면 요청하고, 허용돼 있으면 APNs 등록
    func requestAuthorization() {
        Task {
            let center = UNUserNotificationCenter.current()
            let status = await center.notificationSettings().authorizationStatus
            switch status {
            case .notDetermined:
                let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
                if granted { UIApplication.shared.registerForRemoteNotifications() }
            case .authorized, .provisional, .ephemeral:
                UIApplication.shared.registerForRemoteNotifications()
            default:
                break // 거부한 경우: 웹에서 `openSettings`로 설정 화면을 안내할 수 있음
            }
        }
    }

    /// 실행 시: 이미 허용된 경우에만 조용히 등록 (팝업 없음)
    func registerIfAuthorized() {
        Task {
            let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
            if [.authorized, .provisional, .ephemeral].contains(status) {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    /// 알림 탭 처리. url은 전체 주소 또는 "/mypage" 같은 경로 모두 가능
    func handleTap(link: String?) {
        guard let link, !link.isEmpty,
              let url = URL(string: link, relativeTo: AppConfig.startURL)?.absoluteURL,
              ["http", "https"].contains(url.scheme?.lowercased() ?? "") else { return }
        pendingURL = url
    }

    /// 앱 아이콘 배지 지우기
    func clearBadge() {
        UNUserNotificationCenter.current().setBadgeCount(0) { _ in }
    }
}
