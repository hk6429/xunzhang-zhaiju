import Foundation

enum PlayMode: String, Codable, CaseIterable, Hashable {
    case explore
    case standard
    case challenge

    var label: String {
        switch self {
        case .explore: "悟道"
        case .standard: "標準"
        case .challenge: "天劫"
        }
    }

    var timeMultiplier: Double {
        switch self {
        case .explore: 1.2
        case .standard: 1
        case .challenge: 0.8
        }
    }

    var hintAdjustment: Int {
        switch self {
        case .explore: 1
        case .standard: 0
        case .challenge: -1
        }
    }
}

struct ModeConfiguration: Codable, Equatable {
    var mode: PlayMode
    var label: String
    var timeLimit: Int?
    var hintCap: Int?
    var maxStars: Int
}

enum NativeParityRules {
    static func targetPath(
        start: GridCoordinate,
        direction: GridDirection,
        length: Int,
        size: Int
    ) -> [GridCoordinate]? {
        let path = (0..<length).map { offset in
            switch direction {
            case .east: GridCoordinate(row: start.row, column: start.column + offset)
            case .south: GridCoordinate(row: start.row + offset, column: start.column)
            }
        }
        return path.allSatisfy { (0..<size).contains($0.row) && (0..<size).contains($0.column) }
            ? path
            : nil
    }

    static func snappedPath(
        from: GridCoordinate,
        to: GridCoordinate,
        size: Int
    ) -> [GridCoordinate] {
        let eastDelta = to.column - from.column
        let southDelta = to.row - from.row
        let direction: GridDirection
        let length: Int
        if abs(eastDelta) >= abs(southDelta) {
            direction = .east
            length = max(0, eastDelta)
        } else {
            direction = .south
            length = max(0, southDelta)
        }
        return (0...length).compactMap { offset in
            let coordinate = direction == .east
                ? GridCoordinate(row: from.row, column: from.column + offset)
                : GridCoordinate(row: from.row + offset, column: from.column)
            return coordinate.row < size && coordinate.column < size ? coordinate : nil
        }
    }

    static func modeConfiguration(
        mode: PlayMode,
        timeLimit: Int?,
        hintCap: Int?
    ) -> ModeConfiguration {
        ModeConfiguration(
            mode: mode,
            label: mode.label,
            timeLimit: timeLimit.map { max(1, Int((Double($0) * mode.timeMultiplier).rounded())) },
            hintCap: hintCap.map { max(0, $0 + mode.hintAdjustment) },
            maxStars: 3
        )
    }

    static func stars(usedReveal: Bool, usedHint: Bool, maxStars: Int) -> Int {
        min(usedReveal ? 1 : (usedHint ? 2 : 3), max(0, maxStars))
    }

    static func dailyQuestIDs(dateKey: String) -> [String] {
        let pools = [
            ["clear-level", "clear-level-2"],
            ["quiz-correct-3", "quiz-correct", "quiz-correct-7"],
            ["find-phrases", "find-phrases-5"],
        ]
        return pools.enumerated().map { index, pool in
            let hash = hashSeed("xzzj-quest:\(dateKey):\(index)")
            return pool[Int(hash % UInt32(pool.count))]
        }
    }

    static func dailyQuickPhraseIDs(
        phraseIDs: [String],
        dateKey: String,
        count: Int
    ) -> [String] {
        var unique: [String] = []
        for id in phraseIDs where !id.isEmpty && !unique.contains(id) {
            unique.append(id)
        }
        var state = hashSeed("xzzj:\(dateKey)")
        if state == 0 { state = 1 }
        guard unique.count > 1 else { return Array(unique.prefix(max(1, count))) }
        for index in stride(from: unique.count - 1, through: 1, by: -1) {
            state = state &* 1_664_525 &+ 1_013_904_223
            let random = Double(state) / 4_294_967_296
            let swapIndex = Int(floor(random * Double(index + 1)))
            unique.swapAt(index, swapIndex)
        }
        return Array(unique.prefix(max(1, count)))
    }

    private static func hashSeed(_ text: String) -> UInt32 {
        var hash: UInt32 = 2_166_136_261
        for scalar in text.unicodeScalars {
            hash ^= scalar.value
            hash = hash &* 16_777_619
        }
        return hash
    }
}

struct HintLedger: Equatable {
    private(set) var ink: Int

    init(ink: Int) {
        self.ink = max(0, ink)
    }

