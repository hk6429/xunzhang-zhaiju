#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.startsWith('sync-worker/node_modules/'))
  .filter((file) => !file.endsWith('package-lock.json'))
  .filter((file) => file !== 'tools/scan-secrets.mjs');

const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/u],
  ['turso-url', /\blibsql:\/\/[^\s"']+/u],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{30,}\b/u],
  ['github-token', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/u],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u],
];

const findings = [];
for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  for (const [rule, pattern] of rules) {
    if (pattern.test(content)) findings.push({ file, rule });
  }
}

if (findings.length) {
  for (const finding of findings) console.error(`疑似機密：${finding.file}（${finding.rule}）`);
  process.exitCode = 1;
} else {
  console.log(`機密掃描通過：${files.length} 個版本庫檔案未發現已知 token、私鑰或正式 Turso URL。`);
}
