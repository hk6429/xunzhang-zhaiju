import Foundation

@MainActor
final class GameViewModel: ObservableObject {
    @Published private(set) var state: GameState
    @Published var selectedCrossPhraseID: String?
    @Published var answer = ""
    @Published var knowledgePhrase: Phrase?
    @Published var errorMessage: String?
    @Published private(set) var hintCoordinates: Set<GridCoordinate> = []
    @Published private(set) var ink: Int
    @Published private(set) var comboCount = 0

    let level: Level
    let modeConfiguration: ModeConfiguration
    let phrasesByID: [String: Phrase]
    let passiveBonuses: TreasurePassiveBonuses
    private let persist: (GameState) throws -> Void
    private let spendInk: (HintTier) throws -> Bool
    private let nowMilliseconds: () -> Int64
    private var hintToken = UUID()
    private var comboLastFoundAt: Int64?
    private var lastClockMilliseconds: Int64

    init(
        level: Level,
        phrases: [Phrase],
        initialCollection: [String],
        initialInk: Int = 0,
        playMode: PlayMode = .standard,
        savedRun: GameState? = nil,
        passiveBonuses: TreasurePassiveBonuses = .none,
        persist: @escaping (GameState) throws -> Void,
        spendInk: @escaping (HintTier) throws -> Bool = { _ in false },
        nowMilliseconds: @escaping () -> Int64 = {
            Int64(ProcessInfo.processInfo.systemUptime * 1_000)
        }
    ) {
        self.level = level
        let resumedRun = savedRun.flatMap {
            $0.levelID == level.id && $0.phase == .running ? $0 : nil
        }
        let effectiveMode = resumedRun?.mode ?? playMode
        var configuration = NativeParityRules.modeConfiguration(
            mode: effectiveMode,
            timeLimit: level.timeLimit,
            hintCap: level.hintCap
        )
        if let timeLimit = configuration.timeLimit {
            configuration.timeLimit = timeLimit + max(0, passiveBonuses.extraTimeSeconds)
        }
        modeConfiguration = configuration
        phrasesByID = Dictionary(uniqueKeysWithValues: phrases.map { ($0.id, $0) })
        self.passiveBonuses = passiveBonuses
        self.persist = persist
        self.spendInk = spendInk
        self.nowMilliseconds = nowMilliseconds
        lastClockMilliseconds = nowMilliseconds()
        ink = initialInk
        var state: GameState
        if var savedRun = resumedRun {
            savedRun.collection.formUnion(initialCollection)
            savedRun.pauseReasons.removeAll()
            state = savedRun
        } else {
            state = GameState(
                levelID: level.id,
                targetPhraseIDs: Set(level.targets.map(\.phraseID)),
                timeLimitMilliseconds: modeConfiguration.timeLimit.map { $0 * 1_000 },
                collection: Set(initialCollection),
                mode: effectiveMode,
                treasureReward: level.treasure
            )
            try? GameReducer.reduce(state: &state, action: .start)
        }
        self.state = state
    }

    var targets: [(target: LevelTarget, phrase: Phrase)] {
        level.targets.compactMap { target in
            phrasesByID[target.phraseID].map { (target, $0) }
        }
    }

    var comboThreshold: Int {
        max(2, 4 - max(0, passiveBonuses.comboThresholdReduction))
    }

    var comboIsActive: Bool {
        comboCount >= comboThreshold
    }

    func clueTexts(for item: (target: LevelTarget, phrase: Phrase)) -> [String] {
        let clues = item.phrase.clues
        guard !clues.isEmpty else { return [] }
        let primaryIndex = clues.indices.contains(item.target.clueIndex) ? item.target.clueIndex : 0
        let primary = clues[primaryIndex].text
        let extras = clues.enumerated()
            .filter { $0.offset != primaryIndex }
            .map(\.element.text)
            .prefix(max(0, passiveBonuses.extraClues))
        return [primary] + Array(extras)
    }

    func select(path: [GridCoordinate]) {
        guard let match = targets.first(where: { item in
            !state.foundPhraseIDs.contains(item.phrase.id)
                && NativeParityRules.targetPath(
                    start: item.target.start,
                    direction: item.target.direction,
                    length: item.phrase.text.count,
                    size: level.size
                ) == path
        }) else {
            try? GameReducer.reduce(state: &state, action: .recordMistake)
            errorMessage = "這條路徑還不是本關真言，再看一次線索。"
            return
        }
        found(match.phrase, revealed: false)
    }

    func submitCrossAnswer() {
        guard let id = selectedCrossPhraseID,
              let phrase = phrasesByID[id],
              !state.foundPhraseIDs.contains(id) else { return }
        if answer.trimmingCharacters(in: .whitespacesAndNewlines) == phrase.text {
            found(phrase, revealed: false)
            answer = ""
            selectedCrossPhraseID = nil
        } else {
            try? GameReducer.reduce(state: &state, action: .recordMistake)
            errorMessage = "答案還差一點，再對照交叉字與線索。"
        }
    }

