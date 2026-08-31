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
}
