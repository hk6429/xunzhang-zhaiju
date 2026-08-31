import GRDB
import XCTest
@testable import XunZhangZhaiJu

final class ProgressRepositoryTests: XCTestCase {
    func testMutationWritesSnapshotEventAndOutboxInOneTransaction() throws {
        let database = try AppDatabase.inMemory()
        let repository = ProgressRepository(database: database)
        let mutation = fixture(namespace: "guest:one", revision: 1)

        try repository.apply(mutation)

        XCTAssertEqual(try repository.snapshot(namespace: "guest:one")?.payload, mutation.snapshot.payload)
        XCTAssertEqual(try repository.events(namespace: "guest:one").map(\.id), [mutation.event.id])
        XCTAssertEqual(try repository.pendingOutbox(namespace: "guest:one").map(\.eventID), [mutation.event.id])
    }

    func testFailureRollsBackSnapshotEventAndOutboxTogether() throws {
        let database = try AppDatabase.inMemory()
        let repository = ProgressRepository(database: database)
        let first = fixture(namespace: "guest:one", revision: 1)
        try repository.apply(first)

        var duplicate = fixture(namespace: "guest:one", revision: 2)
        duplicate.event.id = first.event.id
        duplicate.event.sequence = 2

        XCTAssertThrowsError(try repository.apply(duplicate))
        XCTAssertEqual(try repository.snapshot(namespace: "guest:one")?.payload, first.snapshot.payload)
        XCTAssertEqual(try repository.events(namespace: "guest:one").count, 1)
        XCTAssertEqual(try repository.pendingOutbox(namespace: "guest:one").count, 1)
    }

    func testGuestAndAccountNamespacesStayIsolated() throws {
        let database = try AppDatabase.inMemory()
        let repository = ProgressRepository(database: database)
        try repository.apply(fixture(namespace: "guest:device-a", revision: 1))
        try repository.apply(fixture(namespace: "user:apple-123", revision: 9))

        XCTAssertEqual(try repository.snapshot(namespace: "guest:device-a")?.serverRevision, 1)
        XCTAssertEqual(try repository.snapshot(namespace: "user:apple-123")?.serverRevision, 9)
        XCTAssertEqual(try repository.events(namespace: "guest:device-a").count, 1)
        XCTAssertEqual(try repository.events(namespace: "user:apple-123").count, 1)
    }

    func testDeviceIdentifierRemainsStableInKeychain() throws {
        let service = "tw.edu.hc.zgjh.xunzhangzhaiju.tests.\(UUID().uuidString)"
        let store = KeychainStore(service: service)
        defer { try? store.remove(account: "device-id") }

        let first = try store.deviceIdentifier()
        let second = try store.deviceIdentifier()

        XCTAssertEqual(first, second)
        XCTAssertNotNil(UUID(uuidString: first))
    }

    func testLocalPracticeStaysOutsideSyncOutbox() throws {
        let database = try AppDatabase.inMemory()
        let repository = ProgressRepository(database: database)
        let now = Date(timeIntervalSince1970: 1_788_192_000)
        let practice = LocalPhrasePracticeRecord(
            id: "practice-1",
            namespace: "guest:one",
            phraseID: "p1",
            kind: "example",
            text: "我在運動會上全力以赴。",
            createdAt: now,
            updatedAt: now
        )

        try repository.savePractice(practice)

        XCTAssertEqual(try repository.practices(namespace: "guest:one"), [practice])
        XCTAssertTrue(try repository.pendingOutbox(namespace: "guest:one").isEmpty)
    }

    private func fixture(namespace: String, revision: Int64) -> ProgressMutation {
        let suffix = namespace.replacingOccurrences(of: ":", with: "-")
        let payload = Data(#"{"v":1,"ink":3}"#.utf8)
        let date = Date(timeIntervalSince1970: 1_788_192_000)
        return ProgressMutation(
            snapshot: ProgressSnapshotRecord(
                namespace: namespace,
                schemaVersion: 1,
                payload: payload,
                updatedAt: date,
                serverRevision: revision
            ),
            event: ProgressEventRecord(
                id: "event-\(suffix)-\(revision)",
                namespace: namespace,
                deviceID: "device-a",
                sequence: revision,
                kind: "levelCompleted",
                payload: payload,
                occurredAt: date,
                syncedAt: nil
            )
        )
    }
}
