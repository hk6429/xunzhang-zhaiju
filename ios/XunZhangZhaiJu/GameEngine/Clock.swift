import Foundation

protocol GameClock: Sendable {
    func now() -> Date
}

struct SystemGameClock: GameClock {
    func now() -> Date { Date() }
}

struct FixedGameClock: GameClock {
    var date: Date

    func now() -> Date { date }
}
