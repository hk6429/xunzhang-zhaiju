import XCTest
@testable import XunZhangZhaiJu

@MainActor
final class GameViewModelTests: XCTestCase {
    func testFullBoardSelectionFindsTargetAndPersists() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.layout == .full })
        var persisted: [GameState] = []
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            persist: { persisted.append($0) }
        )
        let item = try XCTUnwrap(model.targets.first)
        let path = try XCTUnwrap(NativeParityRules.targetPath(
            start: item.target.start,
            direction: item.target.direction,
            length: item.phrase.text.count,
            size: level.size
        ))

        model.select(path: path)

        XCTAssertTrue(model.state.foundPhraseIDs.contains(item.phrase.id))
        XCTAssertEqual(model.knowledgePhrase?.id, item.phrase.id)
        XCTAssertEqual(persisted.count, 1)
    }

    func testCrossAnswerFindsSelectedTarget() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.layout == .cross })
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            persist: { _ in }
        )
        let phrase = try XCTUnwrap(model.targets.first?.phrase)
        model.selectedCrossPhraseID = phrase.id
        model.answer = phrase.text

        model.submitCrossAnswer()

        XCTAssertTrue(model.state.foundPhraseIDs.contains(phrase.id))
        XCTAssertEqual(model.knowledgePhrase?.id, phrase.id)
    }

    func testChallengeModeAppliesTimerAndHintCap() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.timeLimit != nil })

        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            initialInk: 30,
            playMode: .challenge,
            persist: { _ in },
            spendInk: { _ in true }
        )

        XCTAssertEqual(
            model.state.initialTimeLimitMilliseconds,
            Int((Double(level.timeLimit!) * 0.8).rounded()) * 1_000
        )
        XCTAssertEqual(model.modeConfiguration.hintCap, max(0, level.hintCap - 1))
    }

    func testHintSpendsInkPersistsAndRevealDoesNotEnterCollection() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.hintCap >= 2 })
        var spent: [HintTier] = []
        var persisted: [GameState] = []
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            initialInk: 10,
            persist: { persisted.append($0) },
            spendInk: { spent.append($0); return true }
        )

        model.useHint(.reveal)

        let revealed = try XCTUnwrap(model.state.revealedPhraseIDs.first)
        XCTAssertEqual(spent, [.reveal])
        XCTAssertEqual(model.ink, 5)
        XCTAssertFalse(model.state.collection.contains(revealed))
        XCTAssertEqual(persisted.last?.usedReveal, true)
    }

    func testBackgroundPausesTimerUntilReturningActive() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.timeLimit != nil })
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            persist: { _ in }
        )
        let initial = try XCTUnwrap(model.state.remainingMilliseconds)

        model.setBackgrounded(true)
        model.tick(milliseconds: 1_000)
        XCTAssertEqual(model.state.remainingMilliseconds, initial)

        model.setBackgrounded(false)
        model.tick(milliseconds: 1_000)
        XCTAssertEqual(model.state.remainingMilliseconds, initial - 1_000)
    }
}
