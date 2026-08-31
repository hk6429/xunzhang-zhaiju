import XCTest
@testable import XunZhangZhaiJu

final class ContentValidationTests: XCTestCase {
    func testBundledContentPassesFullValidation() throws {
        let content = try ContentLoader().load()

        XCTAssertNoThrow(try ContentValidator().validate(content))
    }

    func testMissingPhraseIsRejected() throws {
        var content = try ContentLoader().load()
        content.levels[0].targets[0].phraseID = "p9999"

        XCTAssertThrowsError(try ContentValidator().validate(content))
    }

    func testOutOfBoundsCoordinateIsRejected() throws {
        var content = try ContentLoader().load()
        content.levels[0].targets[0].start = GridCoordinate(row: 99, column: 99)

        XCTAssertThrowsError(try ContentValidator().validate(content))
    }

    func testWrongGridSizeIsRejected() throws {
        var content = try ContentLoader().load()
        content.levels[0].grid.removeLast()

        XCTAssertThrowsError(try ContentValidator().validate(content))
    }

    func testCrossRevealedMustEqualCrossingCells() throws {
        var content = try ContentLoader().load()
        let index = try XCTUnwrap(content.levels.firstIndex { $0.layout == .cross })
        content.levels[index].revealed = []

        XCTAssertThrowsError(try ContentValidator().validate(content))
    }

    func testWrongManifestHashIsRejected() throws {
        let content = try ContentLoader().load()
        var resources = content.resourceData
        resources["data/phrases.json"]?.append(0x20)

        XCTAssertThrowsError(
            try ContentValidator().validateManifest(content.manifest, resources: resources)
        )
    }
}
