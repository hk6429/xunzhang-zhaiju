import Foundation

@MainActor
final class GameViewModel: ObservableObject {
    @Published private(set) var state: GameState
    @Published var selectedCrossPhraseID: String?
    @Published var answer = ""
    @Published var knowledgePhrase: Phrase?
    @Published var errorMessage: String?

    let level: Level
    let phrasesByID: [String: Phrase]
    private let persist: (GameState) throws -> Void

    init(
        level: Level,
        phrases: [Phrase],
        initialCollection: [String],
        persist: @escaping (GameState) throws -> Void
    ) {
        self.level = level
        phrasesByID = Dictionary(uniqueKeysWithValues: phrases.map { ($0.id, $0) })
        self.persist = persist
        var state = GameState(
            levelID: level.id,
            targetPhraseIDs: Set(level.targets.map(\.phraseID)),
            timeLimitMilliseconds: level.timeLimit.map { $0 * 1_000 },
            collection: Set(initialCollection)
        )
        try? GameReducer.reduce(state: &state, action: .start)
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
    }

    private func found(_ phrase: Phrase, revealed: Bool) {
        do {
            try GameReducer.reduce(
                state: &state,
                action: .foundPhrase(phrase.id, revealed: revealed)
            )
            try persist(state)
            knowledgePhrase = phrase
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
