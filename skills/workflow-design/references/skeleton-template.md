# Skeleton Template

Annotated `.workflow.js` skeleton plus the reusable shapes for `meta`, `agent`, `pipeline`, `parallel`, and `schema`. Start every script from this skeleton; do not improvise topology. The standard lives in `workflow-good-practices.md` §2-§4; this file is the copy-paste starting point.

## Full annotated skeleton

```js
// File: phase-audit-synthesize.workflow.js   (filename MUST equal meta.name)
//
// A workflow script is a plain JS module. The runtime imports it, reads `meta`,
// then executes the default-exported async function. Intermediate results live
// in script variables — only the final return value re-enters the session
// context, so a single run can scale to hundreds of agents without blowing the
// context window.

export const meta = {
  // name: kebab-case, identical to the filename (minus .workflow.js).
  name: "phase-audit-synthesize",

  // description: ONE line = phase intent + data-flow arrow (a → b → c).
  // This is the human's map; keep it honest with the actual phases below.
  description: "Audit fan-out → adversarial verify → synthesize (dims → findings → report)",

  // phases: declarative phase directory (human reads this; the UI shows it).
  // Loosely coupled to phase() calls below via the title string — keep them in sync.
  phases: [
    { title: "Survey",    detail: "one agent per dimension discovers findings" },
    { title: "Verify",    detail: "2-vote adversarial check, dedup by location" },
    { title: "Synthesize", detail: "single agent ranks accepted findings into a report" },
  ],
};

// ---- Step 0: top-of-script argument handling (uniform entry contract) ----
// args may be a string (from CLI) or an object. Always normalize + early-return
// on bad input. Never read time nondeterministically — pass timestamps in.
export default async function ({ args, budget } = {}) {
  const A = typeof args === "string" ? JSON.parse(args) : args || {};
  const TARGET = A.target;                       // e.g. repo path / module glob
  const DIMS = A.dimensions || ["correctness", "security", "performance", "repro"];
  if (!TARGET) return { error: "no target in args.target" };

  // Guard budget before any loop uses it (anti-pattern: unguarded → 1000 agents).
  const BUDGET = budget && budget.total != null ? budget.total : null;

  log(`audit: target=${TARGET}, dims=${DIMS.length}`);

  // ---- Phase 1: Survey (parallel barrier — Synthesize needs ALL dimensions) ----
  phase("Survey");
  const surveyResults = await parallel(
    DIMS.map((d) =>
      agent(surveyPrompt(d, TARGET), {
        label: `survey:${d}`,                    // kind:short-path — UI distinguishes hundreds
        phase: "Survey",
        schema: surveySchema,                    // tool-call layer validates; auto-retry on mismatch
      })
    )
  );
  // Flatten into one findings list; every finding carries an executable `fix`.
  let findings = surveyResults.flatMap((r) => r.findings);
  log(`survey: ${findings.length} raw findings`);

  // Early exit based on the total (legitimate barrier use #2).
  if (findings.length === 0) {
    return { total: 0, accepted: 0, report: "no findings" };
  }

  // ---- Phase 2: Verify (pipeline over findings; per-finding parallel 2-vote, then dedup) ----
  // vote1 and vote2 are INDEPENDENT (neither consumes the other's output) → parallel, not pipeline.
  // The pipeline carries each finding through; the two votes on a finding are a barrier (we need both before dedup).
  phase("Verify");
  const verified = await pipeline(
    findings,
    (f) => parallel([
      () => agent(votePrompt(f, "correctness"), {
        label: `vote:corr:${f.location}`,
        phase: "Verify",
        schema: voteSchema,
      }),
      () => agent(votePrompt(f, "security"), {
        label: `vote:sec:${f.location}`,
        phase: "Verify",
        schema: voteSchema,
      }),
    ]).then(([v1, v2]) => ({ f, v1, v2 })),
  );
  // accepted = every vote.accept; single-pass dedup of accepted findings by location.
  // accept gates (which findings survive); bugs feed back (the defects the voters found).
  const seen = new Set();
  const accepted = verified
    .filter(({ v1, v2 }) => v1.accept && v2.accept)
    .filter(({ f }) => {
      const key = f.location;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ f }) => f);
  // Merge the bugs both voters returned — these are the actionable defects. In a full
  // Implement→Verify→Fix chain they feed a downstream Fix/Apply stage; here the example
  // trims to Survey→Verify→Synthesize, so we surface them in the report instead (do NOT
  // silently drop what the schema contract requires voters to return).
  const allBugs = verified.flatMap(({ v1, v2 }) => [...(v1.bugs || []), ...(v2.bugs || [])]);
  log(`verify: ${accepted.length} accepted, ${allBugs.length} bugs surfaced`);

  // ---- Phase 3: Synthesize (single agent — one owner of the terminal artifact) ----
  phase("Synthesize");
  const report = await agent(synthPrompt(accepted, TARGET), {
    label: "synth:report",
    phase: "Synthesize",
    schema: reportSchema,
  });

  // ---- Reduce agent counts to top-level stats for health checks ----
  return {
    total: findings.length,
    accepted: accepted.length,
    rejected: findings.length - accepted.length,
    report,
  };
}
```

