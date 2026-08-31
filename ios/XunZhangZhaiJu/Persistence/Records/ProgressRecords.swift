import Foundation
import GRDB

struct ProgressSnapshotRecord: Codable, FetchableRecord, PersistableRecord, TableRecord, Equatable {
    static let databaseTableName = "progressSnapshot"

    var namespace: String
    var schemaVersion: Int
    var payload: Data
    var updatedAt: Date
    var serverRevision: Int64?
}

struct ProgressEventRecord: Codable, FetchableRecord, PersistableRecord, TableRecord, Equatable {
    static let databaseTableName = "progressEvent"

    var id: String
    var namespace: String
    var deviceID: String
    var sequence: Int64
    var kind: String
    var payload: Data
    var occurredAt: Date
    var syncedAt: Date?
}

struct SyncOutboxRecord: Codable, FetchableRecord, PersistableRecord, TableRecord, Equatable {
    static let databaseTableName = "syncOutbox"

    var id: String
    var namespace: String
    var eventID: String
    var payload: Data
    var attemptCount: Int
    var nextAttemptAt: Date?
    var createdAt: Date
}

struct ProgressMutation: Equatable {
    var snapshot: ProgressSnapshotRecord
    var event: ProgressEventRecord
}
