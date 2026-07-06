# Constraint Layers Guide

> Agent prompt 中的约束应分层组织，而非混在一个 flat string 里。
> 本文件是 `workflow-good-practices.md` §13 的深度展开，含 Bun 项目 workflow 的 annotated examples。

## 1. 为什么要分层

### 问题：flat string 约束

```js
// ❌ 反模式：所有约束混在一起
const prompt = `Fix ${file}.
  Never run cargo. Never edit .zig. Never git reset.
  Don't use unsafe outside FFI. Don't add TODO(port) comments.
  Check for aliased-&mut, transmute-to-enum, missing match arms.
  Commit with git -c core.hooksPath=/dev/null add...
  Port real bodies, never re-gate with #[cfg(any())].
  Fix layering, don't work around it.`;
```

问题：
1. **不同角色的 agent 看到不适用的约束** — fix agent 看到 verify-only 的反模式清单，浪费 context
2. **修改一处要改 N 处** — 同样的 git 约束在每个 prompt 里重复，改一处漏一处
3. **无法分级** — violation 的严重性不明确（"never" 和 "prefer" 混在一起）
4. **不可测试** — 无法对每一层独立验证

### 解决方案：分层常量

```js
// ✅ 正确：分层约束
const HARD_RULES = `...`   // L0: 所有 agent 都要遵守
const BANS = `...`          // L1: fix/implement agent 禁止的代码模式
const TAXONOMY = `...`      // L2: survey/classify agent 的分类体系
const CHECKLIST = `...`     // L3: verify/review agent 的反模式清单

// 组合
const fixPrompt = (task) => `${HARD_RULES}\n${BANS}\n${task}`;
const verifyPrompt = (task) => `${HARD_RULES}\n${CHECKLIST}\n${task}`;
const classifyPrompt = (task) => `${HARD_RULES}\n${TAXONOMY}\n${task}`;
```

## 2. 四层模型

| 层 | 名称 | 内容 | 作用域 | 违反后果 |
|---|------|------|--------|---------|
| L0 | **HARD_RULES** | git 操作约束、build 权限、文件域 | 所有 agent | 立即 reject |
| L1 | **BANS** | 禁止的代码模式 | fix / implement agent | 代码 reject |
| L2 | **TAXONOMY** | 领域分类体系 | survey / classify agent | 分类错误 |
| L3 | **CHECKLIST** | 反模式检查清单 | verify / review agent | 漏检 |

### 层间关系

```
L0 (HARD_RULES) ──── 所有 agent 都嵌入
  │
  ├─ L1 (BANS) ──── fix/implement agent 额外嵌入
  │
  ├─ L2 (TAXONOMY) ── survey/classify agent 额外嵌入
  │
  └─ L3 (CHECKLIST) ── verify/review agent 额外嵌入
