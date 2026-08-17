// js/collection.js — 摘句收藏（零 DOM、零 fetch、零外部依賴）
// 介面凍結於 docs/SCHEMA.md。

export function createCollection(savedIds = []) {
  const ids = [];
  const seen = new Set();
  for (const id of Array.isArray(savedIds) ? savedIds : []) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return {
    add(phraseId) {
      if (seen.has(phraseId)) return; // 冪等
      seen.add(phraseId);
      ids.push(phraseId);
    },
    has(phraseId) {
      return seen.has(phraseId);
    },
    list() {
      return ids.slice(); // 依加入順序，回傳副本
    },
    serialize() {
      return ids.slice(); // 副本：外部改動不影響內部狀態
    },
  };
}
