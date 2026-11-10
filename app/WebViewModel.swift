import Foundation
import WebKit
import Combine

final class WebViewModel: ObservableObject {
    @Published var progress: Double = 0
    @Published var isLoading = false
    @Published var loadFailed = false

    let webView: WKWebView

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
        if #available(iOS 16.4, *) { webView.isInspectable = true } // Safari 웹 검사기 연결 허용
        #endif
    }

    func loadStart() {
        loadFailed = false
        webView.load(URLRequest(url: AppConfig.startURL))
    }

    func retry() {
        loadFailed = false
        if webView.url != nil { webView.reload() } else { loadStart() }
    }
}
