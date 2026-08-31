import Foundation

@MainActor
final class AppContainer: ObservableObject {
    enum StartupState: Equatable {
        case ready
        case failed(String)
    }

    @Published private(set) var startupState: StartupState
    @Published private(set) var content: AppContent?
    @Published private(set) var progress: LocalAppProgress
    @Published private(set) var practices: [String: LocalPhrasePracticeRecord]

    private let repository: ProgressRepository?
    private let deviceID: String?
    private let namespace: String?
    private let encoder = JSONEncoder()

    init() {
        do {
            let loadedContent = try ContentLoader().load()
            let database = try AppDatabase.live()
            let repository = ProgressRepository(database: database)
            let deviceID = try KeychainStore().deviceIdentifier()
            let namespace = "guest:\(deviceID)"
            let stored = try repository.snapshot(namespace: namespace)
            let progress = try stored.map { try JSONDecoder().decode(LocalAppProgress.self, from: $0.payload) }
                ?? .fresh
            let loadedPractices = try repository.practices(namespace: namespace)

            content = loadedContent
            self.repository = repository
            self.deviceID = deviceID
            self.namespace = namespace
            self.progress = progress
            practices = Dictionary(uniqueKeysWithValues: loadedPractices.map { ($0.phraseID, $0) })
            startupState = .ready
        } catch {
            content = nil
            repository = nil
            deviceID = nil
            namespace = nil
            progress = .fresh
            practices = [:]
            startupState = .failed(error.localizedDescription)
        }
    }

    func persist(gameState: GameState) throws {
        var next = progress
        let key = String(gameState.levelID)
        var level = next.levels[key] ?? LocalLevelProgress(stars: 0, found: [])
        level.found = orderedUnion(level.found, Array(gameState.foundPhraseIDs).sorted())
        if let earnedStars = gameState.earnedStars {
            level.stars = max(level.stars, earnedStars)
        }
        next.levels[key] = level
        next.collection = orderedUnion(next.collection, Array(gameState.collection).sorted())
        next = DailyProgressEngine().recordingGame(
            in: next,
            dateKey: TaiwanDate.dateKey(),
            gameState: gameState
        )
        var levelStats = next.levelStats ?? [:]
        var stats = levelStats[key] ?? .fresh
        if gameState.phase == .running {
            if next.activeRun?.levelID != gameState.levelID {
                stats.attempts += 1
            }
            next.activeRun = gameState
        } else {
            next.activeRun = nil
        }
        if gameState.phase == .completed {
            stats.completions += 1
            stats.bestStars = max(stats.bestStars, gameState.earnedStars ?? 0)
            stats.fewestMistakes = min(stats.fewestMistakes ?? gameState.mistakes, gameState.mistakes)
            if !stats.modesCleared.contains(gameState.mode) { stats.modesCleared.append(gameState.mode) }
            let badges = completionBadges(for: gameState)
            stats.badges = orderedUnion(stats.badges, badges)
            var activity = next.activity ?? .fresh
            activity.levelsSinceRest += 1
            next.activity = activity
            if let reward = gameState.treasureReward {
                next = WorldProgressEngine().grantingLevelTreasure(
                    reward,
                    levelID: gameState.levelID,
                    to: next
                )
            }
        }
        levelStats[key] = stats
        next.levelStats = levelStats
        try persist(next, kind: gameState.phase == .completed ? "levelCompleted" : "progressUpdated")
    }

    func recordQuiz(phraseID: String, kind: LearningQuestionKind, correct: Bool) throws {
        let next = DailyProgressEngine().recordingQuiz(
            in: progress,
            dateKey: TaiwanDate.dateKey(),
            phraseID: phraseID,
            kind: kind,
            correct: correct
        )
        try persist(next, kind: "quizAnswered")
    }

