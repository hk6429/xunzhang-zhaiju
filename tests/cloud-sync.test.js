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

test('best level duration round-trips between web and native sync', async () => {
  const { mergeCloudSnapshotIntoSave, toSyncSnapshot } = await import('../js/cloud-sync.js');
  const snapshot = toSyncSnapshot({
    v: 1,
    levels: {},
    ink: 0,
    collection: [],
    retention: {
      levelStats: {
        1: { attempts: 2, completions: 1, bestStars: 3, bestDurationMs: 18_000 },
      },
    },
  });

  assert.equal(snapshot.levelStats['1'].bestDurationMs, 18_000);

  const merged = mergeCloudSnapshotIntoSave(
    { v: 1, levels: {}, ink: 0, collection: [], retention: { levelStats: {} } },
    snapshot,
  );
  assert.equal(merged.retention.levelStats['1'].bestDurationMs, 18_000);
});

test('hidden ending answer crosses web and native sync without losing the newer choice', async () => {
  const { mergeCloudSnapshotIntoSave, toSyncSnapshot } = await import('../js/cloud-sync.js');
  const snapshot = toSyncSnapshot({
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    retention: {},
    world: { hiddenEnding: { choice: 'people', answeredAt: 200 } },
  });
  assert.deepEqual(snapshot.world.hiddenEnding, { choice: 'people', answeredAt: 200 });

  const local = {
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    retention: {},
    world: { hiddenEnding: { choice: 'single', answeredAt: 100 } },
  };
  const merged = mergeCloudSnapshotIntoSave(local, snapshot);
  assert.deepEqual(merged.world.hiddenEnding, { choice: 'people', answeredAt: 200 });
});

test('web story treasures are included as complete in the native sync shape', async () => {
  const { toSyncSnapshot } = await import('../js/cloud-sync.js');
  const snapshot = toSyncSnapshot({
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    retention: {},
    world: { treasures: ['dashen-bian'] },
  });

  assert.deepEqual(snapshot.world.treasures['dashen-bian'], { sources: [], complete: true });
});

test('native story treasure fragments round-trip without entering the passive treasure store', async () => {
  const { mergeCloudSnapshotIntoSave, toSyncSnapshot } = await import('../js/cloud-sync.js');
  const local = {
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    retention: {
      treasures: {
        // 舊版同步曾把新版法寶誤放在被動法寶區；合併時應一併搬回正確位置。
        'dashen-bian': { name: '打神鞭', maxFragments: 10, sources: ['legacy:web'] },
      },
    },
    world: { treasures: [] },
  };
  const cloud = {
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    world: {
      treasures: {
        'dashen-bian': { sources: ['level:4'], complete: false },
      },
    },
  };

  const merged = mergeCloudSnapshotIntoSave(local, cloud);
  assert.deepEqual(merged.world.treasures, []);
  assert.deepEqual(merged.world.treasureProgress['dashen-bian'], {
    sources: ['legacy:web', 'level:4'], complete: false,
  });
  assert.equal(Object.hasOwn(merged.retention.treasures, 'dashen-bian'), false);
  assert.deepEqual(toSyncSnapshot(merged).world.treasures['dashen-bian'], {
    sources: ['legacy:web', 'level:4'], complete: false,
  });
});

test('native completed story treasure remains complete after a web save round-trip', async () => {
  const { mergeCloudSnapshotIntoSave, toSyncSnapshot } = await import('../js/cloud-sync.js');
  const local = {
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    retention: {},
    world: {
      treasures: [],
      treasureProgress: { 'dashen-bian': { sources: ['level:4'], complete: false } },
    },
  };
  const cloud = {
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    world: {
      treasures: {
        'dashen-bian': { sources: ['level:4', 'event:whip'], complete: true },
      },
    },
  };

  const merged = mergeCloudSnapshotIntoSave(local, cloud);
  assert.deepEqual(merged.world.treasures, ['dashen-bian']);
  assert.deepEqual(toSyncSnapshot(merged).world.treasures['dashen-bian'], {
    sources: ['level:4', 'event:whip'], complete: true,
  });
});

test('legacy passive treasures still merge into retention and use their fragment threshold', async () => {
  const { mergeCloudSnapshotIntoSave, toSyncSnapshot } = await import('../js/cloud-sync.js');
  const local = {
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    retention: {
      treasures: {
        zhenzhi_shard: { name: '青玉鎮紙', maxFragments: 2, sources: ['chapter:1'] },
      },
    },
    world: { treasures: [] },
  };
  const cloud = {
    v: 1,
    levels: {},
    ink: 3,
    collection: [],
    world: {
      treasures: {
        zhenzhi_shard: { sources: ['chapter:2'], complete: true },
      },
    },
  };

  const merged = mergeCloudSnapshotIntoSave(local, cloud);
  assert.deepEqual(merged.retention.treasures.zhenzhi_shard.sources, ['chapter:1', 'chapter:2']);
  assert.equal(Object.hasOwn(merged.world.treasureProgress, 'zhenzhi_shard'), false);
  assert.deepEqual(toSyncSnapshot(merged).world.treasures.zhenzhi_shard, {
    sources: ['chapter:1', 'chapter:2'], complete: true,
  });
});
