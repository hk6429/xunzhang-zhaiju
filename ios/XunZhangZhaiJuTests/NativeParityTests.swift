import XCTest
@testable import XunZhangZhaiJu

final class NativeParityTests: XCTestCase {
    func testSwiftCoreRulesMatchJavaScriptGoldenFixture() throws {
        let fixture = try loadFixture()

        for item in fixture.targetPaths {
            XCTAssertEqual(
                NativeParityRules.targetPath(
                    start: item.start,
                    direction: item.direction,
                    length: item.length,
                    size: item.size
                ),
                item.expected
            )
        }
        for item in fixture.snappedPaths {
            XCTAssertEqual(
                NativeParityRules.snappedPath(from: item.from, to: item.to, size: item.size),
                item.expected
            )
        }
        for item in fixture.modes {
            XCTAssertEqual(
                NativeParityRules.modeConfiguration(mode: item.mode, timeLimit: 300, hintCap: 2),
                item.expected
            )
        }
        for item in fixture.stars {
            XCTAssertEqual(
                NativeParityRules.stars(
                    usedReveal: item.usedReveal,
                    usedHint: item.usedHint,
                    maxStars: item.maxStars
                ),
                item.expected
            )
        }
    }

    func testHintDailySeedAndProgressMergeMatchJavaScript() throws {
        let fixture = try loadFixture()
        var ledger = HintLedger(ink: fixture.hintRun.initialInk)
        for operation in fixture.hintRun.operations {
            let accepted = operation.action == "earn"
                ? ledger.earn(operation.value)
                : ledger.spend(operation.value)
            XCTAssertEqual(accepted, operation.accepted)
            XCTAssertEqual(ledger.ink, operation.ink)
        }
        XCTAssertEqual(
            NativeParityRules.dailyQuestIDs(dateKey: fixture.daily.dateKey),
            fixture.daily.questIDs
        )
        XCTAssertEqual(
            NativeParityRules.dailyQuickPhraseIDs(
                phraseIDs: fixture.daily.phraseIDs,
                dateKey: fixture.daily.dateKey,
                count: 5
            ),
            fixture.daily.quickPhraseIDs
        )
        XCTAssertEqual(
            ProgressMergeEngine.normalize(fixture.normalization.input),
            fixture.normalization.expected
        )
        XCTAssertEqual(
            ProgressMergeEngine.merge(
                fixture.merge.left,
                fixture.merge.right,
                inkEvents: fixture.merge.inkEvents
            ),
            fixture.merge.expected
        )
    }

    private func loadFixture() throws -> NativeFixture {
        let bundle = Bundle(for: NativeParityTests.self)
        let url = try XCTUnwrap(bundle.url(forResource: "core-rules", withExtension: "json"))
        return try JSONDecoder().decode(NativeFixture.self, from: Data(contentsOf: url))
    }
}

private struct NativeFixture: Decodable {
    struct PathCase: Decodable {
        var start: GridCoordinate
        var direction: GridDirection
        var length: Int
        var size: Int
        var expected: [GridCoordinate]?

        enum CodingKeys: String, CodingKey {
            case start
            case direction = "dir"
            case length
            case size
            case expected
        }
    }

    struct SnapCase: Decodable {
        var from: GridCoordinate
        var to: GridCoordinate
        var size: Int
        var expected: [GridCoordinate]
    }

    struct ModeCase: Decodable {
        var mode: PlayMode
        var expected: ModeConfiguration
    }

    struct StarCase: Decodable {
        var usedReveal: Bool
        var usedHint: Bool
        var maxStars: Int
        var expected: Int
    }

    struct HintRun: Decodable {
        struct Operation: Decodable {
            var action: String
            var value: String
            var accepted: Bool
            var ink: Int
        }
        var initialInk: Int
        var operations: [Operation]
    }

    struct Daily: Decodable {
        var dateKey: String
        var phraseIDs: [String]
        var questIDs: [String]
        var quickPhraseIDs: [String]
    }

    struct Merge: Decodable {
        var left: ProgressSummary
        var right: ProgressSummary
        var inkEvents: [InkEventSummary]
        var expected: ProgressSummary
    }

    struct Normalization: Decodable {
        var input: ProgressSummary
        var expected: ProgressSummary
    }

    var targetPaths: [PathCase]
    var snappedPaths: [SnapCase]
    var modes: [ModeCase]
    var stars: [StarCase]
    var hintRun: HintRun
    var daily: Daily
    var normalization: Normalization
    var merge: Merge
}
