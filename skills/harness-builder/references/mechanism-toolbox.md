# 機關工具箱：落點分類與實現模板

「這條規則該落在哪」是 harness 設計最常見的決策。本表按需求分類，
每類給出落點選項與選擇依據。落點永遠依目標工程的工具鏈重選——
Claude Code 的 hook 事件名不等於其他 agent 平台的，但角色是通用的
（各平台事件名/格式對照見 [platform-hooks.md](platform-hooks.md)）。

## 兩個先於落點的座標系

**強制力階梯**——任何規則都要聲明自己在階梯上的位置與升級計畫：

```
散文規則（CLAUDE.md/skill 文字）
  → 時機點注入（hook 提醒，可忽略）
  → 記帳（ledger/事件帳本，可審計）
  → warn + 記帳（累積誤報數據）
  → deny + 顯式逃生 + 逃生記帳（機關完成態）
```

停在 warn 超過既定期限（如兩週）而不升 deny 的，本身視為架構債登記進 inbox。
這個階梯同時是新機關的安全上線路徑：先 warn 收數據再升 deny，避免誤攔癱瘓流程。

**防線分層 L0/L1/L2**——同一條硬 gate 要聲明目標層級：

| 層 | 落點 | 覆蓋 | 職責 |
|---|---|---|---|
| L0 | agent hook | agent 在場的 tool call | 引導 + 快速失敗（skill 注入、就地 deny、收環提醒） |
| L1 | git hook（core.hooksPath pre-push） | 人手 terminal、任何本地 push | 兜底：重跑硬 gate |
| L2 | CI | 平台側最終防線（含網頁 merge） | 兜底：重跑硬 gate |

三層不互相取代；gate 邏輯單一來源（都調用同一個可信集入口腳本，不在任何層
複製檢查邏輯）。只做 L0 的 gate 要顯式留「L1/L2 待補」的帳，不允許默認
「agent 一定在場」。

## 落點總表

| 需求 | 落點 | 強制等級 | 備註 |
|---|---|---|---|
| 動作發生前攔截（寫禁區、危險命令） | PreToolUse hook deny | hard | 安全類 gate 首選 |
| 「聲稱完成」攔截 | Stop hook block-once + commit deny | block-once / hard | 雙保險：Stop 軟、commit 硬 |
| 進 git 前攔截 | hook 對 `git commit` deny，或 git pre-commit/pre-push hook | hard | git hooks 兼防非 agent 路徑 |
| 進 prod 前攔截 | 部署腳本內建 preflight（exit 1） | hard | 攔截邏輯放腳本內，不放外部說明 |
| 上下文注入（提醒該讀什麼） | SessionStart / UserPromptSubmit / PreToolUse 注入 | advisory | 只加 context，絕不代做動作 |
| 知識回流收集 | Stop 反思 gate → inbox 檔案 | block-once | 信號驅動，無信號不打擾 |
| 債務記帳 | ledger 檔（JSON）+ ratchet 腳本 | hard（schema） | 見下方 schema 模板 |
| 事件審計 | JSONL 帳本 + 週報聚合 | 被動 | 逃生路徑自動寫入 |
| 結構一致性不變量 | live check 腳本（catalog ↔ 檔案 ↔ 佈線三方一致） | hard（exit 1） | 進 harness 可信集 |
| 趨勢觀測 | 儀表板腳本 → repo 內週報 | 被動 | 必須有消費協議 |
| 非 agent 路徑 | git hooks（core.hooksPath）+ CI 跑同一套可信集 | hard | 與 agent 路徑共用可信集，不要兩套 |

## Hook 事件模型（平台無關的角色抽象）

任何 agent 平台的 hook 體系都可以映射到這六個角色；移植時逐一找對應事件：

1. **session 開始/恢復**：重置 per-session 狀態；注入未完成事項（handoff、
   工單、inbox 積壓、例行事項）——這是「發牌」時機。
2. **用戶輸入提交**:按任務域路由該載入的 skill/規則。
3. **工具使用前**：deny 危險動作；按檔案路徑注入領域規則。
4. **工具使用後**：記帳（哪些模組被編輯、哪些驗證跑過）——這是 ledger 的資料源。
5. **子代理啟停**：子代理繼承同樣的注入；SubagentStop 同樣過驗證 gate。
6. **session 結束（Stop）**：閉環驗證 gate + 反思 gate。

