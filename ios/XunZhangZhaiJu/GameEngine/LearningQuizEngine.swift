import Foundation

enum LearningQuestionKind: String, Codable, Equatable {
    case choice
    case fill
}

struct LearningQuestion: Identifiable, Equatable {
    var id: String { "\(phraseID):\(kind.rawValue)" }
    var phraseID: String
    var kind: LearningQuestionKind
    var prompt: String
    var answer: String
    var options: [String]
}

enum ReviewSchedule {
    static func timestamp(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: date)
    }

    static func isDue(
        _ mastery: LocalPhraseMastery?,
        now: Date,
        dateKey: String
    ) -> Bool {
        guard let mastery else { return false }
        if let value = mastery.nextReviewAt,
           let due = date(from: value) {
            return due <= now
        }
        guard let legacyDateKey = mastery.nextReviewDateKey else { return false }
        return legacyDateKey <= dateKey
    }

    static func later(_ left: String?, _ right: String?) -> String? {
        guard let left else { return right }
        guard let right else { return left }
        guard let leftDate = date(from: left) else { return right }
        guard let rightDate = date(from: right) else { return left }
        return leftDate >= rightDate ? left : right
    }

    private static func date(from value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        let wholeSeconds = ISO8601DateFormatter()
        wholeSeconds.formatOptions = [.withInternetDateTime]
        return wholeSeconds.date(from: value)
    }
}

struct LearningQuizEngine {
    func buildStudyQuestions(
        phrases: [Phrase],
        progress: LocalAppProgress,
        dateKey: String,
        count: Int,
        now: Date = Date(),
        randomValues: [Double] = []
    ) -> [LearningQuestion] {
        let knownIDs = Set(phrases.map(\.id))
        let mastery = progress.mastery ?? [:]
        var prioritized: [String] = []
        var seen = Set<String>()

        func append(_ id: String) {
            guard knownIDs.contains(id), seen.insert(id).inserted else { return }
            prioritized.append(id)
        }

        for id in progress.wrongBook ?? [] where ReviewSchedule.isDue(mastery[id], now: now, dateKey: dateKey) {
            append(id)
        }
        for id in progress.wrongBook ?? [] { append(id) }
        for phrase in phrases where ReviewSchedule.isDue(mastery[phrase.id], now: now, dateKey: dateKey) {
            append(phrase.id)
        }
        for id in progress.collection { append(id) }
        for phrase in phrases { append(phrase.id) }

        return buildQuestions(
            phrases: phrases,
            targetPhraseIDs: prioritized,
            count: count,
            randomValues: randomValues
        )
    }

    func dueReviewPhraseIDs(
        phrases: [Phrase],
        progress: LocalAppProgress,
        dateKey: String,
        now: Date = Date(),
        limit: Int
    ) -> [String] {
        let knownIDs = Set(phrases.map(\.id))
        let ownedIDs = Set(progress.collection)
        let mastery = progress.mastery ?? [:]
        var result: [String] = []
        var seen = Set<String>()

        func append(_ id: String, requiresDue: Bool) {
            guard knownIDs.contains(id), ownedIDs.contains(id), seen.insert(id).inserted else { return }
            if requiresDue, !ReviewSchedule.isDue(mastery[id], now: now, dateKey: dateKey) { return }
            result.append(id)
        }

        for id in progress.wrongBook ?? [] { append(id, requiresDue: false) }
        for id in progress.collection { append(id, requiresDue: true) }
        return Array(result.prefix(max(0, limit)))
    }

    func buildQuestions(
        phrases: [Phrase],
        targetPhraseIDs: [String],
        count: Int,
        randomValues: [Double] = []
    ) -> [LearningQuestion] {
        guard count > 0 else { return [] }
        let phrasesByID = Dictionary(uniqueKeysWithValues: phrases.map { ($0.id, $0) })
        var prioritized: [Phrase] = []
        var seen = Set<String>()
        for id in targetPhraseIDs {
            if let phrase = phrasesByID[id], seen.insert(id).inserted {
                prioritized.append(phrase)
            }
        }
        prioritized.append(contentsOf: phrases.filter { seen.insert($0.id).inserted })

        var random = RandomValues(values: randomValues)
        var questions: [LearningQuestion] = []
        for (index, phrase) in prioritized.prefix(count).enumerated() {
            let wantsChoice = index.isMultiple(of: 2)
            if wantsChoice, phrases.count >= 4 {
                questions.append(choiceQuestion(for: phrase, allPhrases: phrases, random: &random))
            } else {
                questions.append(fillQuestion(for: phrase, random: &random))
            }
        }
        return questions
    }

    private func choiceQuestion(
        for phrase: Phrase,
        allPhrases: [Phrase],
        random: inout RandomValues
    ) -> LearningQuestion {
        let distractors = allPhrases
            .filter { $0.id != phrase.id }
            .prefix(3)
            .map(\.text)
        var options = [phrase.text] + distractors
        shuffle(&options, random: &random)
        return LearningQuestion(
            phraseID: phrase.id,
            kind: .choice,
            prompt: phrase.meaning,
            answer: phrase.text,
            options: options
        )
    }

    private func fillQuestion(
        for phrase: Phrase,
        random: inout RandomValues
    ) -> LearningQuestion {
        var characters = Array(phrase.text)
        let eligible = characters.indices.filter { index in
            characters.filter { $0 == characters[index] }.count == 1
        }
        let pool = eligible.isEmpty ? Array(characters.indices) : eligible
        let selected = pool[min(pool.count - 1, Int(random.next() * Double(pool.count)))]
        let answer = String(characters[selected])
        characters[selected] = "　"
        return LearningQuestion(
            phraseID: phrase.id,
            kind: .fill,
            prompt: "請補上空格：\(String(characters))",
            answer: answer,
            options: []
        )
    }

    private func shuffle(_ values: inout [String], random: inout RandomValues) {
        guard values.count > 1 else { return }
        for index in stride(from: values.count - 1, through: 1, by: -1) {
            let swapIndex = min(index, Int(random.next() * Double(index + 1)))
            values.swapAt(index, swapIndex)
        }
    }
}

private struct RandomValues {
    var values: [Double]
    var index = 0

    mutating func next() -> Double {
        defer { index += 1 }
        guard values.indices.contains(index), values[index].isFinite else { return 0 }
        return min(0.999_999_999, max(0, values[index]))
    }
}
