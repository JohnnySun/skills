# Multi-Workflow Orchestration Guide

> 当任务规模超过单个 workflow 的合理边界，应拆分为多个独立 workflow，通过文件系统状态串联。
> 本文件是 `workflow-good-practices.md` §12 的深度展开，含 Bun 项目 53 workflow 的 annotated examples。

## 1. 何时拆分

单个 workflow 出现以下任一信号时，应拆分为多个独立 workflow：

| 信号 | 阈值 | 原因 |
|------|------|------|
| 行数 | >300 | 认知负荷；diff 不可读 |
| MAX_ROUNDS | >12 | 单 workflow 的修复循环收敛太慢，说明有逻辑独立的前置阶段未完成 |
| 独立阶段数 | ≥3 | adapt / compile-repair / test 各自可独立重试 |
| agent 规模跳变 | 前阶段 6 agent, 后阶段 50+ agent/round | 合并后一个阶段的失败会拖垮另一个阶段 |
| resume 不可靠 | 前阶段完成后 resume 无法跳过 | 拆分后前阶段的 git commit 就是检查点 |

### Bun 的拆分实践

Bun 将 Zig→Rust 重写拆为 8 个 phase（a→h），每个 phase 有 1-15 个独立 workflow：

```
phase-a (1): 初始翻译
phase-b (10): 结构整理（cyclebreak/movein/moveout/verify/fill/ungate）
phase-c (1): panic swarm
phase-d (8): 编译驱动（build-queue/todo-sweep/unsafe-audit）
phase-e (5): proper port
phase-f (4): 重构 + probe swarm
phase-g (4): test swarm（v1/v3/isolated/mega）
phase-h (15): bug hunt / 审计 / 杂项
```

每个 workflow 独立、自包含、幂等。不依赖上游 workflow 的返回值。

## 2. Phase 命名约定

### 字母前缀分组

```
phase-a-<verb>.workflow.js    # 代码生成/初始翻译
phase-b-<verb>.workflow.js    # 结构整理
phase-c-<verb>.workflow.js    # 运行时错误发现
phase-d-<verb>.workflow.js    # 编译驱动修复
phase-e-<verb>.workflow.js    # 真正移植
phase-f-<verb>.workflow.js    # 重构
phase-g-<verb>.workflow.js    # 测试修复
phase-h-<verb>.workflow.js    # 审计/杂项
```

### 命名规则

- `phase-<letter>-<verb>` — letter 表示依赖阶段，verb 表示动作
- 同一 phase 内的多个 workflow 用不同 verb 区分：`phase-d-build-queue`、`phase-d-todo-sweep`、`phase-d-unsafe-audit`
- 独立 workflow（不属于任何 phase 序列）直接用描述性名字：`lifetime-classify`、`dedup-codebase`

### Annotated Example（Bun phase-d 家族）

```
phase-d-build-queue.workflow.js      # cargo build 错误驱动修复
phase-d-todo-sweep.workflow.js       # grep todo!() → 逐文件实现
phase-d-recursive-ungate.workflow.js # 按 tier 移除 #[cfg(any())] 门
phase-d-unsafe-audit.workflow.js     # 审计 unsafe 使用
```

这四个 workflow 操作同一代码库，但各自有独立的 survey 逻辑：
- `build-queue` survey: `cargo build -p bun_bin 2>&1 | grep error`
- `todo-sweep` survey: `grep -rn 'todo!(' src/`
- `recursive-ungate` survey: `grep -c '#[cfg(any())]'` per file
- `unsafe-audit` survey: `grep -rn 'unsafe {' src/`

## 3. Workflow 间状态传递

### 核心原则：文件系统即状态

**每个 workflow 自己 survey 当前状态再决定干什么**——不读上游 workflow 的 JSON 返回值。

```js
// ✅ 正确：自己 survey
const survey = await agent(`grep -rn 'todo!(' src/ | wc -l`, { schema: SURVEY_S });
if (survey.total === 0) return { done: true };

// ❌ 错误：依赖上游返回值
// const { remaining_todos } = args.upstream_result;  // 上游可能已过时
```

### 五种状态传递机制