    mutating func earn(_ kind: String) -> Bool {
        guard let amount = ["choice": 1, "fill": 2][kind] else { return false }
        ink += amount
        return true
    }

    mutating func spend(_ tier: String) -> Bool {
        guard let cost = ["circle": 1, "flash": 3, "reveal": 5][tier], ink >= cost else {
            return false
        }
        ink -= cost
        return true
    }
}

struct LevelProgressSummary: Codable, Equatable {
    var stars: Int?
    var found: [String]?
    var badges: [String]?
    var modes: [String]?
    var bestDurationMs: Int?
    var fewestMistakes: Int?
}

struct QuizSummary: Codable, Equatable {
    var answered: Int
    var correct: Int
}

struct ProgressSummary: Codable, Equatable {
    var levels: [String: LevelProgressSummary]
    var collection: [String]
    var treasures: [String]
    var eventsSeen: [String]
    var chapters: [Int]
    var quizStats: QuizSummary
    var ink: Int
}

struct InkEventSummary: Codable, Equatable {
    var id: String
    var kind: String
    var amount: Int
}

enum ProgressMergeEngine {
    static func normalize(_ value: ProgressSummary) -> ProgressSummary {
        var levels: [String: LevelProgressSummary] = [:]
        for (id, record) in value.levels where Int(id) != nil {
            levels[id] = LevelProgressSummary(
                stars: min(3, max(0, record.stars ?? 0)),
                found: union([], record.found ?? []),
                badges: union([], record.badges ?? []),
                modes: union([], record.modes ?? []).filter {
                    ["explore", "standard", "challenge"].contains($0)
                },
                bestDurationMs: nonnegative(record.bestDurationMs),
                fewestMistakes: nonnegative(record.fewestMistakes)
            )
        }
        return ProgressSummary(
            levels: levels,
            collection: union([], value.collection),
            treasures: union([], value.treasures),
            eventsSeen: union([], value.eventsSeen),
            chapters: union([], value.chapters.filter { (1...10).contains($0) }),
            quizStats: QuizSummary(
                answered: max(0, value.quizStats.answered),
                correct: max(0, value.quizStats.correct)
            ),
            ink: max(0, value.ink)
        )
    }

    static func merge(
        _ left: ProgressSummary,
        _ right: ProgressSummary,
        inkEvents: [InkEventSummary]
    ) -> ProgressSummary {
        let left = normalize(left)
        let right = normalize(right)
        var levels: [String: LevelProgressSummary] = [:]
        for id in Set(left.levels.keys).union(right.levels.keys).sorted() {
            let lhs = left.levels[id]
            let rhs = right.levels[id]
            levels[id] = LevelProgressSummary(
                stars: max(lhs?.stars ?? 0, rhs?.stars ?? 0),
                found: union(lhs?.found ?? [], rhs?.found ?? []),
                badges: union(lhs?.badges ?? [], rhs?.badges ?? []),
                modes: union(lhs?.modes ?? [], rhs?.modes ?? []),
                bestDurationMs: minimum(lhs?.bestDurationMs, rhs?.bestDurationMs),
                fewestMistakes: minimum(lhs?.fewestMistakes, rhs?.fewestMistakes)
            )
        }

        var seen = Set<String>()
        var ink = 0
        for event in inkEvents where seen.insert(event.id).inserted {
            if event.kind == "earned" { ink += max(0, event.amount) }
            if event.kind == "spent" { ink -= max(0, event.amount) }
        }
        return ProgressSummary(
            levels: levels,
            collection: union(left.collection, right.collection),
            treasures: union(left.treasures, right.treasures),
            eventsSeen: union(left.eventsSeen, right.eventsSeen),
            chapters: union(left.chapters, right.chapters),
            quizStats: QuizSummary(
                answered: max(0, left.quizStats.answered) + max(0, right.quizStats.answered),
                correct: max(0, left.quizStats.correct) + max(0, right.quizStats.correct)
            ),
            ink: max(0, ink)
        )
    }

    private static func union<T: Hashable>(_ left: [T], _ right: [T]) -> [T] {
        var seen = Set<T>()
        return (left + right).filter { seen.insert($0).inserted }
    }

    private static func minimum(_ left: Int?, _ right: Int?) -> Int? {
        [left, right].compactMap { $0 }.filter { $0 >= 0 }.min()
    }

    private static func nonnegative(_ value: Int?) -> Int? {
        guard let value, value >= 0 else { return nil }
        return value
    }
}
