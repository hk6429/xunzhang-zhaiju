// 匿名班級合作：只交換最低限度的隊伍代碼與彙總成果，不含姓名、答錯紀錄或完整存檔。

const TEAM_CODE_RE = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;

function cleanTeamCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function validateTeamCode(value) {
  const code = cleanTeamCode(value);
  return TEAM_CODE_RE.test(code) ? code : null;
}

export function createTeamCode(rng = Math.random) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    const idx = Math.max(0, Math.min(alphabet.length - 1, Math.floor(rng() * alphabet.length)));
    out += alphabet[idx];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function makeContribution({ teamCode, masteredCount, chapter, updatedAt = Date.now() }) {
  const code = validateTeamCode(teamCode);
  if (!code) return null;
  const mastered = Math.max(0, Math.min(409, Math.floor(Number(masteredCount) || 0)));
  const safeChapter = Math.max(0, Math.min(10, Math.floor(Number(chapter) || 0)));
  return {
    v: 1,
    teamCode: code,
    masteredCount: mastered,
    chapter: safeChapter,
    updatedAt: Math.max(0, Math.floor(Number(updatedAt) || 0)),
  };
}

export function encodeContribution(contribution) {
  const safe = makeContribution(contribution || {});
  if (!safe) return null;
  const json = JSON.stringify(safe);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeContribution(code) {
  try {
    const binary = atob(String(code || '').trim());
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (parsed?.v !== 1) return null;
    return makeContribution(parsed);
  } catch {
    return null;
  }
}

export function mergeContributions(current, incoming) {
  const base = makeContribution(current || {});
  const next = makeContribution(incoming || {});
  if (!next) return base;
  if (!base) return next;
  if (base.teamCode !== next.teamCode) return base;
  return {
    ...base,
    masteredCount: Math.max(base.masteredCount, next.masteredCount),
    chapter: Math.max(base.chapter, next.chapter),
    updatedAt: Math.max(base.updatedAt, next.updatedAt),
  };
}

export function teamMilestone(masteredCount) {
  const count = Math.max(0, Math.floor(Number(masteredCount) || 0));
  const milestones = [50, 100, 200, 300, 409];
  const next = milestones.find((value) => value > count) || 409;
  return {
    count,
    next,
    remaining: Math.max(0, next - count),
    completed: count >= 409,
  };
}

export function makePublicAchievement({ title, totalStars, masteredCount, chapter }) {
  return {
    v: 1,
    title: String(title || '文道旅人').slice(0, 12),
    totalStars: Math.max(0, Math.min(300, Math.floor(Number(totalStars) || 0))),
    masteredCount: Math.max(0, Math.min(409, Math.floor(Number(masteredCount) || 0))),
    chapter: Math.max(0, Math.min(10, Math.floor(Number(chapter) || 0))),
  };
}
