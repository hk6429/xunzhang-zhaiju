import Foundation
import GRDB

enum ProgressRepositoryError: LocalizedError {
    case namespaceMismatch

    var errorDescription: String? {
        switch self {
        case .namespaceMismatch: "snapshot 與 event 的 namespace 不一致"
        }
    }
}

struct ProgressRepository: Sendable {
    private let database: AppDatabase

    init(database: AppDatabase) {
        self.database = database
    }

    func apply(_ mutation: ProgressMutation) throws {
        guard mutation.snapshot.namespace == mutation.event.namespace else {
            throw ProgressRepositoryError.namespaceMismatch
        }

        try database.writer.write { db in
            try mutation.snapshot.save(db)
            try mutation.event.insert(db)
            let outbox = SyncOutboxRecord(
                id: mutation.event.id,
                namespace: mutation.event.namespace,
                eventID: mutation.event.id,
                payload: mutation.event.payload,
                attemptCount: 0,
                nextAttemptAt: nil,
                createdAt: mutation.event.occurredAt
            )
            try outbox.insert(db)
        }
    }

    func snapshot(namespace: String) throws -> ProgressSnapshotRecord? {
        try database.reader.read { db in
            try ProgressSnapshotRecord.fetchOne(db, key: namespace)
        }
    }

    func events(namespace: String) throws -> [ProgressEventRecord] {
        try database.reader.read { db in
            try ProgressEventRecord
                .filter(Column("namespace") == namespace)
                .order(Column("sequence"))
                .fetchAll(db)
        }
    }

    func pendingOutbox(namespace: String) throws -> [SyncOutboxRecord] {
        try database.reader.read { db in
            try SyncOutboxRecord
                .filter(Column("namespace") == namespace)
                .order(Column("createdAt"))
                .fetchAll(db)
        }
    }

    func applyRemoteSnapshot(
        namespace: String,
        schemaVersion: Int,
        payload: Data,
        serverRevision: Int64,
        acceptedEventIDs: [String],
        syncedAt: Date
    ) throws {
        try database.writer.write { db in
            try ProgressSnapshotRecord(
                namespace: namespace,
                schemaVersion: schemaVersion,
                payload: payload,
                updatedAt: syncedAt,
                serverRevision: serverRevision
            ).save(db)

            for eventID in acceptedEventIDs {
                try db.execute(
                    sql: "UPDATE progressEvent SET syncedAt = ? WHERE namespace = ? AND id = ?",
                    arguments: [syncedAt, namespace, eventID]
                )
                try db.execute(
                    sql: "DELETE FROM syncOutbox WHERE namespace = ? AND eventID = ?",
                    arguments: [namespace, eventID]
                )
            }
            try compactSyncedEvents(db, namespace: namespace, keepingMostRecent: 1_000)
        }
    }

    func compactSyncedEvents(namespace: String, keepingMostRecent: Int = 1_000) throws {
        try database.writer.write { db in
            try compactSyncedEvents(db, namespace: namespace, keepingMostRecent: keepingMostRecent)
        }
    }

    func nextSequence(namespace: String, deviceID: String) throws -> Int64 {
        try database.reader.read { db in
            let maximum = try Int64.fetchOne(
                db,
                sql: "SELECT MAX(sequence) FROM progressEvent WHERE namespace = ? AND deviceID = ?",
                arguments: [namespace, deviceID]
            ) ?? 0
            return maximum + 1
        }
    }

    func practices(namespace: String) throws -> [LocalPhrasePracticeRecord] {
        try database.reader.read { db in
            try LocalPhrasePracticeRecord
                .filter(Column("namespace") == namespace)
                .order(Column("updatedAt").desc)
                .fetchAll(db)
        }
    }

    func savePractice(_ practice: LocalPhrasePracticeRecord) throws {
        try database.writer.write { db in
            try practice.save(db)
        }
    }

    func deleteNamespace(_ namespace: String) throws {
        try database.writer.write { db in
            try db.execute(sql: "DELETE FROM syncOutbox WHERE namespace = ?", arguments: [namespace])
            try db.execute(sql: "DELETE FROM progressEvent WHERE namespace = ?", arguments: [namespace])
            try db.execute(sql: "DELETE FROM progressSnapshot WHERE namespace = ?", arguments: [namespace])
            try db.execute(sql: "DELETE FROM localPhrasePractice WHERE namespace = ?", arguments: [namespace])
            try db.execute(sql: "DELETE FROM appSetting WHERE namespace = ?", arguments: [namespace])
        }
    }

    private func compactSyncedEvents(
        _ db: Database,
        namespace: String,
        keepingMostRecent: Int
    ) throws {
        let limit = max(1, keepingMostRecent)
        try db.execute(
            sql: """
                DELETE FROM progressEvent
                WHERE namespace = ? AND syncedAt IS NOT NULL
                  AND id NOT IN (
                    SELECT id FROM progressEvent
                    WHERE namespace = ? AND syncedAt IS NOT NULL
                    ORDER BY occurredAt DESC, sequence DESC
                    LIMIT ?
                  )
                """,
            arguments: [namespace, namespace, limit]
        )
    }
}
