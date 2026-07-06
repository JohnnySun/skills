# Good Workflow Practices — 共享标准

> 本文件是 `workflow-design` 与 `workflow-review` 两个 skill 的共享内核。
> 定义"什么是好的 Claude Code Workflow 脚本"，作为设计与评审的同一把尺。
> 证据来源：(1) bun PR #30412 的 53 个官方 workflow；(2) Anthropic 官方文档 `code.claude.com/docs/en/workflows`；(3) 本仓 `plan-review` / `code-review` skill 的多 reviewer 约定。

## 0. 什么是 Workflow

Workflow 是一个工具（与 `Read`/`Bash` 同级），让 Claude 把"计划"写成一段 JS 脚本，由后台 runtime 执行。脚本以 `export const meta = { name, description, phases }` 开头，body 用 `agent()` / `pipeline()` / `parallel()` / `phase()` / `log()` / `args` / `budget` 编排 subagent。

核心区别于单 subagent / skill：**计划不在 Claude 脑里，而在脚本里**。中间结果存脚本变量，只有最终答案回到会话上下文。可扩展到单次数百 agent 而不撑爆 context window。

## 1. 何时该用 / 不该用 Workflow

### 该用（满足任一）

- **广度**：需要 fan-out 多个独立视角/源/分片才能覆盖（多模态 sweep、全仓审计、跨目录迁移）。
- **验证**：产出代价高，需要对抗式校验才敢采信（findings → refute → 采纳）。
- **规模**：单 context 装不下的工作量（迁移、批量重构、大规模测试修复）。
- **复用编排结构**：同样的"survey→fix→verify"要在多个对象上重复。
- **确定性**：要把控制流钉死，不让 LLM 在每轮自由发挥（bun 的 `rsPathFor` 强制路径）。

### 不该用

- 普通 task 一个 agent 逐轮能做完 → 让一个 agent 做。
- 需要运行中人类输入 → workflow 不能中途接收输入；要阶段签字就拆成多个 workflow。
- token 成本与广度不匹配 → 几十个 agent 换不来收益时不用。
- 能用 regex/hook 自动化强制的机械约束 → 用 hook，不用 skill/workflow。

## 2. 脚本骨架规范

```js
export const meta = {
  name: "phase-x-do-thing",           // 与文件名一致：phase-x-do-thing.workflow.js
  description: "Phase X: <意图> (<数据流: a → b → c>)",
  phases: [
    { title: "Survey",  detail: "one agent per <unit> discovers <work>" },
    { title: "Fix",      detail: "one agent per <unit> applies <fix>" },
    { title: "Verify",   detail: "adversarial check against <ground truth>" },
  ],
};
```

- `name` 与文件名一致，kebab-case。
- `description` 一句话：阶段意图 + 数据流箭头。
- `meta.phases` 是**声明式阶段目录**（人读）；脚本里 `phase("Survey")` 是**运行时进度标记**。两者通过 title 字符串松耦合，`phase()` 可在循环里复用。
- **顶导流统一**：`args` 兜底 + 字符串入参兼容 + 早返回 `{ error: "..." }` + `log()` 进度。

```js
const A = typeof args === "string" ? JSON.parse(args) : args || {};
const FILES = (A && A.files) || [];
if (FILES.length === 0) return { error: "no files in args.files" };
log(`batch: ${FILES.length} files`);
```

## 3. 控制流原语选择

| 原语 | 语义 | 何时用 |
|---|---|---|
| `agent(prompt, opts)` | 派生一个 subagent | 单步任务；`opts` 必带 `label`/`phase`/`schema` |
| `pipeline(items, ...stages)` | 每 item 独立穿过所有 stage，**无 barrier** | 同 item 的 stage 间有数据依赖，item 之间无需同步 |
| `parallel(thunks)` | 并发全部 thunk，**barrier**（等全完成） | 同阶段多个独立任务需全部完成才能进下一阶段 |
| `phase(title)` | 进度组标记 | 切阶段，UI 显示 |
| `log(msg)` | 人类可读进度 | 不进 agent 上下文 |
| `args` | 结构化入参 | 传文件列表/配置 |
| `budget` | token 目标 | loop-until-budget 动态深度 |

### pipeline vs parallel 判据（最关键）

- **同一 item 的 stage 间有数据传递** → `pipeline`。例：`implement → verify → fix`，fix 需要 verify 的 issues。
- **同一阶段的多个独立任务需要全部完成才能进入下一阶段** → `parallel`（barrier）。例：2-vote 对抗验证、一轮内全文件并发修复。
- **常嵌套**：`pipeline(items, stage1, (r,item) => parallel([vote1, vote2]).then(dedup), stage3)`。这是反复出现的复合形态。

