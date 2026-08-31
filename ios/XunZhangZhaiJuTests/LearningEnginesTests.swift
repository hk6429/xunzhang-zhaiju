import XCTest
@testable import XunZhangZhaiJu

final class LearningEnginesTests: XCTestCase {
    func testInkOnlyIncreasesForCorrectEligibleQuizAnswers() {
        var engine = HintEngine(ink: 0)

        XCTAssertEqual(engine.reward(for: .choice, correct: false, eligible: true), 0)
        XCTAssertEqual(engine.reward(for: .choice, correct: true, eligible: false), 0)
        XCTAssertEqual(engine.reward(for: .choice, correct: true, eligible: true), 1)
        XCTAssertEqual(engine.reward(for: .fill, correct: true, eligible: true), 2)
        XCTAssertEqual(engine.ink, 3)
    }

    func testInsufficientInkNeverBecomesNegative() {
        var engine = HintEngine(ink: 2)

        XCTAssertFalse(engine.spend(.flash))
        XCTAssertEqual(engine.ink, 2)
        XCTAssertTrue(engine.spend(.circle))
        XCTAssertEqual(engine.ink, 1)
    }

    func testRevealedPhraseDoesNotEnterCollection() {
        var collection = CollectionEngine(initialPhraseIDs: ["p-old"])

        XCTAssertFalse(collection.collect("p-revealed", revealed: true))
        XCTAssertTrue(collection.collect("p-found", revealed: false))
        XCTAssertEqual(collection.phraseIDs, ["p-old", "p-found"])
    }

    func testQuestionsPrioritizeCurrentLevelTargetsAndAlternateKinds() throws {
        let phrases = try ContentLoader().load().phrases
        let targetIDs = Array(phrases.prefix(4).map(\.id))
        let questions = LearningQuizEngine().buildQuestions(
            phrases: phrases,
            targetPhraseIDs: targetIDs,
            count: 4,
            randomValues: Array(repeating: 0, count: 20)
        )

        XCTAssertEqual(Set(questions.map(\.phraseID)), Set(targetIDs))
        XCTAssertEqual(questions.map(\.kind), [.choice, .fill, .choice, .fill])
        XCTAssertTrue(questions.filter { $0.kind == .choice }.allSatisfy {
            $0.options.count == 4 && $0.options.contains($0.answer)
        })
    }

    func testStudyQuestionsPrioritizeDueWrongBookThenCollection() throws {
        let phrases = try ContentLoader().load().phrases
        let due = phrases[4]
        let future = phrases[5]
        let collected = phrases[6]
        var progress = LocalAppProgress.fresh
        progress.wrongBook = [future.id, due.id]
        progress.collection = [collected.id]
        progress.mastery = [
            due.id: LocalPhraseMastery(
                answered: 1,
                correct: 0,
                wrong: 1,
                correctStreak: 0,
                fillCorrect: 0,
                mastered: false,
                lastAnsweredDateKey: "2026-08-31",
                nextReviewDateKey: "2026-09-01"
            ),
            future.id: LocalPhraseMastery(
                answered: 1,
                correct: 0,
                wrong: 1,
                correctStreak: 0,
                fillCorrect: 0,
                mastered: false,
                lastAnsweredDateKey: "2026-09-01",
                nextReviewDateKey: "2026-09-03"
            ),
        ]

        let questions = LearningQuizEngine().buildStudyQuestions(
            phrases: phrases,
            progress: progress,
            dateKey: "2026-09-01",
            count: 3,
            randomValues: Array(repeating: 0, count: 20)
        )

        XCTAssertEqual(questions.map(\.phraseID), [due.id, future.id, collected.id])
    }
}
