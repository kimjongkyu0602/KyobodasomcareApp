import SwiftUI

@main
struct appApp: App {
    // 푸시 알림 등록·수신을 처리하는 AppDelegate 연결
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
