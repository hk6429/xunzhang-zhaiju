import SwiftUI

struct DailyView: View {
    @EnvironmentObject private var container: AppContainer

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text(dateKey)
                    Spacer()
                    Label("\(container.progress.ink) 墨", systemImage: "drop.fill")
                }
                .foregroundStyle(AppTheme.accent)
                Text("今日三帖")
                    .font(.largeTitle.bold())
                ForEach(Array(questIDs.enumerated()), id: \.offset) { _, questID in
                    let status = questStatus(questID)
                    Label {
                        HStack {
                            Text(questLabel(questID))
                            Spacer()
                            Text("\(min(status.current, status.target)) / \(status.target)")
                                .monospacedDigit()
                                .foregroundStyle(AppTheme.secondaryText)
                        }
                    } icon: {
                        Image(systemName: status.current >= status.target ? "checkmark.seal.fill" : "circle")
                            .foregroundStyle(status.current >= status.target ? AppTheme.accent : AppTheme.secondaryText)
                    }
                        .foregroundStyle(AppTheme.primaryText)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                }
                if let content = container.content {
                    NavigationLink {
                        DailyPracticeView(
                            phrases: content.phrases,
                            phraseIDs: NativeParityRules.dailyQuickPhraseIDs(
                                phraseIDs: content.phrases.map(\.id),
                                dateKey: dateKey,
                                count: 5
                            )
                        )
                    } label: {
                        Label("開始一炷香快陣", systemImage: "flame.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.accent)
                }
            }
            .padding()
        }
        .foregroundStyle(AppTheme.primaryText)
        .background(AppTheme.background)
        .navigationTitle("今日修煉")
    }

    private var dateKey: String { TaiwanDate.dateKey() }

    private var questIDs: [String] {
        NativeParityRules.dailyQuestIDs(dateKey: dateKey)
    }

    private func questLabel(_ id: String) -> String {
        let labels = [
            "clear-level": "破解 1 座字陣", "clear-level-2": "破解 2 座字陣",
            "quiz-correct-3": "研墨答對 3 題", "quiz-correct": "研墨答對 5 題", "quiz-correct-7": "研墨答對 7 題",
            "find-phrases": "尋得 3 句真言", "find-phrases-5": "尋得 5 句真言",
        ]
        return labels[id] ?? id
    }

    private func questStatus(_ id: String) -> (current: Int, target: Int) {
        let daily = container.progress.daily?.dateKey == dateKey ? container.progress.daily : nil
        switch id {
        case "clear-level": return (daily?.completedLevelIDs.count ?? 0, 1)
        case "clear-level-2": return (daily?.completedLevelIDs.count ?? 0, 2)
        case "quiz-correct-3": return (daily?.quizCorrect ?? 0, 3)
        case "quiz-correct": return (daily?.quizCorrect ?? 0, 5)
        case "quiz-correct-7": return (daily?.quizCorrect ?? 0, 7)
        case "find-phrases": return (daily?.foundPhraseIDs.count ?? 0, 3)
        case "find-phrases-5": return (daily?.foundPhraseIDs.count ?? 0, 5)
        default: return (0, 1)
        }
    }
}

enum TaiwanDate {
    static func dateKey(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.timeZone = TimeZone(identifier: "Asia/Taipei")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
