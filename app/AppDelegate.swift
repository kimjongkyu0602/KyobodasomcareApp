import UIKit
import UserNotifications

/// 푸시 알림(APNs) 등록과 알림 수신·탭 처리
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // 앱이 꺼진 상태에서 알림을 눌러 실행된 경우도 didReceive로 들어오도록 실행 직후 delegate 지정
        UNUserNotificationCenter.current().delegate = self
        // 이미 권한을 허용한 사용자는 실행할 때마다 토큰을 새로 받음
        PushManager.shared.registerIfAuthorized()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushManager.shared.deviceToken = deviceToken.map { String(format: "%02x", $0) }.joined()
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[Push] 원격 알림 등록 실패: \(error.localizedDescription)")
    }

    // 백그라운드(content-available) 알림. 지금은 따로 처리할 데이터가 없음
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        completionHandler(.noData)
    }

    // 앱을 보고 있을 때 온 알림도 배너와 소리로 표시
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound, .badge])
    }

    // 알림을 눌렀을 때: payload의 url을 웹뷰로 열기
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                            withCompletionHandler completionHandler: @escaping () -> Void) {
        let link = response.notification.request.content.userInfo["url"] as? String
        Task { @MainActor in
            PushManager.shared.handleTap(link: link)
            completionHandler()
        }
    }
}
