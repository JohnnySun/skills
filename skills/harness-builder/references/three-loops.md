# 三環架構：generic 模板

把 harness 的閉環拆成三個時間尺度不同的環。每個環獨立可運轉，環與環之間
靠帳本交接。往新工程移植時，先問「這個工程的 X 對應什麼」，逐欄填空。

## 移植填空表

| 抽象角色 | 參考實現（範例形態） | 你的工程 |
|---|---|---|
| 可信集（單模組全量驗證） | `./scripts/test-offline.sh` / `npm test` / harness 自己的 `test-harness.sh` | ？ |
| 編輯偵測（哪些檔算 code） | hook PostToolUse 記錄 Write/Edit 的副檔名 | ？ |
| 驗證偵測（哪些命令算收環） | `go test`（無 -run）/ `npm run test\|build` / `node --test` | ？ |
| 攔截點：session 結束 | agent 平台 Stop hook `{"decision":"block"}` | ？ |
| 攔截點：進 git | hook 對 `git commit` DENY / git pre-commit hook | ？ |
| 攔截點：進 prod | deploy 腳本內建 preflight（dirty/未 push/落後 → exit 1） | ？ |
| 逃生 + 記帳 | `VERIFY_SKIP="原因"` / `DEPLOY_FORCE=1` → JSONL 帳本 | ？ |
| 債務 ledger | 各模組 `scripts/gates.json` | ？ |
| 事件帳本 | 本機 `gate-events.jsonl`（週報聚合進 repo） | ？ |
| 反思 inbox | `docs/harness/retro-inbox.md` | ？ |
| 儀表板 | `health-report --days 7 --out docs/harness/reports/<date>.md` | ？ |
| 工單登記處 | `docs/harness/work-orders-*.md` | ？ |

## 環1 — 單次改動閉環（秒~分鐘級）

**消滅的問題**：「AI 聲稱完成但沒驗證」「只跑自己新寫的測試把別的搞壞」。

```
edit(code in module M) ──arm──▶ pendingVerification[M]
verify(M 的全量可信集通過) ──clear──▶ verified
Stop 事件      ▶ 有 pending → block 一次，列出每個模組建議的驗證命令
git commit     ▶ 目標模組有 pending → DENY
                 escape: SKIP="<原因>" → 放行 + 自動落帳本 + 提醒登記偏差
債務 ledger    ▶ ratchet 檢查（schema 完整 + 新增必須當日歸因 + 總數不許超基準）
```

**設計取捨（都有血淚原因）**：
- **Stop gate 攔一次即放行**（同一波編輯不二攔、`stop_hook_active` 直通）——
  防死鎖優先於強制力。真正的硬 gate 放在 commit：代碼進 git 歷史前必須綠或顯式留帳。
- **deny 按 commit 目標模組判定**（解析 `cd <dir> &&` 與 payload cwd）：monorepo
  根目錄的 bump commit 視為涉及全部 pending，但不相干模組（如純 docs）不受牽連。
- **窄跑不算收環**：`go test -run Xxx` 是迭代工具，驗證偵測只認全量可信集。
  否則 agent 會學會用最窄的測試「洗綠」pending。
- **skip 按次不按批**：逃生一次只放行一次 commit，pending 不清除。

## 環2 — 債務償還環（日級）

**消滅的問題**：債務有帳無償還機制、測試覆蓋憑感覺補。

```
量測快照（test-health）
  ├─ 各模組債務數（ledger）與趨勢
  ├─ 高 churn × 無測試 檔案清單（git log 30d 頻次 × 測試存在性）
  ├─ prod 錯誤聚類中「無回歸測試」者（消費錯誤回流管道的輸出）
  └─ 關鍵路徑 manifest 缺口
        ↓ 加權合成
  priority queue（下一個最值得補的最小單元）

例行程序（日排程或手動）
  1. 可信集若紅 → 先走當下歸因，不在紅底上蓋新測試
  2. 取 queue 頭部「一個」單元，TDD（Red→Green）
  3. 跑該模組全量可信集
  4. commit（固定 prefix 便於統計吞吐）；償還了 ledger 債務 → 同 commit 縮減清單
  5. 運行記錄落 repo
```

**關鍵路徑 manifest**（前端/測試真空區的破局點）：不追求鋪面覆蓋，先在 ledger
裡宣告「錢和數據流經的路徑」：

```json
"critical_paths": [
  { "glob": "src/pages/pay/**", "required_spec": "tests/pay-flow.spec.js", "reason": "計費" }
]
```

- hook：編輯命中 glob → 驗證要求升格為「必須跑 required_spec 所在套件」。
- required_spec 還不存在的條目 = 隊列高優先單元（清單先行，覆蓋跟上）。
- manifest 條目只許增不許刪（刪除需偏差登記）——這就是 ratchet 應用在覆蓋面上。

**預算紀律**：便宜模型、單次 token 上限、單拍一個單元。

## 環3 — 規則進化環（週級，框架的框架）

**消滅的問題**：retro 產出是文字建議而非機關、同類事故重複發生。

週報必含指標（全部來自帳本，不來自印象）：

| 指標 | 來源 | 期望方向 |
|---|---|---|
| 債務數 per module | ledger | ↓ |
| gate bypass 次數 | 事件帳本 | ↓→0 |
| 償還吞吐（本期單元數） | commit prefix 統計 | 穩定 >0 |
| 逃逸缺陷（prod 錯誤命中近 14d 改動區域） | 錯誤回流 × git log | ↓ |
| inbox 積壓（status:new 條目數） | inbox | 不持續上升 |

**規則進化協議**：同類逃逸缺陷一期內 ≥2 次 → 開工單把它機關化（新 hook 規則 /
新 lint / 新 eval），機關變更必須自帶測試。**retro 的合法產出只有三種**：
機關變更工單、ratchet 收緊、明確記錄的「不處理+原因」。散文建議不是合法產出。

**自指監控**：框架的完善速度本身是環3的被觀測對象——連續兩週償還吞吐為 0，
週報要把「償還環停擺」本身列為逃逸缺陷開工單。

## 回流層的收集端：反思 gate

環3 的原料收集不能依賴人腦在場。參考實現（可整體移植的設計）：

- harness 在 session 內**機械式累積反思信號**：commit deny 發生過、bypass 用過、
  Stop 被 block 過、harness 自身檔案被改過。
- Stop 時若有信號且本 session 未反思過 → 攔一次，要求把「本 session 暴露的
  harness 問題」按固定格式追加到 inbox（或明確聲明無發現）。
- inbox 條目格式：`signal（deny/bypass/誤射/漏攔/流程摩擦）/ 現象（可复現）/
  提案（建議的機關化修法）/ status（new | converted(<指向>) | rejected(<原因>)）`。
- 條目只增不刪，處理完改 status——inbox 同時是隊列和決策記錄。

## 搭建順序（新工程）

依賴關係決定順序，每步獨立有價值，做到哪步都不白做：

1. 可信集（沒有它 gate 無物可強制）
2. 環1 的 edit→verify ledger + Stop/commit gate
3. 帳本三件套（債務 ledger + 事件帳本 + 反思 inbox）
4. 環3 輕量版（週報腳本 + 人肉 retro）
5. 環2（等量測數據累積後上償還隊列）
6. 非 agent 路徑補防（git hooks / CI 跑同一套可信集）——hook 只攔 agent，
   這步之前「機關不靠自覺」實際上是「機關只靠 agent 在場」
