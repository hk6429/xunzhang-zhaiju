import XCTest

final class LaunchTests: XCTestCase {
    @MainActor
    func testAppLaunchesIntoJourney() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["修煉山河"].firstMatch.waitForExistence(timeout: 5))
    }
}
