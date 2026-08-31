import { createClient, type Client, type InStatement } from "@tursodatabase/serverless/compat";
import { isJsonValue, type SyncRequestBody, type VerifiedIdentity, type JsonValue } from "./types";
import { mergeProgress } from "./merge";

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

export async function syncProgress(
  userID: string,
  input: SyncRequestBody,
  env: Env,
): Promise<{ revision: number; schemaVersion: number; snapshot: JsonValue; acceptedEventIDs: string[] }> {
  const client = database(env);
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT OR IGNORE INTO progress_snapshots
      (user_id, revision, schema_version, payload, updated_at) VALUES (?, 0, ?, ?, ?)`,
    args: [userID, input.schemaVersion, JSON.stringify(input.snapshot), now],
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await client.execute({
      sql: "SELECT revision, schema_version, payload FROM progress_snapshots WHERE user_id = ?",
      args: [userID],
    });
    const row = current.rows[0];
    if (!row) throw new Error("同步快照不存在");
    const revision = numberColumn(row, "revision");
    const serverSchema = numberColumn(row, "schema_version");
    const serverSnapshot = parseStoredJSON(row.payload);
    const merged = input.baseRevision === revision
      ? input.snapshot
      : mergeProgress(serverSnapshot, input.snapshot);
    const nextSchema = Math.max(serverSchema, input.schemaVersion);
    const statements: InStatement[] = input.events.map((event) => ({
      sql: `INSERT OR IGNORE INTO progress_events
        (id, user_id, device_id, sequence, kind, payload, occurred_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        event.id,
        userID,
        input.deviceId,
        event.sequence,
        event.kind,
        JSON.stringify(event.payload),
        event.occurredAt,
        now,
      ],
    }));
    statements.push({
      sql: `UPDATE progress_snapshots
        SET revision = revision + 1, schema_version = ?, payload = ?, updated_at = ?
        WHERE user_id = ? AND revision = ?`,
      args: [nextSchema, JSON.stringify(merged), now, userID, revision],
    });
    const results = await client.batch(statements, { mode: "write" });
    const updated = results.at(-1)?.rowsAffected ?? 0;
    if (updated === 1) {
      return {
        revision: revision + 1,
        schemaVersion: nextSchema,
        snapshot: merged,
        acceptedEventIDs: input.events.map((event) => event.id),
      };
    }
  }
  throw new SyncConflictError();
}

export class SyncConflictError extends Error {
  constructor() {
    super("同步資料同時被其他裝置更新，請重試");
  }
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