### 嗅探规则（anti-pattern）

如果你写出 `parallel → transform → parallel` 且中间 transform 无跨 item 依赖，就该改成 pipeline，把 transform 塞进 stage。barrier 的 wall-clock 延迟是真实浪费。

合理 barrier 理由（仅三种）：
1. 跨全集合去重/合并后再做下游。
2. 基于总数的早退（"0 findings → 跳过验证"）。
3. prompt 要引用"其他 findings"做对比。

## 4. Schema 设计规范

**永远优先用 `schema` 选项，而非在 prompt 里要求返回 JSON。** 校验在 tool-call 层，mismatch 自动 retry。

- 顶层 `{ type:"object", required:[...], properties:{...} }`。`required` 是 agent 的契约。
- `description` 字段是**对 agent 的填表说明**（"absolute path of the .rs file you wrote"），不是给人看的文档。
- `enum` 用于分级与分类：`confidence: ["high","medium","low"]`、`severity: ["must-fix","should-fix","nit"]`。
- **每条 finding 必须自带可执行 `fix` 字段**，让下游 agent 能机械应用——这是对抗闭环的关键。
- **review 类用 `accept: boolean` + `bugs: [...]` 双字段**，accept 做门控，bugs 做反馈。
- 并行分支用**一致**的输出 schema，便于合并。
- agent 返回计数（applied/ungated/todos），workflow 顶层 `reduce` 成统计，供健康度判断。

## 5. 验证模式（按对抗强度递增）

1. **单 verifier**：implement → 1 个 adversarial verifier → fix。verifier "default ok=false if ANY must-fix"。
2. **2-vote verify**（最主流）：`parallel([vote1, vote2])` → dedup by key → accepted = every accept。
3. **3-vote refute**（高代价决策，如会污染全局的知识库生成）：3 个 agent 尝试 refute，`refutes >= 2` 才推翻。
4. **tiebreak**：2-vote 不一致时加第三票。
5. **review→apply 循环直到干涸**：apply 后再 review，直到 accept 或轮次耗尽。

### verifier prompt 骨架

```
You are an adversarial X verifier. Find every place <draft> DEVIATES from <ground truth>.
1. Read <GUIDE>.
2. Read <spec> (source of truth).
3. Read <draft>.
Check ONLY against <GUIDE> rules. High-value targets:
- <具体反模式清单 10+ 条>
Do NOT flag: <明确豁免项>.
Default to ok=false if you find ANY must-fix.
If <短路条件>, return ok=true, issues=[].
```

关键设计：
- **"Default to refuted/ok=false"** —— 强制对抗姿态。
- **High-value targets 是具体反模式清单**，不是泛泛"检查正确性"。
- **明确豁免项**降低假阳性。
- **短路条件**避免对 stub 浪费对抗。
- **fix prompt 嵌入 verifier 的 issues JSON**，且允许"如果 verifier 幻觉就跳过"。

### 官方质量模式

- **Adversarial verify**：派 N 个 skeptic 试图**反驳**而非确认；多数反驳失败才存活。
- **Perspective-diverse verify**：给每个 verifier 不同 lens（correctness/security/perf/repro），而非 N 个相同 verifier。
- **Judge panel**：N 个独立尝试 → parallel 评分 → 从胜者综合并嫁接亚军优点。
- **Loop-until-dry**：持续派 finder 直到连续 K 轮无新发现。**去重必须对"所有见过的全集"去重，而非只对已确认的**——否则被拒的 finding 每轮重现，永不收敛。
- **Loop-until-budget**：用 `budget` 动态伸缩；**必须 guard `budget.total` 非 null**，否则跑到 agent 上限。
- **Completeness critic**：终末 agent 问"漏了什么模态/claim/源"，产出下一轮工作。

## 6. 确定性约束（bun 的核心优点）

- **强制路径/目录隔离**：如 `rsPathFor()` 把 `.zig` 机械映射成 `.rs`，不让 agent 自己选。verify 阶段用计算值覆盖 agent 自报路径。
- **explicit-path commit**：`git add <exact files>` 而非 `git add -A`；`core.hooksPath=/dev/null` 禁 hook。
- **NO_BUILD 约束**：把 build 从 agent 剥离，每轮只 build 一次，agent 只读 diag + source。
- **诊断文件作通信媒介**：survey 写 `.diag`/`.baseline`/`.log` 到 /tmp，fix agent `cat`，避免大段输出塞 prompt。
- **baseline 对比**：跑官方版本存 baseline，只报 divergence，过滤本来就 fail 的项。
- **累积缓存**：passing/triaged-slow 累积，增量推进，不重复 survey。
- **反 reward-hacking**：reviewer grep `PORT NOTE|TODO(port)|SAFETY:.{100,}` 检测"用注释为 hack 辩解"并 REJECT。

