# Harness Scaffold（機關骨架）

harness-builder skill 講方法論，這裡是可以直接落地的最小施工件——環1
（單次改動閉環）的完整實現 + 帳本模板。新工程照下面五步接線，第一天就有
「聲稱完成攔截 + commit 硬 gate + 逃生記帳」。

## 內容

| 檔案 | 角色 |
|---|---|
| `hook-router.mjs` | 平台無關的 hook 核心：edit→arm、verify→clear、Stop block-once、commit deny + 逃生記帳 |
| `hook-router.test.mjs` | router 的可信集（12 案例，含「提及≠執行」「逃生按次」「防死鎖」正反對照） |
| `gates-ratchet.mjs` (+test) | 債務 ledger schema 檢查骨架 |
| `test-harness.sh` | harness 自己的一鍵可信集 |
| `wiring/` | Claude Code / Codex 兩平台的佈線範例（其他平台見 harness-builder 的 platform-hooks.md） |
| `docs-templates/` | 反思 inbox / 工單 / 偏差登記 / 債務 ledger 的空白模板 + `gitattributes.example`（多人協作 union merge 佈線） |

## 接線五步

1. 拷貝：`hook-router.mjs` 等腳本放 `<repo>/scripts/`（或你的機關目錄），
   `docs-templates/*` 放 `<repo>/docs/harness/`。
2. 改配置：`hook-router.mjs` 頂部的 `config`——code 副檔名、模組映射、
   **你的工程的全量可信集命令**（這一步最重要：沒有可信集，gate 無物可強制）。
3. 佈線：按 `wiring/` 範例接進 agent 平台設定。跨平台差異（事件名、
   deny 欄位、Codex trust 機制）**必讀** harness-builder 的
   `references/platform-hooks.md` §6 靜默失效陷阱。
4. 驗證接線：`bash test-harness.sh` 全綠後，**實測一次真的觸發**——改一個
   code 檔不跑測試就結束 session，確認被攔（四家平台寫錯都靜默，唯一可靠
   驗證是實測）。
5. 逐步升級：照 harness-builder 工作流 B 的順序補環3（週報）、環2（償還
   隊列）、L1/L2 兜底（git hooks / CI 調用同一個可信集入口）。

## 修改紀律

改任何機關 = 先在對應 `.test.mjs` 加失敗測試（用真實誤射樣本），再改實現，
再跑 `test-harness.sh` 全量。日常運轉照 harness-operate skill 的七步節拍。
