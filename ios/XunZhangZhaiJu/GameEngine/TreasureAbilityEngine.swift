import Foundation

enum TreasureAbility: String, CaseIterable {
    case revealHiddenNode
    case openRouteShortcut
    case previewEventChoice
    case revealDailyEncounter
    case unlockTrueEnding
}

struct DailyEncounterLocation: Equatable {
    var chapter: Int
    var region: String
}

struct TreasureAbilityEngine {
    private let previewDateEffectKey = "treasure-preview-date"

    func isActive(
        _ ability: TreasureAbility,
        in progress: LocalAppProgress,
        story: StoryLore
    ) -> Bool {
        guard let treasureID = story.treasures.first(where: { $0.ability == ability.rawValue })?.id else {
            return false
        }
        return progress.world?.treasures[treasureID]?.complete == true
    }

    func revealedEventLevelIDs(
        levels: [Level],
        progress: LocalAppProgress,
        story: StoryLore
    ) -> Set<Int> {
        guard isActive(.revealHiddenNode, in: progress, story: story) else { return [] }
        let seen = Set(progress.world?.eventsSeen ?? [])
        let candidates = levels
            .filter { level in
                guard let eventID = level.eventId else { return false }
                return !seen.contains(eventID)
            }
            .sorted { $0.id < $1.id }
        var revealedChapters = Set<Int>()
        return Set(candidates.compactMap { level in
            revealedChapters.insert(level.chapter).inserted ? level.id : nil
        })
    }

    func routeShortcuts(
        levels: [Level],
        progress: LocalAppProgress,
        story: StoryLore
    ) -> [Level] {
        guard isActive(.openRouteShortcut, in: progress, story: story) else { return [] }
        let levelsByChapter = Dictionary(grouping: levels.filter { $0.chapter <= 5 }, by: \.chapter)
        return levelsByChapter.keys.sorted()
            .compactMap { chapter in
                guard let chapterLevels = levelsByChapter[chapter] else { return nil }
                let mainLevels = chapterLevels.filter { ($0.routeType ?? .main) == .main }
                guard !mainLevels.isEmpty, mainLevels.allSatisfy({ isCompleted($0, progress: progress) }) else {
                    return nil
                }
                return chapterLevels
                    .filter { ($0.routeType ?? .main) != .main && !isCompleted($0, progress: progress) }
                    .filter { isNormallyUnlocked($0, progress: progress) }
                    .sorted { $0.id < $1.id }
                    .first
            }
    }

    func dailyEncounterLocation(
        levels: [Level],
        progress: LocalAppProgress,
        story: StoryLore,
        dateKey: String
    ) -> DailyEncounterLocation? {
        guard isActive(.revealDailyEncounter, in: progress, story: story) else { return nil }
        let availableChapters = story.chapters
            .filter { chapter in
                levels.contains { $0.chapter == chapter.id && isNormallyUnlocked($0, progress: progress) }
            }
            .sorted { $0.id < $1.id }
        guard !availableChapters.isEmpty else { return nil }
        let selectedID = NativeParityRules.dailyQuickPhraseIDs(
            phraseIDs: availableChapters.map { "chapter:\($0.id)" },
            dateKey: "encounter-region:\(dateKey)",
            count: 1
        ).first
        guard let chapter = availableChapters.first(where: { "chapter:\($0.id)" == selectedID }) else {
            return nil
        }
        return DailyEncounterLocation(chapter: chapter.id, region: chapter.mapRegion)
    }

    func canPreviewEventChoices(
        dateKey: String,
        progress: LocalAppProgress,
        story: StoryLore
    ) -> Bool {
        guard isActive(.previewEventChoice, in: progress, story: story) else { return false }
        return progress.world?.effects[previewDateEffectKey] != encoded(dateKey: dateKey)
    }

    func recordingEventChoicePreview(
        dateKey: String,
        in progress: LocalAppProgress,
        story: StoryLore
    ) -> LocalAppProgress {
        guard canPreviewEventChoices(dateKey: dateKey, progress: progress, story: story) else {
            return progress
        }
        var next = progress
        var world = next.world ?? .fresh
        world.effects[previewDateEffectKey] = encoded(dateKey: dateKey)
        next.world = world
        return next
    }

    private func isCompleted(_ level: Level, progress: LocalAppProgress) -> Bool {
        (progress.levels[String(level.id)]?.stars ?? 0) > 0
    }

    private func isNormallyUnlocked(_ level: Level, progress: LocalAppProgress) -> Bool {
        level.requirements.completedAll.allSatisfy {
            (progress.levels[String($0)]?.stars ?? 0) > 0
        }
    }

    private func encoded(dateKey: String) -> Int {
        Int(dateKey.filter(\.isNumber)) ?? 0
    }
}
