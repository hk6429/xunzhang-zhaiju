function uniqueStrings(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string' && item))]
    : [];
}

function finiteInt(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function nullableMin(...values) {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0);
  return valid.length ? Math.min(...valid.map(Math.floor)) : null;
}

export function normalizeProgressSummary(value = {}) {
  const levels = {};
  if (value.levels && typeof value.levels === 'object' && !Array.isArray(value.levels)) {
    for (const [id, record] of Object.entries(value.levels)) {
      if (!/^\d+$/.test(id) || !record || typeof record !== 'object') continue;
      levels[id] = {
        stars: Math.min(3, finiteInt(record.stars)),
        found: uniqueStrings(record.found),
        badges: uniqueStrings(record.badges),
        modes: uniqueStrings(record.modes).filter((mode) => ['explore', 'standard', 'challenge'].includes(mode)),
        bestDurationMs: nullableMin(record.bestDurationMs),
        fewestMistakes: nullableMin(record.fewestMistakes),
      };
    }
  }
  const quiz = value.quizStats && typeof value.quizStats === 'object' ? value.quizStats : {};
  return {
    levels,
    collection: uniqueStrings(value.collection),
    treasures: uniqueStrings(value.treasures),
    eventsSeen: uniqueStrings(value.eventsSeen),
    chapters: Array.isArray(value.chapters)
      ? [...new Set(value.chapters.filter((id) => Number.isInteger(id) && id >= 1 && id <= 10))]
      : [],
    quizStats: { answered: finiteInt(quiz.answered), correct: finiteInt(quiz.correct) },
    ink: finiteInt(value.ink),
  };
}

export function mergeProgressSummaries(left, right, inkEvents = []) {
  const a = normalizeProgressSummary(left);
  const b = normalizeProgressSummary(right);
  const levels = {};
  for (const id of new Set([...Object.keys(a.levels), ...Object.keys(b.levels)])) {
    const x = a.levels[id] || {};
    const y = b.levels[id] || {};
    levels[id] = {
      stars: Math.max(x.stars || 0, y.stars || 0),
      found: uniqueStrings([...(x.found || []), ...(y.found || [])]),
      badges: uniqueStrings([...(x.badges || []), ...(y.badges || [])]),
      modes: uniqueStrings([...(x.modes || []), ...(y.modes || [])]),
      bestDurationMs: nullableMin(x.bestDurationMs, y.bestDurationMs),
      fewestMistakes: nullableMin(x.fewestMistakes, y.fewestMistakes),
    };
  }

  const seenEvents = new Set();
  let ink = 0;
  for (const event of inkEvents) {
    if (!event || typeof event.id !== 'string' || seenEvents.has(event.id)) continue;
    seenEvents.add(event.id);
    const amount = finiteInt(event.amount);
    if (event.kind === 'earned') ink += amount;
    if (event.kind === 'spent') ink -= amount;
  }

  return {
    levels,
    collection: uniqueStrings([...a.collection, ...b.collection]),
    treasures: uniqueStrings([...a.treasures, ...b.treasures]),
    eventsSeen: uniqueStrings([...a.eventsSeen, ...b.eventsSeen]),
    chapters: [...new Set([...a.chapters, ...b.chapters])],
    quizStats: {
      answered: a.quizStats.answered + b.quizStats.answered,
      correct: a.quizStats.correct + b.quizStats.correct,
    },
    ink: Math.max(0, ink),
  };
}
