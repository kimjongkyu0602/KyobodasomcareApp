import SwiftUI
import WebKit
import UIKit

struct WebView: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let webView = model.webView
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.configuration.userContentController.add(context.coordinator, name: AppConfig.bridgeName)

        let refresh = UIRefreshControl()   // 당겨서 새로고침
        refresh.addTarget(context.coordinator, action: #selector(Coordinator.handleRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        context.coordinator.observe(webView)
        model.loadStart()
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKDownloadDelegate {
        private let model: WebViewModel
        private var observations: [NSKeyValueObservation] = []
        private var downloadFiles: [ObjectIdentifier: URL] = [:]

        init(model: WebViewModel) { self.model = model }

        func observe(_ webView: WKWebView) {
            observations = [
                webView.observe(\.estimatedProgress) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.model.progress = wv.estimatedProgress }
                },
                webView.observe(\.isLoading) { [weak self] wv, _ in
                    DispatchQueue.main.async { self?.model.isLoading = wv.isLoading }
                },
                webView.observe(\.url) { [weak self] wv, _ in   // 하단 탭 선택 표시용
                    DispatchQueue.main.async { self?.model.currentURL = wv.url }
                }
            ]
        }

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            model.retry()
            sender.endRefreshing()
        }

        // MARK: 링크 처리
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // <a download> 등 다운로드 요청
            if navigationAction.shouldPerformDownload { decisionHandler(.download); return }

            guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else {
                decisionHandler(.allow); return
            }
            // tel:, mailto:, sms:, 앱스토어, 다른 앱 스킴은 밖에서 열기
            if !["http", "https", "about", "data", "blob", "file"].contains(scheme) {
                UIApplication.shared.open(url); decisionHandler(.cancel); return
            }
            // 사용자가 누른 외부 도메인 링크는 Safari로
            if navigationAction.navigationType == .linkActivated,
               navigationAction.targetFrame?.isMainFrame ?? true,
               url.host != nil, !AppConfig.isInternal(url) {
                UIApplication.shared.open(url); decisionHandler(.cancel); return
            }
            decisionHandler(.allow)
        }

        // 화면에 띄울 수 없는 파일(엑셀, zip 등)이나 첨부파일 응답은 다운로드로 처리
        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                     decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            if let http = navigationResponse.response as? HTTPURLResponse,
               let disposition = http.value(forHTTPHeaderField: "Content-Disposition")?.lowercased(),
               disposition.hasPrefix("attachment") {
                decisionHandler(.download); return
            }
            decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
        }

        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            download.delegate = self
        }

        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
            download.delegate = self
        }

        // target="_blank", window.open → 같은 화면에서 열기
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
                webView.load(URLRequest(url: url))
            }
            return nil
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.loadFailed = false
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.pageDidFinish()
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handle(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handle(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        private func handle(_ error: Error) {
            let ns = error as NSError
            if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled { return }
            if ns.domain == "WebKitErrorDomain" && ns.code == 102 { return } // 외부 앱·다운로드로 넘긴 경우
            model.loadFailed = true
            model.pageDidFail()
        }

        // MARK: 카메라·마이크 (웹 영상 상담 등)
        // 우리 도메인은 바로 허용(iOS 시스템 권한 팝업은 그대로 뜸), 그 외 도메인은 사용자에게 물어봄
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(AppConfig.isInternal(host: origin.host) ? .grant : .prompt)
        }

        // MARK: 파일 다운로드 → 공유창
        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                      suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent("Downloads", isDirectory: true)
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let name = (suggestedFilename as NSString).lastPathComponent
            let file = folder.appendingPathComponent(name.isEmpty ? "download" : name)
            try? FileManager.default.removeItem(at: file)
            downloadFiles[ObjectIdentifier(download)] = file
            completionHandler(file)
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard let file = downloadFiles.removeValue(forKey: ObjectIdentifier(download)) else { return }
            UIApplication.shared.presentShareSheet(for: file)
        }

        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            downloadFiles.removeValue(forKey: ObjectIdentifier(download))
            let alert = UIAlertController(title: "알림", message: "파일을 내려받지 못했습니다.\n잠시 후 다시 시도해 주세요.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "확인", style: .default))
            present(alert) {}
        }

        // MARK: JS alert / confirm / prompt → 네이티브 팝업
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: "알림", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler() })
            present(alert, fallback: completionHandler)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: "알림", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler(true) })
            present(alert) { completionHandler(false) }
        }

        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
            present(alert) { completionHandler(nil) }
        }

        private func present(_ alert: UIAlertController, fallback: @escaping () -> Void) {
            guard let top = UIApplication.shared.topViewController else { fallback(); return }
            top.present(alert, animated: true)
        }

        // MARK: 웹 → 앱 브리지 (사용법은 README.md 참고)
        // 웹에서: window.webkit.messageHandlers.kdcApp.postMessage({ action: "biometricAuth", reason: "..." })
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            // 우리 도메인(AppConfig.internalHosts)에서 온 호출만 처리
            guard AppConfig.isInternal(host: message.frameInfo.securityOrigin.host),
                  let body = message.body as? [String: Any],
                  let action = body["action"] as? String else { return }

            switch action {
            case "openExternal":
                if let s = body["url"] as? String, let url = URL(string: s) { UIApplication.shared.open(url) }
            case "call":
                let number = (body["number"] as? String) ?? AppConfig.customerCenter
                let digits = number.filter { $0.isNumber || $0 == "+" }
                if let url = URL(string: "tel:\(digits)") { UIApplication.shared.open(url) }
            case "getPushToken":
                model.sendPushToken(force: true)
            case "requestPushPermission":
                PushManager.shared.requestAuthorization()
            case "biometricAvailable":
                model.callJS("kdcAppOnBiometricAvailable", BiometricAuth.availability())
            case "biometricAuth":
                BiometricAuth.authenticate(reason: body["reason"] as? String) { [weak model] result in
                    model?.callJS("kdcAppOnBiometricResult", result)
                }
            case "getAppInfo":
                let info = Bundle.main.infoDictionary ?? [:]
                model.callJS("kdcAppOnAppInfo", [
                    "platform": "iOS",
                    "version": info["CFBundleShortVersionString"] as? String ?? "",
                    "build": info["CFBundleVersion"] as? String ?? "",
                    "osVersion": UIDevice.current.systemVersion
                ])
            case "openSettings":
                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            default:
                #if DEBUG
                print("[Bridge] 알 수 없는 action: \(action)")
                #endif
            }
        }
    }
}
