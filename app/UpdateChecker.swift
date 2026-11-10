import Foundation
import Combine

/// App Store 최신 버전 확인. 아직 스토어에 없거나 네트워크 오류면 조용히 넘어감
@MainActor
final class UpdateChecker: ObservableObject {
    struct StoreVersion {
        let version: String
        let url: URL
    }

    @Published var storeVersion: StoreVersion?
    @Published var showAlert = false
    private var alreadyPrompted = false

    func check() async {
        guard AppConfig.updateCheckEnabled,
              let current = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String else { return }
        let request = URLRequest(url: AppConfig.appStoreLookupURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let item = try? JSONDecoder().decode(LookupResponse.self, from: data).results.first,
              let url = URL(string: item.trackViewUrl),
              Self.isVersion(item.version, newerThan: current) else { return }

        storeVersion = StoreVersion(version: item.version, url: url)
        // 강제 업데이트면 앱으로 돌아올 때마다, 아니면 실행당 한 번만 안내
        if AppConfig.forceUpdate || !alreadyPrompted {
            alreadyPrompted = true
            showAlert = true
        }
    }

    /// "1.10.0" > "1.9" 처럼 숫자 단위로 비교
    nonisolated static func isVersion(_ a: String, newerThan b: String) -> Bool {
        let lhs = a.split(separator: ".").map { Int($0) ?? 0 }
        let rhs = b.split(separator: ".").map { Int($0) ?? 0 }
        for i in 0..<max(lhs.count, rhs.count) {
            let l = i < lhs.count ? lhs[i] : 0
            let r = i < rhs.count ? rhs[i] : 0
            if l != r { return l > r }
        }
        return false
    }
}

private struct LookupResponse: Decodable {
    struct Item: Decodable {
        let version: String
        let trackViewUrl: String
    }
    let results: [Item]
}