    func recordQuickChallenge(score: Int, durationMilliseconds: Int) throws {
        let next = DailyProgressEngine().recordingQuickChallenge(
            in: progress,
            dateKey: TaiwanDate.dateKey(),
            score: score,
            durationMilliseconds: durationMilliseconds
        )
        try persist(next, kind: "quickChallengeCompleted")
    }

    func spendInk(for tier: HintTier) throws -> Bool {
        var ledger = HintEngine(ink: progress.ink)
        guard ledger.spend(tier) else { return false }
        var next = progress
        next.ink = ledger.ink
        try persist(next, kind: "inkSpent")
        return true
    }

    func savePractice(phraseID: String, text: String) throws {
        guard let repository, let namespace else { throw AppContainerError.unavailable }
        let trimmed = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(80))
        let now = Date()
        let existing = practices[phraseID]
        let record = LocalPhrasePracticeRecord(
            id: existing?.id ?? UUID().uuidString.lowercased(),
            namespace: namespace,
            phraseID: phraseID,
            kind: "example",
            text: trimmed,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        )
        try repository.savePractice(record)
        practices[phraseID] = record
    }

    func takeRest() throws {
        var next = progress
        var activity = next.activity ?? .fresh
        activity.levelsSinceRest = 0
        activity.lastRestAt = Date()
        next.activity = activity
        try persist(next, kind: "restTaken")
    }

    func applyWorldEvent(_ event: WorldEvent, choice: EventChoice) throws {
        guard event.choices.contains(where: { $0.id == choice.id }) else {
            throw AppContainerError.invalidEventChoice
        }
        let next = WorldProgressEngine().applying(
            effects: choice.effect,
            eventID: event.id,
            to: progress
        )
        guard next != progress else { return }
        try persist(next, kind: "worldEventChosen")
    }

    func applyDailyEncounter(_ encounter: DailyEncounter) throws {
        let eventID = "daily:\(TaiwanDate.dateKey()):\(encounter.id)"
        let next = WorldProgressEngine().applying(
            effects: [encounter.effect],
            eventID: eventID,
            to: progress
        )
        guard next != progress else { return }
        try persist(next, kind: "dailyEncounterChosen")
    }

    private func persist(_ next: LocalAppProgress, kind: String) throws {
        guard let repository, let deviceID, let namespace else {
            throw AppContainerError.unavailable
        }

        let payload = try encoder.encode(next)
        let now = Date()
        let sequence = try repository.nextSequence(namespace: namespace, deviceID: deviceID)
        let eventID = UUID().uuidString.lowercased()
        try repository.apply(ProgressMutation(
            snapshot: ProgressSnapshotRecord(
                namespace: namespace,
                schemaVersion: next.v,
                payload: payload,
                updatedAt: now,
                serverRevision: nil
            ),
            event: ProgressEventRecord(
                id: eventID,
                namespace: namespace,
                deviceID: deviceID,
                sequence: sequence,
                kind: kind,
                payload: payload,
                occurredAt: now,
                syncedAt: nil
            )
        ))
        progress = next
    }

    private func orderedUnion(_ left: [String], _ right: [String]) -> [String] {
        var seen = Set<String>()
        return (left + right).filter { seen.insert($0).inserted }
    }

    private func completionBadges(for state: GameState) -> [String] {
        var badges: [String] = []
        if !state.usedReveal && state.mistakes == 0 { badges.append("insight") }
        if !state.usedReveal, !state.usedHint,
           let initial = state.initialTimeLimitMilliseconds,
           let remaining = state.remainingMilliseconds,
           initial > 0, Double(remaining) / Double(initial) >= 0.35 {
            badges.append("swift")
        }
        return badges
    }
}

enum AppContainerError: LocalizedError {
    case unavailable
    case invalidEventChoice

    var errorDescription: String? {
        switch self {
        case .unavailable: "本機內容或進度資料庫尚未就緒"
        case .invalidEventChoice: "這個事件選項不存在"
        }
    }
}
