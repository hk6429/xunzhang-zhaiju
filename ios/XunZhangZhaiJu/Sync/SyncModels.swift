import Foundation

enum IdentityProvider: String, Codable {
    case apple
    case google
}

struct BackendSession: Codable, Equatable {
    let accessToken: String
    let refreshToken: String
    let userID: String
    let accessExpiresAt: Date
    let refreshExpiresAt: Date

    var isValid: Bool { refreshExpiresAt > Date() }
    var accessIsValid: Bool { accessExpiresAt > Date().addingTimeInterval(60) }
}

struct AuthExchangeResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let userID: String
    let expiresIn: TimeInterval
    let refreshExpiresIn: TimeInterval
}

struct SyncEventEnvelope: Encodable {
    let id: String
    let sequence: Int64
    let kind: String
    let payload: LocalAppProgress
    let occurredAt: Date
}

struct SyncRequestEnvelope: Encodable {
    let deviceId: String
    let baseRevision: Int64
    let schemaVersion: Int
    let snapshot: LocalAppProgress
    let events: [SyncEventEnvelope]
}

struct SyncResponseEnvelope: Decodable {
    let revision: Int64
    let schemaVersion: Int
    let snapshot: LocalAppProgress
    let acceptedEventIDs: [String]
}

enum SyncState: Equatable {
    case idle
    case syncing
    case synced(Date)
    case failed(String)
}

enum SyncConfiguration {
    static var baseURL: URL? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: "SyncAPIBaseURL") as? String,
              !raw.isEmpty,
              !raw.contains(".example."),
              let url = URL(string: raw),
              url.scheme == "https" else { return nil }
        return url
    }

    static var googleIsConfigured: Bool {
        guard let clientID = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String,
              let serverID = Bundle.main.object(forInfoDictionaryKey: "GIDServerClientID") as? String else {
            return false
        }
        return !clientID.isEmpty && !serverID.isEmpty
    }
}
