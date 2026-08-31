import GRDB
import XCTest
@testable import XunZhangZhaiJu

final class PersistenceMigrationTests: XCTestCase {
    func testFreshDatabaseCreatesEveryVersionOneTableAndCanReopen() throws {
        let writer = try DatabaseQueue()
        _ = try AppDatabase(writer)
        _ = try AppDatabase(writer)

        let tables = try writer.read { db in
            try String.fetchAll(
                db,
                sql: "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        XCTAssertTrue(Set([
            "progressSnapshot", "progressEvent", "syncOutbox",
            "localPhrasePractice", "appSetting", "migrationLog",
        ]).isSubset(of: Set(tables)))
    }

    func testFailedMigrationRollsBackWithoutReplacingExistingData() throws {
        let writer = try DatabaseQueue()
        try writer.write { db in
            try db.create(table: "sentinel") { table in
                table.column("value", .text).notNull()
            }
            try db.execute(sql: "INSERT INTO sentinel (value) VALUES ('保留')")
        }
        var failing = DatabaseMigrator()
        failing.registerMigration("broken") { db in
            try db.create(table: "partial") { $0.column("id", .integer) }
            throw TestMigrationError.expected
        }

        XCTAssertThrowsError(try AppDatabase(writer, migrator: failing))
        let result = try writer.read { db in
            (
                try String.fetchOne(db, sql: "SELECT value FROM sentinel"),
                try db.tableExists("partial")
            )
        }
        XCTAssertEqual(result.0, "保留")
        XCTAssertFalse(result.1)
    }
}

private enum TestMigrationError: Error {
    case expected
}
