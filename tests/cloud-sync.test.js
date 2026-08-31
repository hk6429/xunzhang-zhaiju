const assert = require('node:assert/strict');
const test = require('node:test');

test('web save converts to v1 sync snapshot without personal writing', async () => {
  const { toSyncSnapshot } = await import('../js/cloud-sync.js');
  const snapshot = toSyncSnapshot({
    v: 1,
    levels: { 1: { stars: 2, found: ['p0001'], badges: ['swift'], best: { durationMs: 1000 } } },
    ink: 5,
    collection: ['p0001'],
    phrasePractice: { p0001: { kind: 'example', text: '這是學生自己的句子' } },
    classroom: { teamCode: 'ABCD-EFGH' },
    retention: { mastery: {}, wrongBook: [], levelStats: {}, streak: {} },
    world: {},
  });

  assert.deepEqual(snapshot.levels['1'], { stars: 2, found: ['p0001'] });
  assert.equal(JSON.stringify(snapshot).includes('學生自己的句子'), false);
  assert.equal(Object.hasOwn(snapshot, 'phrasePractice'), false);
  assert.equal(Object.hasOwn(snapshot, 'classroom'), false);
});

test('cloud merge preserves local-only fields and keeps strongest progress', async () => {
  const { mergeCloudSnapshotIntoSave } = await import('../js/cloud-sync.js');
  const local = {
    v: 1,
    levels: { 1: { stars: 3, found: ['p0001'], badges: ['swift'], best: {} } },
    ink: 2,
    collection: ['p0001'],
    phrasePractice: { p0001: { kind: 'example', text: '只留本機' } },
    retention: { mastery: {}, wrongBook: [], levelStats: {}, streak: {} },
    world: {},
  };
  const cloud = {
    v: 1,
    levels: { 1: { stars: 2, found: ['p0002'] } },
    ink: 7,
    collection: ['p0002'],
    mastery: {},
    wrongBook: [],
    streak: null,
    levelStats: {},
    world: null,
  };

  const merged = mergeCloudSnapshotIntoSave(local, cloud);

  assert.equal(merged.levels['1'].stars, 3);
  assert.deepEqual(merged.levels['1'].found, ['p0001', 'p0002']);
  assert.equal(merged.phrasePractice.p0001.text, '只留本機');
  assert.equal(merged.ink, 7);
});

test('cloud ink is authoritative so concurrent spending cannot resurrect ink', async () => {
  const { mergeCloudSnapshotIntoSave } = await import('../js/cloud-sync.js');
  const local = { v: 1, levels: {}, ink: 8, collection: [], phrasePractice: {}, retention: {}, world: {} };
  const cloud = { v: 1, levels: {}, ink: 3, collection: [] };

  assert.equal(mergeCloudSnapshotIntoSave(local, cloud).ink, 3);
});
