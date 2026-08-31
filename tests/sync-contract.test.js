const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'data/fixtures/sync/progress-v1.json'), 'utf8'));
const snapshotSchema = JSON.parse(fs.readFileSync(path.join(root, 'docs/contracts/progress-snapshot-v1.schema.json'), 'utf8'));
const eventSchema = JSON.parse(fs.readFileSync(path.join(root, 'docs/contracts/progress-events-v1.schema.json'), 'utf8'));

test('sync v1 fixture has only the frozen top-level fields', () => {
  assert.equal(snapshot.v, 1);
  assert.deepEqual(Object.keys(snapshot).sort(), Object.keys(snapshotSchema.properties).sort());
  assert.equal(Object.hasOwn(snapshot, 'localPhrasePractice'), false);
  assert.equal(JSON.stringify(snapshot).includes('exampleText'), false);
});

test('event contract permits only bounded known event kinds', () => {
  const kinds = eventSchema.items.properties.kind.enum;
  assert.ok(kinds.includes('levelCompleted'));
  assert.ok(kinds.includes('guestProgressClaimed'));
  assert.equal(new Set(kinds).size, kinds.length);
  assert.equal(eventSchema.maxItems, 500);
  assert.equal(eventSchema.items.properties.inkDelta.minimum, -100000);
  assert.equal(eventSchema.items.properties.inkDelta.maximum, 100000);
  assert.equal(eventSchema.items.additionalProperties, false);
});