## 7. 隔离与并发

- 并发上限约 16（受 CPU 核数限制），单 run agent 总数上限 1000。
- **并行 agent 写同一文件必冲突** → 要么 `isolation: "worktree"`，要么划互不相交的文件域。
- 隔离层次（由弱到强）：
  1. 共享 repo + explicit-path commit（弱隔离）
  2. 每 shard 独立 worktree + 独立 build dir（强隔离）
  3. worktree isolation + 返回 patch 字符串，orchestrator 应用（最强，agent 不碰 git）
- **"agent 产 diff，orchestrator 提交"** 事务模式，避免并发 git 冲突。
- **NO_TOOLS 分离**：前 N 阶段 agent 不许 cargo/git/bun，唯一 agent 编译提交。

## 8. 可观测性与成本

- `label` 用 `kind:短路径` 格式（`impl:fetch.zig`、`verify:runtime/server`），便于 UI 区分百个并发 agent。
- agent 返回计数，workflow reduce 成顶层统计（`by_confidence`/`total_added`/`clean`/`fixed`/`failed`）。
- 大 run 前在小切片试跑估成本；用 `model` 选项把低价值 stage 路由到小模型。
- `/workflows` 视图实时显示 token，可随时停止且不丢已完成工作。

## 9. 安全与可重复性

- **非确定性函数会抛错**：禁止 `Date.now()`、`Math.random()`、无参 `new Date()`。时间戳通过 `args` 传入，差异用 index 变化 prompt/label。
- **权限继承**：workflow 派生的 subagent 始终在 `acceptEdits` 模式运行，继承工具 allowlist；未在 allowlist 的调用仍弹权限。长 run 前把需要的命令加进 allowlist。
- **headless 限制**：`claude -p` / Agent SDK 下无交互确认；MCP 工具可能不可交互确认，规划时避开依赖 MCP 的 stage。
- **resume**：停止后可 resume，已完成 agent 返回缓存；但只同一 Claude Code 会话内有效。
- **脚本可 diff**：脚本写入 session 目录，可读、可编辑后重跑。

## 10. 元模式速查（可直接套用的 20 种）

1. **Implement→Verify→Fix 三段 pipeline**：每 item 独立链。
2. **2-vote adversarial verify + dedup**：`parallel([v1,v2]).then(dedup by key)`。
3. **Survey→Fan-out→Re-survey 循环**：`for round: survey→pipeline(frontier, fix, verify, bugfix)`，MAX_ROUNDS 有界。
4. **Panic-swarm**：parallel probe N → dedup by location → parallel fix 每 unique。
5. **Ladder/swarm-test**：分级推进（单文件→多文件→目录），rung 全 pass 才 +1。
6. **Isolated worktree per shard**：每 shard 独立 worktree + build dir。
7. **NO_BUILD swarm**：ONE rebuild/round，survey 写 diag，fix/review/apply 全只读源码。
8. **Baseline divergence matrix**：rust_rc × baseline_rc → crash/diverge/hang/passing/baseline-fails。
9. **Incremental coverage**：passing/triaged-slow 累积，每轮 working set 只取未覆盖。
10. **Tier-ordered ungate**：低 tier 先真实化，高 tier 看到真依赖。
11. **Shard + line-bucket split**：crate 分组 + mega-file 按行区间切。
12. **5-stage dedup/unsafe-wrap**：Find(shard)→CrossRef/Coalesce(synth)→Verify(2-vote)→Apply(Edit only)→Compile(唯一 cargo agent)。
13. **Classification + 3-vote refute**：生成分类→对抗 refute→synth，用于"会污染下游的知识库"。
14. **Worktree patch return**：fix agent 隔离 worktree 产 patch 字符串，reviewer 审 patch，orchestrator 应用。
15. **Read-only fix + orchestrator commit**：agent 只 Edit，orchestrator 聚合 explicit-path 一次性 commit。
16. **Adversarial audit of the rulebook itself**：多 dimension auditor 审 ground rules 本身，3-vote refute，synth 产 patch。
17. **Main-parity tracking**：追踪上游是否已同步，2-vote 验证 verdict。
18. **Dep backoff**：连续失败→bail + sleep backoff，orchestrator 适时重启。
19. **REGRESSION GUARD smoke test**：改动后跑 smoke，破坏即 revert。
20. **Reward-hack detection**：reviewer 检测"用注释为 hack 辩解"并 REJECT。

