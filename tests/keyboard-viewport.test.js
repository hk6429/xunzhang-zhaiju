import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizViewportMetrics } from '../js/game.js';

test('研墨填空在鍵盤開啟後採用 Visual Viewport 的可視高度與位移', () => {
  const metrics = quizViewportMetrics({
    innerHeight: 844,
    visualViewport: { height: 390, offsetTop: 18 },
  });

  assert.deepEqual(metrics, { height: 390, offsetTop: 18 });
});

test('沒有 Visual Viewport 時保留完整視窗高度，避免桌機彈窗縮小', () => {
  const metrics = quizViewportMetrics({ innerHeight: 900, visualViewport: null });

  assert.deepEqual(metrics, { height: 900, offsetTop: 0 });
});
