import Foundation

struct LocalLevelProgress: Codable, Equatable {
    var stars: Int
    var found: [String]
}

struct LocalAppProgress: Codable, Equatable {
    var v: Int
    var levels: [String: LocalLevelProgress]
    var ink: Int
    var collection: [String]

    static let fresh = LocalAppProgress(v: 1, levels: [:], ink: 3, collection: [])
}
