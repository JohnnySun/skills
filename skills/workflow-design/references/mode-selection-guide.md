# Mode Selection Guide

How to pick the control-flow primitive for each phase. The shared standard lives in `workflow-good-practices.md` §3; this file is the decision table and the "when each" rationale. Read this *before* authoring — the primitive choice is the most consequential design decision and the single most common source of wasted wall-clock.

## The four modes

| Mode | Primitive(s) | Semantics | Barrier? | When |
|---|---|---|---|---|
| **Pipeline** | `pipeline(items, ...stages)` | Each item independently threads through all stages | No | Same item's stages pass data to each other; items need not sync |
| **Parallel** | `parallel(thunks)` | Run all thunks concurrently | Yes (wait-for-all) | One phase, many independent tasks, next phase needs ALL of them |
| **Swarm** | `parallel` fan-out + dedup | Many agents explore/probe with no shared state, then coalesce | Yes (at dedup) | Broad search where individual hits are uncertain (panic-swarm, audit sweep) |
| **Loop** | `for`/`while` over `MAX_ROUNDS` | Repeat a survey/fix/verify body until a stop condition | Per round | Coverage grows incrementally; working set shrinks each round |

`agent()`, `phase()`, `log()`, `args`, `budget` are not "modes" — they are building blocks composed *inside* a mode. `agent()` is the atom of dispatch; `phase()`/`log()` are observability; `args`/`budget` are inputs and dynamic depth.

## Decision table

Answer these in order.

| Question | If yes | If no |
|---|---|---|
| 1. Does the same item pass data from one stage to the next? | → **Pipeline** | go to 2 |
| 2. Are there many independent tasks in one phase that the *next* phase must all receive? | → **Parallel** (barrier is justified) | go to 3 |
| 3. Is the work a broad search where hits are uncertain and must be deduped? | → **Swarm** (parallel + dedup) | go to 4 |
| 4. Does coverage grow incrementally / does the working set shrink per round? | → **Loop** (bounded) | go to 5 |
| 5. Is it a single step? | → single `agent()` | Revisit step 0 of `design-procedure.md` — you may not need a workflow |

## When each

### Pipeline — `pipeline(items, ...stages)`

**Shape:** each item independently walks `stage1 → stage2 → ... → stageN`. Stage N receives stage N-1's return value. No barrier between items.

**Use when:** the dependency is *along* the item (stage-to-stage), not *across* items.

**Canonical example — Implement→Verify→Fix:**
```js
pipeline(
  FILES,
  (f) => agent(implPrompt(f), { label: `impl:${f}`, phase: "Fix", schema: implSchema }),
  (r, f) => agent(verifyPrompt(r, f), { label: `verify:${f}`, phase: "Verify", schema: verifySchema }),
  (r, f) => r.accept ? r : agent(fixPrompt(r, f), { label: `fix:${f}`, phase: "Fix", schema: fixSchema }),
);
```
Here `fix` consumes `verify`'s `issues` JSON — a within-item dependency. Items do not wait for each other.

### Parallel — `parallel(thunks)`

**Shape:** all thunks run concurrently; the result resolves only when *every* thunk completes. This is a **barrier**.

**Use when** (only three legitimate reasons — see `anti-patterns.md` for the smell):
1. The next phase needs the **full set** to dedup/merge before going downstream.
2. An **early exit based on the total** ("0 findings → skip verify").
3. A downstream prompt must **reference other findings** for comparison.

**Canonical example — 2-vote adversarial verify:**
```js
parallel([
  agent(votePrompt(findings, lens="correctness"), { label: "vote:corr", schema: voteSchema }),
  agent(votePrompt(findings, lens="security"),   { label: "vote:sec",  schema: voteSchema }),
]).then(([a, b]) => dedup([...a.bugs, ...b.bugs], by: "location"));
```
Both votes must complete before dedup — a justified barrier.

### Swarm — parallel fan-out + dedup

**Shape:** `parallel` over many probes (often N identical-looking agents on different seeds/shards) → flatten → dedup by a stable key.

**Use when:** broad search where the *existence* and *location* of hits is uncertain. Classic cases: panic-swarm (probe N locations for a crash, dedup by stack/location), audit sweep (one agent per dimension: correctness/security/perf/repro).

