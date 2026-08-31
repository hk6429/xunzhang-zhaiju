import Foundation

struct ContentManifest: Codable, Hashable {
    struct Counts: Codable, Hashable {
        var phraseCount: Int
        var levelCount: Int
        var targetCount: Int
    }

    struct FileEntry: Codable, Hashable {
        var sha256: String
        var bytes: Int
    }

    var schemaVersion: Int
    var content: Counts
    var files: [String: FileEntry]
}
