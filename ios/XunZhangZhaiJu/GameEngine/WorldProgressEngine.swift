import Foundation

struct WorldProgressEngine {
    func studyQuestionCount(for effects: [EventEffect]) -> Int {
        effects.reduce(into: 0) { total, effect in
            guard effect.type == .study else { return }
            total += max(1, effect.amount ?? 1)
        }
    }

    func applying(
        effects: [EventEffect],
        eventID: String,
        to progress: LocalAppProgress
    ) -> LocalAppProgress {
        var next = progress
        var world = next.world ?? .fresh
        guard !world.eventsSeen.contains(eventID) else { return next }

        for effect in effects {
            switch effect.type {
            case .unlockLore:
                if !world.loreUnlocked.contains(effect.value) {
                    world.loreUnlocked.append(effect.value)
                }
            case .treasureShard:
                grantTreasure(
                    id: effect.value,
                    source: eventID,
                    completesItem: false,
                    world: &world
                )
            default:
                let amount = effect.amount ?? effect.uses ?? 1
                world.effects["\(effect.type.rawValue):\(effect.value)", default: 0] += amount
            }
        }
        world.eventsSeen.append(eventID)
        next.world = world
        return next
    }

    func grantingLevelTreasure(
        _ reward: TreasureReward,
        levelID: Int,
        to progress: LocalAppProgress
    ) -> LocalAppProgress {
        var next = progress
        var world = next.world ?? .fresh
        grantTreasure(
            id: reward.id,
            source: "level:\(levelID)",
            completesItem: reward.completesItem,
            world: &world
        )
        next.world = world
        return next
    }

    private func grantTreasure(
        id: String,
        source: String,
        completesItem: Bool,
        world: inout LocalWorldProgress
    ) {
        var treasure = world.treasures[id] ?? LocalTreasureProgress(sources: [], complete: false)
        guard !treasure.sources.contains(source) else { return }
        treasure.sources.append(source)
        treasure.complete = treasure.complete || completesItem || treasure.sources.count >= 2
        world.treasures[id] = treasure
    }
}
