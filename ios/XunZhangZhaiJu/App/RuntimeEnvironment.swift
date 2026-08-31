import Foundation

enum RuntimeEnvironment {
    private static let productionKeychainService = "tw.edu.hc.zgjh.xunzhangzhaiju"

    static var persistenceFileName: String {
        guard let identifier = uiTestStorageIdentifier else { return "progress.sqlite" }
        return "progress-\(identifier).sqlite"
    }

    static var keychainService: String {
        guard let identifier = uiTestStorageIdentifier else { return productionKeychainService }
        return "\(productionKeychainService).uitest.\(identifier)"
    }

    static var forcesOffline: Bool {
#if DEBUG
        ProcessInfo.processInfo.environment["UI_TEST_FORCE_OFFLINE"] == "1"
#else
        false
#endif
    }

    static var forcesAccessibleBoard: Bool {
#if DEBUG
        ProcessInfo.processInfo.environment["UI_TEST_ACCESSIBLE_BOARD"] == "1"
#else
        false
#endif
    }

    static var forcesAccessibilityText: Bool {
#if DEBUG
        ProcessInfo.processInfo.environment["UI_TEST_ACCESSIBILITY_TEXT"] == "1"
#else
        false
#endif
    }

    static var forcedDailyEncounterID: String? {
#if DEBUG
        ProcessInfo.processInfo.environment["UI_TEST_DAILY_ENCOUNTER_ID"]
#else
        nil
#endif
    }

    private static var uiTestStorageIdentifier: String? {
#if DEBUG
        guard let raw = ProcessInfo.processInfo.environment["UI_TEST_STORAGE_ID"] else { return nil }
        let safe = raw.filter { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" }
        return safe.isEmpty ? nil : String(safe.prefix(64))
#else
        return nil
#endif
    }
}
