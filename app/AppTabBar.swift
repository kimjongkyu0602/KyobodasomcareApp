import SwiftUI

/// 하단 탭 메뉴 (네이티브). 탭을 누르면 해당 웹 주소를 같은 웹뷰에 엶
struct AppTabBar: View {
    let tabs: [AppTab]
    let selected: AppTab?
    let onSelect: (AppTab) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs) { tab in
                let isSelected = tab == selected
                Button { onSelect(tab) } label: {
                    VStack(spacing: 3) {
                        Image(systemName: tab.systemImage)
                            .symbolVariant(isSelected ? .fill : .none)
                            .font(.system(size: 20))
                            .frame(height: 24)
                        Text(tab.title)
                            .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 7)
                    .padding(.bottom, 4)
                    .foregroundStyle(isSelected ? Color.accentColor : Color.secondary)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .background(.bar)
        .overlay(alignment: .top) { Divider() }
    }
}

#Preview {
    VStack {
        Spacer()
        AppTabBar(tabs: AppConfig.tabs, selected: AppConfig.tabs.first) { _ in }
    }
}