```

## 3. L0: HARD_RULES

### 职责

不可违反的操作约束。任何 agent 违反任何一条都应被 reject。

### 设计原则

1. **短**：5-10 条规则，每条一行
2. **绝对**：用 NEVER / ALWAYS，不用 prefer / consider
3. **可机械检查**：reviewer 可以 grep commit diff 验证
4. **与领域无关**：不包含"如何修代码"，只包含"如何操作工具"

### Annotated Example（Bun phase-d-build-queue）

```js
// From phase-d-build-queue.workflow.js line 65
const HARD = `**HARD RULES:**
Edit ONLY your assigned file (and at most one upstream type-def file
if signature change is unavoidable — note it in fns_touched).
Never git reset/checkout/restore/stash.
Never .zig.
Other agents own OTHER frontier files this round.
**Commit+push with retry:**
\`for i in 1 2 3 4 5; do
  git -c core.hooksPath=/dev/null add -A 'src/' &&
  git -c core.hooksPath=/dev/null commit -q -m "phase-d: <file>: <what>" 2>/dev/null &&
  git -c core.hooksPath=/dev/null pull --no-rebase --no-edit -X ours origin claude/phase-a-port 2>/dev/null;
  git -c core.hooksPath=/dev/null push origin claude/phase-a-port && break || sleep $((RANDOM%6+1));
done\`.
Filter cargo errors to YOUR file only — sibling breakage is expected mid-round.`;
```

**分析：**
- `Edit ONLY your assigned file` — 文件域约束（可机械检查）
- `Never git reset/checkout/restore/stash` — git 操作约束（绝对）
- `Never .zig` — 文件类型约束（绝对）
- `Commit+push with retry` — 标准 git 操作模板（可复制粘贴）
- `Filter cargo errors to YOUR file only` — 预期行为说明

### 通用 HARD_RULES 模板

```js
const HARD_RULES = `
**HARD RULES (violation = immediate rejection):**
- NEVER run ${BUILD_CMD} (orchestrator builds once per round).
- NEVER git reset/checkout/restore/stash/rebase/pull.
- Edit ONLY files under your assigned domain: ${DOMAIN}.
- DO NOT edit ${FORBIDDEN_FILES}.
- Commit: \`git -c core.hooksPath=/dev/null add -- <exact paths you edited> &&
  git -c core.hooksPath=/dev/null commit -q -m "${PHASE}: <what>"\`.
  NEVER \`git add -A\`. NEVER \`--allow-empty\`.
- Commit message ≤ 80 chars — describe WHAT changed, not your analysis.
`;
```

### NO_BUILD 变体

当 fix agent 不允许运行 build 时，单独声明：

```js
// From phase-g-mega-swarm.workflow.js
const NO_BUILD = `**DO NOT run \`bun bd\`, \`cargo build\`, \`cargo check\`,
or any test command.** Work from the diagnostic + source.
Orchestrator rebuilds once per round.`;

