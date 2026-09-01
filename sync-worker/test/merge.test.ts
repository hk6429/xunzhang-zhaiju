import { describe, expect, it } from "vitest";
import { mergeProgress } from "../src/merge";

describe("mergeProgress", () => {
  it("unions progress and keeps best stars without duplicating collections", () => {
    const merged = mergeProgress(
      { levels: { "1": { stars: 2, found: ["p1"] } }, collection: ["p1"], ink: 4 },
      { levels: { "1": { stars: 3, found: ["p2"] } }, collection: ["p1", "p2"], ink: 2 },
    );

    expect(merged).toEqual({
      levels: { "1": { stars: 3, found: ["p1", "p2"] } },
      collection: ["p1", "p2"],
      ink: 4,
      daily: null,
    });
  });

  it("uses only the newer daily plan and preserves the stronger quick result", () => {
    const merged = mergeProgress(
      { daily: { dateKey: "2026-09-01", quizCorrect: 2, quickBest: { score: 4, durationMilliseconds: 30_000 } } },
      { daily: { dateKey: "2026-09-01", quizCorrect: 3, quickBest: { score: 4, durationMilliseconds: 20_000 } } },
    );

    expect(merged).toMatchObject({
      daily: { dateKey: "2026-09-01", quizCorrect: 3, quickBest: { score: 4, durationMilliseconds: 20_000 } },
    });
  });

  it("removes resolved phrases from the merged wrong book", () => {
    const merged = mergeProgress(
      { mastery: { p1: { correctStreak: 0 } }, wrongBook: ["p1"] },
      { mastery: { p1: { correctStreak: 2 } }, wrongBook: [] },
    );

    expect(merged).toMatchObject({ wrongBook: [] });
  });

  it("keeps lower mistake and duration records", () => {
    const merged = mergeProgress(
      { levelStats: { "1": { fewestMistakes: 4, bestDurationMs: 35_000 } }, daily: { dateKey: "2026-09-01", quickBest: { score: 3, durationMilliseconds: 12_000 } } },
      { levelStats: { "1": { fewestMistakes: 1, bestDurationMs: 28_000 } }, daily: { dateKey: "2026-09-01", quickBest: { score: 3, durationMilliseconds: 18_000 } } },
    );

    expect(merged).toMatchObject({
      levelStats: { "1": { fewestMistakes: 1, bestDurationMs: 28_000 } },
      daily: { quickBest: { score: 3, durationMilliseconds: 12_000 } },
    });
  });

  it("applies only unseen ink deltas on a conflicting revision", () => {
    const merged = mergeProgress(
      { levels: {}, collection: [], ink: 8 },
      { levels: {}, collection: [], ink: 10 },
      -3,
    );

    expect(merged).toMatchObject({ ink: 5 });
  });
});
