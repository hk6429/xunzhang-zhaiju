// js/hints.js — 墨水提示引擎（零 DOM、零 fetch、零外部依賴）
// 介面凍結於 docs/SCHEMA.md，不得變更。

export const COSTS = { circle: 1, flash: 3, reveal: 5 };
export const EARN = { choice: 1, fill: 2 };

export function createHintEngine(savedInk = 0) {
  let ink = Number.isFinite(savedInk) && savedInk > 0 ? Math.floor(savedInk) : 0;

  return {
    getInk() {
      return ink;
    },
    earn(kind) {
      if (!Object.prototype.hasOwnProperty.call(EARN, kind)) {
        throw new Error(`invalid earn kind: ${kind}`);
      }
      ink += EARN[kind];
      return ink;
    },
    canSpend(tier) {
      if (!Object.prototype.hasOwnProperty.call(COSTS, tier)) return false;
      return ink >= COSTS[tier];
    },
    spend(tier) {
      if (!Object.prototype.hasOwnProperty.call(COSTS, tier)) return false;
      if (ink < COSTS[tier]) return false;
      ink -= COSTS[tier];
      return true;
    },
    serialize() {
      return ink;
    },
  };
}
