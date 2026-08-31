import XCTest
@testable import XunZhangZhaiJu

final class SmokeTests: XCTestCase {
    func testRootNavigationHasFourStableSections() {
        XCTAssertEqual(AppSection.allCases.map(\.title), [
            "修煉山河",
            "今日修煉",
            "摘句集",
            "我的",
        ])
    }
}
