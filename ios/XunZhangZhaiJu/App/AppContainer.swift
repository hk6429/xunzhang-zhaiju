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
    @Published private(set) var practices: [String: LocalPhrasePracticeRecord]
    @Published private(set) var backendSession: BackendSession?
    @Published private(set) var syncState: SyncState
    @Published private(set) var cloudDeletionPendingLocalNamespace: String?

    private let repository: ProgressRepository?
    private let deviceID: String?
    private var namespace: String?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let keychain = KeychainStore()
    private let syncClient = SyncClient()

    init() {
        do {
            let initialEncoder = JSONEncoder()
            let initialDecoder = JSONDecoder()
            let loadedContent = try ContentLoader().load()
            let database = try AppDatabase.live()
            let repository = ProgressRepository(database: database)
            let deviceID = try keychain.deviceIdentifier()
            let storedSession = try? keychain.backendSession()
            let validSession = storedSession?.isValid == true ? storedSession : nil
            if storedSession != nil, validSession == nil { try? keychain.removeBackendSession() }
            let namespace = validSession.map { "user:\($0.userID)" } ?? "guest:\(deviceID)"
            let stored = try repository.snapshot(namespace: namespace)
            let guestNamespace = "guest:\(deviceID)"
            let guestStored = try repository.snapshot(namespace: guestNamespace)
            let progress = try stored.map { try initialDecoder.decode(LocalAppProgress.self, from: $0.payload) }
                ?? guestStored.map { try initialDecoder.decode(LocalAppProgress.self, from: $0.payload) }
                ?? .fresh
            if stored == nil, validSession != nil, guestStored != nil {
                let now = Date()
                let sequence = try repository.nextSequence(namespace: namespace, deviceID: deviceID)
                try repository.apply(ProgressMutation(
                    snapshot: ProgressSnapshotRecord(
                        namespace: namespace,
                        schemaVersion: progress.v,
                        payload: try initialEncoder.encode(progress),
                        updatedAt: now,
                        serverRevision: nil
                    ),
                    event: ProgressEventRecord(
                        id: UUID().uuidString.lowercased(),
                        namespace: namespace,
                        deviceID: deviceID,
                        sequence: sequence,
                        kind: "guestProgressClaimed",
                        payload: try initialEncoder.encode(progress),
                        occurredAt: now,
                        syncedAt: nil
                    )
                ))
            }
            let loadedPractices = try repository.practices(namespace: namespace)

            content = loadedContent
            self.repository = repository
            self.deviceID = deviceID
            self.namespace = namespace
            self.progress = progress
            practices = Dictionary(uniqueKeysWithValues: loadedPractices.map { ($0.phraseID, $0) })
            backendSession = validSession
            syncState = .idle
            cloudDeletionPendingLocalNamespace = nil
            startupState = .ready
        } catch {
            content = nil
            repository = nil
            deviceID = nil
            namespace = nil
            progress = .fresh
            practices = [:]
            backendSession = nil
            syncState = .failed(error.localizedDescription)
            cloudDeletionPendingLocalNamespace = nil
            startupState = .failed(error.localizedDescription)
        }
    }

    var isSignedIn: Bool { backendSession?.isValid == true }

    func signIn(provider: IdentityProvider, idToken: String, nonce: String? = nil) async {
        guard let baseURL = SyncConfiguration.baseURL else {
            syncState = .failed(SyncClientError.notConfigured.localizedDescription)
            return
        }
        syncState = .syncing
        do {
            let session = try await syncClient.exchange(
                provider: provider,
                idToken: idToken,
                nonce: nonce,
                baseURL: baseURL
            )
            try keychain.setBackendSession(session)
            try activate(session)
            await syncNow()
        } catch {
            syncState = .failed(error.localizedDescription)
        }
    }

    func linkIdentity(provider: IdentityProvider, idToken: String, nonce: String? = nil) async -> Bool {
        guard let existingSession = backendSession, existingSession.isValid,
              let baseURL = SyncConfiguration.baseURL else {
            syncState = .failed("帳號連結需要有效登入階段")
            return false
        }
        do {
            let session: BackendSession
            if existingSession.accessIsValid {
                session = existingSession
            } else {
                session = try await syncClient.refresh(existingSession.refreshToken, baseURL: baseURL)
                try keychain.setBackendSession(session)
                backendSession = session
            }
            try await syncClient.linkIdentity(
                provider: provider,
                idToken: idToken,
                nonce: nonce,
                sessionToken: session.accessToken,
                baseURL: baseURL
            )
            syncState = .synced(Date())
            return true
        } catch {
            syncState = .failed(error.localizedDescription)
            return false
        }
    }

    func syncNow() async {
        guard syncState != .syncing else { return }
        guard let existingSession = backendSession, existingSession.isValid,
              let baseURL = SyncConfiguration.baseURL,
              let repository, let deviceID, let namespace else { return }
        syncState = .syncing
        do {
            let session: BackendSession
            if existingSession.accessIsValid {
                session = existingSession
            } else {
                session = try await syncClient.refresh(existingSession.refreshToken, baseURL: baseURL)
                try keychain.setBackendSession(session)
                backendSession = session
            }
            let snapshot = try repository.snapshot(namespace: namespace)
            let pending = Array(try repository.pendingOutbox(namespace: namespace).prefix(500))
            let pendingIDs = Set(pending.map(\.eventID))
            let events = try repository.events(namespace: namespace)
                .filter { pendingIDs.contains($0.id) }
                .map {
                    SyncEventEnvelope(
                        id: $0.id,
                        sequence: $0.sequence,
                        kind: $0.kind,
                        inkDelta: $0.inkDelta,
                        payload: try decoder.decode(LocalAppProgress.self, from: $0.payload),
                        occurredAt: $0.occurredAt
                    )
                }
            let response = try await syncClient.sync(
                SyncRequestEnvelope(
                    deviceId: deviceID,
                    baseRevision: snapshot?.serverRevision ?? 0,
                    schemaVersion: progress.v,
                    snapshot: progress,
                    events: events
                ),
                sessionToken: session.accessToken,
                baseURL: baseURL
            )
            guard self.namespace == namespace else { return }
            let merged = LocalProgressMergeEngine.merge(
                response.snapshot,
                progress,
                authoritativeInk: response.snapshot.ink
            )
            let now = Date()
            try repository.applyRemoteSnapshot(
                namespace: namespace,
                schemaVersion: response.schemaVersion,
                payload: try encoder.encode(merged),
                serverRevision: response.revision,
                acceptedEventIDs: response.acceptedEventIDs,
                syncedAt: now
            )
            progress = merged
            syncState = .synced(now)
            if !(try repository.pendingOutbox(namespace: namespace)).isEmpty {
                Task { await self.syncNow() }
            }
        } catch {
            syncState = .failed(error.localizedDescription)
        }
    }

    func signOut() async {
        if let existingSession = backendSession, existingSession.isValid,
           let baseURL = SyncConfiguration.baseURL {
            if existingSession.accessIsValid {
                try? await syncClient.logout(sessionToken: existingSession.accessToken, baseURL: baseURL)
            } else if let refreshed = try? await syncClient.refresh(existingSession.refreshToken, baseURL: baseURL) {
                try? await syncClient.logout(sessionToken: refreshed.accessToken, baseURL: baseURL)
            }
        }
        signOutLocally()
    }

    private func signOutLocally() {
        try? keychain.removeBackendSession()
        backendSession = nil
        syncState = .idle
        guard let repository, let deviceID else { return }
        let guestNamespace = "guest:\(deviceID)"
        namespace = guestNamespace
        if let stored = try? repository.snapshot(namespace: guestNamespace),
           let decoded = try? decoder.decode(LocalAppProgress.self, from: stored.payload) {
            progress = decoded
        } else {
            progress = .fresh
        }
        let loaded = (try? repository.practices(namespace: guestNamespace)) ?? []
        practices = Dictionary(uniqueKeysWithValues: loaded.map { ($0.phraseID, $0) })
    }

    func exportAccount() async -> URL? {
        guard let existingSession = backendSession, existingSession.isValid,
              let baseURL = SyncConfiguration.baseURL else { return nil }
        do {
            let session: BackendSession
            if existingSession.accessIsValid {
                session = existingSession
            } else {
                session = try await syncClient.refresh(existingSession.refreshToken, baseURL: baseURL)
                try keychain.setBackendSession(session)
                backendSession = session
            }
            let data = try await syncClient.exportAccount(
                sessionToken: session.accessToken,
                baseURL: baseURL
            )
            _ = try JSONSerialization.jsonObject(with: data)
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyyMMdd-HHmmss"
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("xunzhang-zhaiju-\(formatter.string(from: Date())).json")
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            syncState = .failed(error.localizedDescription)
            return nil
        }
    }

    func deleteCloudAccount() async -> Bool {
        guard let existingSession = backendSession, existingSession.isValid,
              let baseURL = SyncConfiguration.baseURL,
              let namespace else { return false }
        do {
            let session: BackendSession
            if existingSession.accessIsValid {
                session = existingSession
            } else {
                session = try await syncClient.refresh(existingSession.refreshToken, baseURL: baseURL)
            }
            try await syncClient.deleteAccount(sessionToken: session.accessToken, baseURL: baseURL)
            cloudDeletionPendingLocalNamespace = namespace
            signOutLocally()
            return true
        } catch {
            syncState = .failed(error.localizedDescription)
            return false
        }
    }

    func clearDeletedAccountLocalData() throws {
        guard let namespace = cloudDeletionPendingLocalNamespace, let repository else {
            throw AppContainerError.unavailable
        }
        try repository.deleteNamespace(namespace)
        cloudDeletionPendingLocalNamespace = nil
    }

    func persist(gameState: GameState) throws {
        var next = progress
        let key = String(gameState.levelID)
        var level = next.levels[key] ?? LocalLevelProgress(stars: 0, found: [])
        level.found = orderedUnion(level.found, Array(gameState.foundPhraseIDs).sorted())
        if let earnedStars = gameState.earnedStars {
            level.stars = max(level.stars, earnedStars)
        }
        next.levels[key] = level
        next.collection = orderedUnion(next.collection, Array(gameState.collection).sorted())
        next = DailyProgressEngine().recordingGame(
            in: next,
            dateKey: TaiwanDate.dateKey(),
            gameState: gameState
        )
        var levelStats = next.levelStats ?? [:]
        var stats = levelStats[key] ?? .fresh
        if gameState.phase == .running {
            if next.activeRun?.levelID != gameState.levelID {
                stats.attempts += 1
            }
            next.activeRun = gameState
        } else {
            next.activeRun = nil
        }
        if gameState.phase == .completed {
            stats.completions += 1
            stats.bestStars = max(stats.bestStars, gameState.earnedStars ?? 0)
            stats.fewestMistakes = min(stats.fewestMistakes ?? gameState.mistakes, gameState.mistakes)
            if !stats.modesCleared.contains(gameState.mode) { stats.modesCleared.append(gameState.mode) }
            let badges = completionBadges(for: gameState)
            stats.badges = orderedUnion(stats.badges, badges)
            var activity = next.activity ?? .fresh
            activity.levelsSinceRest += 1
            next.activity = activity
            if let reward = gameState.treasureReward {
                next = WorldProgressEngine().grantingLevelTreasure(
                    reward,
                    levelID: gameState.levelID,
                    to: next
                )
            }
        }
        levelStats[key] = stats
        next.levelStats = levelStats
        try persist(next, kind: gameState.phase == .completed ? "levelCompleted" : "progressUpdated")
    }

    func recordQuiz(phraseID: String, kind: LearningQuestionKind, correct: Bool) throws {
        let next = DailyProgressEngine().recordingQuiz(
            in: progress,
            dateKey: TaiwanDate.dateKey(),
            phraseID: phraseID,
            kind: kind,
            correct: correct
        )
        try persist(next, kind: "quizAnswered")
    }

    func recordQuickChallenge(score: Int, durationMilliseconds: Int) throws {
        let next = DailyProgressEngine().recordingQuickChallenge(
            in: progress,
            dateKey: TaiwanDate.dateKey(),
            score: score,
            durationMilliseconds: durationMilliseconds
        )
        try persist(next, kind: "quickChallengeCompleted")
    }

    func spendInk(for tier: HintTier) throws -> Bool {
        var ledger = HintEngine(ink: progress.ink)
        guard ledger.spend(tier) else { return false }
        var next = progress
        next.ink = ledger.ink
        try persist(next, kind: "inkSpent")
        return true
    }

    func savePractice(phraseID: String, text: String) throws {
        guard let repository, let namespace else { throw AppContainerError.unavailable }
        let trimmed = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(80))
        let now = Date()
        let existing = practices[phraseID]
        let record = LocalPhrasePracticeRecord(
            id: existing?.id ?? UUID().uuidString.lowercased(),
            namespace: namespace,
            phraseID: phraseID,
            kind: "example",
            text: trimmed,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        )
        try repository.savePractice(record)
        practices[phraseID] = record
    }

    func takeRest() throws {
        var next = progress
        var activity = next.activity ?? .fresh
        activity.levelsSinceRest = 0
        activity.lastRestAt = Date()
        next.activity = activity
        try persist(next, kind: "restTaken")
    }

    func applyWorldEvent(_ event: WorldEvent, choice: EventChoice) throws {
        guard event.choices.contains(where: { $0.id == choice.id }) else {
            throw AppContainerError.invalidEventChoice
        }
        let next = WorldProgressEngine().applying(
            effects: choice.effect,
            eventID: event.id,
            to: progress
        )
        guard next != progress else { return }
        try persist(next, kind: "worldEventChosen")
    }

    func applyDailyEncounter(_ encounter: DailyEncounter) throws {
        let eventID = "daily:\(TaiwanDate.dateKey()):\(encounter.id)"
        let next = WorldProgressEngine().applying(
            effects: [encounter.effect],
            eventID: eventID,
            to: progress
        )
        guard next != progress else { return }
        try persist(next, kind: "dailyEncounterChosen")
    }

    private func activate(_ session: BackendSession) throws {
        guard let repository, let deviceID else { throw AppContainerError.unavailable }
        let userNamespace = "user:\(session.userID)"
        let stored = try repository.snapshot(namespace: userNamespace)
        let userProgress = try stored.map { try decoder.decode(LocalAppProgress.self, from: $0.payload) }
        let merged = userProgress.map { LocalProgressMergeEngine.merge($0, progress) } ?? progress
        namespace = userNamespace
        backendSession = session

        let now = Date()
        let payload = try encoder.encode(merged)
        let sequence = try repository.nextSequence(namespace: userNamespace, deviceID: deviceID)
        try repository.apply(ProgressMutation(
            snapshot: ProgressSnapshotRecord(
                namespace: userNamespace,
                schemaVersion: merged.v,
                payload: payload,
                updatedAt: now,
                serverRevision: stored?.serverRevision
            ),
            event: ProgressEventRecord(
                id: UUID().uuidString.lowercased(),
                namespace: userNamespace,
                deviceID: deviceID,
                sequence: sequence,
                kind: "guestProgressClaimed",
                payload: payload,
                occurredAt: now,
                syncedAt: nil
            )
        ))
        progress = merged
        var loaded = try repository.practices(namespace: userNamespace)
        var existingPhraseIDs = Set(loaded.map(\.phraseID))
        let guestNamespace = "guest:\(deviceID)"
        for practice in try repository.practices(namespace: guestNamespace)
        where !existingPhraseIDs.contains(practice.phraseID) {
            var claimed = practice
            claimed.id = UUID().uuidString.lowercased()
            claimed.namespace = userNamespace
            try repository.savePractice(claimed)
            loaded.append(claimed)
            existingPhraseIDs.insert(claimed.phraseID)
        }
        practices = Dictionary(uniqueKeysWithValues: loaded.map { ($0.phraseID, $0) })
    }

    private func persist(_ next: LocalAppProgress, kind: String) throws {
        guard let repository, let deviceID, let namespace else {
            throw AppContainerError.unavailable
        }

        let payload = try encoder.encode(next)
        let now = Date()
        let sequence = try repository.nextSequence(namespace: namespace, deviceID: deviceID)
        let eventID = UUID().uuidString.lowercased()
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
                inkDelta: next.ink - progress.ink,
                payload: payload,
                occurredAt: now,
                syncedAt: nil
            )
        ))
        progress = next
        if isSignedIn { Task { await self.syncNow() } }
    }

    private func orderedUnion(_ left: [String], _ right: [String]) -> [String] {
        var seen = Set<String>()
        return (left + right).filter { seen.insert($0).inserted }
    }

    private func completionBadges(for state: GameState) -> [String] {
        var badges: [String] = []
        if !state.usedReveal && state.mistakes == 0 { badges.append("insight") }
        if !state.usedReveal, !state.usedHint,
           let initial = state.initialTimeLimitMilliseconds,
           let remaining = state.remainingMilliseconds,
           initial > 0, Double(remaining) / Double(initial) >= 0.35 {
            badges.append("swift")
        }
        return badges
    }
}

enum AppContainerError: LocalizedError {
    case unavailable
    case invalidEventChoice

    var errorDescription: String? {
        switch self {
        case .unavailable: "本機內容或進度資料庫尚未就緒"
        case .invalidEventChoice: "這個事件選項不存在"
        }
    }
}
