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

    func testCompletedTimePassivesExtendTheNativeCountdown() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.timeLimit != nil })
        let bonuses = TreasurePassiveBonuses(extraTimeSeconds: 35)

        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            passiveBonuses: bonuses,
            persist: { _ in }
        )

        XCTAssertEqual(model.modeConfiguration.timeLimit, level.timeLimit! + 35)
        XCTAssertEqual(model.state.initialTimeLimitMilliseconds, (level.timeLimit! + 35) * 1_000)
    }

    func testCluePassivesExposeAdditionalDistinctClues() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first)
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            passiveBonuses: TreasurePassiveBonuses(extraClues: 2),
            persist: { _ in }
        )
        let item = try XCTUnwrap(model.targets.first)

        let clues = model.clueTexts(for: item)

        XCTAssertEqual(clues.count, 3)
        XCTAssertEqual(Set(clues).count, 3)
    }

    func testComboPassivesLowerTheMilestoneAndExpireAfterTwelveSeconds() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.targets.count >= 2 })
        var now: Int64 = 1_000
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            passiveBonuses: TreasurePassiveBonuses(comboThresholdReduction: 2),
            persist: { _ in },
            nowMilliseconds: { now }
        )

        for item in model.targets.prefix(2) {
            let path = try XCTUnwrap(NativeParityRules.targetPath(
                start: item.target.start,
                direction: item.target.direction,
                length: item.phrase.text.count,
                size: level.size
            ))
            model.select(path: path)
            model.dismissKnowledge()
            now += 4_000
        }

        XCTAssertEqual(model.comboThreshold, 2)
        XCTAssertEqual(model.comboCount, 2)
        XCTAssertTrue(model.comboIsActive)

        now += 13_000
        model.tick(milliseconds: 0)
        XCTAssertEqual(model.comboCount, 0)
        XCTAssertFalse(model.comboIsActive)
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

    func testSavedRunRestoresFoundPhrasesTimeAndMode() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.timeLimit != nil })
        let firstID = try XCTUnwrap(level.targets.first?.phraseID)
        var saved = GameState(
            levelID: level.id,
            targetPhraseIDs: Set(level.targets.map(\.phraseID)),
            timeLimitMilliseconds: 99_000,
            mode: .challenge
        )
        saved.phase = .running
        saved.foundPhraseIDs = [firstID]
        saved.remainingMilliseconds = 42_000
        saved.pauseReasons = [.background]

        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [firstID],
            playMode: .standard,
            savedRun: saved,
            persist: { _ in }
        )

        XCTAssertEqual(model.state.foundPhraseIDs, [firstID])
        XCTAssertEqual(model.state.remainingMilliseconds, 42_000)
        XCTAssertEqual(model.state.mode, .challenge)
        XCTAssertEqual(model.modeConfiguration.mode, .challenge)
        XCTAssertTrue(model.state.pauseReasons.isEmpty)
    }

    func testLearningQuizPausesAndResumesCountdown() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.timeLimit != nil })
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            persist: { _ in }
        )
        let initial = try XCTUnwrap(model.state.remainingMilliseconds)

        model.setLearningQuizPresented(true)
        model.tick(milliseconds: 1_000)
        XCTAssertEqual(model.state.remainingMilliseconds, initial)
        XCTAssertTrue(model.state.pauseReasons.contains(.learningQuiz))

        model.setLearningQuizPresented(false)
        model.tick(milliseconds: 1_000)
        XCTAssertEqual(model.state.remainingMilliseconds, initial - 1_000)
        XCTAssertFalse(model.state.pauseReasons.contains(.learningQuiz))
    }

    func testWorldEventPausesAndResumesCountdown() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first { $0.timeLimit != nil })
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            persist: { _ in }
        )
        let initial = try XCTUnwrap(model.state.remainingMilliseconds)

        model.setWorldEventPresented(true)
        model.tick(milliseconds: 1_000)
        XCTAssertEqual(model.state.remainingMilliseconds, initial)
        XCTAssertTrue(model.state.pauseReasons.contains(.systemInterruption))

        model.setWorldEventPresented(false)
        model.tick(milliseconds: 1_000)
        XCTAssertEqual(model.state.remainingMilliseconds, initial - 1_000)
        XCTAssertFalse(model.state.pauseReasons.contains(.systemInterruption))
    }

    func testQuizInkRefreshNeverAcceptsNegativeValue() throws {
        let content = try ContentLoader().load()
        let level = try XCTUnwrap(content.levels.first)
        let model = GameViewModel(
            level: level,
            phrases: content.phrases,
            initialCollection: [],
            initialInk: 3,
            persist: { _ in }
        )

        model.refreshInk(-2)

        XCTAssertEqual(model.ink, 0)
    }
}
