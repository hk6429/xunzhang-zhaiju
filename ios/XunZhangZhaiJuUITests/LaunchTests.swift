import XCTest
import UIKit

final class LaunchTests: XCTestCase {
    @MainActor
    func testAppLaunchesIntoJourney() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["修煉山河"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(
            app.descendants(matching: .any)["mountain-journey-map"].waitForExistence(timeout: 5)
        )
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
        XCTAssertTrue(
            app.descendants(matching: .any)["game-mission"].waitForExistence(timeout: 5)
        )
        XCTAssertTrue(app.staticTexts["學習目標"].waitForExistence(timeout: 5))
    }

    @MainActor
    func testNativeTabsOpenDailyCollectionAndProfile() throws {
        let app = XCUIApplication()
        app.launch()

        navigationButton("今日修煉", in: app).tap()
        XCTAssertTrue(app.staticTexts["今日三帖"].waitForExistence(timeout: 5))

        navigationButton("摘句集", in: app).tap()
        XCTAssertTrue(app.navigationBars["摘句集"].waitForExistence(timeout: 5))

        navigationButton("我的", in: app).tap()
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
        assertCoreNavigation(in: app)
    }

    @MainActor
    func testSystemAccessibilityAuditPassesOnJourney() throws {
        guard #available(iOS 17.0, *) else {
            throw XCTSkip("System accessibility audit requires iOS 17 or newer")
        }

        let app = isolatedApp()
        app.launch()

        XCTAssertTrue(app.staticTexts["修煉山河"].firstMatch.waitForExistence(timeout: 5))
        try app.performAccessibilityAudit(for: [
            .hitRegion,
            .sufficientElementDescription,
            .textClipped,
            .trait,
        ])
    }

    @MainActor
    func testGuestProgressSurvivesTerminationAndOfflineRelaunch() throws {
        let app = isolatedApp()
        app.launchEnvironment["UI_TEST_ACCESSIBLE_BOARD"] = "1"
        app.launch()
        openFirstLevel(in: app)

        let start = app.buttons["第 1 列第 2 欄，目"]
        let end = app.buttons["第 4 列第 2 欄，睛"]
        XCTAssertTrue(start.waitForExistence(timeout: 5))
        XCTAssertTrue(end.exists)
        start.tap()
        end.tap()
        XCTAssertTrue(app.staticTexts["目不轉睛"].firstMatch.waitForExistence(timeout: 5))

        app.terminate()
        app.launchEnvironment["UI_TEST_FORCE_OFFLINE"] = "1"
        app.launch()
        openFirstLevel(in: app)

        XCTAssertTrue(app.staticTexts["✓ 目不轉睛"].waitForExistence(timeout: 5))
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

        navigationButton("今日修煉", in: app).tap()
        XCTAssertTrue(app.staticTexts["今日三帖"].waitForExistence(timeout: 5))
    }

    @MainActor
    private func assertCoreNavigation(in app: XCUIApplication) {
        XCTAssertTrue(navigationButton("今日修煉", in: app).exists)
        XCTAssertTrue(navigationButton("摘句集", in: app).exists)
        XCTAssertTrue(navigationButton("我的", in: app).exists)
    }

    @MainActor
    private func navigationButton(_ title: String, in app: XCUIApplication) -> XCUIElement {
        let button = app.buttons[title]
        if !button.exists {
            let sidebarToggle = app.buttons["ToggleSidebar"]
            XCTAssertTrue(sidebarToggle.waitForExistence(timeout: 5))
            sidebarToggle.tap()
            XCTAssertTrue(button.waitForExistence(timeout: 5))
        }
        return button
    }

    @MainActor
    private func isolatedApp() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["UI_TEST_STORAGE_ID"] = UUID().uuidString
        return app
    }

    @MainActor
    private func openFirstLevel(in app: XCUIApplication) {
        let firstLevel = app.buttons["level-1"]
        XCTAssertTrue(firstLevel.waitForExistence(timeout: 5))
        firstLevel.tap()
        XCTAssertTrue(app.descendants(matching: .any)["full-board"].waitForExistence(timeout: 5))
    }
}
