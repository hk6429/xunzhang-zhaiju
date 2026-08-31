import Foundation
import GRDB

struct LocalPhrasePracticeRecord: Codable, FetchableRecord, PersistableRecord, TableRecord, Equatable {
    static let databaseTableName = "localPhrasePractice"

    var id: String
    var namespace: String
    var phraseID: String
    var kind: String
    var text: String
    var createdAt: Date
    var updatedAt: Date
}

struct AppSettingRecord: Codable, FetchableRecord, PersistableRecord, TableRecord, Equatable {
    static let databaseTableName = "appSetting"

    var namespace: String
    var key: String
    var value: Data
    var updatedAt: Date
}