### Annotations called out

- **`meta.name` == filename.** The runtime matches them; drift breaks resume.
- **`meta.phases` ↔ `phase()`** couple via the title string. A human reading `meta.phases` and a user watching the UI must see the same story.
- **Entry contract:** `args` fallback + string compat + early `return { error }` + `log()`.
- **`parallel` at Survey** because Synthesize needs all dimensions (barrier reason #1).
- **Per-finding `parallel` 2-vote inside a `pipeline` at Verify** — the two votes are independent (neither consumes the other's output), so they run under `parallel`; the outer `pipeline` threads each *finding* (findings need not sync with each other).
- **Dedup here is single-pass** — accepted findings deduped by `location` in one filter pass. The "dedup against the seen *superset*, not just accepted" rule is for **loops** (loop-until-dry), where rejected findings would otherwise recur every round — see `mode-selection-guide.md` §Loop. Don't copy this single-pass block into a loop.
- **Early exit on zero findings** — legitimate barrier use #2.
- **Every finding carries `fix`** — the dedup/apply step stays mechanical.
- **`budget.total` guarded** before any loop reads it.
- **Top-level `reduce`** returns counts the user can sanity-check.

## Reusable shapes

### meta

```js
export const meta = {
  name: "phase-x-do-thing",                       // == filename, kebab-case
  description: "Phase X: <intent> (<data flow: a → b → c>)",
  phases: [
    { title: "Survey", detail: "one agent per <unit> discovers <work>" },
    { title: "Fix",    detail: "one agent per <unit> applies <fix>" },
    { title: "Verify", detail: "adversarial check against <ground truth>" },
  ],
};
```

### agent (the atom)

```js
agent(prompt, {
  label: "kind:short-path",   // e.g. impl:fetch.zig, verify:runtime/server
  phase: "Fix",               // must match a meta.phases title
  schema: { /* JSON schema, see below */ },
  model: "small",            // optional: route low-value stages to a smaller model
  isolation: "worktree",     // optional: when the agent writes files (see below)
});
```

### pipeline (along-item dependency)

```js
await pipeline(
  ITEMS,
  (item) => agent(stage1Prompt(item), { label: `s1:${item}`, phase: "Fix", schema: s1Schema }),
  (prev, item) => agent(stage2Prompt(prev, item), { label: `s2:${item}`, phase: "Verify", schema: s2Schema }),
);
// stage2 receives stage1's return value as `prev`. Items do NOT wait for each other.
```

### parallel (across-item barrier)

```js
const [a, b] = await parallel([
  agent(votePrompt(findings, "correctness"), { label: "vote:corr", phase: "Verify", schema: voteSchema }),
  agent(votePrompt(findings, "security"),    { label: "vote:sec",  phase: "Verify", schema: voteSchema }),
]);
// Resolves only when BOTH complete. Use only when next phase needs ALL results.
```

### schema (tool-call layer, never "return JSON" in the prompt)

```js
// ONE shared finding shape — survey/vote/report all use it, so merge/dedup needs no
// provenance special-casing (kernel §4: parallel branches share one schema to merge cleanly).
const findingSchema = {
  type: "object",
  required: ["location", "severity", "fix"],
  properties: {
    location: { type: "string", description: "absolute path + line range, e.g. src/x.rs:42-58" },
    issue:    { type: "string", description: "what is wrong, one line (optional for survey findings that ARE the issue)" },
    severity: { type: "string", enum: ["must-fix", "should-fix", "nit"] },
    fix:      { type: "string", description: "exact edit instruction a downstream agent can apply mechanically" },
  },
};

const surveySchema = {
  type: "object",
  required: ["findings"],
  properties: {
    findings: { type: "array", items: findingSchema },   // `fix` is the contract for the apply step
  },
};

// Review-style agents return accept (gate) + bugs (feedback).
// bugs use the same findingSchema so dedup/merge across voters needs no special-casing.
const voteSchema = {
  type: "object",
  required: ["accept", "bugs"],
  properties: {
    accept: { type: "boolean", description: "true only if the finding survives adversarial review" },
    bugs:   { type: "array", items: findingSchema },
  },
};

// Terminal synthesize agent returns the artifact + a ranked finding list.
const reportSchema = {
  type: "object",
  required: ["summary", "ranked"],
  properties: {
    summary: { type: "string", description: "one-paragraph consolidated verdict" },
    ranked:  { type: "array", items: findingSchema },
  },
};

// Worktree-patch-return fix agent: returns a patch string for the orchestrator to apply
// (strongest isolation — agents never touch git). See "worktree patch return" below.
const patchSchema = {
  type: "object",
  required: ["patch", "files_edited"],
  properties: {
    patch: { type: "string", description: "stringified unified diff the orchestrator applies via `git apply`" },
    files_edited: { type: "array", items: { type: "string" }, description: "paths the patch touches, for the explicit-path `git add`" },
  },
};
```

### worktree patch return (strongest isolation)

When parallel agents would write the same file, give each its own worktree and have it return a **patch string** — the orchestrator applies patches, agents never touch git.

```js
const patches = await parallel(
  SHARDS.map((shard) =>
    agent(fixPrompt(shard), {
      label: `fix:${shard}`,
      phase: "Fix",
      schema: patchSchema,                 // { patch: "stringified unified diff" }
      isolation: "worktree",              // each agent gets its own worktree + build dir
    })
  )
);
// Orchestrator applies patches transactionally with explicit-path commit:
//   git apply <patch>  then  git add <exact files>  (never  git add -A)
// Disable hooks in isolated runs:  git -c core.hooksPath=/dev/null commit ...
```

## Worked example (the one referenced from SKILL.md)

The full skeleton above *is* the worked example: **codebase audit fan-out → adversarial verify → synthesize**. Its shape:

```
meta.phases = [Survey, Verify, Synthesize]
Survey    : parallel(one agent per dimension: correctness/security/perf/repro)
            → flatten findings, each with executable `fix`
            → early-exit if findings.length === 0 (legitimate barrier use #2)
Verify    : pipeline(findings, per-finding parallel([vote1, vote2])).then(dedup by location)
            → accepted = findings where every vote.accept
Synthesize: single agent reads accepted findings → ranked report
```

Three principles are visible in the shape:
1. `parallel` barrier at Survey — Synthesize needs *all* dimensions (barrier reason #1); early-exit on zero findings (barrier reason #2).
2. Per-finding `parallel` 2-vote inside a `pipeline` — the two votes are independent (neither consumes the other) so they are `parallel`, while each finding threads through as its own `pipeline` item.
3. `fix` on every finding — dedup/apply stays mechanical, closing the adversarial loop.

This is one excellent example; do not clone it verbatim for unrelated tasks. Map your own unit of work, ground truth, and terminal artifact onto the skeleton via `design-procedure.md`.

## Compile-queue skeleton (from Bun `phase-d-build-queue`)

Build errors as the work queue. Survey error → group by file → fix each (NO_BUILD) → 2-vote verify → bugfix → re-survey until green.

```js
// File: phase-d-build-queue.workflow.js
export const meta = {
  name: "phase-d-build-queue",
  description: "Build-error-driven repair: survey → fix per-file (NO_BUILD) → 2-vote verify → repeat until link",
  phases: [
    { title: "Survey", detail: "build → group errors by file, write .err files" },
    { title: "Fix",    detail: "one agent per frontier file, NO build" },
    { title: "Verify", detail: "2-vote spec check on touched fns" },
    { title: "Bugfix", detail: "apply verified bugs" },
  ],
};

const A = typeof args === "string" ? JSON.parse(args) : args || {};
const MAX_ROUNDS = A.max_rounds || 12;
const MAX_FILES_PER_ROUND = A.max_files || 25;

// ── Constraint layers ──
const HARD_RULES = `**HARD RULES:**
Edit ONLY your assigned file. Never git reset/checkout/restore/stash.
**Commit+push with retry:**
\`for i in 1 2 3 4 5; do
  git -c core.hooksPath=/dev/null add -- <exact files> &&
  git -c core.hooksPath=/dev/null commit -q -m "phase-d: <file>: <what>" &&
  git push origin <branch> && break || sleep $((RANDOM%6+1));
done\``;
const NO_BUILD = `**DO NOT run build commands.** Read diagnostic + source only.`;

let seen = {};
let prevTotal = Infinity;

for (let round = 1; round <= MAX_ROUNDS; round++) {
  phase("Survey");
  const survey = await agent(
    `Run build, group errors by file, write .err files to /tmp/diag/`,
    { label: `survey-r${round}`, phase: "Survey", schema: SURVEY_S }
  );
  if (survey.link_ok || survey.total === 0) break;

  // Stuck detection
  if (round > 1 && survey.total >= prevTotal) {
    log(`stuck: ${survey.total} errors — stopping`);
    break;
  }
  prevTotal = survey.total;

  // Frontier: unseen-first, then most-errors-first, capped
  const frontier = survey.by_file
    .filter(f => !seen[f.file] || seen[f.file] < 3)
    .sort((a, b) => (seen[a.file]||0) - (seen[b.file]||0) || b.total - a.total)
    .slice(0, MAX_FILES_PER_ROUND);
  for (const f of frontier) seen[f.file] = (seen[f.file] || 0) + 1;

  phase("Fix");
  await pipeline(frontier,
    // Stage 1: fix (NO_BUILD)
    (f) => agent(`Read /tmp/diag/${f.errfile}, fix. ${HARD_RULES}\n${NO_BUILD}`,
      { label: `fix:${f.file.split("/").pop()}`, phase: "Fix", schema: FIX_S }),
    // Stage 2: 2-vote verify
    (fix, f) => fix?.fns_touched?.length > 0
      ? parallel([0, 1].map(i => () =>
          agent(`Adversarially verify ${f.file}. ${NO_BUILD}`,
            { label: `verify${i}:${f.file.split("/").pop()}`, phase: "Verify", schema: VERIFY_S })
        )).then(votes => {
          const all = votes.filter(Boolean).flatMap(v => v.bugs || []);
          const dedup = []; const k = {};
          for (const b of all) {
            const key = `${b.fn}::${(b.what||"").slice(0,80)}`;
            if (!k[key]) { k[key] = 1; dedup.push(b); }
          }
          return { file: f.file, fix, bugs: dedup };
        })
      : { file: f.file, fix, bugs: [] },
    // Stage 3: bugfix
    (vr, f) => vr.bugs.length > 0
      ? agent(`Apply bugs: ${JSON.stringify(vr.bugs)}. ${HARD_RULES}`,
          { label: `bugfix:${f.file.split("/").pop()}`, phase: "Bugfix", schema: BUGFIX_S })
      : null,
  );
}
```

### Key design points called out

- **Survey agent is the ONLY one that runs build** — all others obey `NO_BUILD`.
- **Frontier priority**: `unseen-first, then most-errors-first` — ensures breadth before depth.
- **Seen tracking**: `seen[f.file]++`, not permanent exclusion (files can be retried at lower priority).
- **Stuck detection**: `survey.total >= prevTotal && round > 1` → early exit.
- **Constraint layers**: `HARD_RULES` and `NO_BUILD` are separate constants, composed into agent prompts.
- **2-vote dedup key**: `${fn}::${what.slice(0,80)}` — composite stable key, not free-text.
- **Git retry**: 5-attempt retry with `sleep $((RANDOM%6+1))` random backoff.

## Constraint-layer composition skeleton

Template for organizing constraints into layers. See `constraint-layers-guide.md` for the full guide.

```js
// ── L0: HARD_RULES — all agents ──
const HARD_RULES = `
**HARD RULES (violation = immediate rejection):**
- NEVER run ${BUILD_CMD} (orchestrator builds once per round).
- NEVER git reset/checkout/restore/stash.
- Edit ONLY files under your assigned domain.
- Commit: \`git -c core.hooksPath=/dev/null add -- <exact paths> && git commit -m "..."\`.
`;

// ── L1: BANS — fix/implement agents ──
const BANS = `
**BANNED PATTERNS:**
- NO ${PATTERN_1}. Instead: ${ALT_1}. Why: ${WHY_1}.
- NO justification comments (PORT NOTE / TODO(port) / SAFETY essays).
`;

// ── L2: TAXONOMY — survey/classify agents ──
const TAXONOMY = `
**Classification (use these EXACT names):**
CAT_A → ${TYPE_A} — ${CRITERION_A}
CAT_B → ${TYPE_B} — ${CRITERION_B}
UNKNOWN → ${DEFAULT} — can't determine from this file alone
`;

// ── L3: CHECKLIST — verify/review agents ──
const CHECKLIST = `
**Verification checklist (default: refuted):**
1. ${CHECK_1} — \`${GREP_1}\` → REJECT.
2. ${CHECK_2} — ${DESC_2}.
**Exemptions:** ${EXEMPT_1}.
**Short-circuit:** If ${STUB}, return accept=true, bugs=[].
`;

// ── Compose per role ──
const fixPrompt = (task) => `${HARD_RULES}\n${NO_BUILD}\n${BANS}\n${task}`;
const verifyPrompt = (task) => `${HARD_RULES}\n${NO_BUILD}\n${CHECKLIST}\n${task}`;
const surveyPrompt = (task) => `${HARD_RULES}\n${task}`;  // survey can build
const classifyPrompt = (task) => `${HARD_RULES}\n${TAXONOMY}\n${task}`;
```
