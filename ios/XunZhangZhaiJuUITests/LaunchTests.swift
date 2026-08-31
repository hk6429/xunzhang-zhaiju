import XCTest
import UIKit

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
        app.swipeUp()
        app.swipeUp()
        XCTAssertTrue(
            app.descendants(matching: .any)["privacy-policy-link"].waitForExistence(timeout: 5)
        )
        XCTAssertTrue(
            app.descendants(matching: .any)["support-page-link"].waitForExistence(timeout: 5)
        )
    }

    @MainActor
    func testAccessibilityTextStillReachesCoreNavigation() throws {
        let app = XCUIApplication()
        app.launchEnvironment["UI_TEST_ACCESSIBILITY_TEXT"] = "1"
        app.launch()

        XCTAssertTrue(app.staticTexts["修煉山河"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["今日修煉"].exists)
        XCTAssertTrue(app.buttons["摘句集"].exists)
        XCTAssertTrue(app.buttons["我的"].exists)
    }

    @MainActor
    func testIPadPortraitAndLandscapeKeepLargeTextNavigationUsable() throws {
        guard UIDevice.current.userInterfaceIdiom == .pad else {
            throw XCTSkip("iPad layout validation")
        }

        let device = XCUIDevice.shared
        device.orientation = .portrait
        addTeardownBlock { device.orientation = .portrait }

        let app = XCUIApplication()
        app.launchEnvironment["UI_TEST_ACCESSIBILITY_TEXT"] = "1"
        app.launch()

        assertCoreNavigation(in: app)

        device.orientation = .landscapeLeft
        XCTAssertTrue(app.staticTexts["修煉山河"].firstMatch.waitForExistence(timeout: 5))
        assertCoreNavigation(in: app)

        app.buttons["今日修煉"].tap()
        XCTAssertTrue(app.staticTexts["今日三帖"].waitForExistence(timeout: 5))
    }

    @MainActor
    private func assertCoreNavigation(in app: XCUIApplication) {
        XCTAssertTrue(app.buttons["今日修煉"].exists)
        XCTAssertTrue(app.buttons["摘句集"].exists)
        XCTAssertTrue(app.buttons["我的"].exists)
    }
}
