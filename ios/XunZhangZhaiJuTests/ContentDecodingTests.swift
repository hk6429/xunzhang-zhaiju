import XCTest
@testable import XunZhangZhaiJu

final class ContentDecodingTests: XCTestCase {
    func testBundledContentDecodesAllRecords() throws {
        let content = try ContentLoader().load()

        XCTAssertEqual(content.phrases.count, 409)
        XCTAssertEqual(content.levels.count, 100)
        XCTAssertEqual(content.levels.flatMap(\.targets).count, 832)
        XCTAssertEqual(content.events.events.count, 10)
        XCTAssertEqual(content.events.dailyEncounters.count, 5)
        XCTAssertEqual(content.story.chapters.count, 10)
        XCTAssertEqual(content.story.bosses.count, 5)
        XCTAssertEqual(content.story.treasures.count, 5)
    }

    func testPhraseTypesCoverIdiomAndAllLiteraryMetadata() throws {
        let content = try ContentLoader().load()
        let types = Set(content.phrases.map(\.type))

        XCTAssertEqual(types, Set(PhraseType.allCases))
        XCTAssertTrue(content.phrases.filter(\.type.isLiterary).allSatisfy {
            $0.author?.isEmpty == false && $0.dynasty?.isEmpty == false
        })
    }

    func testUnknownPhraseTypeIsRejected() {
        let json = #"[{"id":"p0001","text":"一心一意","type":"未知","level":"常用","meaning":"義","insight":"悟","textbook":true,"clues":[]}]"#

        XCTAssertThrowsError(try JSONDecoder().decode([Phrase].self, from: Data(json.utf8)))
    }

    func testLevelEnumsDecodeOnlySupportedValues() throws {
        let content = try ContentLoader().load()

        XCTAssertEqual(Set(content.levels.map(\.layout)), [.full, .cross])
        XCTAssertEqual(Set(content.levels.flatMap(\.directions)), [.east, .south])
        XCTAssertEqual(Set(content.levels.flatMap(\.targets).map(\.direction)), [.east, .south])
    }
}
