import SwiftUI

struct CompletionView: View {
    let stars: Int

    var body: some View {
        VStack(spacing: 16) {
            Image("VictoryCelebration")
                .resizable()
                .scaledToFill()
                .frame(height: 150)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            Text("破陣成功")
                .font(.largeTitle.bold())
            Text(String(repeating: "★", count: stars) + String(repeating: "☆", count: 3 - stars))
                .font(.title)
                .foregroundStyle(AppTheme.accent)
            Text("返回山河圖即可挑戰下一關")
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding(28)
        .background(AppTheme.background, in: RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(AppTheme.accent, lineWidth: 2))
        .padding()
        .accessibilityIdentifier("completion-view")
    }
}