| 机制 | 适用场景 | 持久性 | 示例 |
|------|---------|--------|------|
| **Git 分支上的代码** | 上游产出的代码文件就是下游的输入 | 永久 | phase-a commit 的 .rs 文件是 phase-d 的输入 |
| **Git commit 历史** | 分支上的 commit 序列即进度 | 永久 | `git log --oneline` 看已完成的修复 |
| **/tmp 诊断文件** | survey 写的 `.diag`/`.err`/`.log` 供 fix agent 读 | 会话内 | `/tmp/mega-diag/*.log` |
| **累积状态文件** | `passing.txt`/`triaged-slow.txt` 跨 round 累积 | 会话内 | `/tmp/tswarm-s0-diag/passing.txt` |
| **TSV/JSON 知识库** | 分类结果供下游引用 | 永久（若 committed） | `LIFETIMES.tsv` |

### Annotated Example（Bun mega-swarm 的累积状态）

```js
// From phase-g-mega-swarm.workflow.js — 累积 passing/triaged-slow
// 每轮 survey 排除已知 passing 和已知 slow 的测试文件

// Survey agent 的关键指令：
`mkdir -p ${DIAG} ${GDIAG};
 touch ${GDIAG}/triaged-slow.txt ${GDIAG}/passing.txt;
 find ${TEST_GLOB} -name '*.test.ts' | sort
   | grep -vxFf ${GDIAG}/triaged-slow.txt   // 排除已知 slow
   | grep -vxFf ${GDIAG}/passing.txt         // 排除已通过
   > ${GDIAG}/all.txt`

// Fix agent 可以将 debug-slow 文件追加到 triaged-slow.txt：
`append the file to ${GDIAG}/triaged-slow.txt so it's excluded from future rounds`
```

这样每轮 working set 只包含未覆盖的 frontier，避免重复 survey 已解决的问题。

## 4. 独立重试设计

### 原则

每个 workflow 必须满足：
1. **幂等**：重跑不会产生副作用（git commit 是天然幂等的——重复 commit 不改变已有内容）
2. **自描述输入**：输入是 `args`（显式参数）+ 文件系统当前状态，不是上游 workflow 的内存变量
3. **收敛检查**：每轮 survey 检查当前状态，已解决的问题不重复处理

### Annotated Example（Bun build-queue 的独立重试）

```js
// From phase-d-build-queue.workflow.js
// 这个 workflow 可以在任何时候重跑——它自己 survey cargo build 的错误

for (let round = 1; round <= MAX_ROUNDS; round++) {
  phase("Survey");
  const survey = await agent(
    `cargo build -p bun_bin 2>&1 | grep error | group by file`,
    { schema: SURVEY_S }
  );
  
  // 自己判断是否已完成
  if (survey.link_ok || survey.total === 0) {
    return { rounds: round, linked: true, history };
  }
  
  // 自己决定 frontier（unseen-first, most-errors-first）
  const frontier = Object.entries(survey.by_file)
    .filter(([f, n]) => n > 0)
    .sort(([fa, na], [fb, nb]) => {
      const sa = seen_files[fa] || 0, sb = seen_files[fb] || 0;
      if (sa !== sb) return sa - sb;  // unseen first
      return nb - na;                  // then by error count
    })
    .slice(0, MAX_FILES_PER_ROUND);
}
```

关键：即使中间某轮失败或超时，重跑时 survey 会发现已修复的文件不再报错，自动聚焦剩余问题。

## 5. Sharding（外部并行）

当单个 workflow 实例的 agent 规模不够覆盖全部工作时，用 sharding 拆成多个并行实例。

### args 约定

```js
const SHARD = args.shard ?? 0;
const NSHARDS = args.nshards || 4;
```

### 分配策略

| 策略 | 适用场景 | 实现 | 优劣 |
|------|---------|------|------|
| **Round-robin（modulo）** | 文件大小均匀 | `items.filter((_, i) => i % NSHARDS === SHARD)` | 均匀但无局部性 |
| **Contiguous slice** | 需要局部性（同目录文件相关） | `sed -n "$((SHARD*slice+1)),$(((SHARD+1)*slice))p"` | 有局部性但可能不均 |
| **Priority-based** | 热点文件优先 | `sort by error count desc, then round-robin` | 热点先修但实现复杂 |
| **Mega-file split** | 超大文件 | `line-range buckets (800 lines each)` | 适用于单文件 >800 行 |

### Shard 隔离

每个 shard 实例应有独立的 worktree + branch：

```js
// From phase-g-test-swarm-v3.workflow.js
const WT = `/root/bun-5-tswarm-s${SHARD}`;
const DIAG = `/tmp/tswarm-s${SHARD}-diag`;