**Canonical example — audit fan-out:**
```js
const dims = ["correctness", "security", "performance", "reproducibility"];
parallel(
  dims.map((d) => agent(surveyPrompt(d), { label: `survey:${d}`, phase: "Survey", schema: surveySchema }))
).then((byDim) => byDim.flatMap((r) => r.findings));
```
Barrier is justified: synthesize needs all dimensions (reason #1).

### Loop — `for` / `while` over `MAX_ROUNDS`

**Shape:** repeat `{ survey → pipeline(frontier, fix, verify, bugfix) }` until a stop condition or `MAX_ROUNDS`.

**Use when:** coverage grows incrementally and the working set shrinks per round (Survey→Fan-out→Re-survey). Also loop-until-dry (keep dispatching a finder until K consecutive rounds yield no new finding) and loop-until-budget (use `budget` to scale depth).

**Mandatory guards:**
- **`MAX_ROUNDS` / `MAX_FILES`** — no unbounded loop.
- **Dedup against the *seen superset***, not just confirmed results. Deduping only against `confirmed` lets rejected findings recur every round and the loop never converges.
- **`if (budget.total == null) bail`** — loop-until-budget must guard `budget.total` against null or it runs to the 1000-agent ceiling.
- **Accumulate passing/triaged sets** so each round's working set is only the uncovered frontier.

**Canonical example — Survey→Fan-out→Re-survey:**
```js
const MAX_ROUNDS = 5;
for (let round = 0; round < MAX_ROUNDS; round++) {
  phase(`Round ${round + 1}`);
  const frontier = await agent(surveyPrompt(seenSoFar), { label: `survey:r${round}`, schema: surveySchema });
  if (frontier.items.length === 0) { log("dry"); break; }
  await pipeline(frontier.items, fix, verify, bugfix);
  if (frontier.earlyExit) break;
}
```

## The composite shape (most real workflows)

Real workflows are usually **nested**: a `pipeline` whose middle stage is a `parallel`, or a `loop` whose body is a `pipeline`. The recurring composite:

```js
pipeline(
  items,
  stage1,
  (r, item) => parallel([vote1(r), vote2(r)]).then(dedup),  // nested parallel inside pipeline
  stage3,
);
```
Design the *innermost* dependency first, then wrap. If you find yourself writing `parallel → transform → parallel` where the middle transform has no cross-item dependency, collapse it into a `pipeline` — see `anti-patterns.md`.

## One-line rule to remember

> **Along-item dependency → `pipeline`. Across-item barrier → `parallel`. Broad uncertain search → swarm. Growing coverage → bounded `loop`. Dependency order → tier-ordered `loop`.**

## Advanced modes (from Bun practice)

### Tier-ordered loop

**Shape:** `for (const tier of TIERS) { pipeline(tier.files, fix, verify, bugfix) }` — process items in dependency order. Low-tier items are processed first so high-tier items see real definitions.

**Use when:** items have a dependency DAG (crate hierarchy, module layers, build targets). Processing out of order causes cascading errors (high-tier code references low-tier stubs).

**Canonical example — Bun `phase-d-recursive-ungate`:**
```js
const TIERS = [
  { tier: 0, crates: ["bun_core", "bun_alloc", "string", "paths", "sys"] },
  { tier: 1, crates: ["logger", "options_types", "watcher"] },
  // ...
  { tier: 6, crates: ["bun_bin"] },
];
for (const tier of TIERS) {
  phase("Survey");
  const survey = await agent(`Survey gates in tier ${tier.tier}`, { schema: SURVEY_S });
  if (survey.total === 0) continue;  // tier already clean
  await pipeline(survey.files, ungate, twoVoteVerify, bugfix);
}
```

Key: within a tier, all files run in parallel (no inter-file dependency); across tiers, strict order (tier 0 before tier 1).

### 5-stage Find → CrossRef → Verify → Apply → Compile

**Shape:** `parallel(shards, find) → agent(crossref) → pipeline(clusters, parallel(2-vote)) → parallel(apply) → agent(compile)`. A broad codebase sweep with deduplication, verification, and a single compile gate.

**Use when:** the work is a codebase-wide sweep (dedup, unsafe-wrap, pattern migration) where: (a) findings must be discovered sharded, (b) cross-shard dedup is needed, (c) edits are independent but compile must be centralized.

**Canonical example — Bun `phase-h-dedup`:**
```js
// Phase 1: Find (30 shard-agents read crates, output dup candidates)
const found = await parallel(SHARDS.map(sh => () => agent(`Find dups in ${sh}`, { schema: FIND_S })));
// Phase 2: CrossRef (merge candidates across shards into clusters)
const clusters = await agent(`Cross-reference into clusters`, { schema: CLUSTER_S });
// Phase 3: Verify (2-vote per cluster)
const verified = await pipeline(clusters, c => parallel([vote1, vote2]).then(dedup));
// Phase 4: Dedup (Edit only, NO cargo/git)
const applied = await parallel(accepted.map(r => () => agent(`Apply dedup. NO cargo/git.`)));
// Phase 5: Compile (ONLY agent with cargo/git permission)
await agent(`cargo check, fix errors, commit. You are the ONLY agent allowed cargo/git.`);
```

Key: phases 1-4 use `NO_TOOLS` (no cargo/git/bun); only phase 5 has build+commit permission. This is the **NO_TOOLS separation** pattern.