const HARD = `**HARD RULES:** Work in /root/bun-5 on branch claude/phase-a-port.
${NO_BUILD}
Never git reset/checkout/stash/rebase/pull.
**Commit explicit paths ONLY:** \`git -c core.hooksPath=/dev/null add <exact files>\`
(not \`add 'src/'\` — only YOUR files). NO push.
**NEVER --allow-empty. Commit message ≤ 80 chars.**`;
```

### Git Retry 模板

当多个 agent 并行 commit 到同一分支时，需要 retry：

```js
// From phase-d-build-queue.workflow.js — 5-attempt retry with merge strategy
const GIT_RETRY = `**Commit+push with retry:**
\`for i in 1 2 3 4 5; do
  git -c core.hooksPath=/dev/null add -- <exact files> &&
  git -c core.hooksPath=/dev/null commit -q -m "${PHASE}: <file>: <what>" 2>/dev/null &&
  git -c core.hooksPath=/dev/null pull --no-rebase --no-edit -X ours origin ${BRANCH} 2>/dev/null;
  git -c core.hooksPath=/dev/null push origin ${BRANCH} && break || sleep $((RANDOM%6+1));
done\``;
```

**关键设计决策：**
- `pull --no-rebase` — 避免 rebase 冲突
- `-X ours` — 自动解决冲突（自己的改动优先，因为文件域不重叠）
- `sleep $((RANDOM%6+1))` — 随机退避避免惊群
- 5 次重试 — 足够应对典型并发

## 4. L1: BANS

### 职责

fix / implement agent 禁止使用的代码模式。这些模式在技术上可行但违反架构原则。

### 设计原则

1. **面向 fix agent** — verify agent 不需要这些（verify 用 L3 CHECKLIST）
2. **说明 WHY** — 不只是说"不要用 X"，要说"不要用 X，因为 Y，应该用 Z"
3. **可由 verify agent 检查** — L3 CHECKLIST 中有对应条目检查 L1 是否被违反

### Annotated Example（Bun mega-swarm）

```js
// From phase-g-mega-swarm.workflow.js — HARD 中的 BANS 部分
const HARD = `...
**FIX LAYERING.** Low-tier needs high-tier type → MOVE down or
\`extern "Rust"\`. NEVER hooks/c_void round-trips/dup types.

**NO NEW \`unsafe {}\` outside FFI.** Reaching for
\`unsafe { &mut *ptr }\` → change signature to \`&mut T\`.

**FFI unsafe goes in ONE place.** If you add an \`extern "Rust"/"C"\`
function, wrap it in ONE safe inline fn; call sites use the wrapper.
Adding \`unsafe {}\` at N>2 call sites for the same extern is wrong.

**NO JUSTIFICATION COMMENTS.** Do NOT add
\`// PORT NOTE: reshaped for borrowck\` /
\`// TODO(port):\` / long \`// SAFETY:\` essays.
If you need a paragraph to justify it, the code is wrong.`;
```

**分析：**
- `FIX LAYERING` — 架构约束 + 正确做法
- `NO NEW unsafe` — 代码模式禁令 + 替代方案
- `FFI unsafe ONE place` — 抽象约束 + 可机械检查
- `NO JUSTIFICATION COMMENTS` — 反 reward-hacking

### 通用 BANS 模板

```js
const BANS = `
**BANNED PATTERNS (violation = code rejection):**
- NO ${PATTERN_1}. Instead: ${ALTERNATIVE_1}. Why: ${REASON_1}.
- NO ${PATTERN_2}. Instead: ${ALTERNATIVE_2}. Why: ${REASON_2}.
- NO justification comments (PORT NOTE / TODO(port) / SAFETY essays >1 line).
  If you need a paragraph to justify it, the code is wrong — fix the code.
`;
```

## 5. L2: TAXONOMY

### 职责

为 survey / classify agent 提供领域分类体系，确保分类结果一致且可合并。

### 设计原则

1. **穷尽** — 每个可能的输入都有归属类别（包括 UNKNOWN 兜底）
2. **互斥** — 类别之间不重叠，避免歧义
3. **带 heuristic** — 每个类别提供判断依据，不只是名字
4. **与 schema enum 对应** — taxonomy 的类别名就是 schema 中 `enum` 的值

### Annotated Example（Bun lifetime-classify）

```js
// From lifetime-classify.workflow.js — 完整的指针分类体系
const TAXONOMY = `
OWNED        → Box<T> / Option<Box<T>>      — this struct creates it AND deinit destroys it
SHARED       → Rc<T> / Arc<T>               — ref-counted; multiple owners
BORROW_PARAM → struct gets <'a>, &'a T      — assigned from a constructor param; outlives self
BORROW_FIELD → &'a T tied to sibling field  — points into self.other_field's allocation
STATIC       → &'static T                   — assigned from a global/static/singleton
JSC_BORROW   → &JSGlobalObject / &VM etc.   — well-known JSC types always borrowed from caller
BACKREF      → *const Parent (raw)          — points to the struct that OWNS self
INTRUSIVE    → *mut T (raw)                 — next/prev/link in intrusive list
FFI          → *mut T / *const T (raw)      — comes from or goes to C
ARENA        → StoreRef<T> / *const T       — points into arena; freed by arena.reset()
UNKNOWN      → Option<NonNull<T>> + TODO    — can't determine from this file alone
`;
```

**关键设计：**
- 每个类别有 Rust 类型映射（→ `Box<T>`）— 分类即行动
- 每个类别有判断依据（"deinit destroys it"）— 可重复的判断标准
- `UNKNOWN` 兜底 — 穷尽
- 与 schema `enum` 对应：

```js
class: {
  enum: ["OWNED", "SHARED", "BORROW_PARAM", "BORROW_FIELD",
         "STATIC", "JSC_BORROW", "BACKREF", "INTRUSIVE",
         "FFI", "ARENA", "UNKNOWN"],
}
```

### Heuristic 示例

taxonomy 中嵌入启发式规则，减少 classify agent 的猜测：

```js
// From lifetime-classify.workflow.js — classify prompt 中的 heuristics
`Heuristics:
- *JSGlobalObject, *VirtualMachine, *CallFrame, *VM → JSC_BORROW
  (these are NEVER stored long-term)
- field named next/prev/head/tail/link AND points to same type → INTRUSIVE
- assigned from @fieldParentPtr or container_of → BACKREF
- ${crate.endsWith("_sys") ? "this is a *_sys crate → default FFI" : "not *_sys crate"}
- deinit calls bun.destroy(self.field) → OWNED
- NO deinit touches it AND assigned from param → BORROW_PARAM
- can't tell → UNKNOWN with confidence=low`
```

### 通用 TAXONOMY 模板

```js
const TAXONOMY = `
**Classification taxonomy (use these EXACT names):**

${CATEGORY_1}  → ${MAPPING_1}  — ${CRITERION_1}
${CATEGORY_2}  → ${MAPPING_2}  — ${CRITERION_2}
...
UNKNOWN        → ${DEFAULT}    — ${FALLBACK_CRITERION}

**Heuristics (in priority order):**
- ${SIGNAL_1} → ${CATEGORY_X}
- ${SIGNAL_2} → ${CATEGORY_Y}
- can't determine → UNKNOWN with confidence=low
`;
```

## 6. L3: CHECKLIST

### 职责

verify / review agent 的反模式检查清单。具体、可检查、带 severity。

### 设计原则

1. **10+ 条具体反模式** — 不是"检查正确性"
2. **每条可机械检查** — grep / diff / 行数统计
3. **带 severity** — must-fix vs should-fix vs nit
4. **带豁免项** — 减少假阳性
5. **Default to refuted** — 找到任何 must-fix 就 reject

### Annotated Example（Bun build-queue verify）

```js
// From phase-d-build-queue.workflow.js — verify prompt
`Find: spec divergences, silent-no-ops, aliased-&mut,
transmute-to-enum, mem::forget/Box::leak for &'static,
missing match arms, ptr::read of Drop type, wrong-discriminant.
Check docs/PORTING.md §Forbidden.

DEFAULT TO refuted — only report with .zig:line + .rs:line
+ observable divergence. DO NOT edit. DO NOT report compile errors.`
```

### Annotated Example（Bun mega-swarm review）

```js
// From phase-g-mega-swarm.workflow.js — review prompt
`1. NEW non-FFI unsafe? \`git show ${fix.commit} | grep '^+.*unsafe {'\` count.
2. Layering workaround? hook/c_void/dup-type → REJECT.
2b. **Justification-comment reward-hacking?**
    \`git show ${fix.commit} | grep -cE
    '^\\+.*(PORT NOTE|TODO\\(port\\)|reshaped for borrowck|SAFETY:.{100,})'\`
    — if added, REJECT with severity:"reward-hack".
3. Matches .zig spec? Read .zig at each src_edited path.
4. Would fix address the assertion in .diag?

accept:true ONLY if 0 non-FFI unsafe + no workaround + matches spec + addresses diag.`
```

**关键设计：**
- 每条检查有**具体的 grep 命令** — 可机械执行
- **Reward-hack detection** — `PORT NOTE|TODO(port)|SAFETY:.{100,}` 检测用注释为 hack 辩解
- **4 条件 AND-gate** — 所有条件都满足才 accept
- `severity:"reward-hack"` — 专门的 severity 类别

### 通用 CHECKLIST 模板

```js
const CHECKLIST = `
**Adversarial verification checklist (default: refuted).**
Find ANY of the following → set accept=false:

**Must-fix (severity: critical):**
1. ${CHECK_1} — \`${GREP_1}\` → if found, REJECT.
2. ${CHECK_2} — \`${GREP_2}\` → if found, REJECT.

**Should-fix (severity: major):**
3. ${CHECK_3} — ${DESCRIPTION_3}.
4. ${CHECK_4} — ${DESCRIPTION_4}.

**Exemptions (do NOT flag):**
- ${EXEMPTION_1}
- ${EXEMPTION_2}

**Short-circuit:** If ${STUB_CONDITION}, return accept=true, bugs=[].
`;
```

## 7. 组合使用

### 典型 workflow 中的约束组合

```js
// ── 约束常量定义 ──
const HARD_RULES = `**HARD RULES:** ...`;
const NO_BUILD = `**DO NOT run build commands.** ...`;
const BANS = `**BANNED PATTERNS:** ...`;
const TAXONOMY = `**Classification:** ...`;
const CHECKLIST = `**Verification checklist:** ...`;

