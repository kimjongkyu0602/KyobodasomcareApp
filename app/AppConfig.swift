import Foundation

/// 앱 전체 설정. 웹 도메인·메뉴 주소가 정해지면 이 파일만 바꾸면 됩니다.
enum AppConfig {
    // MARK: 웹
    /// 앱을 켜면 처음 여는 웹 주소 (임시값)
    static let startURL = URL(string: "https://www.kyobodasomcare.com")!

    /// 앱 안에서 열어 둘 도메인(하위 도메인 포함). 이 외의 링크는 Safari로 열고, 브리지 호출도 이 도메인에서만 받습니다.
    static let internalHosts: [String] = ["kyobodasomcare.com"]

    /// 웹에서 앱 접속을 구분할 수 있도록 User-Agent 뒤에 붙는 값
    static let userAgentSuffix = "KDCHealthcareApp/iOS"

    /// 웹 → 앱 호출용 JS 메시지 이름 (window.webkit.messageHandlers.kdcApp.postMessage(...))
    static let bridgeName = "kdcApp"

    /// 고객센터 전화번호 (브리지 `call` 기본값)
    static let customerCenter = "1588-7524"

    // MARK: 하단 탭 메뉴
    /// false로 바꾸면 하단 탭 없이 웹 화면만 전체로 보여줍니다.
    static let tabBarEnabled = true

    /// 하단 탭 목록. path는 startURL 도메인 기준 경로입니다.
    /// TODO: 웹 메뉴 주소가 확정되면 path를 실제 경로로 바꿔 주세요. (지금은 임시값)
    static let tabs: [AppTab] = [
        AppTab(id: "home", title: "홈", systemImage: "house", path: "/"),
        AppTab(id: "reservation", title: "상담·예약", systemImage: "calendar.badge.clock", path: "/reservation"),       // TODO
        AppTab(id: "hospital", title: "병원검색", systemImage: "cross.case", path: "/hospital"),                         // TODO
        AppTab(id: "healthInfo", title: "건강정보", systemImage: "heart.text.square", path: "/health-info"),             // TODO
        AppTab(id: "mypage", title: "마이페이지", systemImage: "person.crop.circle", path: "/mypage")                   // TODO
    ]

    // MARK: 푸시 알림
    /// true면 첫 화면 로딩이 끝난 뒤 알림 권한을 요청합니다. false면 웹에서 `requestPushPermission`을 호출할 때만 요청합니다.
    static let requestPushPermissionAfterFirstLoad = true

    // MARK: 시작 화면
    /// 첫 페이지가 늦게 열려도 시작 화면(로고)을 최대 이 시간(초)까지만 보여줍니다.
    static let splashMaxDuration: Double = 3

    // MARK: 업데이트 안내
    static let updateCheckEnabled = true
    /// true면 '나중에' 버튼 없이 업데이트만 가능하게 합니다(강제 업데이트).
    static let forceUpdate = false
    static var appStoreLookupURL: URL {
        let bundleID = Bundle.main.bundleIdentifier ?? "com.kyobodasomcare.app"
        return URL(string: "https://itunes.apple.com/lookup?bundleId=\(bundleID)&country=kr")!
    }

    // MARK: 도우미
    /// 우리 도메인인지 확인
    static func isInternal(host: String?) -> Bool {
        guard let host = host?.lowercased(), !host.isEmpty else { return false }
        return internalHosts.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    static func isInternal(_ url: URL) -> Bool { isInternal(host: url.host) }

    /// startURL 도메인 기준 경로 → 전체 주소
    static func url(forPath path: String) -> URL {
        URL(string: path, relativeTo: startURL)?.absoluteURL ?? startURL
    }

    /// 현재 주소에 해당하는 탭 (가장 길게 일치하는 경로 우선, 홈 "/"은 정확히 일치할 때만)
    static func tab(matching url: URL?) -> AppTab? {
        guard let url, isInternal(url) else { return nil }
        let path = url.path.isEmpty ? "/" : url.path
        return tabs
            .filter { $0.path == "/" ? path == "/" : (path == $0.path || path.hasPrefix($0.path + "/")) }
            .max { $0.path.count < $1.path.count }
    }
}

/// 하단 탭 한 칸
struct AppTab: Identifiable, Hashable {
    let id: String
    let title: String
    let systemImage: String   // SF Symbols 이름 (선택되면 .fill 모양으로 바뀜)
    let path: String
}
