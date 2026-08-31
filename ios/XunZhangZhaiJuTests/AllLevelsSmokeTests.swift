import XCTest
@testable import XunZhangZhaiJu

final class AllLevelsSmokeTests: XCTestCase {
    func testAllOneHundredLevelsHaveALegalCompletionPath() throws {
        let content = try ContentLoader().load()
        XCTAssertEqual(content.levels.count, 100)

        for level in content.levels {
            var state = GameState(
                levelID: level.id,
                targetPhraseIDs: Set(level.targets.map(\.phraseID)),
                timeLimitMilliseconds: level.timeLimit.map { $0 * 1_000 },
                mode: .standard,
                treasureReward: level.treasure
            )
            try GameReducer.reduce(state: &state, action: .start)
            for phraseID in level.targets.map(\.phraseID) {
                try GameReducer.reduce(state: &state, action: .foundPhrase(phraseID, revealed: false))
            }
            XCTAssertEqual(state.phase, .completed, "第 \(level.id) 關無法合法完成")
            XCTAssertEqual(state.earnedStars, 3, "第 \(level.id) 關零提示完成應為三星")
        }
    }
}
