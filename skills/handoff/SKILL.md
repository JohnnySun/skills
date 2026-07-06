---
name: handoff
description: Compact the current conversation into a persistent handoff document so a fresh agent can continue the work without re-understanding the world.
argument-hint: "What will the next session be used for?"
---

# Handoff（session 知識傳承）

把當前對話壓縮成一份**持久化**的接力文件，讓下一個 session 直接接續，而不是重新理解世界。

## 產出位置與命名（固定）

寫到：`docs/handoff/active/<date>-<slug>.md`

- `<date>`：今天日期，`YYYY-MM-DD`
- `<slug>`：kebab-case 的任務短名（例：`wo2-knowledge-transfer`、`billing-audit`）
- 用 Write 建立此檔（先確認 `docs/handoff/active/` 目錄存在，缺就建）。**不要**寫到 `mktemp` 臨時檔——臨時檔不跨 session 傳承，等於沒寫。

`docs/handoff/active/` 放**進行中**的 handoff；SessionStart hook 會偵測此目錄非空並提醒新 session 先讀。任務接完、確認結束後，把該檔**移到** `docs/handoff/archive/`（`git mv docs/handoff/active/<file> docs/handoff/archive/`），讓 active 只留真正未完成的。

## 固定格式（六段，缺段不合規）

```markdown
# <任務標題> · handoff

> 起始 session 日期：<YYYY-MM-DD>　|　接手者聚焦：<若有傳入 argument，寫在這>

## 背景
為什麼做這件事、要達成什麼目標、關鍵約束（1-3 段，不要貼已在 PRD/issue/工單裡的內容，用路徑或 URL 引用）。

## 已完成
已經做好且驗證過的部分（帶驗證證據：測試數字、curl 結果、截圖路徑）。

## 進行中
現在卡在哪、做到哪一步、下一個動作是什麼。

## 下一步
接手者應該按什麼順序做什麼；每步盡量可執行（命令、檔案、驗收條件）。

## 陷阱與已證偽假說
走過的死路、被證偽的假設、踩過的坑——**這段最值錢**，讓接手者不必重走。
若屬某個領域的排查結論，且工程有該領域的 incidents/runbook 檔，同時回寫該檔。

## 相關檔案
- `path/to/file` — 為什麼相關（一句話）
- 相關 PR / issue / 工單 URL

## 建議下一個 session 載入的 skill
- `<skill-name>` — 為什麼
```

## 撰寫原則

- **不重複已有 artifact**：PRD、plan、ADR、issue、commit、diff 已記錄的東西用路徑/URL 引用，不要抄一遍。
- **證據優先**：已完成的部分帶上驗證證據（測試通過數、命令輸出摘要），不要只寫「做好了」。
- **陷阱段是核心價值**：省下接手者重走死路的時間比任何優化都值錢。有假說被證偽，寫清楚「假說 → 證偽證據」。
- 若使用者傳入 argument，視為「下一個 session 的聚焦點」，據此裁剪內容與 `## 建議下一個 session 載入的 skill`。

## 完成後

接手 session 把任務做完、確認交付後，將對應 handoff 從 `docs/handoff/active/` 移到 `docs/handoff/archive/`，避免 active 目錄堆積已完成項、讓 SessionStart 提醒失真。