## 11. 反模式清单（评审时标红）

- ❌ 在 `parallel` 后做无跨 item 依赖的 transform 再 `parallel`（应改 pipeline）。
- ❌ 在 prompt 里要求返回 JSON 而不用 `schema`。
- ❌ finding 不带 `fix` 字段，下游无法机械应用。
- ❌ verifier prompt 用"检查正确性"而非具体反模式清单。
- ❌ loop-until-dry 对 `confirmed` 去重而非对 `seen` 全集去重（永不收敛）。
- ❌ 用 `budget.total` 前不 guard null（跑到 1000 agent 上限）。
- ❌ 用 `Date.now()`/`Math.random()`/`new Date()`（runtime 抛错）。
- ❌ 并行 agent 写同一文件无 worktree 隔离。
- ❌ agent 自由决定输出路径/目录（应确定性映射）。
- ❌ 把大段测试输出塞进 prompt（应用诊断文件）。
- ❌ 每 agent 自己 build（应剥离 build，每轮一次）。
- ❌ 无 MAX_ROUNDS/MAX_FILES 的无限循环。
- ❌ 30 个 agent 同时 `git commit`（应 orchestrator 事务提交）。
- ❌ `meta.phases` 与 `phase()` 调用完全脱节（人读目录与运行时进度对不上）。
- ❌ 单体 workflow >300 行或 MAX_ROUNDS >12 未拆分为多个独立 workflow（参考 §12）。
- ❌ HARD RULES、BANS、领域约束混在一个 flat string 里（应分层，参考 §13）。
- ❌ loop 只有 MAX_ROUNDS 无 stuck detection（应检测 `after_errors >= before_errors && round > 1` 则 early exit）。
- ❌ fix/implement agent 的 prompt 无 BANNED 行为清单（只有 verifier 有反模式清单，fix agent 不知道禁忌）。
- ❌ git commit 在多 agent 并行写时无 retry+merge 策略（应 `for i in 1..5; add && commit && pull -X ours && push && break || sleep $((RANDOM%6+1))`）。

## 12. 跨 Workflow 编排（Multi-Workflow Orchestration）

当任务规模超过单个 workflow 的合理边界（>300 行、>12 轮修复、>3 个独立阶段），应拆分为多个独立 workflow，通过文件系统状态串联。

### 拆分原则

- **每个 workflow 可独立重试**：输入是文件系统当前状态 + 显式 args，不依赖上游 workflow 的返回值。
- **每个 workflow 自己 survey 当前状态再决定干什么**（不是读上游 workflow 的 JSON 返回值）。
- **共享 git 分支**：所有 workflow 都在同一分支上操作，commit 是持久化状态的唯一方式。
- **`/tmp` 诊断文件**：survey 的 diag 文件跨 round 累积（`passing.txt`、`failing-rN.txt`）。

### Phase 命名约定

按字母前缀分组（参考 Bun 的 a→h），每个 phase 可有多个 workflow 变体：
```
phase-a-adapt.workflow.js         # 代码适配
phase-b-compile-repair.workflow.js # 编译+修复
phase-c-smoke-test.workflow.js    # 冒烟测试
phase-d-wheel-pytest.workflow.js  # wheel+pytest
```

### Workflow 间状态传递

| 机制 | 适用场景 |
|------|---------|
| **文件系统** | 上游产出的代码文件就是下游的输入（最常见） |
| **git branch** | 分支上的 commit 历史即状态 |
| **`/tmp` 诊断文件** | survey 写的 `.diag`/`.err` 文件供 fix agent 读 |
| **TSV/JSON 知识库** | 分类结果（如 `LIFETIMES.tsv`）供下游引用 |
| **args** | 显式传参（shard id、crate name、build dir 路径） |

### 拆分决策

考虑拆分当：
1. 单 workflow 行数 >300
2. MAX_ROUNDS >12
3. 有 3+ 个逻辑独立的阶段（如 adapt、compile、test）
4. 前面的阶段失败后，不需要从头重跑后面的阶段
5. 不同阶段需要不同的 agent 规模（adapt: 12 agent, compile-repair: 50+ agent per round）

## 13. 约束分层（Constraint Layers）