// 隔离设置
await agent(`
  if test -d ${WT}; then
    git -C ${WT} fetch origin claude/phase-a-port
    git -C ${WT} rebase origin/claude/phase-a-port || git -C ${WT} rebase --abort
  else
    git -C /root/bun-5 worktree add -b claude/phase-g-tswarm-s${SHARD} ${WT} origin/claude/phase-a-port
  fi
  git -C ${WT} push -u origin claude/phase-g-tswarm-s${SHARD} 2>/dev/null || true
`);
```

### Shard 合并

shard 完成后需要合并回主分支。常见模式：
1. **Push per-shard branch** — orchestrator 或人类做 merge
2. **Per-round push** — 每轮结束 push，确保 commit 持久化
3. **Rebase onto upstream** — 新 round 开始时 rebase 获取其他 shard 的改动

## 6. FAIL_BATCH（快速失败）

survey 阶段发现太多失败时，提前停止以节省 token：

```js
// From phase-g-test-swarm-v3.workflow.js
const FAIL_BATCH = A.fail_batch || 14; // stop survey after this many failures

// Survey prompt 中：
`FAIL-FAST: stop after ${FAIL_BATCH} failures.`
`fails=0; for f in ...; do ...; fails=$((fails+1)); [ $fails -ge ${FAIL_BATCH} ] && break; done`
```

好处：
- 避免在大量失败时浪费 token 做完整 survey
- 每轮只修 FAIL_BATCH 个问题，修完再 survey 剩余
- 实现了自然的优先级——先发现的问题先修

## 7. Stuck Detection + Early Exit

除了 MAX_ROUNDS 硬上限，还需检测"进展停滞"：

```js
// From workflow-good-practices.md §14 — Compile-Queue 模式
let prevTotal = Infinity;
for (let round = 0; round < MAX_ROUNDS; round++) {
  const survey = await agent(`...`, { schema: SURVEY_S });
  
  // Stuck detection: 错误数没减少
  if (round > 0 && survey.total >= prevTotal) {
    log(`stuck: ${survey.total} errors (was ${prevTotal}) — stopping`);
    break;
  }
  prevTotal = survey.total;
  
  // ... fix pipeline ...
}
```

也可用更细粒度的 stuck detection：
- 连续 2 轮同一文件报同样错误 → 降低该文件优先级
- 连续 3 轮 fix 后 verify 仍拒绝 → 标记为"需人工"

## 8. 编排执行顺序

### 手动执行

最简单的方式——人类按顺序运行：

```bash
# 1. 代码适配
claude -p "run workflow phase-a-adapt"
# 2. 检查结果，确认 OK
# 3. 编译修复
claude -p "run workflow phase-d-build-queue"
# 4. 测试修复
claude -p "run workflow phase-g-test-swarm-v3 --args '{\"shard\":0, \"nshards\":4}'"
```

### 脚本编排

```bash
#!/bin/bash
set -e

# Phase A: adapt
claude -p "run workflow phase-a-adapt" || { echo "phase-a failed"; exit 1; }

# Phase D: compile repair (retry up to 3 times)
for i in 1 2 3; do
  claude -p "run workflow phase-d-build-queue" && break
  echo "phase-d attempt $i failed, retrying..."
done

# Phase G: test swarm (4 shards in parallel)
for s in 0 1 2 3; do
  claude -p "run workflow phase-g-test-swarm-v3 --args '{\"shard\":$s, \"nshards\":4}'" &
done
wait
```

### 关键原则

1. **不要在一个 workflow 里调另一个 workflow** — workflow 不能嵌套
2. **每个 workflow 的 exit code / return value 用于判断下一步** — `{ done: true }` vs `{ done: false }`
3. **人类是编排器** — 人类根据每个 workflow 的输出决定下一步
4. **Git commit 是检查点** — 任何时候都可以从当前 git 状态重新开始

## 9. Checklist：拆分前自检

在决定拆分之前，回答以下问题：

- [ ] 单 workflow 行数是否 >300？
- [ ] MAX_ROUNDS 是否 >12？
- [ ] 有几个逻辑独立的阶段？（≥3 就该拆）
- [ ] 前面阶段失败后，是否需要从头重跑后面的阶段？（不需要 → 拆）
- [ ] 不同阶段的 agent 规模是否差异大？（差异大 → 拆）
- [ ] 每个拆出的 workflow 能否独立 survey 当前状态？（不能 → 不拆，找其他方式）
- [ ] 每个拆出的 workflow 是否幂等？（不是 → 先改幂等再拆）
