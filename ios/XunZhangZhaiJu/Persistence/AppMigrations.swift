import Foundation
import GRDB

enum AppMigrations {
    static func makeMigrator() -> DatabaseMigrator {
        var migrator = DatabaseMigrator()
        migrator.registerMigration("v1-offline-progress") { db in
            try db.create(table: ProgressSnapshotRecord.databaseTableName) { table in
                table.primaryKey("namespace", .text)
                table.column("schemaVersion", .integer).notNull()
                table.column("payload", .blob).notNull()
                table.column("updatedAt", .datetime).notNull()
                table.column("serverRevision", .integer)
            }

            try db.create(table: ProgressEventRecord.databaseTableName) { table in
                table.primaryKey("id", .text)
                table.column("namespace", .text).notNull().indexed()
                table.column("deviceID", .text).notNull()
                table.column("sequence", .integer).notNull()
                table.column("kind", .text).notNull()
                table.column("payload", .blob).notNull()
                table.column("occurredAt", .datetime).notNull()
                table.column("syncedAt", .datetime)
                table.uniqueKey(["namespace", "deviceID", "sequence"])
            }

            try db.create(table: SyncOutboxRecord.databaseTableName) { table in
                table.primaryKey("id", .text)
                table.column("namespace", .text).notNull().indexed()
                table.column("eventID", .text)
                    .notNull()
                    .unique()
                    .references(ProgressEventRecord.databaseTableName, onDelete: .cascade)
                table.column("payload", .blob).notNull()
                table.column("attemptCount", .integer).notNull().defaults(to: 0)
                table.column("nextAttemptAt", .datetime)
                table.column("createdAt", .datetime).notNull()
            }

            try db.create(table: LocalPhrasePracticeRecord.databaseTableName) { table in
                table.primaryKey("id", .text)
                table.column("namespace", .text).notNull().indexed()
                table.column("phraseID", .text).notNull().indexed()
                table.column("kind", .text).notNull()
                table.column("text", .text).notNull()
                table.column("createdAt", .datetime).notNull()
                table.column("updatedAt", .datetime).notNull()
            }

            try db.create(table: AppSettingRecord.databaseTableName) { table in
                table.column("namespace", .text).notNull()
                table.column("key", .text).notNull()
                table.column("value", .blob).notNull()
                table.column("updatedAt", .datetime).notNull()
                table.primaryKey(["namespace", "key"])
            }

            try db.create(table: "migrationLog") { table in
                table.autoIncrementedPrimaryKey("id")
                table.column("migrationName", .text).notNull().unique()
                table.column("appliedAt", .datetime).notNull()
            }
            try db.execute(
                sql: "INSERT INTO migrationLog (migrationName, appliedAt) VALUES (?, ?)",
                arguments: ["v1-offline-progress", Date()]
            )
        }
        return migrator
    }
}
