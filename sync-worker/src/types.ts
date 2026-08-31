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
  if (!isJsonValue(value.snapshot)) throw new TypeError("snapshot 不是合法 JSON");
  if (!Array.isArray(value.events) || value.events.length > 500) {
    throw new TypeError("events 最多 500 筆");
  }
  const events = value.events.map(parseSyncEvent);
  return {
    deviceId: value.deviceId,
    baseRevision: Number(value.baseRevision),
    schemaVersion: Number(value.schemaVersion),
    snapshot: value.snapshot,
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
  if (!isJsonValue(value.payload)) throw new TypeError("event.payload 不是合法 JSON");
  return {
    id: value.id,
    sequence: Number(value.sequence),
    kind: value.kind,
    inkDelta: Number(inkDelta),
    payload: value.payload,
    occurredAt: value.occurredAt,
  };
}

const syncEventKinds = new Set([
  "progressUpdated", "levelCompleted", "quizAnswered", "quickChallengeCompleted",
  "inkSpent", "restTaken", "worldEventChosen", "dailyEncounterChosen", "guestProgressClaimed",
]);

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}
