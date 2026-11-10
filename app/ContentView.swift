import SwiftUI

struct ContentView: View {
    @StateObject private var model = WebViewModel()
    @StateObject private var network = NetworkMonitor()

    var body: some View {
        ZStack(alignment: .top) {
            WebView(model: model)
                .ignoresSafeArea(edges: .bottom)

            if model.isLoading && model.progress < 1 {
                ProgressView(value: model.progress)
                    .progressViewStyle(.linear)
                    .tint(.accentColor)
            }

            if model.loadFailed || !network.isConnected {
                NetworkErrorView { model.retry() }
            }
        }
        .onChange(of: network.isConnected) { _, connected in
            if connected && model.loadFailed { model.retry() }
        }
    }
}

/// 화면정의서의 '네트워크 연결 오류' 화면
struct NetworkErrorView: View {
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)
            Text("네트워크 연결 오류")
                .font(.title3.bold())
            Text("네트워크 연결 상태를 확인 후\n다시 시도해 주세요.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button(action: onRetry) {
                Text("다시 시도")
                    .font(.headline)
                    .frame(maxWidth: 220)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 8)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

#Preview {
    ContentView()
}
