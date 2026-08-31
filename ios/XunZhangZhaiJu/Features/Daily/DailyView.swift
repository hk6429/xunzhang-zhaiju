import SwiftUI

struct DailyView: View {
    @EnvironmentObject private var container: AppContainer

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text(dateKey)
                    Spacer()
                    if let streak = container.progress.streak, streak.current > 0 {
                        Label("\(streak.current) 日", systemImage: "flame.fill")
                    }
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
                if let encounter = dailyEncounter {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("今日奇遇").font(.caption.bold()).foregroundStyle(AppTheme.accent)
                        Text(encounter.title).font(.title2.bold())
                        Text(encounter.text).foregroundStyle(AppTheme.secondaryText)
                        Button(isEncounterSeen(encounter) ? "今日已相遇" : "收下奇遇") {
                            try? container.applyDailyEncounter(encounter)
                        }
                        .buttonStyle(.bordered)
                        .disabled(isEncounterSeen(encounter))
                    }
                    .padding()
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
                    if let best = currentDaily?.quickBest {
                        Text("今日最佳：\(best.score) / 5 題・\(format(milliseconds: best.durationMilliseconds))")
                            .font(.footnote)
                            .foregroundStyle(AppTheme.secondaryText)
                    }
                }
            }
            .padding()
        }
        .foregroundStyle(AppTheme.primaryText)
        .background(AppTheme.background)
        .navigationTitle("今日修煉")
    }

    private var dateKey: String { TaiwanDate.dateKey() }

    private var currentDaily: LocalDailyProgress? {
        container.progress.daily?.dateKey == dateKey ? container.progress.daily : nil
    }

    private var dailyEncounter: DailyEncounter? {
        guard let encounters = container.content?.events.dailyEncounters, !encounters.isEmpty else { return nil }
        let selected = NativeParityRules.dailyQuickPhraseIDs(
            phraseIDs: encounters.map(\.id),
            dateKey: "encounter:\(dateKey)",
            count: 1
        ).first
        return encounters.first { $0.id == selected }
    }

    private func isEncounterSeen(_ encounter: DailyEncounter) -> Bool {
        container.progress.world?.eventsSeen.contains("daily:\(dateKey):\(encounter.id)") == true
    }

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
        let daily = currentDaily
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

    private func format(milliseconds: Int) -> String {
        let seconds = milliseconds / 1_000
        return String(format: "%d:%02d", seconds / 60, seconds % 60)
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

    static func adding(days: Int, to dateKey: String) -> String? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Taipei")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateKey),
              let shifted = formatter.calendar.date(byAdding: .day, value: days, to: date) else {
            return nil
        }
        return formatter.string(from: shifted)
    }

    static func monday(of dateKey: String) -> String? {
        guard let date = parsed(dateKey) else { return nil }
        let calendar = taipeiCalendar
        let weekday = calendar.component(.weekday, from: date)
        return adding(days: -((weekday + 5) % 7), to: dateKey)
    }

    static func previousSchoolDay(before dateKey: String) -> String? {
        var cursor = adding(days: -1, to: dateKey)
        for _ in 0..<3 {
            guard let key = cursor, let date = parsed(key) else { return cursor }
            let weekday = taipeiCalendar.component(.weekday, from: date)
            if weekday != 1 && weekday != 7 { return key }
            cursor = adding(days: -1, to: key)
        }
        return cursor
    }

    private static var taipeiCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Taipei")!
        return calendar
    }

    private static func parsed(_ dateKey: String) -> Date? {
        let formatter = DateFormatter()
        formatter.calendar = taipeiCalendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Asia/Taipei")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateKey)
    }
}
