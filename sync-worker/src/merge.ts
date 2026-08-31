import type { JsonValue } from "./types";
import { isRecord } from "./types";

export function mergeProgress(server: JsonValue, client: JsonValue): JsonValue {
  if (!isJsonObject(server) || !isJsonObject(client)) return client;
  const merged = mergeObjects(server, client);
  merged.daily = mergeDaily(server.daily, client.daily);
  const mastery = isJsonObject(merged.mastery) ? merged.mastery : {};
  if (Array.isArray(merged.wrongBook)) {
    merged.wrongBook = merged.wrongBook.filter((id) => {
      if (typeof id !== "string") return false;
      const item = mastery[id];
      return !isJsonObject(item) || Number(item.correctStreak ?? 0) < 2;
    });
  }
  return merged;
}

function mergeObjects(
  server: Record<string, JsonValue>,
  client: Record<string, JsonValue>,
  path: string[] = [],
): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = { ...server };
  for (const [key, clientValue] of Object.entries(client)) {
    const serverValue = server[key];
    if (serverValue === undefined) {
      out[key] = clientValue;
    } else if (Array.isArray(serverValue) && Array.isArray(clientValue)) {
      out[key] = union(serverValue, clientValue);
    } else if (isJsonObject(serverValue) && isJsonObject(clientValue)) {
      out[key] = mergeObjects(serverValue, clientValue, [...path, key]);
    } else if (typeof serverValue === "number" && typeof clientValue === "number") {
      out[key] = prefersMinimum([...path, key])
        ? Math.min(serverValue, clientValue)
        : Math.max(serverValue, clientValue);
    } else if (typeof serverValue === "boolean" && typeof clientValue === "boolean") {
      out[key] = serverValue || clientValue;
    } else {
      out[key] = clientValue;
    }
  }
  return out;
}

function prefersMinimum(path: string[]): boolean {
  const key = path.at(-1);
  return key === "fewestMistakes" || key === "bestDurationMs" || key === "durationMilliseconds";
}

function mergeDaily(server: JsonValue | undefined, client: JsonValue | undefined): JsonValue {
  if (!isJsonObject(server)) return client ?? null;
  if (!isJsonObject(client)) return server;
  const serverDate = typeof server.dateKey === "string" ? server.dateKey : "";
  const clientDate = typeof client.dateKey === "string" ? client.dateKey : "";
  if (serverDate !== clientDate) return clientDate > serverDate ? client : server;
  const merged = mergeObjects(server, client);
  if (isJsonObject(server.quickBest) && isJsonObject(client.quickBest)) {
    const serverScore = Number(server.quickBest.score ?? 0);
    const clientScore = Number(client.quickBest.score ?? 0);
    const serverDuration = Number(server.quickBest.durationMilliseconds ?? Number.MAX_SAFE_INTEGER);
    const clientDuration = Number(client.quickBest.durationMilliseconds ?? Number.MAX_SAFE_INTEGER);
    merged.quickBest = clientScore > serverScore || (clientScore === serverScore && clientDuration < serverDuration)
      ? client.quickBest
      : server.quickBest;
  }
  return merged;
}

function union(left: JsonValue[], right: JsonValue[]): JsonValue[] {
  const seen = new Set<string>();
  return [...left, ...right].filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isJsonObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}
