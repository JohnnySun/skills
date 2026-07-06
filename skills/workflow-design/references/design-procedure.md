# Design Procedure

The 7-step procedure for designing a `.workflow.js`. Walk it top-down; loop back to step 3 when a smell check fails (see `anti-patterns.md`). The shared standard for "good" lives in `workflow-good-practices.md`; this file reframes it as an actionable sequence.

## Step 0 — Gate: should you even use a workflow?

Before step 1, confirm a workflow is the right tool. Use a workflow only if at least one of breadth / verification / scale / reuse / determinism applies (see SKILL.md "Gate" section or `workflow-good-practices.md` §1). Otherwise: one agent, a hook, or a human-in-the-loop split. Skipping this gate is the #1 source of over-engineered workflows.

## Step 1 — Decompose the need

Write down, in plain prose, the answer to each:

- **What is the unit of work?** (one file? one shard? one test case? one claim?)
- **What is the ground truth** the workflow must converge toward? (a spec, a baseline, a rulebook, an upstream version)
- **What does "done" look like?** — a concrete terminal artifact: a ranked report, a patch set, a green test run, a knowledge-base file.
- **Where does the input come from?** (`args` — file list, config, timestamps; never `Date.now()`).

If you cannot name the unit, the ground truth, and the terminal artifact, you do not have a design yet — go back to the user.

## Step 2 — Partition into phases

Group the work into ordered phases. Each phase has:

- a **title** (kebab-case, short) — this becomes both a `meta.phases` entry and a `phase(title)` call,
- a **one-line intent** ("one agent per <unit> discovers <work>"),
- a **data-flow arrow** (`a → b → c`) describing what enters and what leaves.

Aim for 3-5 phases. More than 5 usually means you have two workflows stitched together — split them with a human sign-off in between. Fewer than 2 means you probably don't need a workflow at all (revisit step 0).

### Phase kinds you will reuse

| Kind | Purpose | Typical primitive |
|---|---|---|
| Survey / Find | discover work units or defects | `parallel` (one per dimension/shard) |
| Fan-out Fix | apply a fix per unit | `pipeline` (per item: fix → verify) |
| Adversarial Verify | refute draft findings | `parallel([vote1, vote2])` then dedup |
| Synthesize / Coalesce | merge across units into one artifact | single `agent` |
| Compile / Commit | single owner of a side-effecting resource | single `agent` |

## Step 3 — Pick the control-flow primitive per phase

This is the most consequential decision. Use `references/mode-selection-guide.md` for the full decision table. The one-sentence rule:

- **Same item across stages, data passes between stages** → `pipeline`.
- **Same phase, many independent tasks, next phase needs ALL of them** → `parallel` (barrier).
- **Need many agents exploring with no shared state** → swarm (parallel fan-out + dedup).
- **Need to keep going until a condition** → loop, but **bounded** (`MAX_ROUNDS`) and dedup against the **seen superset**.
- **Items have dependency order** (crate DAG, module layers) → **tier-ordered loop**: process low-tier first so high-tier sees real definitions. `for (const tier of TIERS) { pipeline(tier.files, ...) }`. (Bun `phase-d-recursive-ungate` pattern.)
- **Work is a 5-stage pipeline** (find duplication / wrap unsafe / refactor) → **Find(shard) → CrossRef → Verify(2-vote) → Apply(Edit only) → Compile(single agent)**. The first 4 stages use NO_TOOLS (no cargo/git); only stage 5 has build+commit permission. (Bun `phase-h-dedup` pattern.)

Document, per phase, the dependency shape — not just "use parallel." If you wrote `parallel → transform → parallel` and the transform has no cross-item dependency, switch to `pipeline`. The barrier's wall-clock cost is real.

## Step 4 — Design the output schema per agent

**Always prefer the `schema` option over asking for JSON in the prompt.** Validation happens at the tool-call layer; mismatches auto-retry.

For each agent role, define:

- **Top-level shape**: `{ type:"object", required:[...], properties:{...} }`. `required` is the agent's contract.
- **`description` fields are form-filling instructions to the agent** ("absolute path of the .rs file you wrote"), not human docs.
- **`enum` for grading/classification**: `confidence: ["high","medium","low"]`, `severity: ["must-fix","should-fix","nit"]`.
- **Every finding carries an executable `fix` field** — so a downstream agent can apply it mechanically. This is the hinge of the adversarial loop.
- **Review-style agents return `accept: boolean` + `bugs: [...]`** — accept gates, bugs feed back.
- **Parallel branches share one output schema** so they can be merged/deduped.
- **Agents return counts** (applied / ungate / todos); the workflow `reduce`s to top-level stats for health checks.

## Step 5 — Choose the verification pattern

Verification strength rises with the cost of a wrong answer (see `workflow-good-practices.md` §5):

