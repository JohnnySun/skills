---
name: harness-builder
description: 為任意工程設計、評估、迭代「AI 開發 Harness」（hook/gate/閉環/知識回流/自我迭代體系）的通用方法論。Use when：用戶要為一個 repo 從零構建 agent 開發防護體系、評估現有 harness 的完善度（gate 夠不夠硬、閉環有沒有斷點）、設計某個具體 gate/hook 機關、解決「AI 聲稱完成但沒驗證」「AI 偷懶跳過測試」「規則寫了沒人遵守」「知識散落不回流」類問題、或撰寫 CLAUDE.md/AGENTS.md 級別的 agent 行為規範。跨工程通用，不綁定任何特定 repo。
---

# Harness Builder

把「AI 開發流程的可靠性」從散文規則變成機器機關的方法論。適用於任何有
coding agent 參與的工程——目標是讓流程品質不依賴「模型今天狀態好不好」，
而依賴一套自己會收緊、自己會進化的機關體系。

## 什麼是 Harness（先對齊定義）

Harness = 圍繞 agent 的四層結構，缺一層都不算閉環：

1. **約束層（Constraints）**：CLAUDE.md/AGENTS.md 規則、skill、上下文注入——告訴 agent 該怎麼做。
2. **強制層（Gates）**：hook deny / 腳本 exit 1 / CI fail——agent 不照做時攔下來。
3. **回流層（Feedback）**：事件帳本、反思 inbox、錯誤回流、偏差登記——失敗案例自動變成改進原料。
4. **進化層（Evolution）**：週期 retro 把回流原料轉成新機關——harness 自己迭代自己。

大多數工程只做了第 1 層就停了。**只有約束層的 harness 等於沒有 harness**：
規則寫在文檔裡靠自覺，agent 偷懶時沒有任何東西會變紅。

## 七條公理

完整論證與反例見 [references/axioms.md](references/axioms.md)。速記：

1. **機關不靠自覺**：任何「靠 AI/人自覺遵守」的規則都是待修的 bug。警告只是收數據的過渡態，必須寫明升級路徑（warn → 累積 N 週數據 → deny）。
2. **每個輸出都要有消費者**：量測沒人看 = 沒裝儀表；inbox 沒人消費 = 沒有回流。設計任何機關時先回答「它的輸出誰在哪個時機消費」。
3. **Ratchet 只進不退**：債務數只許降、防護清單只許長。放鬆一律走顯式逃生（`FORCE=1 原因`）+ 自動記帳，讓每次後退都變成週報上的可見負債。
4. **證據長存，SSOT 進 repo**：gate 事件落 JSONL 帳本、債務落 ledger 檔、反思落 inbox——全部進 git。單機工具（本地記憶、~/ 下的檔案）只能當快取。
5. **Harness 對可維護行為吃 TDD**：先分類；改 reusable 機關、parser、validator、installer、policy enforcement、stable contract 或可重現 regression 時先寫失敗測試。探索、唯讀查證、純文檔與 throwaway probe 不強求 Red→Green，但仍須獨立驗證。誤射修正用真實樣本 fixture，並配「該觸發仍觸發」的正向對照。harness 要有自己的一鍵可信集。
6. **當下歸因**：測試變紅、需求偏差、gate 被繞過——都必須在資訊最全的當下三選一處置（修好/改語義+寫明/登記掛帳）。事後考古成本是當下判斷的十倍且經常無解。
7. **小步 + 成本有界**：一拍只消費一個最小單元（一條 inbox / 一筆債務 / 一個 gate），跑不完留給下一拍。慢即是快，因為 ratchet 保證不會退。

## 三環架構（閉環的參考拓撲）

任何工程的 harness 都可以往這個拓撲上映射，映射不上的地方就是斷點。
完整模板見 [references/three-loops.md](references/three-loops.md)。

```
環1 單次改動閉環（秒~分鐘級）
  edit ──arm──▶ pending[module]
  verify(全量可信集) ──clear──▶ verified
  Stop  ▶ 有 pending → block 一次（防死鎖：二次放行）
  commit ▶ 目標模組有 pending → DENY（硬 gate 放在進 git 歷史之前）
           escape: SKIP="<原因>" → 放行 + 落帳本

環2 債務償還環（日級）
  量測（churn × 既有覆蓋 × 逃逸錯誤）→ priority queue → 每日啃一個單元
  債務 ledger（known_failures + class + reason + registered）+ ratchet 腳本守 schema

環3 規則進化環（週級）
  儀表板週報（債務趨勢 / bypass 次數 / 逃逸缺陷）
  同類逃逸 ≥2 次 → 機關化工單
  retro 合法產出只有三種：機關變更（自帶測試）/ ratchet 收緊 / 明確記錄的「不處理+原因」
```