每个 workflow 应定义分层约束常量，嵌入所有 agent prompt。避免把所有约束混在一个 flat string 里。

### 层次

| 层 | 名称 | 内容 | 作用域 |
|---|------|------|--------|
| L0 | **HARD_RULES** | git 操作约束、build 权限、文件权限 | 所有 agent |
| L1 | **BANS** | 禁止的代码模式（如"不能用 xcrun"、"不能 include .mm"） | fix/implement agent |
| L2 | **TAXONOMY** | 领域分类（如 bug 类型枚举、ownership 类型枚举） | survey/classify agent |
| L3 | **CHECKLIST** | 反模式检查清单（如"pthread_setname_np 2-arg vs 1-arg"） | verify/review agent |

### HARD_RULES 模板

```js
const HARD_RULES = `
**HARD RULES (violation = immediate rejection):**
- NEVER run cmake/cargo/build commands (orchestrator builds once per round).
- NEVER git reset/checkout/restore/stash.
- Commit: git -c core.hooksPath=/dev/null add -- <explicit paths> && git commit -m "<phase>: <what>"
- Edit ONLY files under your assigned domain.
- DO NOT edit .mm/.swift files (Apple-only).
`
```

### 使用

```js
const basePrompt = (task) => `${HARD_RULES}\n${BANS}\n${task}`
agent(basePrompt(`Fix ${file}: ${errors}`), { schema: FIX_SCHEMA })
```

## 14. Compile-Queue 模式

编译错误驱动的修复循环——build 本身就是 work queue。每轮 survey error → group by file → fix each → verify → bugfix → re-survey。

### 骨架

```js
const MAX_ROUNDS = 12
const MAX_FILES_PER_ROUND = 25
const seen = {}

for (let round = 0; round < MAX_ROUNDS; round++) {
  phase('Survey')
  const survey = await agent(`cmake/cargo build → group errors by file, write .err files to /tmp/diag/`, { schema: SURVEY_SCHEMA })
  if (survey.link_ok || survey.total === 0) break

  // Frontier: unseen first, then most errors, capped
  const frontier = survey.by_file
    .filter(f => !seen[f.file] || seen[f.file] < 3)
    .sort((a,b) => (seen[a.file]||0) - (seen[b.file]||0) || b.total - a.total)
    .slice(0, MAX_FILES_PER_ROUND)

  phase('Fix')
  const results = await pipeline(frontier,
    (f) => agent(`Read /tmp/diag/${f.errfile}, fix ${f.file}. ${HARD_RULES}`, { schema: FIX_SCHEMA }),
    (impl, f) => twoVoteVerify(impl, f),
    (review, f) => review.bugs.length ? agent(`Fix bugs: ${JSON.stringify(review.bugs)}`) : null
  )

  for (const f of frontier) seen[f.file] = (seen[f.file] || 0) + 1
  // Stuck detection
  if (round > 0 && survey.total >= prevTotal) {
    log(`stuck: ${survey.total} errors (was ${prevTotal}) — stopping`)
    break
  }
  prevTotal = survey.total
}
```

### 关键设计点

1. **Survey agent 是唯一跑 build 的**（NO_BUILD 约束）
2. **错误写 .err 文件**，fix agent 读文件而非 build 输出
3. **Frontier 优先级**：unseen-first, then most-errors-first
4. **Seen tracking**：`seen[f.file]++`，非永久排除（修了又坏可以重试，只是排后面）
5. **Stuck detection**：`survey.total >= prevTotal && round > 1` 则 break
6. **Git retry**：commit 有 5-attempt retry with `pull -X ours`

## 15. Sharding（外部并行）

当单个 workflow 的 agent 规模不够覆盖全部工作时，用 sharding 拆成多个独立实例。

### args 约定

```js
const SHARD = args.shard ?? 0
const NSHARDS = args.nshards || 4
const myItems = items.filter((_, i) => i % NSHARDS === SHARD)
```

### 分配策略

| 策略 | 适用场景 | 实现 |
|------|---------|------|
| **Round-robin** | 文件大小均匀 | `i % NSHARDS === SHARD` |
| **Contiguous slice** | 需要局部性 | `items.slice(SHARD * chunkSize, (SHARD+1) * chunkSize)` |
| **Priority-based** | 热点文件 | `sort by error count desc, then round-robin` |
| **Mega-file split** | 超大文件 | `line-range buckets (800 lines each)` |

### Shard 隔离

每个 shard 实例应有独立的 worktree + branch：
```bash
git worktree add -b claude/phase-g-s${SHARD} /root/workspace-s${SHARD} origin/main
```
