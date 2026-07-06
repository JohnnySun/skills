#!/usr/bin/env node
// 債務 ledger 的 ratchet 檢查骨架：schema 完整性 + 只進不退。
// 用法：node gates-ratchet.mjs <path/to/gates.json>
// 進 harness 可信集（test-harness.sh）跑，違規 exit 1。
//
// 骨架只做 schema 檢查；「新增條目 registered 必須是當日」與「總數不超基準」
// 需要對照 git HEAD 版本，接好 git 後把 TODO 打開（參考 harness-builder
// references/mechanism-toolbox.md 的 ledger 章節）。

import fs from 'node:fs';

const VALID_CLASSES = new Set(['outdated', 'env-dependent', 'unclassified']);
const REQUIRED_ENTRY_FIELDS = ['pattern', 'class', 'reason', 'registered', 'debt_doc'];

export function validateLedger(ledger) {
  const errors = [];
  for (const field of ['version', 'module', 'trusted_suite']) {
    if (!ledger[field]) errors.push(`缺頂層欄位 ${field}`);
  }
  const failures = ledger.known_failures || {};
  for (const [suite, entries] of Object.entries(failures)) {
    if (!Array.isArray(entries)) {
      errors.push(`known_failures.${suite} 不是陣列`);
      continue;
    }
    entries.forEach((e, i) => {
      for (const f of REQUIRED_ENTRY_FIELDS) {
        if (!e[f]) errors.push(`${suite}[${i}] 缺 ${f}（債務必須完整歸因才准登記）`);
      }
      if (e.class && !VALID_CLASSES.has(e.class)) {
        errors.push(`${suite}[${i}] class "${e.class}" 不在枚舉 ${[...VALID_CLASSES]}`);
      }
      if (e.registered && !/^\d{4}-\d{2}-\d{2}$/.test(e.registered)) {
        errors.push(`${suite}[${i}] registered 格式須為 YYYY-MM-DD`);
      }
    });
  }
  // TODO(接 git 後啟用)：
  // 1. 對照 `git show HEAD:<ledger>`：新增條目的 registered 必須是今天
  //    （禁止考古補登，逼出「當下歸因」——公理 6）。
  // 2. 總條目數不得超過 HEAD 基準，除非新增均為當日登記（債務只許降）。
  return errors;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('用法: node gates-ratchet.mjs <gates.json>');
    process.exit(1);
  }
  const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validateLedger(ledger);
  if (errors.length) {
    console.error(`✗ ${file} ratchet 違規:\n  - ${errors.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`✔ gates-ratchet: ${file} schema OK`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
