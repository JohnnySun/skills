# Anti-Patterns

Bad workflow smells to catch at design time — before a single agent runs. Each is sourced from the shared kernel `workflow-good-practices.md` §11. When any of these is present, loop back to step 3 of `design-procedure.md` and re-pick the primitive.

## Control-flow smells

### parallel → transform → parallel with no cross-item dependency
You wrote `parallel(...)` then a transform that touches each item independently, then `parallel(...)` again. The middle barrier adds wall-clock latency for nothing.
**Fix:** collapse into a `pipeline(items, transformAsStage, nextStage)`. The barrier's cost is real.

### Unjustified barrier
A `parallel` whose results the next phase does not actually need *all* of. Legitimate barriers are only three: (1) dedup/merge across the full set before downstream, (2) early exit based on the total ("0 findings → skip"), (3) a downstream prompt must reference other findings for comparison. Anything else is a barrier by accident.
**Fix:** switch to `pipeline`, or remove the barrier.

### Loop with no bound
A `for`/`while` with no `MAX_ROUNDS` / `MAX_FILES`. A finder that never dries up will run to the agent ceiling.
**Fix:** every loop gets a hard cap; prefer an explicit `MAX_ROUNDS` constant.

### Loop-until-dry dedups against `confirmed` instead of `seen`
Rejected findings recur every round because they were never recorded as seen. The loop never converges.
**Fix:** dedup against the **seen superset** — every finding ever returned, accepted or not.

### Unguarded `budget.total`
A loop-until-budget reads `budget.total` without a null check. When `budget` is absent the loop runs to the 1000-agent ceiling.
**Fix:** `const BUDGET = budget && budget.total != null ? budget.total : null;` then bail if null.

### `meta.phases` and `phase()` calls disagree
The declarative directory a human reads and the runtime progress markers a user watches tell different stories. The UI lies.
**Fix:** keep them coupled via the title string; one `phase(title)` call per `meta.phases` entry (titles may repeat in loops — that is fine).

## Schema smells

### "Return JSON" in the prompt instead of the `schema` option
Asking the agent to emit JSON in prose. No tool-call-layer validation, no auto-retry on mismatch, brittle parsing downstream.
**Fix:** always use the `schema` option. Validation is enforced at the tool-call layer.

### Finding without an executable `fix` field
A finding reports a problem but no machine-applicable fix. The downstream apply agent cannot act mechanically — the adversarial loop breaks.
**Fix:** every finding's schema requires `fix` ("exact edit instruction a downstream agent can apply mechanically").

### Verifier prompt says "check correctness"
A vague instruction produces vague refusals and false positives. Adversarial verifiers need a target.
**Fix:** give the verifier a concrete **anti-pattern checklist (10+ items)**, explicit exemptions to cut false positives, a short-circuit for stubs, and "default to ok=false."

### Parallel branches with divergent output schemas
Two vote agents return differently-shaped objects; the dedup/merge step has to special-case each.
**Fix:** parallel branches share one output schema.

## Determinism smells

### `Date.now()` / `Math.random()` / no-arg `new Date()`
The runtime forbids nondeterministic functions and throws. Time-based logic silently breaks.
**Fix:** pass timestamps in via `args`; vary prompt/label by index.

### Agent self-selects output path or directory
The agent picks where to write, so the verify stage cannot find the artifact deterministically.
**Fix:** force a path mapping (e.g. `.zig → .rs`); the verify stage uses the computed path, overriding any agent self-report.

### Every agent builds
Each fix agent runs `cargo build` / `xcodebuild` / `./gradlew`. Wall-clock explodes and build state conflicts.
**Fix:** NO_BUILD — one build per round, owned by a single agent; fix/review/apply agents are read-only over source + diagnostics.

### Large test output pasted into the prompt
The full build log or test dump goes into the agent prompt, blowing tokens and diluting attention.
**Fix:** write diagnostics to `/tmp` files (`.diag`/`.baseline`/`.log`); agents `cat` only the slice they need.

## Isolation smells

### Parallel agents writing the same file with no worktree
Concurrent writes to one file corrupt it; concurrent `git` operations conflict.
**Fix:** `isolation: "worktree"` per shard, or disjoint file domains. Strongest pattern: agent produces a **patch string**, orchestrator applies (agents never touch git).

### 30 agents each `git commit`
Concurrent commits race; the repo history is garbage.
**Fix:** orchestrator transactionally commits with `git add <exact files>` (never `git add -A`); `core.hooksPath=/dev/null` in isolated runs.

### Agent uses `git add -A` or `git add .`
Stages unintended files; rewards path-fudging.
**Fix:** explicit-path commit — list the exact files the agent wrote.

