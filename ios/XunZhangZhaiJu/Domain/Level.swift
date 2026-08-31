import Foundation

enum LevelLayout: String, Codable, CaseIterable, Hashable {
    case full
    case cross
}

enum GridDirection: String, Codable, CaseIterable, Hashable {
    case east = "E"
    case south = "S"
}

enum TargetDisplay: String, Codable, Hashable {
    case clue
}

enum RouteType: String, Codable, Hashable {
    case main
    case lore
    case treasure
}

struct LevelTarget: Codable, Hashable {
    var phraseID: String
    var start: GridCoordinate
    var direction: GridDirection
    var clueIndex: Int

    enum CodingKeys: String, CodingKey {
        case phraseID = "phraseId"
        case start
        case direction = "dir"
        case clueIndex
    }
}

struct LevelRequirements: Codable, Hashable {
    var completedAll: [Int]
}

struct MapPosition: Codable, Hashable {
    var x: Double
    var y: Double
}

struct LockPreview: Codable, Hashable {
    var title: String
    var hint: String
    var rewardPreview: String
}

struct BossReward: Codable, Hashable {
    var id: String
    var phaseCount: Int
}

struct TreasureReward: Codable, Hashable {
    var id: String
    var shard: Int
    var completesItem: Bool
}

struct Level: Codable, Identifiable, Hashable {
    var id: Int
    var chapter: Int
    var chapterTitle: String
    var size: Int
    var layout: LevelLayout
    var timeLimit: Int?
    var hintCap: Int
    var directions: [GridDirection]
    var targetDisplay: TargetDisplay
    var targets: [LevelTarget]
    var grid: [[String?]]
    var revealed: [GridCoordinate]?
    var routeType: RouteType?
    var nextIds: [Int]
    var requirements: LevelRequirements
    var mapPosition: MapPosition?
    var lockPreview: LockPreview?
    var storyFragmentId: String?
    var eventId: String?
    var boss: BossReward?
    var treasure: TreasureReward?
}

struct LevelDocument: Codable, Hashable {
    var levels: [Level]
}
