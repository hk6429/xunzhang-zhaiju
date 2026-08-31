import XCTest
@testable import XunZhangZhaiJu

final class AccessibilityThemeTests: XCTestCase {
    func testEveryTextColorMeetsWCAGAAAgainstAppSurfaces() {
        let textColors = [
            AppTheme.primaryTextRGB,
            AppTheme.secondaryTextRGB,
            AppTheme.accentRGB,
        ]
        let surfaces = [
            AppTheme.backgroundRGB,
            AppTheme.surfaceRGB,
        ]

        for textColor in textColors {
            for surface in surfaces {
                XCTAssertGreaterThanOrEqual(textColor.contrastRatio(against: surface), 4.5)
            }
        }
    }
}
