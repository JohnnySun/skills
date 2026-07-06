# ai-infra

私有 AI 基建沉澱庫——跨工程可複用的 agent 開發資產（skill、harness 機關模板、
提示詞 pattern、平台佈線參考）。內容與任何單一業務工程解耦，新工程直接取用。

## 目錄

| 路徑 | 內容 | 閉環站點 |
|---|---|---|
| `skills/harness-builder/` | Harness 構建方法論：四層結構、七公理、三環閉環、機關工具箱、真實事故陷阱、反偷懶提示詞 pattern、四平台 hooks 對照 | 設計端 |
| `skills/harness-operate/` | Harness 日常運轉七步節拍：消費反思 inbox → 需求對齊 → 落點 → TDD（真實樣本+正向對照）→ 全量可信集 → review → 收帳 | 消費端 |
| `skills/code-review/` | 對抗式代碼 review 收斂迴路：reviewer lanes 攻擊 diff + 獨立 verifier 反駁 + 硬預算保證終止 | 驗證端 |
| `skills/plan-review/` | 對抗式方案/設計 review 收斂迴路（與 code-review 同構，作用於實作前） | 驗證端 |
| `skills/skill-creator/` | Skill 的創建與 eval 迭代工具（約束層文本自己的進化迴路） | 進化端 |
| `skills/handoff/` | Session 知識傳承：六段固定格式 handoff 文件 + active/archive 生命週期 | 傳承端 |
| `templates/harness-scaffold/` | 環1 最小施工件：hook router（自帶 12 案例可信集）+ ratchet + 佈線範例 + 帳本模板，五步接線 | 施工件 |

## 建議的使用路徑

1. **新工程**：讀 `harness-builder` → 用 `templates/harness-scaffold/` 五步接線 → 日常照 `harness-operate` 運轉。
2. **評估既有工程**：`harness-builder` 工作流 A（四層評分 + 強制力階梯 + 閉環斷點圖）。
3. **review 站點**：把 `code-review` / `plan-review` 接進工作流，其中的 Domain Skill Packs 表換成目標工程自己的 skill。

## 使用方式

Skill 拷貝（或 symlink）到目標工程的 skill 目錄即可：

```bash
# Claude Code
cp -R skills/harness-builder <repo>/.claude/skills/
# Codex（若工程用 .agents 佈局）
ln -s ../../.claude/skills/harness-builder <repo>/.agents/skills/harness-builder
```

## 收錄原則

- 只收跨工程通用的資產；綁定單一工程的機關留在該工程 repo。
- 每份資產自帶「為什麼」（事故敘事/論證），不只有結論。
- 更新走小步迭代：一次一個資產，commit message 寫明變更動機。
