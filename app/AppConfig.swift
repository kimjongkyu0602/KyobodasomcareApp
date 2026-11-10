import Foundation

/// 앱 전체 설정. 웹 도메인이 정해지면 `startURL`만 바꾸면 됩니다.
enum AppConfig {
    /// 앱을 켜면 처음 여는 웹 주소 (임시값)
    static let startURL = URL(string: "https://www.kyobodasomcare.com")!

    /// 앱 안에서 열어 둘 도메인. 이 외의 링크는 Safari로 엽니다.
    static let internalHosts: [String] = ["kyobodasomcare.com"]

    /// 웹에서 앱 접속을 구분할 수 있도록 User-Agent 뒤에 붙는 값
    static let userAgentSuffix = "KDCHealthcareApp/iOS"

    /// 웹 → 앱 호출용 JS 메시지 이름 (window.webkit.messageHandlers.kdcApp.postMessage(...))
    static let bridgeName = "kdcApp"

    static let customerCenter = "1588-7524"
}
