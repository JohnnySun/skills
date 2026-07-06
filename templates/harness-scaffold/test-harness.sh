#!/bin/bash
# Harness 自身的一鍵可信集（公理 5）。改任何機關後，收環驗證 = 跑這一條。
# 沒有「只跑我改的那個測試」的空間——窄跑不算收環。
set -euo pipefail
cd "$(dirname "$0")"

node --test hook-router.test.mjs gates-ratchet.test.mjs

# 債務 ratchet：所有存在的 ledger 都要過 schema 檢查
for ledger in ../../*/scripts/gates.json ./docs-templates/gates.example.json; do
  [ -f "$ledger" ] && node gates-ratchet.mjs "$ledger"
done

# TODO：加 live 一致性檢查（catalog ↔ 檔案 ↔ 佈線三方一致，見 mechanism-toolbox.md）

echo ""
echo "✔ harness 可信集通過"
