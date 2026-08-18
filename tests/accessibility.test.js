import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/fengshen-ink.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/accessibility.js', import.meta.url), 'utf8');

test('all interface hooks required by app logic exist exactly once', () => {
  const ids = [
    'modal-onboarding', 'btn-start-onboarding', 'btn-skip-onboarding',
    'resume-quest-card', 'btn-resume-quest', 'unfinished-quest-prompt',
    'btn-continue-unfinished', 'btn-restart-unfinished', 'chamber-details-template',
    'mobile-tabbar', 'mobile-game-controls', 'game-scene-details',
    'play-instruction-tip', 'btn-dismiss-play-tip', 'play-mode-selector',
    'class-coop-panel', 'btn-join-class-coop', 'rest-reminder',
    'session-summary-card', 'btn-end-session', 'btn-map-fullscreen', 'btn-close-map',
  ];
  for (const id of ids) {
    const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) || [];
    assert.equal(matches.length, 1, `${id} should exist exactly once`);
  }
});

test('關卡地圖提供全螢幕沉浸層、離開控制與手機安全區', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(css, /#view-map:not\(\.hidden\)[\s\S]*position:\s*fixed/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /#view-map \.world-map-shell[\s\S]*overflow:\s*auto/);
  assert.match(app, /requestMapFullscreen/);
  assert.match(app, /btn-close-map/);
  assert.match(app, /document\.fullscreenElement/);
});

test('modal surfaces expose dialog semantics and labelled titles', () => {
  for (const id of ['modal-onboarding', 'modal-card', 'modal-quiz', 'modal-timeout', 'modal-complete']) {
    const start = html.indexOf(`id="${id}"`);
    assert.notEqual(start, -1, `${id} missing`);
    const tag = html.slice(html.lastIndexOf('<div', start), html.indexOf('>', start) + 1);
    assert.match(tag, /role="dialog"/);
    assert.match(tag, /aria-modal="true"/);
    assert.match(tag, /aria-labelledby="[^"]+"/);
  }
});

test('mobile layout has safe-area, touch targets and reduced motion support', () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('單張守護立繪依 data-mood 區分動態並支援減少動畫', () => {
  for (const mood of ['thinking', 'victory', 'panic']) {
    assert.match(css, new RegExp(`fengshen-avatar-img\\[data-mood=["']${mood}["']\\]`));
    assert.match(css, new RegExp(`@keyframes\\s+companion-${mood}`));
  }
  assert.match(css, /prefers-reduced-motion:[\s\S]*fengshen-avatar-img\[data-mood\][\s\S]*animation:\s*none\s*!important/);
});

test('關卡守護角色圖片在桌機與手機皆填滿展示框', () => {
  assert.match(css, /companion-avatar-wrap[\s\S]*width:\s*100%[\s\S]*height:\s*100%/);
  assert.match(css, /companion-avatar-wrap \.fengshen-avatar-img[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*object-fit:\s*cover/);
  assert.match(css, /mask-image:\s*none/);
});

test('accessibility controller includes focus trap, escape handling and focus restoration', () => {
  assert.match(js, /event\.key !== 'Tab'/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /lastDialogOpener\.focus\(\)/);
  assert.match(js, /aria-current/);
  assert.match(js, /xzzj:play-mode-change/);
});
