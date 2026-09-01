import type { Client } from "@tursodatabase/serverless/compat";
import { describe, expect, it } from "vitest";
import { makeRefreshCredential } from "../src/auth";
import {
  deleteAccount,
  rotateSession,
  sessionIsActive,
} from "../src/database";

type SessionRow = {
  id: string;
  user_id: string;
  family_id: string;
  secret_hash: string;
  expires_at: string;
  rotated_at: string | null;
  revoked_at: string | null;
};

const env = {
  SESSION_ISSUER: "test-session-issuer",
  WORKER_SESSION_SECRET: "test-session-secret-that-is-longer-than-32-characters",
} as Env;

describe("database session lifecycle", () => {
  it("revokes the complete refresh family when a rotated token is replayed", async () => {
    const fake = new FakeSessionClient();
    const original = await fake.addSession("user-1", "family-1", "original-session");

    const rotated = await rotateSession(original.token, env, fake.client);
    const nextID = rotated.refreshToken.slice(0, rotated.refreshToken.indexOf("."));

    await expect(sessionIsActive("user-1", nextID, env, fake.client)).resolves.toBe(true);
    await expect(rotateSession(original.token, env, fake.client)).rejects.toThrow(
      "偵測到 refresh token 重播",
    );
    await expect(sessionIsActive("user-1", nextID, env, fake.client)).resolves.toBe(false);
    await expect(rotateSession(rotated.refreshToken, env, fake.client)).rejects.toThrow(
      "refresh token 已失效",
    );
  });

  it("makes every refresh credential unusable after account deletion", async () => {
    const fake = new FakeSessionClient();
    const credential = await fake.addSession("user-delete", "family-delete", "delete-session");

    await expect(sessionIsActive("user-delete", "delete-session", env, fake.client)).resolves.toBe(true);
    await deleteAccount("user-delete", env, fake.client);

    await expect(sessionIsActive("user-delete", "delete-session", env, fake.client)).resolves.toBe(false);
    await expect(rotateSession(credential.token, env, fake.client)).rejects.toThrow(
      "refresh token 無效",
    );
    expect(fake.deletedTables).toEqual([
      "sessions",
      "progress_events",
      "progress_snapshots",
      "identities",
      "users",
    ]);
  });
});

class FakeSessionClient {
  readonly sessions = new Map<string, SessionRow>();
  readonly deletedTables: string[] = [];

  readonly client = {
    execute: async (statement: { sql: string; args?: unknown[] }) => {
      const sql = normalized(statement.sql);
      const args = statement.args ?? [];

      if (sql.startsWith("SELECT user_id, family_id, secret_hash")) {
        const row = this.sessions.get(String(args[0]));
        return result(row ? [row] : []);
      }
      if (sql.startsWith("UPDATE sessions SET rotated_at")) {
        const row = this.sessions.get(String(args[1]));
        if (!row || row.user_id !== args[2] || row.rotated_at !== null || row.revoked_at !== null) {
          return result([], 0);
        }
        row.rotated_at = String(args[0]);
        return result([], 1);
      }
      if (sql.startsWith("INSERT INTO sessions")) {
        const [id, userID, familyID, secretHash, expiresAt] = args.map(String);
        this.sessions.set(id, {
          id,
          user_id: userID,
          family_id: familyID,
          secret_hash: secretHash,
          expires_at: expiresAt,
          rotated_at: null,
          revoked_at: null,
        });
        return result([], 1);
      }
      if (sql.startsWith("UPDATE sessions SET revoked_at")) {
        let changed = 0;
        for (const row of this.sessions.values()) {
          if (row.user_id === args[1] && row.family_id === args[2] && row.revoked_at === null) {
            row.revoked_at = String(args[0]);
            changed += 1;
          }
        }
        return result([], changed);
      }
      if (sql.startsWith("SELECT 1 AS active FROM sessions")) {
        const row = this.sessions.get(String(args[0]));
        const active = row
          && row.user_id === args[1]
          && row.rotated_at === null
          && row.revoked_at === null
          && row.expires_at > String(args[2]);
        return result(active ? [{ active: 1 }] : []);
      }
      throw new Error(`未處理的測試 SQL：${sql}`);
    },
    batch: async (statements: Array<{ sql: string; args?: unknown[] }>) => {
      for (const statement of statements) {
        const match = normalized(statement.sql).match(/^DELETE FROM ([a-z_]+) WHERE (?:user_id|id) = \?$/);
        if (!match) throw new Error(`未處理的測試 batch SQL：${statement.sql}`);
        this.deletedTables.push(match[1]);
        if (match[1] === "sessions") {
          const userID = String(statement.args?.[0]);
          for (const [id, row] of this.sessions) {
            if (row.user_id === userID) this.sessions.delete(id);
          }
        }
      }
      return statements.map(() => result([], 1));
    },
  } as unknown as Client;

  async addSession(userID: string, familyID: string, id: string) {
    const credential = await makeRefreshCredential(id);
    this.sessions.set(id, {
      id,
      user_id: userID,
      family_id: familyID,
      secret_hash: credential.secretHash,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      rotated_at: null,
      revoked_at: null,
    });
    return credential;
  }
}

function normalized(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function result(rows: Array<Record<string, unknown>>, rowsAffected = 0) {
  return {
    columns: rows.length ? Object.keys(rows[0]) : [],
    columnTypes: [],
    rows,
    rowsAffected,
    lastInsertRowid: undefined,
    toJSON: () => ({ columns: [], rows }),
  };
}
