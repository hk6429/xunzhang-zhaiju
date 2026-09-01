import { describe, expect, it } from "vitest";
import { parseProgressSnapshot, parseSyncRequest } from "../src/types";

const snapshot = { v: 1, levels: {}, ink: 3, collection: [] };

describe("sync contract parser", () => {
  it("rejects unknown snapshot fields including attempted user overrides", () => {
    expect(() => parseProgressSnapshot({ ...snapshot, userId: "victim" })).toThrow(/未知欄位/u);
    expect(() => parseProgressSnapshot({ ...snapshot, localPhrasePractice: {} })).toThrow(/未知欄位/u);
  });

  it("rejects unknown event kinds and out-of-range ink deltas", () => {
    const request = (kind: string, inkDelta: number) => ({
      deviceId: "device-12345678",
      baseRevision: 0,
      schemaVersion: 1,
      snapshot,
      events: [{
        id: "event-12345678", sequence: 1, kind, inkDelta, payload: snapshot,
        occurredAt: "2026-09-01T00:00:00Z",
      }],
    });
    expect(() => parseSyncRequest(request("adminOverride", 0))).toThrow(/event.kind/u);
    expect(() => parseSyncRequest(request("progressUpdated", 100_001))).toThrow(/inkDelta/u);
  });

  it("rejects duplicate or oversized string sets", () => {
    expect(() => parseProgressSnapshot({ ...snapshot, collection: ["p1", "p1"] })).toThrow(/collection/u);
    expect(() => parseProgressSnapshot({ ...snapshot, collection: ["x".repeat(129)] })).toThrow(/collection/u);
  });

  it("accepts the hidden ending event and its world payload", () => {
    const endingSnapshot = {
      ...snapshot,
      world: { hiddenEnding: { choice: "people", answeredAt: 1_788_192_000_000 } },
    };
    expect(() => parseSyncRequest({
      deviceId: "device-12345678",
      baseRevision: 0,
      schemaVersion: 1,
      snapshot: endingSnapshot,
      events: [{
        id: "event-12345678",
        sequence: 1,
        kind: "hiddenEndingAnswered",
        inkDelta: 0,
        payload: endingSnapshot,
        occurredAt: "2026-09-01T00:00:00Z",
      }],
    })).not.toThrow();
  });
});
