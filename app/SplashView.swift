import SwiftUI

/// 시작 화면(Launch Screen)과 똑같은 모습의 로고 화면. 첫 페이지가 열리면 서서히 사라짐
struct SplashView: View {
    var body: some View {
        ZStack {
            Color("LaunchBackground").ignoresSafeArea()
            Image("LaunchLogo")
                .accessibilityLabel("교보다솜케어")
        }
    }
}

#Preview {
    SplashView()
}
