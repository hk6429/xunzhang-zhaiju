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

    let level: Level
    let modeConfiguration: ModeConfiguration
    let phrasesByID: [String: Phrase]
    private let persist: (GameState) throws -> Void
    private let spendInk: (HintTier) throws -> Bool
    private var hintToken = UUID()

    init(
        level: Level,
        phrases: [Phrase],
        initialCollection: [String],
        initialInk: Int = 0,
        playMode: PlayMode = .standard,
        savedRun: GameState? = nil,
        persist: @escaping (GameState) throws -> Void,
        spendInk: @escaping (HintTier) throws -> Bool = { _ in false }
    ) {
        self.level = level
        let resumedRun = savedRun.flatMap {
            $0.levelID == level.id && $0.phase == .running ? $0 : nil
        }
        let effectiveMode = resumedRun?.mode ?? playMode
        modeConfiguration = NativeParityRules.modeConfiguration(
            mode: effectiveMode,
            timeLimit: level.timeLimit,
            hintCap: level.hintCap
        )
        phrasesByID = Dictionary(uniqueKeysWithValues: phrases.map { ($0.id, $0) })
        self.persist = persist
        self.spendInk = spendInk
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
        }
    }

    func setLearningQuizPresented(_ presented: Bool) {
        guard state.phase == .running else { return }
        if presented, !state.pauseReasons.contains(.learningQuiz) {
            try? GameReducer.reduce(state: &state, action: .pause(.learningQuiz))
        } else if !presented, state.pauseReasons.contains(.learningQuiz) {
            try? GameReducer.reduce(state: &state, action: .resume(.learningQuiz))
        }
    }

    func setWorldEventPresented(_ presented: Bool) {
        guard state.phase == .running else { return }
        if presented, !state.pauseReasons.contains(.systemInterruption) {
            try? GameReducer.reduce(state: &state, action: .pause(.systemInterruption))
        } else if !presented, state.pauseReasons.contains(.systemInterruption) {
            try? GameReducer.reduce(state: &state, action: .resume(.systemInterruption))
        }
    }

    func refreshInk(_ value: Int) {
        ink = max(0, value)
    }

    func tick(milliseconds: Int) {
        guard state.phase == .running else { return }
        let phase = state.phase
        try? GameReducer.reduce(state: &state, action: .tick(milliseconds: milliseconds))
        if phase != state.phase { try? persist(state) }
    }

    func setBackgrounded(_ backgrounded: Bool) {
        guard state.phase == .running else { return }
        if backgrounded, !state.pauseReasons.contains(.background) {
            try? GameReducer.reduce(state: &state, action: .pause(.background))
            try? persist(state)
        } else if !backgrounded, state.pauseReasons.contains(.background) {
            try? GameReducer.reduce(state: &state, action: .resume(.background))
        }
    }

    func retry() {
        do {
            try GameReducer.reduce(state: &state, action: .retry)
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
            try GameReducer.reduce(
                state: &state,
                action: .foundPhrase(phrase.id, revealed: revealed)
            )
            try persist(state)
            knowledgePhrase = phrase
            if state.phase == .running {
                try GameReducer.reduce(state: &state, action: .pause(.knowledgeCard))
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
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
