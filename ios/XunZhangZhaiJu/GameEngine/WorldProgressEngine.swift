import Foundation

enum EndingRequirementGap: Equatable {
    case completedLevels([Int])
    case bossStars(levelIDs: [Int], minimum: Int)
    case events([String])
    case treasures([String])
}

struct WorldEndingState: Equatable {
    var normalUnlocked: Bool
    var trueRequirementsMet: Bool
    var hiddenLevelUnlocked: Bool
    var hiddenLevelCompleted: Bool
    var currentEndingID: String?
    var missingForTrue: [EndingRequirementGap]
}

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

    func endingState(for progress: LocalAppProgress, story: StoryLore) -> WorldEndingState {
        let normalMissing = missingRequirements(story.endings.normal.requirements, in: progress)
        let trueMissing = missingRequirements(story.endings.true.requirements, in: progress)
        let hiddenCompleted = progress.world?.hiddenEnding != nil
        return WorldEndingState(
            normalUnlocked: normalMissing.isEmpty,
            trueRequirementsMet: trueMissing.isEmpty,
            hiddenLevelUnlocked: trueMissing.isEmpty,
            hiddenLevelCompleted: hiddenCompleted,
            currentEndingID: hiddenCompleted
                ? story.endings.true.id
                : normalMissing.isEmpty ? story.endings.normal.id : nil,
            missingForTrue: trueMissing
        )
    }

    func recordingHiddenEnding(
        choice: HiddenEndingChoice,
        answeredAt: Int64,
        in progress: LocalAppProgress
    ) -> LocalAppProgress {
        var next = progress
        var world = next.world ?? .fresh
        let answer = LocalHiddenEnding(choice: choice, answeredAt: max(0, answeredAt))
        if let existing = world.hiddenEnding, existing.answeredAt > answer.answeredAt {
            return next
        }
        world.hiddenEnding = answer
        next.world = world
        return next
    }

    func preparingTrueEndingRequirements(
        from story: StoryLore,
        in progress: LocalAppProgress
    ) -> LocalAppProgress {
        var next = progress
        let requirements = story.endings.true.requirements
        for levelID in Set(requirements.completedAll + (requirements.bossLevels ?? [])) {
            let minimum = requirements.bossLevels?.contains(levelID) == true
                ? max(1, requirements.bossMinStars ?? 1)
                : 1
            var level = next.levels[String(levelID)] ?? LocalLevelProgress(stars: 0, found: [])
            level.stars = max(level.stars, minimum)
            next.levels[String(levelID)] = level
        }
        var world = next.world ?? .fresh
        for eventID in requirements.eventsSeenAll ?? [] where !world.eventsSeen.contains(eventID) {
            world.eventsSeen.append(eventID)
        }
        for treasureID in requirements.treasuresAll ?? [] {
            world.treasures[treasureID] = LocalTreasureProgress(
                sources: ["ending-requirement:1", "ending-requirement:2"],
                complete: true
            )
        }
        next.world = world
        return next
    }

    private func missingRequirements(
        _ requirements: StoryLore.EndingRequirements,
        in progress: LocalAppProgress
    ) -> [EndingRequirementGap] {
        var gaps: [EndingRequirementGap] = []
        let missingLevels = requirements.completedAll.filter {
            (progress.levels[String($0)]?.stars ?? 0) == 0
        }
        if !missingLevels.isEmpty { gaps.append(.completedLevels(missingLevels)) }

        if let minimum = requirements.bossMinStars {
            let weakBosses = (requirements.bossLevels ?? []).filter {
                (progress.levels[String($0)]?.stars ?? 0) < minimum
            }
            if !weakBosses.isEmpty {
                gaps.append(.bossStars(levelIDs: weakBosses, minimum: minimum))
            }
        }

        let seen = Set(progress.world?.eventsSeen ?? [])
        let missingEvents = (requirements.eventsSeenAll ?? []).filter { !seen.contains($0) }
        if !missingEvents.isEmpty { gaps.append(.events(missingEvents)) }

        let treasures = progress.world?.treasures ?? [:]
        let missingTreasures = (requirements.treasuresAll ?? []).filter {
            treasures[$0]?.complete != true
        }
        if !missingTreasures.isEmpty { gaps.append(.treasures(missingTreasures)) }
        return gaps
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
