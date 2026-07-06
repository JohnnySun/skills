# 完整案例走讀：一個生產環境 harness 的解剖

本文走讀一個真實生產 monorepo（後端 + 多個前端子倉 + 文檔倉 + 機關倉，
多 agent 平台共用）的 harness 全貌，關鍵識別資訊已通用化。用途：評估時當
對照組、構建時當拓撲參考。**抄拓撲不抄實現**——落點依你的工具鏈重選。

背景約束（影響設計的關鍵前提）：無線上 CI 承擔測試（後補），因此
「agent commit 前的強制 gate 就是 CI」；多台機器、兩個 agent 工具共用
同一套機關（單一 hook router 腳本，兩平台佈線指向同一入口）。

## 第一層：約束層

- 根指令檔：TDD 憲章、部署憲章（含兩類真實事故敘事：不 pull 先 deploy 的
  覆蓋事故、不 commit 先 deploy 的丟失事故）、紅測試歸因協議、UI 設計 gate
  ——每條大規則都自帶 why 與機關落點說明。
- 機關倉指令檔：治理元原則四條（機關不靠自覺 / 框架自我迭代 /
  持久層進 repo / 多平台兼容）。
- 50+ 個 skill + 一個 router skill（路由表：任務域 → 該載入的 skill），
  hook 按路徑/關鍵字注入載入建議。
- 專項規則檔（如 user-facing 訊息規範：黑名單詞表 + 翻譯練習表 + checklist）。

## 第二層：強制層（機關清單）

| 機關 | 觸發 | 強制等級 |
|---|---|---|
| 閉環驗證 gate | PostToolUse 記帳 edit/verify；Stop 時有 pending → block | block-once（防死鎖） |
| commit deny | 目標子倉有 pending verification 的 `git commit` | hard；escape `VERIFY_SKIP="原因"` + 記帳 |
| 生成目標倉寫入攔截 | 對生成部署倉的任何 AI 寫入/部署命令/push | hard deny（fail-closed，永久掃原文） |
| deploy preflight | 部署腳本內建：dirty/未 push/落後/分叉 | hard exit 1；escape `DEPLOY_FORCE=1` + 事後補帳義務 |
| 債務 ratchet | 每次跑可信集時檢查各倉 ledger | hard：schema 缺欄/非當日新增/超基準 → fail |
| live 一致性檢查 | harness 可信集內：skill catalog ↔ 路由表 ↔ 佈線三方一致、文檔根目錄白名單、orphan skill | hard exit 1 |
| i18n / log 語言 lint | 前端可信集 | 硬（i18n）+ report-mode 過渡（log 語言） |
| review 證據 gate | 實質改動（≥3 code 檔）commit 時查帳本中 review-passed 記錄 | V1 warn + 記帳（計畫升 deny） |

支撐設計：
- 一鍵可信集分層：每個子倉一條命令，harness 自己也有一條（全部機關測試
  套件 + live check + ratchet）。
- 「窄跑不算收環」：驗證偵測只認全量可信集，單測試窄跑不清 pending。
- 逃生一律顯式 + 自動記帳 + 按次生效。

## 第三層：回流層

| 管道 | 收集 | 消費 |
|---|---|---|
| 反思 inbox | Stop 反思 gate：session 內累積信號（deny/bypass/stop-block/harness 被改）→ 結束前攔一次要求登記 | SessionStart 檢查 `status: new` 數注入提醒 → 機關迭代 skill 一拍一條消費 |
| prod 錯誤回流 | 腳本聚類 prod 日誌/指標異常 → 結構化報告 | 與用戶反饋管道 triage 匯流（機器信號×用戶報障互相印證） |
| 偏差登記 | 被糾偏的 AI 當輪立即登記（歸因枚舉：描述不清/理解錯/範圍蔓延/驗收缺失） | 儀表板統計偏差率趨勢 |
| 事件帳本 | deny/bypass/review-passed 自動落 JSONL | 週報聚合進 repo |
| handoff | 未完成工作固定格式落 active 目錄 | SessionStart 提醒接續，完成移 archive |
| 工單 | 工單登記檔（目標/已定案設計/驗收/測試要求） | SessionStart 發牌（最老 top 3）；完成改 `done(<證據>)` |

## 第四層：進化層