// ── 按 agent 角色组合 ──
// Survey agent: 只读，只需 HARD_RULES
const surveyPrompt = (task) => `${HARD_RULES}\n${task}`;

// Classify agent: 只读 + taxonomy
const classifyPrompt = (task) => `${HARD_RULES}\n${TAXONOMY}\n${task}`;

// Fix agent: 可写，需要 HARD_RULES + NO_BUILD + BANS
const fixPrompt = (task) => `${HARD_RULES}\n${NO_BUILD}\n${BANS}\n${task}`;

// Verify agent: 只读，需要 HARD_RULES + NO_BUILD + CHECKLIST
const verifyPrompt = (task) => `${HARD_RULES}\n${NO_BUILD}\n${CHECKLIST}\n${task}`;

// Compile agent: 可写 + 可 build（唯一），需要 HARD_RULES（无 NO_BUILD）
const compilePrompt = (task) => `${HARD_RULES}\n${task}`;
```

### 5-stage dedup workflow 的约束分配

```js
// From phase-h-dedup.workflow.js — 不同阶段的约束组合
const NO_TOOLS = `**HARD RULES:** Work in ${WT}.
**DO NOT** run \`cargo\`/\`git\`/\`bun\`. Edit via Edit tool only.
NO commits. NO build/exec.`;

