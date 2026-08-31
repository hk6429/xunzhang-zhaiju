import XCTest
@testable import XunZhangZhaiJu

final class SyncContractTests: XCTestCase {
    func testSharedV1FixtureDecodesAndNeverContainsLocalPractice() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "progress-v1", withExtension: "json"))
        let data = try Data(contentsOf: url)
        let snapshot = try JSONDecoder().decode(LocalAppProgress.self, from: data)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

        XCTAssertEqual(snapshot.v, 1)
        XCTAssertEqual(snapshot.levels["1"]?.stars, 3)
        XCTAssertNil(object["localPhrasePractice"])
    }
}