閉環的判定標準：**從任何一次失敗出發，能不能不靠人記得，走完
「失敗 → 被記錄 → 被消費 → 變成機關 → 機關有測試 → 該失敗不再發生」**。
走不完的那一段就是你要補的。

## 工作流

### A. 評估既有 harness（用戶問「我的 harness 夠不夠好」）

1. 按四層結構盤點現況：每條規則標注它在**強制力階梯**上的位置
   （散文 → 注入 → 記帳 → warn+記帳 → deny+逃生記帳），與硬 gate 的**防線層級**
   （L0 agent hook / L1 git hook / L2 CI）——兩個座標系的定義見
   [references/mechanism-toolbox.md](references/mechanism-toolbox.md)。
2. 畫閉環圖（帳本註冊表）：每個機關的輸出 → 誰消費。找出無消費者的輸出與無機器落點的規則。
3. 檢查覆蓋面盲區（最常見的三個）：
   - **非 agent 路徑**：hook 只攔 agent；人手 terminal、CI、網頁 merge 是否繞過一切？（解法：git hooks + CI 跑同一套可信集）
   - **閘後全軟**：gate 通常集中在「進 git / 進 prod」閘口，部署後驗證、review 證據、週報消費是否純靠自覺？
   - **回流積壓**：收集端吞吐 > 消費端吞吐時，inbox 積壓本身要成為被觀測指標。
4. 產出評分表（每層 0-2 分）+ 按「複用既有機關模式的成本」排序的補強清單。

### B. 從零構建（新工程）

不要一次建四層。按依賴序逐環搭，每一步都有獨立價值：

1. **先立可信集**：一條命令跑完全部可信驗證（測試+lint+一致性檢查）。沒有可信集，gate 無物可強制。
2. **環1**：edit→verify ledger + Stop/commit gate。這一步就消滅「聲稱完成但沒驗證」。
3. **帳本三件套**：債務 ledger（紅測試掛帳）、事件帳本（deny/bypass 記錄）、反思 inbox（收集端先上，哪怕暫時人肉消費）。
4. **環3 輕量版**：週報腳本聚合帳本 → 人讀 → 開工單。先跑起來再自動化。
5. **環2**：等債務和量測數據累積後再上償還隊列。
6. **Agent profile 收環（工程採用時）**：export 或 upgrade 可攜 runtime 與 repo
   profile，將 wiring fragment 合併到實際生效的 prompt-submit hook，再跑
   `agent-kit.sh profile check --root <repo> --client <client>`。若已有語義等價
   profile，可驗證後跳過；不覆寫既有 hooks 或規則。

### C. 迭代一個機關（修誤射/漏攔）

固定節拍：選一個單元 → 三行需求對齊（複述/驗收/本次不做）→ 定位落點 →
工作分類 → 行為改動走 TDD（真實樣本 fixture + 正向對照）→ 跑 harness 全量可信集 → review → 收帳
（inbox 條目改 status、commit message 寫明機關化了什麼）。
機關實現的落點選擇與陷阱見 [references/mechanism-toolbox.md](references/mechanism-toolbox.md)
與 [references/pitfalls.md](references/pitfalls.md)（後者全部來自真實事故，動手寫偵測邏輯前必讀）。
跨多個 agent 平台（Claude Code / Codex / Cursor…）佈線 hook 時，各平台的設定
格式、事件名、輸入輸出約定差異很大且寫錯會**靜默不生效**——動手前必讀
[references/platform-hooks.md](references/platform-hooks.md)。

### D. 撰寫約束層文本（CLAUDE.md / skill / 規則）

約束層的目標是讓 agent「想照做」，強制層才負責「不照做攔下來」——兩層分工
不同，文本技巧也不同。反偷懶提示詞 pattern（含 Bun 等成熟開源工程的實證做法）
見 [references/prompt-patterns.md](references/prompt-patterns.md)。核心原則：

- 解釋 why 優於堆疊 MUST：寫出「為什麼一定要先 commit 才能 deploy」的兩類真實事故，比十個感嘆號有效。
- 具體黑名單優於抽象要求：「禁止 `go test -run Xxx` 當收環」比「要充分測試」可執行。
- 每條規則旁邊註明它的機關落點；沒有落點的規則要標記為「待機關化」而不是假裝它有約束力。

## 完整案例走讀

一個生產環境的完整實現（某 monorepo：1700+ 行 hook + 等量測試、三環全部落地、
18 種機關，識別資訊已通用化）見 [references/worked-example.md](references/worked-example.md)。
評估或構建時拿它當對照組，但**抄拓撲不抄實現**——落點永遠依目標工程的
工具鏈重新選擇。