| Pattern | When | Shape |
|---|---|---|
| Single verifier | low-cost output | `implement → 1 adversarial verifier → fix`; verifier "default ok=false if ANY must-fix" |
| **2-vote verify** (mainstream) | most findings | `parallel([vote1, vote2]).then(dedup by key)`; accepted = every `accept` |
| 3-vote refute | pollutes downstream (e.g. knowledge base) | 3 agents try to refute; `refutes >= 2` to overturn |
| Tiebreak | 2-vote split | add a third vote |
| Review→apply until dry | high-stakes edits | apply then re-review, until accept or round cap |

### Verifier prompt essentials

- **Ingest ground truth first** — the verifier reads `Read <GUIDE>` (the rulebook) then `Read <spec>` (source of truth) then `Read <draft>` (the artifact under review), in that order, before checking anything.
- **Scope checks to the rulebook only** — "Check ONLY against <GUIDE> rules." Findings outside the GUIDE's scope are noise.
- **"Default to refuted / ok=false"** — force an adversarial posture.
- **High-value targets = a concrete anti-pattern checklist (10+ items)**, not "check correctness."
- **Explicit exemptions** to cut false positives.
- **Short-circuit condition** so stubs don't waste adversarial effort.
- **Fix prompt embeds the verifier's `issues` JSON**, and permits skipping if the verifier hallucinated.

(The order above matters: ingest → scope → targets → exemptions → short-circuit, mirroring the verifier skeleton in `workflow-good-practices.md` §5.)

## Step 6 — Author the skeleton script

Use `references/skeleton-template.md` as the starting point. Minimum viable skeleton:

1. `export const meta = { name, description, phases }` — `name` kebab-case and identical to the filename (`<name>.workflow.js`); `description` is one line: phase intent + data-flow arrow.
2. Top-of-script argument handling: `args` fallback, string-input compat, early `return { error: "..." }`, `log()` progress.
3. One `phase(title)` call per `meta.phases` entry — keep them coupled via the title string.
4. Compose primitives per step 3; pass `schema` per step 4; wire verification per step 5.
5. `reduce` agent counts to a top-level stats object; return it.

Authoring rules that are easy to forget:

- **No `Date.now()` / `Math.random()` / no-arg `new Date()`** — runtime throws. Timestamps come in via `args`; vary prompt/label by index.
- **`label` = `kind:short-path`** (`impl:fetch.zig`, `verify:runtime/server`) so the UI can tell hundreds of concurrent agents apart.
- **Force paths** — computed path mappings (e.g. `.zig → .rs`) override agent self-reported paths; verify stage uses computed values.
- **`git add <exact files>`** not `git add -A`; `core.hooksPath=/dev/null` to disable hooks in isolated runs.
- **Build is centralized** — one build per round (NO_BUILD); fix/review/apply agents only read source + diagnostics.

## Step 7 — Cost & isolation check

Before declaring the design done:

1. **Pilot on a small slice.** Estimate token cost by running one shard/dimension, then multiply. A big run that surprises you on cost has already failed.
2. **Route low-value stages to a smaller `model`** via the `model` option.
3. **Isolation matches write-conflict risk.** List every file each agent writes. If two parallel agents write the same file → `isolation: "worktree"` or disjoint file domains. Strongest pattern: agent produces a patch string, orchestrator applies (agents never touch git).
4. **Concurrency ceiling.** ~16 concurrent (CPU-bound), 1000 agents per run. If you exceed, shard or add rounds.
5. **Loop bounds present.** Every loop has `MAX_ROUNDS` / `MAX_FILES`; `budget.total` is guarded against null.
6. **`meta.phases` and `phase()` calls agree.** A human reading `meta.phases` and a user watching the UI must see the same story.
7. **Permissions.** Subagents inherit `acceptEdits` + the tool allowlist; add needed commands to the allowlist before a long run. Under `claude -p` / Agent SDK there is no interactive confirmation — avoid stages that depend on MCP tools needing interactive approval.
8. **Multi-workflow split check.** If the script is >300 lines, MAX_ROUNDS >12, or has ≥3 logically independent stages — split into multiple independent workflows per `references/multi-workflow-guide.md`. Each workflow must self-survey current state (file-system-as-state) and be independently retryable.
9. **Constraint layering check.** Verify that agent prompt constraints are organized into named layers (HARD_RULES / BANS / TAXONOMY / CHECKLIST) per `references/constraint-layers-guide.md`. No flat string mixing all constraints; each agent role receives only the layers it needs. HARD_RULES is a shared `const`, not copy-pasted inline.

## Output

The deliverable of this procedure is a reviewed `.workflow.js` plus, optionally, a one-paragraph design note covering: unit of work, ground truth, terminal artifact, chosen meta-pattern, verification mode, isolation level, and pilot cost estimate. Hand the script to the user; do not auto-run unless asked. The review-time mirror of this procedure is the `workflow-review` skill.
