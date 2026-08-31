import { createClient, type Client } from "@tursodatabase/serverless/compat";
import { isJsonValue, type SyncRequestBody, type VerifiedIdentity, type JsonValue } from "./types";
import { mergeProgress } from "./merge";
import { issueSession, makeRefreshCredential, verifyRefreshSecret } from "./auth";

const accessExpiresIn = 900;
const refreshExpiresIn = 2_592_000;

export interface SessionBundle {
  accessToken: string;
  refreshToken: string;
  userID: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export function database(env: Env): Client {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

export async function ensureUser(identity: VerifiedIdentity, env: Env): Promise<string> {
  const client = database(env);
  const existing = await client.execute({
    sql: "SELECT user_id FROM identities WHERE provider = ? AND subject = ?",
    args: [identity.provider, identity.subject],
  });
  const existingID = stringColumn(existing.rows[0], "user_id");
  if (existingID) return existingID;

  const userID = await stableUserID(identity.provider, identity.subject);
  const now = new Date().toISOString();
  await client.batch([
    {
      sql: "INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)",
      args: [userID, now],
    },
    {
      sql: "INSERT OR IGNORE INTO identities (provider, subject, user_id, created_at) VALUES (?, ?, ?, ?)",
      args: [identity.provider, identity.subject, userID, now],
    },
  ], { mode: "write" });
  const resolved = await client.execute({
    sql: "SELECT user_id FROM identities WHERE provider = ? AND subject = ?",
    args: [identity.provider, identity.subject],
  });
  const resolvedID = stringColumn(resolved.rows[0], "user_id");
  if (!resolvedID) throw new Error("無法建立登入身分");
  return resolvedID;
}

export async function linkIdentity(userID: string, identity: VerifiedIdentity, env: Env): Promise<void> {
  const client = database(env);
  const existing = await client.execute({
    sql: `SELECT provider, subject, user_id FROM identities
      WHERE (provider = ? AND subject = ?) OR (provider = ? AND user_id = ?)`,
    args: [identity.provider, identity.subject, identity.provider, userID],
  });
  for (const row of existing.rows) {
    const linkedUserID = requiredString(row, "user_id");
    const subject = requiredString(row, "subject");
    if (linkedUserID === userID && subject === identity.subject) return;
    throw new IdentityLinkError("這個登入身分已連結至另一個帳號，或本帳號已有同類登入身分");
  }
  await client.execute({
    sql: `INSERT INTO identities (provider, subject, user_id, created_at)
      VALUES (?, ?, ?, ?)`,
    args: [identity.provider, identity.subject, userID, new Date().toISOString()],
  });
}

export class IdentityLinkError extends Error {}

export async function createSession(userID: string, env: Env): Promise<SessionBundle> {
  const client = database(env);
  const credential = await makeRefreshCredential();
  const familyID = crypto.randomUUID();
  const now = new Date();
  await client.execute({
    sql: `INSERT INTO sessions
      (id, user_id, family_id, secret_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      credential.id,
      userID,
      familyID,
      credential.secretHash,
      new Date(now.getTime() + refreshExpiresIn * 1_000).toISOString(),
      now.toISOString(),
    ],
  });
  return sessionBundle(userID, credential.id, credential.token, env);
}

export async function rotateSession(refreshToken: string, env: Env): Promise<SessionBundle> {
  const separator = refreshToken.indexOf(".");
  if (separator < 1) throw new SessionTokenError("refresh token 無效");
  const id = refreshToken.slice(0, separator);
  const secret = refreshToken.slice(separator + 1);
  const client = database(env);
  const result = await client.execute({
    sql: `SELECT user_id, family_id, secret_hash, expires_at, rotated_at, revoked_at
      FROM sessions WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  if (!row) throw new SessionTokenError("refresh token 無效");
  const userID = requiredString(row, "user_id");
  const familyID = requiredString(row, "family_id");
  const expectedHash = requiredString(row, "secret_hash");
  if (!await verifyRefreshSecret(secret, expectedHash)) {
    throw new SessionTokenError("refresh token 無效");
  }
  if (row.revoked_at !== null || Date.parse(requiredString(row, "expires_at")) <= Date.now()) {
    throw new SessionTokenError("refresh token 已失效");
  }
  if (row.rotated_at !== null) {
    await revokeFamily(client, userID, familyID);
    throw new SessionTokenError("偵測到 refresh token 重播，已撤銷登入階段");
  }

  const now = new Date();
  const rotated = await client.execute({
    sql: `UPDATE sessions SET rotated_at = ?
      WHERE id = ? AND user_id = ? AND rotated_at IS NULL AND revoked_at IS NULL`,
    args: [now.toISOString(), id, userID],
  });
  if (rotated.rowsAffected !== 1) {
    await revokeFamily(client, userID, familyID);
    throw new SessionTokenError("refresh token 已被使用，已撤銷登入階段");
  }

  const next = await makeRefreshCredential();
  await client.execute({
    sql: `INSERT INTO sessions
      (id, user_id, family_id, secret_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      next.id,
      userID,
      familyID,
      next.secretHash,
      new Date(now.getTime() + refreshExpiresIn * 1_000).toISOString(),
      now.toISOString(),
    ],
  });
  return sessionBundle(userID, next.id, next.token, env);
}

export async function sessionIsActive(userID: string, sessionID: string, env: Env): Promise<boolean> {
  const result = await database(env).execute({
    sql: `SELECT 1 AS active FROM sessions
      WHERE id = ? AND user_id = ? AND rotated_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
    args: [sessionID, userID, new Date().toISOString()],
  });
  return result.rows.length === 1;
}

export async function revokeSessionFamily(userID: string, sessionID: string, env: Env): Promise<void> {
  const client = database(env);
  const result = await client.execute({
    sql: "SELECT family_id FROM sessions WHERE id = ? AND user_id = ?",
    args: [sessionID, userID],
  });
  const familyID = stringColumn(result.rows[0], "family_id");
  if (familyID) await revokeFamily(client, userID, familyID);
}

export async function exportAccount(userID: string, env: Env): Promise<JsonValue> {
  const client = database(env);
  const snapshot = await client.execute({
    sql: "SELECT revision, schema_version, payload, updated_at FROM progress_snapshots WHERE user_id = ?",
    args: [userID],
  });
  const events = await client.execute({
    sql: `SELECT id, device_id, sequence, kind, ink_delta, payload, occurred_at, created_at
      FROM progress_events WHERE user_id = ? ORDER BY created_at, id`,
    args: [userID],
  });
  const snapshotRow = snapshot.rows[0];
  return {
    format: "xunzhang-zhaiju-account-v1",
    exportedAt: new Date().toISOString(),
    snapshot: snapshotRow ? {
      revision: numberColumn(snapshotRow, "revision"),
      schemaVersion: numberColumn(snapshotRow, "schema_version"),
      payload: parseStoredJSON(snapshotRow.payload),
      updatedAt: requiredString(snapshotRow, "updated_at"),
    } : null,
    events: events.rows.map((row) => ({
      id: requiredString(row, "id"),
      deviceId: requiredString(row, "device_id"),
      sequence: numberColumn(row, "sequence"),
      kind: requiredString(row, "kind"),
      inkDelta: numberColumn(row, "ink_delta"),
      payload: parseStoredJSON(row.payload),
      occurredAt: requiredString(row, "occurred_at"),
      createdAt: requiredString(row, "created_at"),
    })),
  };
}

export async function deleteAccount(userID: string, env: Env): Promise<void> {
  const client = database(env);
  await client.batch([
    { sql: "DELETE FROM sessions WHERE user_id = ?", args: [userID] },
    { sql: "DELETE FROM progress_events WHERE user_id = ?", args: [userID] },
    { sql: "DELETE FROM progress_snapshots WHERE user_id = ?", args: [userID] },
    { sql: "DELETE FROM identities WHERE user_id = ?", args: [userID] },
    { sql: "DELETE FROM users WHERE id = ?", args: [userID] },
  ], { mode: "write" });
}

export async function syncProgress(
  userID: string,
  input: SyncRequestBody,
  env: Env,
): Promise<{ revision: number; schemaVersion: number; snapshot: JsonValue; acceptedEventIDs: string[] }> {
  const client = database(env);
  const now = new Date().toISOString();
  const transaction = await client.transaction("write");
  try {
    await transaction.execute({
      sql: `INSERT OR IGNORE INTO progress_snapshots
        (user_id, revision, schema_version, payload, updated_at) VALUES (?, 0, ?, ?, ?)`,
      args: [userID, input.schemaVersion, JSON.stringify(input.snapshot), now],
    });
    const current = await transaction.execute({
      sql: "SELECT revision, schema_version, payload FROM progress_snapshots WHERE user_id = ?",
      args: [userID],
    });
    const row = current.rows[0];
    if (!row) throw new Error("同步快照不存在");
    const revision = numberColumn(row, "revision");
    const serverSchema = numberColumn(row, "schema_version");
    const serverSnapshot = parseStoredJSON(row.payload);
    const acceptedEventIDs: string[] = [];
    let unseenInkDelta = 0;
    for (const event of input.events) {
      const inserted = await transaction.execute({
        sql: `INSERT OR IGNORE INTO progress_events
          (id, user_id, device_id, sequence, kind, ink_delta, payload, occurred_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          event.id,
          userID,
          input.deviceId,
          event.sequence,
          event.kind,
          event.inkDelta,
          JSON.stringify(event.payload),
          event.occurredAt,
          now,
        ],
      });
      if (inserted.rowsAffected === 1) {
        acceptedEventIDs.push(event.id);
        unseenInkDelta += event.inkDelta;
      } else {
        const duplicate = await transaction.execute({
          sql: `SELECT 1 AS accepted FROM progress_events
            WHERE user_id = ? AND id = ? AND device_id = ? AND sequence = ?`,
          args: [userID, event.id, input.deviceId, event.sequence],
        });
        if (duplicate.rows.length === 1) acceptedEventIDs.push(event.id);
      }
    }
    const merged = input.baseRevision === revision
      ? input.snapshot
      : mergeProgress(serverSnapshot, input.snapshot, unseenInkDelta);
    const nextSchema = Math.max(serverSchema, input.schemaVersion);
    await transaction.execute({
      sql: `UPDATE progress_snapshots
        SET revision = revision + 1, schema_version = ?, payload = ?, updated_at = ?
        WHERE user_id = ?`,
      args: [nextSchema, JSON.stringify(merged), now, userID],
    });
    await transaction.commit();
    return {
      revision: revision + 1,
      schemaVersion: nextSchema,
      snapshot: merged,
      acceptedEventIDs,
    };
  } catch (error) {
    if (!transaction.closed) await transaction.rollback();
    throw error;
  } finally {
    if (!transaction.closed) transaction.close();
  }
}

export class SessionTokenError extends Error {}

async function sessionBundle(
  userID: string,
  sessionID: string,
  refreshToken: string,
  env: Env,
): Promise<SessionBundle> {
  return {
    accessToken: await issueSession(userID, sessionID, env),
    refreshToken,
    userID,
    expiresIn: accessExpiresIn,
    refreshExpiresIn,
  };
}

async function revokeFamily(client: Client, userID: string, familyID: string): Promise<void> {
  await client.execute({
    sql: "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND family_id = ? AND revoked_at IS NULL",
    args: [new Date().toISOString(), userID, familyID],
  });
}

async function stableUserID(provider: string, subject: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${provider}\u0000${subject}`),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `u_${hex.slice(0, 40)}`;
}

function stringColumn(row: Record<string, unknown> | undefined, name: string): string | undefined {
  const value = row?.[name];
  return typeof value === "string" ? value : undefined;
}

function requiredString(row: Record<string, unknown>, name: string): string {
  const value = stringColumn(row, name);
  if (value === undefined) throw new Error(`資料庫欄位 ${name} 不是字串`);
  return value;
}

function numberColumn(row: Record<string, unknown>, name: string): number {
  const value = row[name];
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`資料庫欄位 ${name} 不是數字`);
}

function parseStoredJSON(value: unknown): JsonValue {
  if (typeof value !== "string") throw new Error("資料庫快照格式錯誤");
  const parsed: unknown = JSON.parse(value);
  if (!isJsonValue(parsed)) throw new Error("資料庫快照不是合法 JSON");
  return parsed;
}