- 頂層架構文檔本身進 repo 且是活文檔，內含三張註冊表：**帳本註冊表**
  （8 本帳各自的寫入端/消費端/節奏/閉環狀態——「✓ 閉環」只授予消費端有
  機器落點者）、**防線分層表**（L0 agent hook ✓ / L1 git hook ✗ / L2 CI ✗，
  誠實標注現狀）、**時機點模型**（引導掛在 SessionStart/PreToolUse/Stop 等
  時機點上，不靠關鍵字噴灑）。新增帳本/gate/時機點必須同步更新表。
- 每條規則按**強制力階梯**聲明位置與升級計畫；停在 warn 超兩週不升 deny
  視為架構債自動掛帳。
- 三環設計文檔（單次改動閉環/債務償還環/規則進化環）+ 工單登記處，工單帶
  已定案設計與驗收標準。
- 週報儀表板：債務趨勢、bypass 次數、偏差率、子倉 pointer 漂移、fix:feat
  比例；**消費協議**：產出的同一 session 必須逐項歸因轉動作，無惡化也要
  顯式寫「本週綠」。
- 機關迭代 skill 把「消費一條 inbox」標準化成固定節拍（選單 → 三行需求
  對齊 → 落點表 → TDD（真實樣本+正向對照）→ 全量可信集 → review → 收帳），
  任何 agent 照章執行都能安全收環。
- harness 自身測試密度：hook 測試代碼量**大於** hook 本體（約 1.85k 行 vs
  1.74k 行）；被打穿的繞過樣本（17 條）全部回歸測試釘死。

## 閉環實例：一條失敗的完整旅程

同一天內的真實鏈條，展示「失敗 → 機關」的轉換：

1. session 中 hook 對唯讀命令誤射 3 次（grep 部署腳本內容觸發部署警告、
   grep 輸出含路徑字串觸發 skill 注入等）。
2. Stop 反思 gate 攔下，agent 把現象+提案按格式寫進 inbox（signal: 誤射）。
3. 次日機關迭代 skill 消費：真實誤射命令當 fixture 寫 Red → 實作唯讀豁免
   / 引號遮罩 / 執行位置錨定 → 正向對照測試（該攔的仍攔）→ 全量可信集綠。
4. inbox 條目改 `status: converted(<機關名：當日誤射案例全部回歸測試化>)`。
5. 同週另一條（安全 gate 誤攔測試內容）走同流程但結論是 **rejected**：兩輪
   精準化方案都被對抗測試打穿，裁決「永久掃原文、寧可誤攔」，繞過樣本釘死
   成回歸測試——**拒絕也是合法產出，且留下了裁決依據**。

## 評估時的參考結論（該工程自評）

強項：環1 硬 gate 完整、harness 自身 TDD、失敗→機關轉換率高、
自我診斷能力（缺口全部由 harness 自己掃出並落 inbox）。

已知缺口（自己的 inbox 為證，說明回流層工作正常）：
- 閘後全軟：review gate 停在 warn（升級數據已累積但沒人升）、部署後觀測
  驗證零機關、週報消費是散文協議。
- 非 agent 路徑零機關：git hooks 全缺、CI 只 build 不測試——所有機關只綁
  agent hook 層。多人協作場景下此缺口從架構債躍升為致命（純 terminal
  commit / 網頁 merge 對整套 harness 免疫）。
- ~~收集端吞吐 > 消費端：inbox 積壓 19 條~~ → **已機關化**（見下）。

這三類缺口在任何工程都會以同構形式出現，評估時優先檢查。

## 缺口 → 機關的完整弧線（進化層活著的證據）

「消費端積壓」從被診斷到被治癒的全過程，發生在同一週內：

1. 完善度評估指出「收集機械、消費自願 → 積壓 19 條是排隊論必然」；
2. 方案設計時用戶反問「每天很多次 SessionStart，它本身就能替代 cron」——
   演化成 anacron 派工設計（見 three-loops.md 消費端機械化）；
3. 實作中對抗式 review 兩輪抓出 8 個 confirmed（git 預算撐爆 hook timeout、
   殭屍鎖不可回收、union 吃掉認領衝突、shell 注入…），全部修復並釘成
   回歸測試——這些教訓沉澱為 pitfalls #11-15；
4. 機關上線當天起，harness 的改進隊列由 harness 自己派工消費。

這條弧線本身就是四層結構的示範：評估（診斷）→ 設計（借用戶的觸發器洞察）
→ 對抗驗證（review 殺掉四個會靜默失效的版本）→ 教訓回流（pitfalls）。
