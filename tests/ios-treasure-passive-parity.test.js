import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { TREASURE_PASSIVES } from '../js/treasure-passives.js';

const swiftSource = readFileSync(
  new URL('../ios/XunZhangZhaiJu/GameEngine/TreasurePassiveEngine.swift', import.meta.url),
  'utf8',
);

test('SwiftUI 十章法寶被動與 Web catalog 的 ID、效果及數值一致', () => {
  const swiftIDs = [...swiftSource.matchAll(/id: "([^"]+_shard)"/g)].map((match) => match[1]);
  assert.deepEqual(swiftIDs.toSorted(), Object.keys(TREASURE_PASSIVES).toSorted());

  for (const [id, passive] of Object.entries(TREASURE_PASSIVES)) {
    const escapedID = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = swiftSource.match(new RegExp(
      `TreasurePassive\\(\\s*id: "${escapedID}"[\\s\\S]*?\\n\\s*\\),`,
    ))?.[0];
    assert.ok(block, `Swift catalog 缺少 ${id}`);
    assert.match(block, new RegExp(`effect: \\.${passive.effect},`));
    assert.match(block, new RegExp(`value: ${passive.value},`));
  }
});
