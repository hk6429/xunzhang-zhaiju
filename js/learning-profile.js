// 學習型遊戲化：多元稱號、圖鑑再加工、每日任務與收尾摘要。

export const IDENTITY_TITLES = [
  { id: 'traveler', name: '文道旅人', test: () => true },
  { id: 'idiom-detective', name: '典故偵探', test: (s) => (s.masteredCount || 0) >= 20 },
  { id: 'proverb-ranger', name: '諺語旅人', test: (s) => (s.proverbCount || 0) >= 12 },
  { id: 'grid-artisan', name: '填字巧手', test: (s) => (s.crossWins || 0) >= 5 },
  { id: 'clear-eyed', name: '慧眼文士', test: (s) => (s.accuracy || 0) >= 0.9 && (s.answered || 0) >= 10 },
];

export function availableTitles(stats = {}) {
  return IDENTITY_TITLES.filter((title) => title.test(stats));
}

export function normalizePhrasePractice(value) {
  if (!value || typeof value !== 'object') return {};
  const out = {};
  for (const [phraseId, record] of Object.entries(value)) {
    if (!/^p\d{4}$/.test(phraseId) || !record || typeof record !== 'object') continue;
    const kind = ['example', 'situation', 'visual'].includes(record.kind) ? record.kind : 'example';
    const text = String(record.text || '').trim().slice(0, 80);
    if (!text) continue;
    out[phraseId] = { kind, text, mastered: true };
  }
  return out;
}

export function savePhrasePractice(practices, phraseId, kind, text) {
  const base = normalizePhrasePractice(practices);
  if (!/^p\d{4}$/.test(String(phraseId))) return base;
  const safeKind = ['example', 'situation', 'visual'].includes(kind) ? kind : 'example';
  const safeText = String(text || '').trim().slice(0, 80);
  if (!safeText) {
    delete base[phraseId];
    return base;
  }
  base[phraseId] = { kind: safeKind, text: safeText, mastered: true };
  return base;
}

function hashDate(dateKey) {
  return [...String(dateKey)].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 17);
}

export function dailyMissions(dateKey) {
  const pool = [
    { id: 'clear-one', label: '破解 1 關', target: 1, metric: 'levels' },
    { id: 'review-five', label: '複習答對 5 題', target: 5, metric: 'correct' },
    { id: 'find-three', label: '找到 3 句佳句', target: 3, metric: 'phrases' },
    { id: 'practice-one', label: '替 1 句寫使用情境', target: 1, metric: 'practices' },
    { id: 'no-reveal', label: '不用揭示完成 1 關', target: 1, metric: 'independent' },
  ];
  const seed = hashDate(dateKey);
  const start = seed % pool.length;
  return [0, 1, 2].map((offset) => pool[(start + offset * 2) % pool.length]);
}

export function missionStatus(missions, counters = {}) {
  return missions.map((mission) => {
    const value = Math.max(0, Math.floor(Number(counters[mission.metric]) || 0));
    return { ...mission, value, done: value >= mission.target };
  });
}

export function sessionSummary({ found = 0, mastered = 0, nextLevel = 1, favorite = '' } = {}) {
  return {
    found: Math.max(0, Math.floor(Number(found) || 0)),
    mastered: Math.max(0, Math.floor(Number(mastered) || 0)),
    nextLevel: Math.max(1, Math.min(51, Math.floor(Number(nextLevel) || 1))),
    favorite: String(favorite || '').slice(0, 12),
  };
}
