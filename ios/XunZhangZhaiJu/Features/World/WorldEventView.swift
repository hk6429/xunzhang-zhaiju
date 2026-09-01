import SwiftUI

struct WorldEventView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var errorMessage = ""
    let event: WorldEvent
    var previewsEffects = false
    let onChoose: (EventChoice) throws -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("\(event.speaker)・非戰鬥事件")
                        .font(.caption.bold())
                        .foregroundStyle(AppTheme.accent)
                    Text(event.title)
                        .font(.largeTitle.bold())
                    Text(event.text)
                        .font(.title3)
                    ForEach(event.choices) { choice in
                        Button {
                            do {
                                try onChoose(choice)
                                dismiss()
                            } catch {
                                errorMessage = error.localizedDescription
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(choice.label).font(.headline)
                                Text(previewsEffects ? effectSummary(choice.effect) : "效果將在選擇後揭曉")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.secondaryText)
                                    .accessibilityIdentifier(previewsEffects ? "event-effect-preview" : "event-effect-hidden")
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                        }
                        .buttonStyle(.bordered)
                    }
                    if previewsEffects {
                        Label("三尖兩刃刀・今日一次預見", systemImage: "eye.fill")
                            .font(.caption.bold())
                            .foregroundStyle(AppTheme.accent)
                    }
                    if !errorMessage.isEmpty {
                        Text(errorMessage).foregroundStyle(Color.orange)
                    }
                }
                .foregroundStyle(AppTheme.primaryText)
                .padding(24)
            }
            .background(AppTheme.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("稍後再選") { dismiss() }
                }
            }
        }
    }

    private func effectSummary(_ effects: [EventEffect]) -> String {
        effects.map {
            switch $0.type {
            case .unlockLore: "解鎖失落故事"
            case .treasureShard: "取得法寶碎片"
            case .study: "開啟研讀機會"
            case .mapReveal: "揭開地圖迷霧"
            case .bossBoost: "取得首領戰助力"
            case .replayBonus: "取得重玩加成"
            case .routeBoost: "取得路線助力"
            }
        }.joined(separator: "・")
    }
}
