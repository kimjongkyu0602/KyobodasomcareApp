import SwiftUI

struct ContentView: View {
    @StateObject private var model = WebViewModel()
    @StateObject private var network = NetworkMonitor()
    @StateObject private var updater = UpdateChecker()
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab: AppTab? = AppConfig.tabs.first
    @State private var showSplash = true

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .top) {
                WebView(model: model)
                    .ignoresSafeArea(.container, edges: AppConfig.tabBarEnabled ? [] : .bottom)

                if model.isLoading && model.progress < 1 {
                    ProgressView(value: model.progress)
                        .progressViewStyle(.linear)
                        .tint(.accentColor)
                }

                if model.loadFailed || !network.isConnected {
                    NetworkErrorView { model.retry() }
                }
            }

            if AppConfig.tabBarEnabled {
                AppTabBar(tabs: AppConfig.tabs, selected: selectedTab) { tab in
                    selectedTab = tab
                    model.load(AppConfig.url(forPath: tab.path))
                }
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom) // 키보드가 올라와도 탭 메뉴는 아래에 고정
        .overlay {
            if showSplash {
                SplashView().transition(.opacity)
            }
        }
        .onChange(of: network.isConnected) { _, connected in
            if connected && model.loadFailed { model.retry() }
        }
        .onChange(of: model.currentURL) { _, url in
            if let tab = AppConfig.tab(matching: url) { selectedTab = tab }
        }
        .onChange(of: model.firstLoadFinished) { _, finished in
            if finished { hideSplash() }
        }
        .task {
            // 첫 페이지가 늦게 열려도 시작 화면은 최대 splashMaxDuration초까지만
            try? await Task.sleep(for: .seconds(AppConfig.splashMaxDuration))
            hideSplash()
        }
        .task { await updater.check() }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            PushManager.shared.clearBadge()
            if AppConfig.forceUpdate { Task { await updater.check() } }
        }
        .alert("새 버전이 있습니다", isPresented: $updater.showAlert, presenting: updater.storeVersion) { store in
            Button("업데이트") { UIApplication.shared.open(store.url) }
            if !AppConfig.forceUpdate {
                Button("나중에", role: .cancel) {}
            }
        } message: { store in
            Text("최신 버전(\(store.version))으로 업데이트한 뒤 이용해 주세요.")
        }
    }

    private func hideSplash() {
        guard showSplash else { return }
        withAnimation(.easeOut(duration: 0.35)) { showSplash = false }
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
