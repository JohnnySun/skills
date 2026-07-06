# ai-infra

私有 AI 基建沉澱庫——跨工程可複用的 agent 開發資產（skill、harness 機關模板、
提示詞 pattern、平台佈線參考）。內容與任何單一業務工程解耦，新工程直接取用。

## 目錄

| 路徑 | 內容 |
|---|---|
| `skills/harness-builder/` | 通用 Harness 構建方法論 skill：為任意工程設計/評估/迭代 AI 開發防護體系（四層結構、七公理、三環閉環、機關工具箱、真實事故陷阱、反偷懶提示詞 pattern、四平台 hooks 對照） |

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
