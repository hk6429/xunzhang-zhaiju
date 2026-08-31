import Foundation
import GRDB

struct AppDatabase: Sendable {
    let writer: any DatabaseWriter

    init(
        _ writer: any DatabaseWriter,
        migrator: DatabaseMigrator = AppMigrations.makeMigrator()
    ) throws {
        self.writer = writer
        try migrator.migrate(writer)
    }

    static func inMemory() throws -> AppDatabase {
        try AppDatabase(DatabaseQueue())
    }

    static func open(at url: URL) throws -> AppDatabase {
        try AppDatabase(DatabaseQueue(path: url.path))
    }

    static func live(fileManager: FileManager = .default) throws -> AppDatabase {
        let directory = try fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ).appendingPathComponent("XunZhangZhaiJu", isDirectory: true)
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        return try open(at: directory.appendingPathComponent("progress.sqlite"))
    }

    var reader: any DatabaseReader { writer }
}
