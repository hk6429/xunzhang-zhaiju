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
}
