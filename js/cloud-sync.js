import { TREASURE_PASSIVES } from './treasure-passives.js';

const DEVICE_KEY = 'xzzj_sync_device_v1';
const REVISION_KEY = 'xzzj_sync_revision_v1';
const SEQUENCE_KEY = 'xzzj_sync_sequence_v1';
const OUTBOX_KEY = 'xzzj_sync_outbox_v1';
const LAST_INK_KEY = 'xzzj_sync_last_ink_v1';

export function createCloudSync({ apiBase, getSave, onMerged, onStatus = () => {}, fetchImpl = fetch }) {
  const base = normalizeBaseURL(apiBase);
  let timer = null;
  if (base && !readText(LAST_INK_KEY)) {
    writeText(LAST_INK_KEY, String(nonnegativeInteger(getSave()?.ink, 0)));
  }

  function schedule() {
    if (!base || timer) return;
    timer = setTimeout(async () => {
      timer = null;
      queueSnapshot(getSave());
      await syncNow();
    }, 800);
  }

  async function syncNow() {
    if (!base) { onStatus('disabled'); return false; }
    const save = getSave();
    const snapshot = toSyncSnapshot(save);
    const events = readJSON(OUTBOX_KEY, []).slice(0, 500);
    onStatus('syncing');
    try {
      let response = await request('/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceID(),
          baseRevision: nonnegativeInteger(readText(REVISION_KEY), 0),
          schemaVersion: 1,
          snapshot,
          events,
        }),
      });
      if (response.status === 401) {
        const refreshed = await request('/v1/auth/web/refresh', { method: 'POST' });
        if (!refreshed.ok) { onStatus('guest'); return false; }
        response = await request('/v1/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: deviceID(),
            baseRevision: nonnegativeInteger(readText(REVISION_KEY), 0),
            schemaVersion: 1,
            snapshot,
            events,
          }),
        });
      }
      if (!response.ok) throw new Error(`sync_${response.status}`);
      const result = await response.json();
      const accepted = new Set(Array.isArray(result.acceptedEventIDs) ? result.acceptedEventIDs : []);
      writeJSON(OUTBOX_KEY, readJSON(OUTBOX_KEY, []).filter((event) => !accepted.has(event.id)));
      writeText(REVISION_KEY, String(nonnegativeInteger(result.revision, 0)));
      const merged = mergeCloudSnapshotIntoSave(save, result.snapshot);
      writeText(LAST_INK_KEY, String(nonnegativeInteger(merged.ink, 0)));
      onMerged(merged);
      onStatus('synced');
      return true;
    } catch {
      onStatus('offline');
      return false;
    }
  }

  function login(provider) {
    if (!base || !['apple', 'google'].includes(provider)) return false;
    const returnTo = `${location.origin}${location.pathname}`;
    location.assign(`${base}/v1/auth/web/start?provider=${provider}&returnTo=${encodeURIComponent(returnTo)}`);
    return true;
  }

  function link(provider) {
    if (!base || !['apple', 'google'].includes(provider)) return false;
    const returnTo = `${location.origin}${location.pathname}`;
    location.assign(`${base}/v1/auth/web/start?provider=${provider}&action=link&returnTo=${encodeURIComponent(returnTo)}`);
    return true;
  }

  async function exportAccount() {
    if (!base) return false;
    const response = await authenticatedRequest('/v1/account/export');
    if (!response.ok) return false;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `xunzhang-zhaiju-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  }

  async function deleteAccount() {
    if (!base) return false;
    const response = await authenticatedRequest('/v1/account', {
      method: 'DELETE',
      headers: { 'X-Confirm-Delete': 'DELETE' },
    });
    if (!response.ok) return false;
    clearSyncMetadata();
    onStatus('guest');
    return true;
  }

  async function logout() {
    if (!base) return false;
    const response = await authenticatedRequest('/v1/auth/logout', { method: 'POST' });
    if (!response.ok) return false;
    clearSyncMetadata();
    onStatus('guest');
    return true;
  }

  function flushToOutbox() {
    if (!base) return;
    if (timer) clearTimeout(timer);
    timer = null;
    queueSnapshot(getSave());
  }

  async function authenticatedRequest(path, init = {}) {
    let response = await request(path, init);
    if (response.status !== 401) return response;
    const refreshed = await request('/v1/auth/web/refresh', { method: 'POST' });
    if (!refreshed.ok) return response;
    return request(path, init);
  }

  function request(path, init = {}) {
    return fetchImpl(`${base}${path}`, { ...init, credentials: 'include' });
  }

  return { enabled: !!base, schedule, syncNow, login, link, logout, exportAccount, deleteAccount, flushToOutbox };
}

export function toSyncSnapshot(save = {}) {
  const levels = {};
  for (const [id, value] of Object.entries(save.levels || {})) {
    if (!/^\d{1,3}$/.test(id) || !value || typeof value !== 'object') continue;
    levels[id] = {
      stars: Math.min(3, nonnegativeInteger(value.stars, 0)),
      found: uniqueStrings(value.found),
    };
  }
  const retention = save.retention && typeof save.retention === 'object' ? save.retention : {};
  return {
    v: 1,
    levels,
    ink: nonnegativeInteger(save.ink, 0),
    collection: uniqueStrings(save.collection),
    daily: toDaily(retention.daily),
    mastery: toMastery(retention.mastery),
    wrongBook: uniqueStrings(retention.wrongBook),
    streak: toStreak(retention.streak),
    activeRun: null,
    levelStats: toLevelStats(retention.levelStats),
    activity: null,
    world: toWorld(save.world, retention.treasures),
  };
}

export function mergeCloudSnapshotIntoSave(save, cloud) {
  if (!cloud || typeof cloud !== 'object' || cloud.v !== 1) return save;
  const merged = structuredClone(save);
  merged.levels ||= {};
  for (const [id, value] of Object.entries(cloud.levels || {})) {
    if (!value || typeof value !== 'object') continue;
    const previous = merged.levels[id] || { stars: 0, found: [], badges: [], best: {} };
    merged.levels[id] = {
      ...previous,
      stars: Math.max(nonnegativeInteger(previous.stars, 0), nonnegativeInteger(value.stars, 0)),
      found: union(previous.found, value.found),
    };
  }
  merged.ink = nonnegativeInteger(cloud.ink, nonnegativeInteger(merged.ink, 0));
  merged.collection = union(merged.collection, cloud.collection);
  merged.retention ||= {};
  merged.retention.mastery = fromMastery(merged.retention.mastery, cloud.mastery);
  merged.retention.wrongBook = uniqueStrings(cloud.wrongBook);
  merged.retention.streak = fromStreak(merged.retention.streak, cloud.streak);
  merged.retention.levelStats = fromLevelStats(merged.retention.levelStats, cloud.levelStats);
  merged.world = fromWorld(merged.world, merged.retention, cloud.world);
  return merged;
}

function queueSnapshot(save) {
  const snapshot = toSyncSnapshot(save);
  const previousInk = nonnegativeInteger(readText(LAST_INK_KEY), snapshot.ink);
  const inkDelta = snapshot.ink - previousInk;
  writeText(LAST_INK_KEY, String(snapshot.ink));
  const sequence = nonnegativeInteger(readText(SEQUENCE_KEY), 0) + 1;
  writeText(SEQUENCE_KEY, String(sequence));
  const outbox = readJSON(OUTBOX_KEY, []);
  outbox.push({
    id: crypto.randomUUID(),
    sequence,
    kind: 'progressUpdated',
    inkDelta,
    payload: snapshot,
    occurredAt: new Date().toISOString(),
  });
  writeJSON(OUTBOX_KEY, outbox.slice(-500));
}

function toDaily(value) {
  if (!value || typeof value !== 'object' || typeof value.dateKey !== 'string') return null;
  const quick = value.quickChallenge?.best;
  return {
    dateKey: value.dateKey,
    quizAnswered: 0,
    quizCorrect: 0,
    rewardedPhraseIDs: uniqueStrings(value.quizRewardedPhraseIds),
    completedLevelIDs: [],
    foundPhraseIDs: [],
    completedDateKey: typeof value.completedAt === 'string' ? value.completedAt.slice(0, 10) : null,
    quickBest: quick ? {
      score: nonnegativeInteger(quick.score, 0),
      durationMilliseconds: nonnegativeInteger(quick.durationMs, 0),
    } : null,
  };
}

function toMastery(value) {
  const result = {};
  for (const [id, item] of Object.entries(value || {})) {
    if (!item || typeof item !== 'object') continue;
    result[id] = {
      answered: nonnegativeInteger(item.answered, 0),
      correct: nonnegativeInteger(item.correct, 0),
      wrong: nonnegativeInteger(item.wrong, 0),
      correctStreak: nonnegativeInteger(item.correctStreak, 0),
      fillCorrect: nonnegativeInteger(item.fillCorrect, 0),
      mastered: !!item.mastered,
      lastAnsweredDateKey: dateKey(item.lastAnsweredAt),
      nextReviewDateKey: dateKey(item.nextReviewAt),
    };
  }
  return result;
}

function toStreak(value = {}) {
  return {
    current: nonnegativeInteger(value.current, 0),
    best: nonnegativeInteger(value.best, 0),
    lastCompletedDateKey: dateKey(value.lastCompletedDate),
    makeups: nonnegativeInteger(value.makeups, 0),
    makeupRefillDateKey: dateKey(value.makeupRefillDate),
  };
}

function toLevelStats(value) {
  const result = {};
  for (const [id, item] of Object.entries(value || {})) {
    if (!item || typeof item !== 'object') continue;
    result[id] = {
      attempts: nonnegativeInteger(item.attempts, 0),
      completions: nonnegativeInteger(item.completions, 0),
      bestStars: Math.min(3, nonnegativeInteger(item.bestStars, 0)),
      fewestMistakes: item.fewestMistakes == null ? null : nonnegativeInteger(item.fewestMistakes, 0),
      modesCleared: uniqueStrings(item.modesCleared),
      badges: uniqueStrings(item.badges),
    };
  }
  return result;
}

function toWorld(world = {}, treasures = {}) {
  const mappedTreasures = {};
  for (const [id, item] of Object.entries(world.treasureProgress || {})) {
    mappedTreasures[id] = mergeTreasureProgress(mappedTreasures[id], item);
  }
  for (const id of uniqueStrings(world.treasures)) {
    mappedTreasures[id] = mergeTreasureProgress(mappedTreasures[id], { complete: true });
  }
  for (const [id, item] of Object.entries(treasures || {})) {
    mappedTreasures[id] = mergeTreasureProgress(mappedTreasures[id], {
      sources: uniqueStrings(item?.sources),
      complete: uniqueStrings(item?.sources).length >= nonnegativeInteger(item?.maxFragments, 10),
    });
  }
  return {
    eventsSeen: uniqueStrings(world.eventsSeen),
    loreUnlocked: uniqueStrings(world.loreUnlocked),
    treasures: mappedTreasures,
    effects: numericMap(world.bonuses),
    hiddenEnding: normalizeHiddenEnding(world.hiddenEnding),
  };
}

function fromMastery(current = {}, cloud = {}) {
  const result = { ...current };
  for (const [id, item] of Object.entries(cloud || {})) {
    result[id] = {
      ...(result[id] || {}),
      answered: nonnegativeInteger(item?.answered, 0),
      correct: nonnegativeInteger(item?.correct, 0),
      wrong: nonnegativeInteger(item?.wrong, 0),
      correctStreak: nonnegativeInteger(item?.correctStreak, 0),
      fillCorrect: nonnegativeInteger(item?.fillCorrect, 0),
      mastered: !!item?.mastered,
      lastAnsweredAt: item?.lastAnsweredDateKey || null,
      nextReviewAt: item?.nextReviewDateKey || null,
    };
  }
  return result;
}

function fromStreak(current = {}, cloud) {
  if (!cloud || typeof cloud !== 'object') return current;
  return {
    ...current,
    current: nonnegativeInteger(cloud.current, 0),
    best: nonnegativeInteger(cloud.best, 0),
    makeups: nonnegativeInteger(cloud.makeups, 0),
    lastCompletedDate: cloud.lastCompletedDateKey || null,
    makeupRefillDate: cloud.makeupRefillDateKey || null,
  };
}

function fromLevelStats(current = {}, cloud = {}) {
  const result = { ...current };
  for (const [id, item] of Object.entries(cloud || {})) {
    result[id] = {
      ...(result[id] || {}),
      attempts: nonnegativeInteger(item?.attempts, 0),
      completions: nonnegativeInteger(item?.completions, 0),
      bestStars: nonnegativeInteger(item?.bestStars, 0),
      fewestMistakes: item?.fewestMistakes ?? null,
      modesCleared: uniqueStrings(item?.modesCleared),
      badges: uniqueStrings(item?.badges),
    };
  }
  return result;
}

function fromWorld(current = {}, retention, cloud) {
  if (!cloud || typeof cloud !== 'object') return current;
  retention.treasures ||= {};
  const treasureProgress = { ...(current.treasureProgress || {}) };
  for (const [id, item] of Object.entries(cloud.treasures || {})) {
    if (Object.hasOwn(TREASURE_PASSIVES, id)) {
      retention.treasures[id] = {
        ...(retention.treasures[id] || { name: id, maxFragments: 10, firstObtainedAt: null }),
        sources: union(retention.treasures[id]?.sources, item?.sources),
      };
    } else {
      treasureProgress[id] = mergeTreasureProgress(
        treasureProgress[id],
        { ...item, sources: union(retention.treasures[id]?.sources, item?.sources) },
      );
      delete retention.treasures[id];
    }
  }
  const localEnding = normalizeHiddenEnding(current.hiddenEnding);
  const cloudEnding = normalizeHiddenEnding(cloud.hiddenEnding);
  const hiddenEnding = !localEnding || (cloudEnding?.answeredAt || 0) >= localEnding.answeredAt
    ? cloudEnding
    : localEnding;
  return {
    ...current,
    eventsSeen: union(current.eventsSeen, cloud.eventsSeen),
    loreUnlocked: union(current.loreUnlocked, cloud.loreUnlocked),
    treasures: union(current.treasures, Object.entries(cloud.treasures || {}).filter(([, item]) => item?.complete).map(([id]) => id)),
    treasureProgress,
    bonuses: { ...(current.bonuses || {}), ...numericMap(cloud.effects) },
    hiddenEnding,
  };
}

function mergeTreasureProgress(previous = {}, incoming = {}) {
  return {
    sources: union(previous?.sources, incoming?.sources),
    complete: !!previous?.complete || !!incoming?.complete,
  };
}

function normalizeHiddenEnding(value) {
  if (!value || typeof value !== 'object' || !['people', 'single'].includes(value.choice)) return null;
  return {
    choice: value.choice,
    answeredAt: nonnegativeInteger(value.answeredAt, 0),
  };
}

function normalizeBaseURL(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.hostname.includes('example')) return '';
    return url.origin;
  } catch { return ''; }
}

function deviceID() {
  let value = readText(DEVICE_KEY);
  if (!value) { value = crypto.randomUUID(); writeText(DEVICE_KEY, value); }
  return value;
}

function clearSyncMetadata() {
  for (const key of [REVISION_KEY, SEQUENCE_KEY, OUTBOX_KEY, LAST_INK_KEY]) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }
}

function uniqueStrings(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === 'string' && item).map((item) => item.slice(0, 128)))];
}

function union(left, right) { return uniqueStrings([...(left || []), ...(right || [])]); }
function nonnegativeInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}
function dateKey(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null; }
function numericMap(value) {
  const result = {};
  for (const [key, item] of Object.entries(value || {})) {
    if (Number.isFinite(Number(item))) result[key] = nonnegativeInteger(item, 0);
  }
  return result;
}
function readText(key) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
function writeText(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(key, value) { writeText(key, JSON.stringify(value)); }
