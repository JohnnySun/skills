import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLedger } from './gates-ratchet.mjs';

const valid = {
  version: 1,
  module: 'server',
  trusted_suite: './scripts/test-offline.sh',
  known_failures: {
    router: [
      {
        pattern: 'TestFoo_.*',
        class: 'env-dependent',
        reason: 'DB 依賴，無 tunnel panic',
        registered: '2026-07-06',
        debt_doc: 'docs/unit-test-debt.md',
      },
    ],
  },
};

test('完整 ledger 通過', () => {
  assert.deepEqual(validateLedger(valid), []);
});

test('缺 reason 的債務被拒（登記必須完整歸因）', () => {
  const bad = structuredClone(valid);
  delete bad.known_failures.router[0].reason;
  assert.ok(validateLedger(bad).some((e) => e.includes('reason')));
});

test('class 不在枚舉被拒', () => {
  const bad = structuredClone(valid);
  bad.known_failures.router[0].class = 'flaky';
  assert.ok(validateLedger(bad).some((e) => e.includes('枚舉')));
});

test('registered 格式錯誤被拒', () => {
  const bad = structuredClone(valid);
  bad.known_failures.router[0].registered = '07/06/2026';
  assert.ok(validateLedger(bad).some((e) => e.includes('YYYY-MM-DD')));
});