## Cost smells

### No pilot on a small slice
A big run surprises you on token cost after it has already spent.
**Fix:** run one shard/dimension first, multiply, then launch the full run.

### Low-value stages on the big model
Every stage uses the default (expensive) model, including mechanical slicing or counting.
**Fix:** route low-value stages to a smaller `model` via the `model` option.

### No top-level stats
The workflow returns a blob; you cannot tell if 2 of 200 agents failed silently.
**Fix:** agents return counts; the workflow `reduce`s to a top-level stats object (`total`/`accepted`/`rejected`/`fixed`/`failed`).

## Reward-hacking smells

### "PORT NOTE" / "TODO(port)" / long "SAFETY:" comments used to justify a hack
An agent papers over a non-fix with a comment that argues for itself, and the reviewer accepts it.
**Fix:** reviewer greps for `PORT NOTE|TODO(port)|SAFETY:.{100,}` and REJECTs matches. Reward-hack detection is a first-class verify dimension.

## Safety & permissions smells

### Long run without allowlisting the commands it needs
Subagents inherit `acceptEdits` + the tool allowlist, but un-allowlisted shell/web/MCP calls still prompt mid-run. A 200-agent run stalls on the first un-allowlisted `cargo` call.
**Fix:** before the run, add every command the workflow issues to the allowlist. Under `claude -p` / Agent SDK there is no interactive confirmation — un-allowlisted calls fail outright.

### A stage depends on an MCP tool needing interactive approval
Headless (`claude -p` / Agent SDK) has no confirmation prompt, so MCP-dependent stages that work interactively fail silently in CI.
**Fix:** avoid stages that depend on interactively-approved MCP tools. If unavoidable, document the MCP dependency in the script and provide a non-MCP fallback.

## Design-time checklist

Before declaring the design done, scan for every item above. The single highest-value check: **is there a `parallel → transform → parallel` with no cross-item dependency?** If yes, it is a pipeline in disguise — fix it first.

## Multi-workflow & constraint smells (from Bun practice)

### Monolithic workflow exceeding split thresholds
A single `.workflow.js` exceeds 300 lines, MAX_ROUNDS >12, or mixes ≥3 logically independent stages (e.g. adapt + compile + test in one script). When the first stage fails, the entire workflow must restart from scratch.
**Fix:** split into independent phase-lettered workflows per `multi-workflow-guide.md`. Each workflow self-surveys the git tree; file-system-as-state, not return-value chaining.

### Workflow depends on upstream workflow's return value
A workflow reads `args.upstream_result` or expects a specific JSON structure from a prior workflow's return. When the upstream is re-run or its schema changes, the downstream breaks silently.
**Fix:** each workflow surveys the current file-system state (`grep`, `cargo build`, `find`) to discover its work. The git branch + `/tmp` diag files are the state transfer mechanism.

### Flat constraint string in agent prompts
All constraints — git rules, banned code patterns, domain taxonomy, verification checklist — are mixed in one string. Different agent roles see irrelevant constraints; modifying one rule requires changing N prompts.
**Fix:** extract constraints into named layers (`const HARD_RULES`, `const BANS`, `const TAXONOMY`, `const CHECKLIST`) per `constraint-layers-guide.md`. Compose per role: `fixPrompt = HARD + BANS + task`.

### Fix/implement agent has no BANNED patterns list
The verifier has a concrete anti-pattern checklist (L3 CHECKLIST), but the fix agent that produces the code has no awareness of what patterns are forbidden (L1 BANS). The fix agent produces banned code; the verifier catches it; the fix agent produces banned code again.
**Fix:** extract a BANS constant listing forbidden code patterns with WHY + alternative, and embed it in every fix/implement agent prompt. The verifier's CHECKLIST then validates compliance.

### No stuck detection in repair loop
A loop has `MAX_ROUNDS` but no check for progress stalling. The loop grinds through all rounds even when `survey.total` stops decreasing.
**Fix:** add stuck detection: `if (round > 0 && survey.total >= prevTotal) { log("stuck"); break; }`. For finer granularity: track per-file seen count and deprioritize files that fail 3+ rounds.

### Git commit with no retry in concurrent multi-agent writes
Multiple agents commit to the same branch concurrently. The first succeeds; the rest fail on push with "non-fast-forward". No retry logic, so their work is lost.
**Fix:** use the git retry pattern: `for i in 1..5; add && commit && pull --no-rebase -X ours && push && break || sleep $((RANDOM%6+1))`. The `-X ours` merge strategy works because agents edit disjoint file domains.
