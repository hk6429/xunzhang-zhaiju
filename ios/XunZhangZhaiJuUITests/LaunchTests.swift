import XCTest

final class LaunchTests: XCTestCase {
    @MainActor
    func testAppLaunchesIntoJourney() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["修煉山河"].firstMatch.waitForExistence(timeout: 5))
    }

    @MainActor
    func testFirstLevelOpensNativeFullBoard() throws {
        let app = XCUIApplication()
        app.launch()
        let firstLevel = app.buttons["level-1"]
        XCTAssertTrue(firstLevel.waitForExistence(timeout: 5))

        firstLevel.tap()

        XCTAssertTrue(
            app.descendants(matching: .any)["full-board"].waitForExistence(timeout: 5)
        )
    }

    @MainActor
    func testNativeTabsOpenDailyCollectionAndProfile() throws {
        let app = XCUIApplication()
        app.launch()

        app.buttons["今日修煉"].tap()
        XCTAssertTrue(app.staticTexts["今日三帖"].waitForExistence(timeout: 5))

        app.buttons["摘句集"].tap()
        XCTAssertTrue(app.navigationBars["摘句集"].waitForExistence(timeout: 5))

        app.buttons["我的"].tap()
        XCTAssertTrue(app.staticTexts["遊玩模式"].waitForExistence(timeout: 5))
    }
}
