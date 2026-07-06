# 多平台 Hook / 規則 / MCP 佈線對照

四家主流 coding agent（Claude Code / OpenAI Codex CLI / Cursor / Gemini CLI）都有
hook 體系，但**設定檔格式、事件名、輸入輸出約定各不相同，且寫錯幾乎都是靜默不
生效**（不報錯、hook 就是不跑）。移植機關前先在本表對齊，別憑一家的記憶去寫另
一家。角色抽象（session 開始 / 工具前 / 工具後 / stop…）見
[mechanism-toolbox.md](mechanism-toolbox.md)「Hook 事件模型」，本檔只管**各平台把
那些角色叫什麼、怎麼寫**。

查閱日期：2026-07-06。各平台 hook 體系都在快速演進，動手前建議複查來源頁。

---

## 0. 一頁速查（先看這張）

| 維度 | Claude Code | Codex CLI | Cursor | Gemini CLI |
|---|---|---|---|---|
| Hook 設定檔 | `.claude/settings.json` | `~/.codex/hooks.json` 或 `config.toml` 內 `[hooks]` | `.cursor/hooks.json` | `.gemini/settings.json` |
| 格式 | JSON | JSON **或** TOML | JSON | JSON |
| 事件命名風格 | PascalCase `PreToolUse` | PascalCase `PreToolUse`（同 CC） | **camelCase** `beforeShellExecution` | PascalCase 但**不同名** `BeforeTool` |
| 需顯式開關 | 否 | **是**（`[features].hooks=true`） | 否 | 否 |
| Hook 信任機制 | 無（settings 即信任） | **有**（hash 信任，改了要重新 trust） | 無 | 無 |
| 輸入 | stdin JSON | stdin JSON | stdin JSON | stdin JSON |
| 阻擋機制 | `permissionDecision:"deny"` / exit 2 | `permissionDecision:"deny"` / exit 2 | `permission:"deny"` / exit 2 | `decision:"deny"`(或`"block"`) / exit 2 |
| 指令檔 | `CLAUDE.md`（+ `@import`、nested） | `AGENTS.md`（+ `.override.md`、nested） | `.cursor/rules/*.mdc` + `AGENTS.md` | `GEMINI.md` |
| MCP 設定 | `.mcp.json`（專案）/ `~/.claude.json` | `config.toml` 的 `[mcp_servers.<id>]` | `.cursor/mcp.json` | `.gemini/settings.json` 的 `mcpServers` |

**三個最咬人的靜默失效點**（詳見 §6）：事件名大小寫/拼法寫成別家的、阻擋用了
別家的 JSON 欄位名、Codex 忘了開 `features.hooks` 或沒重新 trust。

---

## 1. Claude Code

**設定檔（依作用域，後者覆蓋前者）**：`~/.claude/settings.json`（全域）、
`.claude/settings.json`（專案、進 git）、`.claude/settings.local.json`（本機、gitignore）、
managed policy（組織）、plugin 的 `hooks/hooks.json`、skill/agent frontmatter。

**事件名**（PascalCase）：核心是 `PreToolUse` / `PostToolUse` / `UserPromptSubmit` /
`Stop` / `SubagentStop` / `SubagentStart` / `SessionStart` / `SessionEnd` / `PreCompact` /
`Notification`（新版另有 `PostToolBatch` / `PermissionRequest` / `PermissionDenied` /
`PostCompact` 等更細事件）。

