import Foundation

struct HintEngine: Equatable {
    static let softCap = 30

    private(set) var ink: Int

    init(ink: Int) {
        self.ink = max(0, ink)
    }

    func canSpend(_ tier: HintTier) -> Bool {
        ink >= Self.cost(of: tier)
    }

    mutating func spend(_ tier: HintTier) -> Bool {
        let amount = Self.cost(of: tier)
        guard ink >= amount else { return false }
        ink -= amount
        return true
    }

    @discardableResult
    mutating func reward(
        for kind: LearningQuestionKind,
        correct: Bool,
        eligible: Bool
    ) -> Int {
        guard correct, eligible else { return 0 }
        let base = kind == .fill ? 2 : 1
        let gained = max(0, min(base, Self.softCap - ink))
        ink += gained
        return gained
    }

    static func cost(of tier: HintTier) -> Int {
        switch tier {
        case .circle: 1
        case .flash: 3
        case .reveal: 5
        }
    }
}
