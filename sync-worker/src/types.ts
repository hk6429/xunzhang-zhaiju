export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type IdentityProvider = "apple" | "google";

export interface AuthExchangeRequest {
  provider: IdentityProvider;
  idToken: string;
  nonce?: string;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface SyncEventInput {
  id: string;
  sequence: number;
  kind: string;
  inkDelta: number;
  payload: JsonValue;
  occurredAt: string;
}

export interface SyncRequestBody {
  deviceId: string;
  baseRevision: number;
  schemaVersion: number;
  snapshot: JsonValue;
  events: SyncEventInput[];
}

export interface VerifiedIdentity {
  provider: IdentityProvider;
  subject: string;
  email?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAuthExchange(value: unknown): AuthExchangeRequest {
  if (!isRecord(value) || (value.provider !== "apple" && value.provider !== "google")) {
    throw new TypeError("provider 必須是 apple 或 google");
  }
  if (typeof value.idToken !== "string" || value.idToken.length < 20) {
    throw new TypeError("idToken 格式錯誤");
  }
  if (value.nonce !== undefined && typeof value.nonce !== "string") {
    throw new TypeError("nonce 格式錯誤");
  }
  if (value.provider === "apple" && (typeof value.nonce !== "string" || value.nonce.length < 16)) {
    throw new TypeError("Apple 登入必須提供 nonce");
  }
  return {
    provider: value.provider,
    idToken: value.idToken,
    nonce: value.nonce,
  };
}

export function parseAuthRefresh(value: unknown): AuthRefreshRequest {
  if (!isRecord(value) || typeof value.refreshToken !== "string"
      || value.refreshToken.length < 40 || value.refreshToken.length > 256) {
    throw new TypeError("refreshToken 格式錯誤");
  }
  return { refreshToken: value.refreshToken };
}

export function parseSyncRequest(value: unknown): SyncRequestBody {
  if (!isRecord(value)) throw new TypeError("同步內容必須是物件");
  if (typeof value.deviceId !== "string" || value.deviceId.length < 8 || value.deviceId.length > 128) {
    throw new TypeError("deviceId 格式錯誤");
  }
  if (!Number.isSafeInteger(value.baseRevision) || Number(value.baseRevision) < 0) {
    throw new TypeError("baseRevision 格式錯誤");
  }
  if (!Number.isSafeInteger(value.schemaVersion) || Number(value.schemaVersion) < 1) {
    throw new TypeError("schemaVersion 格式錯誤");
  }
  const snapshot = parseProgressSnapshot(value.snapshot);
  if (!Array.isArray(value.events) || value.events.length > 500) {
    throw new TypeError("events 最多 500 筆");
  }
  const events = value.events.map(parseSyncEvent);
  return {
    deviceId: value.deviceId,
    baseRevision: Number(value.baseRevision),
    schemaVersion: Number(value.schemaVersion),
    snapshot,
    events,
  };
}

function parseSyncEvent(value: unknown): SyncEventInput {
  if (!isRecord(value)) throw new TypeError("event 格式錯誤");
  if (typeof value.id !== "string" || value.id.length < 8 || value.id.length > 128) {
    throw new TypeError("event.id 格式錯誤");
  }
  if (!Number.isSafeInteger(value.sequence) || Number(value.sequence) < 1) {
    throw new TypeError("event.sequence 格式錯誤");
  }
  if (typeof value.kind !== "string" || !syncEventKinds.has(value.kind)) {
    throw new TypeError("event.kind 格式錯誤");
  }
  const inkDelta = value.inkDelta === undefined ? 0 : value.inkDelta;
  if (!Number.isSafeInteger(inkDelta) || Math.abs(Number(inkDelta)) > 100_000) {
    throw new TypeError("event.inkDelta 格式錯誤");
  }
  if (typeof value.occurredAt !== "string" || !Number.isFinite(Date.parse(value.occurredAt))) {
    throw new TypeError("event.occurredAt 格式錯誤");
  }
  const payload = parseProgressSnapshot(value.payload);
  return {
    id: value.id,
    sequence: Number(value.sequence),
    kind: value.kind,
    inkDelta: Number(inkDelta),
    payload,
    occurredAt: value.occurredAt,
  };
}

const syncEventKinds = new Set([
  "progressUpdated", "levelCompleted", "quizAnswered", "quickChallengeCompleted",
  "inkSpent", "restTaken", "worldEventChosen", "dailyEncounterChosen", "guestProgressClaimed",
  "hiddenEndingAnswered",
]);

const snapshotKeys = new Set([
  "v", "levels", "ink", "collection", "daily", "mastery", "wrongBook", "streak",
  "activeRun", "levelStats", "activity", "world",
]);

export function parseProgressSnapshot(value: unknown): JsonValue {
  if (!isRecord(value) || Object.keys(value).some((key) => !snapshotKeys.has(key))) {
    throw new TypeError("snapshot 含未知欄位");
  }
  if (value.v !== 1 || !isRecord(value.levels)) throw new TypeError("snapshot 版本或 levels 格式錯誤");
  const levels = Object.entries(value.levels);
  if (levels.length > 1_000) throw new TypeError("snapshot levels 過多");
  for (const [id, level] of levels) {
    if (!/^[1-9][0-9]{0,2}$/u.test(id) || !isRecord(level)
        || Object.keys(level).some((key) => key !== "stars" && key !== "found")
        || !Number.isInteger(level.stars) || Number(level.stars) < 0 || Number(level.stars) > 3) {
      throw new TypeError("snapshot level 格式錯誤");
    }
    parseStringSet(level.found, "level.found");
  }
  if (!Number.isSafeInteger(value.ink) || Number(value.ink) < 0 || Number(value.ink) > 100_000) {
    throw new TypeError("snapshot ink 格式錯誤");
  }
  parseStringSet(value.collection, "collection");
  for (const key of ["daily", "mastery", "streak", "activeRun", "levelStats", "activity", "world"] as const) {
    if (value[key] !== undefined && value[key] !== null && !isRecord(value[key])) {
      throw new TypeError(`snapshot ${key} 格式錯誤`);
    }
  }
  if (value.wrongBook !== undefined && value.wrongBook !== null) parseStringSet(value.wrongBook, "wrongBook");
  if (!isJsonValue(value)) throw new TypeError("snapshot 不是合法 JSON");
  return value as JsonValue;
}

function parseStringSet(value: unknown, name: string): void {
  if (!Array.isArray(value) || value.length > 2_000) throw new TypeError(`snapshot ${name} 格式錯誤`);
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || item.length < 1 || item.length > 128 || seen.has(item)) {
      throw new TypeError(`snapshot ${name} 格式錯誤`);
    }
    seen.add(item);
  }
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}