**結構**：`hooks.<Event>` 是 matcher group 陣列，每組 `matcher` + `hooks[]`。

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/guard.sh" }
        ]
      }
    ]
  }
}
```

**matcher 語法**：`Bash`（精確）、`Edit|Write`（or）、`mcp__memory__.*`（含特殊字元
時當**未錨定** JS regex）、`"*"`/`""`/省略 = 全配。MCP 工具名格式 `mcp__<server>__<tool>`。

**輸入**：stdin 一個 JSON，含 `session_id` / `cwd` / `hook_event_name` / `tool_name` /
`tool_input` 等。

**輸出 / 阻擋**：
- exit 0：讀 stdout JSON；`SessionStart`/`UserPromptSubmit` 的 stdout 進 context。
- exit 2：**阻擋**，stderr 當理由餵給模型（`PreToolUse` 擋工具、`UserPromptSubmit`
  擋提交、`Stop` 阻止停下…）。
- 其他 exit code：非阻擋錯誤，流程繼續。
- 結構化阻擋（PreToolUse）：
  ```json
  {"hookSpecificOutput":{"hookEventName":"PreToolUse",
   "permissionDecision":"deny","permissionDecisionReason":"..."}}
  ```
  `permissionDecision` 取值 `allow`/`deny`/`ask`/`defer`。另有 `updatedInput`（改寫參數）、
  `additionalContext`（注入 context）。

**注入 context 的事件**：`SessionStart` / `UserPromptSubmit` / `PreToolUse` /
`PostToolUse` / `Stop` 等（用 `additionalContext` 或 exit 0 的 stdout）。

**指令檔**：`CLAUDE.md`（根 + 巢狀目錄逐層併入），支援 `@path` import。
**MCP**：專案 `.mcp.json`（進 git、team 共用）；local scope 落 `~/.claude.json`。

---

## 2. OpenAI Codex CLI

**關鍵前提：hooks 預設關閉**，要在 `config.toml` 開 `[features] hooks = true`（舊別名
`codex_hooks` 已 deprecated）。忘了開 = hook 靜默不跑。

**設定檔**：`~/.codex/hooks.json` 或 `~/.codex/config.toml` 內聯 `[hooks]`；專案側
`<repo>/.codex/hooks.json` 或 `<repo>/.codex/config.toml`。

**事件名**（PascalCase，是 Claude Code 事件集的**子集**）：`SessionStart` /
`SubagentStart` / `PreToolUse` / `PermissionRequest` / `PostToolUse` / `PreCompact` /
`PostCompact` / `UserPromptSubmit` / `SubagentStop` / `Stop`。

**結構（JSON 版）** 跟 Claude Code 幾乎同構：

```json
{ "hooks": { "PreToolUse": [ { "matcher": "^Bash$",
  "hooks": [ { "type": "command", "command": "python3 ~/.codex/hooks/guard.py",
              "timeout": 30, "statusMessage": "Checking Bash command" } ] } ] } }
