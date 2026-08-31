import Foundation

enum EventKind: String, Codable, Hashable {
    case lore
    case treasure
}

enum EventEffectType: String, Codable, Hashable {
    case bossBoost
    case mapReveal
    case replayBonus
    case routeBoost
    case study
    case treasureShard
    case unlockLore
}

struct EventEffect: Codable, Hashable {
    var type: EventEffectType
    var value: String
    var amount: Int?
    var uses: Int?
}

struct EventChoice: Codable, Hashable, Identifiable {
    var id: String
    var label: String
    var effect: [EventEffect]
}

struct WorldEvent: Codable, Hashable, Identifiable {
    var id: String
    var chapter: Int
    var kind: EventKind
    var title: String
    var speaker: String
    var text: String
    var choices: [EventChoice]
}

struct DailyEncounter: Codable, Hashable, Identifiable {
    var id: String
    var title: String
    var text: String
    var effect: EventEffect
}

struct EventDocument: Codable, Hashable {
    struct Metadata: Codable, Hashable {
        var version: Int
        var description: String
    }

    var meta: Metadata
    var events: [WorldEvent]
    var dailyEncounters: [DailyEncounter]
}

struct StoryLore: Codable, Hashable {
    struct Metadata: Codable, Hashable {
        var version: Int
        var title: String
        var playerRole: String
        var premise: String
    }

    struct Position: Codable, Hashable {
        var x: Double
        var y: Double
    }

    struct Chapter: Codable, Hashable, Identifiable {
        var id: Int
        var mapRegion: String
        var position: Position
        var title: String
        var intro: [String]
        var outro: [String]
        var guardianIds: [String]?
        var bossId: String?
        var treasureId: String?
    }

    struct BossPhase: Codable, Hashable, Identifiable {
        var id: String
        var name: String
        var rule: String
    }

    struct Boss: Codable, Hashable, Identifiable {
        var id: String
        var chapter: Int
        var levelId: Int
        var name: String
        var phases: [BossPhase]
    }

    struct Treasure: Codable, Hashable, Identifiable {
        var id: String
        var name: String
        var ability: String
        var description: String
    }

    struct EndingRequirements: Codable, Hashable {
        var completedAll: [Int]
        var bossMinStars: Int?
        var bossLevels: [Int]?
        var eventsSeenAll: [String]?
        var treasuresAll: [String]?
    }

    struct Ending: Codable, Hashable, Identifiable {
        var id: String
        var title: String
        var requirements: EndingRequirements
        var summary: String
    }

    struct Endings: Codable, Hashable {
        var normal: Ending
        var `true`: Ending
    }

    struct HiddenLevel: Codable, Hashable, Identifiable {
        var id: Int
        var title: String
        var unlockEnding: String
        var kind: String
        var status: String
        var rule: String
    }

    var meta: Metadata
    var chapters: [Chapter]
    var bosses: [Boss]
    var treasures: [Treasure]
    var endings: Endings
    var hiddenLevel: HiddenLevel
}