    func dismissKnowledge() {
        knowledgePhrase = nil
        if state.phase == .running, state.pauseReasons.contains(.knowledgeCard) {
            try? GameReducer.reduce(state: &state, action: .resume(.knowledgeCard))
            resetClockAnchor()
        }
    }

    func setLearningQuizPresented(_ presented: Bool) {
        guard state.phase == .running else { return }
        if presented, !state.pauseReasons.contains(.learningQuiz) {
            advanceClock()
            guard state.phase == .running else { return }
            try? GameReducer.reduce(state: &state, action: .pause(.learningQuiz))
        } else if !presented, state.pauseReasons.contains(.learningQuiz) {
            try? GameReducer.reduce(state: &state, action: .resume(.learningQuiz))
            resetClockAnchor()
        }
    }

    func setWorldEventPresented(_ presented: Bool) {
        guard state.phase == .running else { return }
        if presented, !state.pauseReasons.contains(.systemInterruption) {
            advanceClock()
            guard state.phase == .running else { return }
            try? GameReducer.reduce(state: &state, action: .pause(.systemInterruption))
        } else if !presented, state.pauseReasons.contains(.systemInterruption) {
            try? GameReducer.reduce(state: &state, action: .resume(.systemInterruption))
            resetClockAnchor()
        }
    }

    func refreshInk(_ value: Int) {
        ink = max(0, value)
    }

    func tick(milliseconds: Int) {
        guard state.phase == .running else { return }
        if let last = comboLastFoundAt, nowMilliseconds() - last > 12_000 {
            comboCount = 0
            comboLastFoundAt = nil
        }
        let phase = state.phase
        try? GameReducer.reduce(state: &state, action: .tick(milliseconds: milliseconds))
        if phase != state.phase { try? persist(state) }
    }

    func advanceClock() {
        let now = nowMilliseconds()
        let elapsed = max(0, now - lastClockMilliseconds)
        lastClockMilliseconds = now
        guard elapsed > 0 else { return }
        tick(milliseconds: Int(min(elapsed, Int64(Int.max))))
    }

    func setBackgrounded(_ backgrounded: Bool) {
        guard state.phase == .running else { return }
        if backgrounded, !state.pauseReasons.contains(.background) {
            advanceClock()
            guard state.phase == .running else { return }
            try? GameReducer.reduce(state: &state, action: .pause(.background))
            try? persist(state)
        } else if !backgrounded, state.pauseReasons.contains(.background) {
            try? GameReducer.reduce(state: &state, action: .resume(.background))
            resetClockAnchor()
        }
    }

    func retry() {
        do {
            try GameReducer.reduce(state: &state, action: .retry)
            resetClockAnchor()
            try persist(state)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveRunIfNeeded() {
        guard state.phase == .running else { return }
        try? persist(state)
    }

    func useHint(_ tier: HintTier) {
        guard state.phase == .running else { return }
        guard state.hintsUsed < (modeConfiguration.hintCap ?? Int.max) else {
            errorMessage = "本關提示次數已用完。"
            return
        }
        guard let item = targets.first(where: { !state.foundPhraseIDs.contains($0.phrase.id) }),
              let path = NativeParityRules.targetPath(
                start: item.target.start,
                direction: item.target.direction,
                length: item.phrase.text.count,
                size: level.size
              ) else { return }
        do {
            guard try spendInk(tier) else {
                errorMessage = "墨水不足，先到今日修煉答題研墨。"
                return
            }
            ink -= HintEngine.cost(of: tier)
            try GameReducer.reduce(state: &state, action: .useHint(tier))
            switch tier {
            case .circle:
                showHint(Set(path.prefix(1)))
            case .flash:
                showHint(Set(path))
            case .reveal:
                try GameReducer.reduce(
                    state: &state,
                    action: .foundPhrase(item.phrase.id, revealed: true)
                )
                knowledgePhrase = item.phrase
            }
            try persist(state)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func found(_ phrase: Phrase, revealed: Bool) {
        do {
            advanceClock()
            guard state.phase == .running else { return }
            let wasFound = state.foundPhraseIDs.contains(phrase.id)
            try GameReducer.reduce(
                state: &state,
                action: .foundPhrase(phrase.id, revealed: revealed)
            )
            if !wasFound, !revealed {
                recordCombo()
            }
            try persist(state)
            knowledgePhrase = phrase
            if state.phase == .running {
                try GameReducer.reduce(state: &state, action: .pause(.knowledgeCard))
                resetClockAnchor()
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func recordCombo() {
        let now = nowMilliseconds()
        if let last = comboLastFoundAt, now - last <= 12_000 {
            comboCount += 1
        } else {
            comboCount = 1
        }
        comboLastFoundAt = now
    }

    private func resetClockAnchor() {
        lastClockMilliseconds = nowMilliseconds()
    }

    private func showHint(_ coordinates: Set<GridCoordinate>) {
        let token = UUID()
        hintToken = token
        hintCoordinates = coordinates
        Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard self?.hintToken == token else { return }
            self?.hintCoordinates = []
        }
    }
}
