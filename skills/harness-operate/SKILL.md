---
name: harness-operate
description: Harness 的日常運轉與自我迭代工作流——消費反思 inbox 條目，把 gate 誤射/漏攔/流程摩擦機關化（hook 規則、gate、ratchet、檢查腳本），TDD + 全量可信集收環。Use when：SessionStart 提醒「反思 inbox 有 N 條未消費」、用戶要求優化/迭代/完善 harness 或 gate 或 hook、改動機關腳本、處理債務 ledger / gate 事件帳本 / 反思 inbox、發現 hook 誤射或 gate 漏攔想修掉，或任何「讓 AI 開發流程跑得更順」的框架工作。改業務代碼不適用。搭配 harness-builder（設計端方法論）使用：builder 負責設計，本 skill 負責運轉。
---

# Harness Operate

把 harness 的問題變成機關的標準工作流。這個 skill 的存在理由：框架的迭代
不靠某個聰明 agent 的臨場發揮，而是任何 agent 照章執行都能安全收環。

前提：目標工程已按 harness-builder 的拓撲建了基本件（反思 inbox、債務
ledger、harness 自己的一鍵可信集）。缺件時先回 harness-builder 工作流 B 補件。

## 邊界（先讀）

- **只碰框架，不碰業務**：hook/機關腳本、inbox、各模組的債務 ledger 與
  可信集腳本。業務代碼一律不改——那是開發工作流的事。
- **一拍一單元**：一次只消費一條 inbox 條目（或一個明確工單）。做完收環，
  剩下的留給下一拍。慢即是快。
- **Ratchet 只進不退**：不放寬任何既有 gate；確需放寬走顯式逃生 + 記帳，
  並在 inbox 登記原因。

## 工作流

### 1. 選單元

讀反思 inbox，挑一條 `status: new`（優先序：近期復發次數多的 > 有安全
含義的 > 舊的）。沒有 inbox 條目時，看工單登記處的待排項。

### 2. 需求對齊（三行，寫在回覆裡）

- 需求複述：這條要機關化什麼行為
- 驗收標準：哪些正反案例會變成測試、哪個 gate/檢查會擋住復發
- 本次不做：明確劃出去的相鄰問題（回 inbox 排隊）

### 3. 定位機關落點

| 問題類型 | 落點 |
|---|---|
| hook 誤射/漏攔、gate 行為 | hook router 腳本（+ 對應測試檔） |
| 一致性/結構不變量 | live 一致性檢查腳本 |
| 債務/白名單 ratchet | ratchet 腳本、各模組債務 ledger |
| 週報/趨勢 | 儀表板腳本 |
| 事件記帳 | gate 事件帳本工具 |
| skill 內容/觸發 | 對應 SKILL.md + skill-creator 方法論 |

### 4. TDD（不可跳）

1. **Red**：在對應測試檔補失敗測試。誤射/漏攔類必須用**真實發生的
   命令/路徑樣本**當 fixture（去 inbox 條目裡找），不要造理想化樣本。
2. **Green**：最小實作。改 hook 的偵測邏輯時注意既有防線的一致性——
   引號遮罩、heredoc 處理、執行位置錨定（「提及 ≠ 執行」）；新偵測點
   不得繞過這些防線（歷史教訓：正面證據 marker 曾可被 commit message 偽造）。
3. **正向對照**：每個「不再觸發」的修正，都要配一個「該觸發的仍觸發」
   測試（歷史教訓：一次信噪修正差點誤傷部署逃生路徑的偵測）。

### 5. 收環驗證

跑 harness 自己的一鍵可信集（全部機關測試 + live 檢查 + ratchet）。

- 紅了 → 當場走紅測試歸因協議（改壞/過時/登記），禁止留紅。
- 改了 gate 語義 → 同步更新一致性檢查的守門條款（它守著上一版的不變量，
  升級要在 commit message 寫「測試語義變更：舊 → 新，原因」）。
- 多平台檢查：新 gate 依賴的事件在所有 agent 平台的佈線裡是否都接了
  （事件名/格式差異見 harness-builder 的 platform-hooks reference）。

### 6. Review + 提交

- 實質改動（≥3 檔）：用 code-review skill 跑 review-only 收斂；confirmed
  blocker 修完後，若工程有 review 證據 gate，發出 review-passed 記帳標記。
- Commit 走 conventional 格式，message 含：機關化了什麼、review 結果、
  收環證據（測試數）。

### 7. 收帳

- inbox 條目 `status: new` → `converted(<一句話指向 commit/機關名>)`
  或 `rejected(<裁決依據>)`——拒絕也是合法產出，必須留下依據。
- 過程中發現的**新**問題：不擴 scope 現場修，追加 inbox 條目排隊。
- Session 結束時反思 gate 會再問一次——如實補充。

## 設計原則（判斷依據，詳見 harness-builder references/axioms.md）

1. 機關不靠自覺：warn 只是收數據的過渡態，路徑要寫明「累積數據後升 deny」。
2. 持久層進 repo：SSOT 在 repo 內；本機檔案只放原始流水。
3. 提及 ≠ 執行：任何掃 command 文本的偵測都要問「這是引用還是執行？」
4. advisory 與 fail-closed 分開：skill 預載可以激進降噪；安全 gate
   寧可誤攔不可漏攔，精準化要單獨開工單慢慢做。
