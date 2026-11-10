import Foundation
import WebKit
import Combine

/// 앱 전체에서 하나만 쓰는 웹뷰와 그 상태
@MainActor
final class WebViewModel: ObservableObject {
    @Published var progress: Double = 0
    @Published var isLoading = false
    @Published var loadFailed = false
    @Published var currentURL: URL?
    /// 첫 페이지 로딩이 끝났는지 (성공·실패 모두). 시작 화면을 닫는 기준
    @Published private(set) var firstLoadFinished = false

    let webView: WKWebView
    private var started = false
    private var cancellables = Set<AnyCancellable>()

    init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()               // 로그인 쿠키 유지
        config.allowsInlineMediaPlayback = true             // 운동영상 등 인라인 재생
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = AppConfig.userAgentSuffix
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true  // 스와이프로 뒤로가기
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        #if DEBUG
        webView.isInspectable = true                        // Safari 웹 검사기 연결 허용
        #endif

        // 푸시 토큰을 새로 받으면 지금 보고 있는 페이지에도 전달
        PushManager.shared.$deviceToken
            .compactMap { $0 }
            .removeDuplicates()
            .sink { [weak self] _ in self?.sendPushToken() }
            .store(in: &cancellables)

        // 알림을 눌러 들어오면 해당 주소 열기
        PushManager.shared.$pendingURL
            .compactMap { $0 }
            .sink { [weak self] url in self?.openPendingPushURL(url) }
            .store(in: &cancellables)
    }

    /// 첫 화면 열기. 알림을 눌러 앱이 켜진 경우엔 알림 주소부터 엶
    func loadStart() {
        started = true
        loadFailed = false
        if let pending = PushManager.shared.pendingURL {
            openPendingPushURL(pending)
        } else {
            load(AppConfig.startURL)
        }
    }

    func load(_ url: URL) {
        loadFailed = false
        webView.load(URLRequest(url: url))
    }

    func retry() {
        loadFailed = false
        if webView.url != nil { webView.reload() } else { loadStart() }
    }

    /// 페이지 로딩 완료 시 (WebView.Coordinator에서 호출)
    func pageDidFinish() {
        if !firstLoadFinished {
            firstLoadFinished = true
            if AppConfig.requestPushPermissionAfterFirstLoad { PushManager.shared.requestAuthorization() }
        }
        sendPushToken()
    }

    /// 첫 로딩이 실패해도 시작 화면은 닫고 오류 화면을 보여줌
    func pageDidFail() {
        firstLoadFinished = true
    }

    /// window.kdcAppOnPushToken(token) 호출. force면 토큰이 없어도 null로 호출
    func sendPushToken(force: Bool = false) {
        let token = PushManager.shared.deviceToken
        guard token != nil || force else { return }
        callJS("kdcAppOnPushToken", token)
    }

    /// 웹의 window.<함수>가 있으면 JSON 값 하나를 넘겨 호출
    func callJS(_ function: String, _ argument: Any?) {
        let value = argument ?? NSNull()
        var json = "null"
        if let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]),
           let text = String(data: data, encoding: .utf8) {
            json = text
        }
        let script = "window.\(function) && window.\(function)(\(json));"
        webView.evaluateJavaScript(script) { _, error in
            #if DEBUG
            if let error { print("[Bridge] \(function) 호출 실패: \(error.localizedDescription)") }
            #endif
        }
    }

    private func openPendingPushURL(_ url: URL) {
        guard started else { return } // 웹뷰가 아직 없으면 loadStart()에서 처리
        PushManager.shared.pendingURL = nil
        if AppConfig.isInternal(url) {
            load(url)
        } else {
            UIApplication.shared.open(url)
        }
    }
}