**多平台共用**：如果工程同時用多個 agent 工具（如 Claude Code + Codex），
hook 邏輯寫成單一腳本、兩邊佈線調用同一入口。任何新 gate 上線時檢查兩邊
事件都接了——單邊佈線的 gate 是漏攔源。

## 債務 ledger schema 模板

```json
{
  "version": 1,
  "module": "<模組名>",
  "trusted_suite": "<一鍵可信集命令>",
  "iteration_hint": "<窄跑命令>（迭代用，不算收環）",
  "known_failures": {
    "<套件>": [
      {
        "pattern": "<測試名 regex>",
        "class": "outdated | env-dependent | unclassified",
        "reason": "<一句話，含判讀依據>",
        "registered": "YYYY-MM-DD",
        "debt_doc": "<詳細登記文檔路徑>"
      }
    ]
  },
  "critical_paths": [
    { "glob": "<高價值路徑>", "required_spec": "<對應測試>", "reason": "<為什麼關鍵>" }
  ]
}
```

ratchet 腳本強制的不變量：
- schema 欄位齊全才收（缺 reason/registered → fail）。
- 新增條目的 registered 必須是當日（禁止事後補登舊帳，逼出「當下歸因」）。
- 總數不許超過基準，除非當日登記（債務只許降）。
- `class` 是償還環的分流依據：outdated → 改測試；env-dependent → 環境改造
  （如 sqlite/nil-guard）；unclassified → 人工判讀優先。

**消費規則**：可信集腳本與儀表板都從 ledger 讀 skip 清單——ledger 是唯一事實
來源，禁止在腳本裡另外手改 skip 清單（兩處清單必然漂移）。

## 事件帳本模板

一行一事件的 JSONL，欄位保持最少：

```jsonl
{"ts":"...","event":"commit-deny","module":"server","detail":"pending verification"}
{"ts":"...","event":"verify-skip","module":"server","reason":"<用戶給的逃生原因>"}
{"ts":"...","event":"review-passed","module":".claude","detail":"code-review 收斂"}
```

要點：逃生路徑**自動**寫帳本（不依賴自報）；本機帳本是原始流水，週報聚合值
落 repo 才是可信數據；「review 通過」這類正面證據也走帳本（gate 檢查證據
存在性，而不是相信 agent 的口頭聲稱——口頭聲稱可被 commit message 偽造）。

## 一鍵可信集模板

```bash
#!/bin/bash
# harness 自身的可信集。改任何機關後，收環驗證 = 跑這一條。
set -euo pipefail
cd "$(dirname "$0")/../.."

node --test <所有機關測試檔>          # 全部機關單測
node <live 一致性檢查腳本>            # catalog ↔ 檔案 ↔ 佈線不變量
for ledger in <各模組 ledger 路徑>; do  # 債務 ratchet
  [ -f "$ledger" ] && node <ratchet 腳本> "$ledger"
done
echo "✔ harness 可信集通過"
```

## 週報消費協議模板

儀表板產出後**同一 session 必須消費**（只產報告不行動等於沒裝儀表）：

1. 找惡化趨勢（債務升、bypass 升、偏差新增、吞吐歸零）。
2. 逐項歸因並轉動作（三選一）：新事故模式 → 立 gate 或開工單；既有 gate
   失效 → 當場修；債務類 → 按 class 開清債工單。
3. 無惡化 → 週報尾追加一行「本週綠，無行動」（顯式記錄，不是沉默跳過）。
4. 動作落地後 commit；改 harness 本身也走完整收環（跑 harness 可信集）。

## 工單格式（把設計與施工解耦）

harness 補強常由便宜模型/子代理施工，工單格式決定施工質量：

- 每張自帶：目標、**設計決策（已定案，執行者不重新設計）**、驗收標準、測試要求。
- 一張工單 = 一個獨立 session，完成 = 驗收全過 + 可信集綠 + commit/push。
- 執行者遇規格與現實衝突：停下登記，不自行改設計。
- status 欄位收帳：`done(<證據>)`——證據是檔案路徑/commit，不是「已完成」三個字。
