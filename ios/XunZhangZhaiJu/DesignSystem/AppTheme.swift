import SwiftUI

struct ThemeRGB {
    let red: Double
    let green: Double
    let blue: Double

    var color: Color { Color(red: red, green: green, blue: blue) }

    func contrastRatio(against other: ThemeRGB) -> Double {
        let lighter = max(relativeLuminance, other.relativeLuminance)
        let darker = min(relativeLuminance, other.relativeLuminance)
        return (lighter + 0.05) / (darker + 0.05)
    }

    private var relativeLuminance: Double {
        0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
    }

    private func linear(_ component: Double) -> Double {
        component <= 0.04045
            ? component / 12.92
            : pow((component + 0.055) / 1.055, 2.4)
    }
}

enum AppTheme {
    static let accentRGB = ThemeRGB(red: 0.95, green: 0.68, blue: 0.20)
    static let backgroundRGB = ThemeRGB(red: 0.07, green: 0.06, blue: 0.05)
    static let surfaceRGB = ThemeRGB(red: 0.15, green: 0.13, blue: 0.10)
    static let primaryTextRGB = ThemeRGB(red: 1, green: 1, blue: 1)
    static let secondaryTextRGB = ThemeRGB(red: 0.93, green: 0.88, blue: 0.74)

    static let accent = accentRGB.color
    static let background = backgroundRGB.color
    static let surface = surfaceRGB.color
    static let primaryText = primaryTextRGB.color
    static let secondaryText = secondaryTextRGB.color
}
