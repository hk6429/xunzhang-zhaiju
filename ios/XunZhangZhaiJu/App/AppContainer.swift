import Foundation

@MainActor
final class AppContainer: ObservableObject {
    enum StartupState: Equatable {
        case ready
        case failed(String)
    }

    @Published private(set) var startupState: StartupState
    @Published private(set) var content: AppContent?
    @Published private(set) var progress: LocalAppProgress

    private let repository: ProgressRepository?
    private let deviceID: String?
    private let namespace: String?
    private let encoder = JSONEncoder()

    init() {
        do {
            let loadedContent = try ContentLoader().load()
            let database = try AppDatabase.live()
            let repository = ProgressRepository(database: database)
            let deviceID = try KeychainStore().deviceIdentifier()
            let namespace = "guest:\(deviceID)"
            let stored = try repository.snapshot(namespace: namespace)
            let progress = try stored.map { try JSONDecoder().decode(LocalAppProgress.self, from: $0.payload) }
                ?? .fresh

            content = loadedContent
            self.repository = repository
            self.deviceID = deviceID
            self.namespace = namespace
            self.progress = progress
            startupState = .ready
        } catch {
            content = nil
            repository = nil
            deviceID = nil
            namespace = nil
            progress = .fresh
            startupState = .failed(error.localizedDescription)
        }
    }

    func persist(gameState: GameState) throws {
        guard let repository, let deviceID, let namespace else {
            throw AppContainerError.unavailable
        }
        var next = progress
        let key = String(gameState.levelID)
        var level = next.levels[key] ?? LocalLevelProgress(stars: 0, found: [])
        level.found = orderedUnion(level.found, Array(gameState.foundPhraseIDs).sorted())
        if let earnedStars = gameState.earnedStars {
            level.stars = max(level.stars, earnedStars)
        }
        next.levels[key] = level
        next.collection = orderedUnion(next.collection, Array(gameState.collection).sorted())

        let payload = try encoder.encode(next)
        let now = Date()
        let sequence = try repository.nextSequence(namespace: namespace, deviceID: deviceID)
        let eventID = UUID().uuidString.lowercased()
        let kind = gameState.phase == .completed ? "levelCompleted" : "progressUpdated"
        try repository.apply(ProgressMutation(
            snapshot: ProgressSnapshotRecord(
                namespace: namespace,
                schemaVersion: next.v,
                payload: payload,
                updatedAt: now,
                serverRevision: nil
            ),
            event: ProgressEventRecord(
                id: eventID,
                namespace: namespace,
                deviceID: deviceID,
                sequence: sequence,
                kind: kind,
                payload: payload,
                occurredAt: now,
                syncedAt: nil
            )
        ))
        progress = next
    }

    private func orderedUnion(_ left: [String], _ right: [String]) -> [String] {
        var seen = Set<String>()
        return (left + right).filter { seen.insert($0).inserted }
    }
}

enum AppContainerError: LocalizedError {
    case unavailable

    var errorDescription: String? { "本機內容或進度資料庫尚未就緒" }
}