// Find (phase 1): NO_TOOLS + Read/Grep OK
agent(`...${NO_TOOLS} (Read/Grep/Glob OK; no Edit this phase)...`);

// CrossRef (phase 2): NO_TOOLS + Read OK
agent(`...${NO_TOOLS} (Read OK to disambiguate)...`);

// Verify (phase 3): NO_TOOLS only
agent(`...${NO_TOOLS}...`);

// Dedup (phase 4): NO_TOOLS + Edit OK (but no cargo/git)
agent(`...${NO_TOOLS} (Edit OK, NO cargo/git)...`);

// Compile (phase 5): ONLY agent with cargo/git permission
agent(`**You are the ONLY agent allowed cargo/git.**`);
```

这是 NO_TOOLS 分离模式：前 4 个阶段的 agent 不能执行 cargo/git/bun，只有第 5 阶段的 compile agent 可以。

## 8. 验证约束是否被遵守

### 在 verify/review agent 中检查 L1 BANS

```js
// Review prompt 嵌入 L1 BANS 的检查
`1. NEW non-FFI unsafe? \`git show ${commit} | grep '^+.*unsafe {'\` count.
2. Layering workaround? hook/c_void/dup-type → REJECT.
3. Justification-comment reward-hacking?
   \`git show ${commit} | grep -cE
   '^\\+.*(PORT NOTE|TODO\\(port\\)|SAFETY:.{100,})'\`
   — if added, REJECT.`
```

### 在 orchestrator 中检查 L0 HARD_RULES

```js
// Orchestrator 验证 fix agent 的 commit
const fix = await agent(fixPrompt(task), { schema: FIX_S });

// 检查 fix agent 是否只编辑了指定文件
const diff = await agent(`git diff --name-only HEAD~1`, { schema: DIFF_S });
const violations = diff.files.filter(f => !allowedDomain.test(f));
if (violations.length > 0) {
  log(`HARD_RULES violated: edited ${violations.join(', ')}`);
  // revert or flag
}
```

## 9. Checklist：约束设计自检

- [ ] 是否将约束分为 HARD_RULES / BANS / TAXONOMY / CHECKLIST 四层？
- [ ] HARD_RULES 是否 ≤10 条，每条一行，用 NEVER/ALWAYS？
- [ ] HARD_RULES 是否包含 git 操作约束 + build 权限 + 文件域？
- [ ] BANS 是否说明了 WHY + 替代方案？
- [ ] TAXONOMY 是否穷尽互斥，含 UNKNOWN 兜底？
- [ ] TAXONOMY 的类别名是否与 schema `enum` 一致？
- [ ] CHECKLIST 是否有 10+ 具体反模式，可 grep 检查？
- [ ] CHECKLIST 是否有豁免项和 short-circuit？
- [ ] 每种 agent 角色是否只嵌入了它需要的层？
- [ ] NO_BUILD / NO_TOOLS 分离是否明确？