```

**結構（TOML 版）**——注意是**雙括號 array-of-tables**，寫成單括號 `[hooks.PreToolUse]`
會解析錯：

```toml
[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = '/usr/bin/python3 "guard.py"'
timeout = 30
```

**輸入 / 輸出 / 阻擋**：stdin 一個 JSON（`session_id` / `cwd` / `hook_event_name` /
`model` + 事件資料）。exit 2 + stderr = 阻擋理由；或 stdout 用**與 Claude Code 相同**的
`hookSpecificOutput.permissionDecision:"deny"`（PreToolUse），`UserPromptSubmit` 用
`{"decision":"block","reason":"..."}`。

**信任機制（Codex 獨有，會咬人）**：非 managed 的 command hook 執行前要經 `/hooks`
審核 trust，trust 綁在 hook 定義的 hash 上——**改了 hook 內容就要重新 trust，否則不跑**。
一次性繞過 `--dangerously-bypass-hook-trust`。managed hook（MDM / `requirements.toml`）
自動 trust 且不可停。

**指令檔**：`AGENTS.md`（`AGENTS.override.md` 優先；全域 `~/.codex/AGENTS.md`；
專案從 git root 往 cwd 逐層 concat，越近越後、越後越優先；單檔上限 32 KiB
`project_doc_max_bytes`）。
**MCP**：`config.toml` 的 `[mcp_servers.<id>]`，keys `command`/`args`/`url`/`env`/
`enabled`/`enabled_tools`/`disabled_tools`。
**notify**（非 hook）：`notify = ["..."]` array，目前只在 `agent-turn-complete` 觸發，
適合桌面通知/webhook，不能拿來 deny。

---

## 3. Cursor

**設定檔**：`<repo>/.cursor/hooks.json`（專案）、`~/.cursor/hooks.json`（使用者）、
企業級（mac `/Library/Application Support/Cursor/hooks.json`、Linux `/etc/cursor/hooks.json`、
Win `C:\ProgramData\Cursor\hooks.json`）。

**事件名（camelCase，跟其他三家完全不同的命名風格）**：`beforeSubmitPrompt` /
`beforeShellExecution` / `beforeMCPExecution` / `beforeReadFile` / `afterFileEdit` / `stop`。

**結構**：頂層 `version` + `hooks`，事件名映射到 command 物件陣列（**沒有 matcher 層**，
過濾邏輯自己在腳本裡判）：

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [ { "command": "./guard.sh" } ],
    "afterFileEdit": [ { "command": "./format.sh" } ]
  }
}
```

**輸入 / 輸出 / 阻擋**：stdin JSON（含 command / cwd / file_path / edits 等視事件而定）。
可阻擋的事件回 stdout：

```json
{ "permission": "allow" | "deny" | "ask",
  "user_message": "顯示給用戶", "agent_message": "餵給 agent" }
```

- `beforeShellExecution` / `beforeMCPExecution` / `beforeReadFile`：用 `permission`
  （`allow`/`deny`/`ask`）阻擋。
- `beforeSubmitPrompt`：用 `continue: true|false`（+ 可選 `user_message`）。
- `afterFileEdit` / `stop`：**純資訊、fire-and-forget，無法阻擋**（想「聲稱完成」攔截
  在 Cursor 只能軟提示，擋不住）。
- exit 2 = 等同 `permission:"deny"`。

**指令檔 / 規則**：`.cursor/rules/*.mdc`（可放子目錄），frontmatter 三欄
`description` / `globs` / `alwaysApply`，四種類型：Always（`alwaysApply:true`）、
Apply Intelligently（`alwaysApply:false`+`description`，agent 按需拉入）、
Apply to Specific Files（`alwaysApply:false`+`globs`，命中檔案自動掛）、
Manual（都不填，只在 `@mention` 時）。也支援根目錄與巢狀 `AGENTS.md`（無 frontmatter）、
legacy `.cursorrules`。
**MCP**：`.cursor/mcp.json`（`~/.cursor/mcp.json` 全域 / 專案 `.cursor/mcp.json`），
格式與 Claude/Codex 的 server 物件相容（`command`/`args`/`env`）。

---

## 4. Gemini CLI

**設定檔**：`.gemini/settings.json`（專案）覆蓋 `~/.gemini/settings.json`（使用者），
hooks 放 `hooks` 物件內。

**事件名（PascalCase 但名字自成一套）**：`BeforeTool` / `AfterTool` /
`BeforeModel` / `AfterModel` / `BeforeAgent` / `AfterAgent` / `BeforeToolSelection` /
`SessionStart` / `SessionEnd` / `Notification` / `PreCompress`。
（注意：**沒有 `PreToolUse`**，工具前是 `BeforeTool`；壓縮是 `PreCompress` 不是 `PreCompact`。）

**結構**：`hooks.<Event>` 為定義陣列，每個定義含 `matcher`（可選 regex/精確）、
可選 `sequential`、`hooks[]`（每個 `type:"command"` + `command`，可選 `name`/`timeout`/
`description`）。matcher 比對的是工具名。

```json
{ "hooks": { "BeforeTool": [ { "matcher": "run_shell_command",
  "hooks": [ { "type": "command", "command": "./guard.sh" } ] } ] } }
```

**輸入 / 輸出 / 阻擋**：stdin JSON（`session_id` / `cwd` / `hook_event_name` /
`timestamp` + 事件資料）。exit 0 成功、exit 2 = System Block（stderr 當拒絕理由）、
其他 = warning。結構化阻擋（BeforeTool）：`{"decision":"deny","reason":"..."}`
（`"block"` 亦可），reason 會當 tool error 餵回 agent 讓它 retry。

**指令檔**：`GEMINI.md`。
**MCP**：`.gemini/settings.json` 的 `mcpServers`。

---

## 5. 同一場景四寫法：PreToolUse 攔 `rm -rf` 並 deny

腳本邏輯（各家共用的判斷）：讀 stdin JSON → 取要執行的 shell 命令 → 命中
`rm -rf` → 回該平台的 deny。差別只在**掛哪個事件、deny 用哪個 JSON 欄位**。

**Claude Code** — `.claude/settings.json` 掛 `PreToolUse`/matcher `Bash`，腳本 stdout：
```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"rm -rf blocked"}}
```

**Codex** — 先 `config.toml` `[features] hooks=true`，掛 `PreToolUse`/matcher `^Bash$`，
腳本 stdout 同 Claude Code 的 `permissionDecision:"deny"`（首次執行要 `/hooks` trust）。

**Cursor** — `.cursor/hooks.json` 掛 `beforeShellExecution`（**不是** PreToolUse），
腳本 stdout：
```json
{"permission":"deny","user_message":"rm -rf blocked","agent_message":"Refused: destructive rm"}
```

**Gemini CLI** — `.gemini/settings.json` 掛 `BeforeTool`（**不是** PreToolUse）/matcher
`run_shell_command`，腳本 stdout：
```json
{"decision":"deny","reason":"rm -rf blocked"}
```

四家都可退化成 `exit 2 + stderr` 達到相同 deny 效果——跨平台共用一支腳本時，**最省事
的作法是只用 exit code（0 放行 / 2 阻擋 + stderr 理由），避開四套不相容的 JSON 欄位**。
需要 `ask`/改寫參數/注入 context 等進階能力時才寫各家專屬 JSON。

---

## 6. 靜默失效陷阱清單（寫錯不報錯、hook 就是不跑）

按「發生頻率 × 難察覺」排序，移植時逐條對：

1. **事件名張冠李戴**。把 `beforeShellExecution`（Cursor）寫進 Claude Code、或在
   Gemini 寫 `PreToolUse`（它叫 `BeforeTool`）、在 Cursor 寫 PascalCase `Stop`（它是
   小寫 `stop`）——都是**合法 JSON、非法事件名，靜默忽略**。四家風格：CC/Codex
   PascalCase 同名、Gemini PascalCase 異名、Cursor camelCase。
2. **deny 欄位用錯家**。`permissionDecision`（CC/Codex）↔ `permission`（Cursor）↔
   `decision`（Gemini）互不相通；用錯的欄位 = 沒 deny 成功、動作照跑。跨平台腳本
   優先退回 exit 2。
3. **Codex 沒開 `features.hooks`**。預設關閉，hooks.json 寫得再對也不載入。
4. **Codex hook 改了沒重新 trust**。trust 綁 hash，改一行就要 `/hooks` 重新信任，
   否則靜默跳過（這點最容易在「改完 hook 驗證時發現沒生效」白忙半天）。
5. **Codex TOML 單括號**。`[hooks.PreToolUse]` vs 正確的 `[[hooks.PreToolUse]]`
   （array-of-tables）——TOML 解析語義不同，matcher group 掛不上。
6. **拿 informational 事件當 gate**。Cursor 的 `afterFileEdit`/`stop`、各家的
   `PostToolUse` 系列多半**無法阻擋**（動作已發生）。想做「聲稱完成攔截」要用
   `Stop`(CC/Codex 可 exit2 阻止停下) 或把硬 gate 放進 commit/CI，別指望 Cursor `stop`。
7. **matcher regex 錨定假設**。Claude Code 的 matcher 含特殊字元時是**未錨定** regex
   （`Notebook` 會配到 `MyNotebookTool`）；Cursor 根本沒有 matcher 層（要自己在腳本
   內過濾）。假設「matcher 全錨定」會誤配或漏配。
8. **設定檔路徑/檔名**。`settings.json`（CC/Gemini）vs `hooks.json`（Cursor/Codex）
   vs `config.toml`（Codex）——放錯檔名不會報錯。
9. **exit code 語義**。四家都是 `2 = 阻擋`，`0 = 成功`，**其他非零 = 非阻擋警告**
   （不是阻擋！）。想 deny 卻 `exit 1` = 動作照跑、只留個 warning。

---

## 7. 移植 checklist（在別家立同一個 gate 時逐條過）

- [ ] 這個角色（工具前/後、stop、session 開始）在目標平台叫什麼事件名？大小寫拼對了？
- [ ] 設定檔是哪個檔名、哪個路徑作用域？需不需要顯式開關（Codex）？
- [ ] deny 是用哪個 JSON 欄位、哪些取值？能不能退回 exit 2 統一處理？
- [ ] 這個事件在目標平台**能不能阻擋**（還是 informational-only）？擋不住就換事件或
      換層（commit/CI）。
- [ ] 有沒有信任/hash 機制（Codex），改完要不要重新 trust？
- [ ] matcher 是精確還是 regex、錨不錨定、有沒有 matcher 層（Cursor 沒有）？
- [ ] 立完之後**實測一次真的觸發**——四家寫錯都靜默，唯一可靠驗證是跑一個該被擋的
      動作看它有沒有被擋（呼應 axioms「Harness 自己吃 TDD」：正向對照不可省）。

---

## 來源（查閱日 2026-07-06）

- Claude Code Hooks：https://code.claude.com/docs/en/hooks ；MCP：https://code.claude.com/docs/en/mcp
- Codex Hooks：https://developers.openai.com/codex/hooks ；Config/MCP：https://developers.openai.com/codex/config-reference ；AGENTS.md：https://developers.openai.com/codex/guides/agents-md
- Cursor Hooks：https://cursor.com/docs/hooks ；Rules：https://cursor.com/docs/context/rules
- Gemini CLI Hooks：https://geminicli.com/docs/hooks/ 、https://geminicli.com/docs/hooks/reference/
