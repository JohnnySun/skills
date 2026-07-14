---
name: plan-review
description: Use this skill for plan, architecture, product, technical design, or implementation-plan review when the review should improve the artifact through an adversarial, self-terminating convergence loop. Reviewers attack the plan, an independent verifier tries to refute every blocker before it can block, and a hard iteration budget guarantees the loop always terminates with a harness-readable status. Trigger for /plan-review, design review, plan gate, architecture review, UI/UX plan review, or any workflow phase that needs independent reviewers before implementation.
---

# Plan Review

Adversarial review loop for plans and design documents. It gives two guarantees
the naive "review N rounds" pattern cannot:

1. **Blockers are verified, not asserted.** A finding blocks convergence only
   after an independent verifier tried to refute it and failed. Reviewer opinion
   alone never drives another iteration.
2. **The loop always terminates.** Convergence semantics decide *why* it stops;
   the iteration budget guarantees *that* it stops. There is no input that can
   produce an unbounded number of review rounds.

## Core Model

Three harness outcomes:

- `passed`: no verified blockers remain and the profile's final check found no
  new evidence-backed blocker (`light`/`standard`: the focused verification
  sweep or its allowed director self-check; `release-gate`: one held-out
  sweep).
- `continue`: verified, fixable blockers remain; revise and run one more sweep.
- `blocked`: plateaued, oscillating, needs a human decision, lacks required
  evidence, review process is defective, or the iteration budget is exhausted.

## Iteration Budget (hard backstop)

The selected profile fixes the active budget; do not choose it by intuition:

| Profile | Active sweep budget | Held-out sweep |
| --- | ---: | --- |
| `light` | **2** (discovery + focused verification) | None |
| `standard` | **3** total | None |
| `release-gate` | Caller-declared, up to **5** total | At most one |

The hard ceiling is **5** for every profile. The skill must never exceed the
active budget silently and must never treat "no budget given" as "unlimited".
The budget is deliberately tight because this loop is a token furnace when run
naively; see Cost Control below.

Why a hard cap when convergence semantics exist: convergence rules are executed
by a model, and a misread rule or a churny artifact can defeat them. The budget
is the circuit breaker that turns a defective loop into a `blocked` result with
a readable ledger, instead of a 200-round runaway. Hitting the budget is not
failure noise — it returns `blocked` with `reasonCode: "budget_exhausted"` and
the full unresolved ledger, which is itself a useful review result.

Two secondary brakes, checked every iteration:

- **Monotonic progress (carryover)**: from iteration 3 onward, the blockers
  that were already open before the last revision must strictly shrink each
  iteration — a revise step must actually resolve what it claims to address,
  and one that doesn't will not start doing so on round 12. If the carryover
  set fails to shrink, return `blocked` as plateau. Brand-new first-seen
  findings do not count against this rule: a healthy loop that fixes last
  round's blocker while a fresh sweep uncovers a different one is making
  progress, not plateauing. New findings are governed by attribution (the
  `latent_missed` streak, artifact instability) and by the budget.
- **Per-issue cap**: an issue still open after 2 material revision attempts with
  no new fixable evidence is a plateau, not a todo.

## Review Altitude

Treat the reviewed artifact as a **design drawing or harness frame**, not as a
construction checklist. Review only the load-bearing structure: invariants,
cross-layer producer-to-consumer contracts, security surfaces, data lifecycle,
rollback and rollout, and whether the declared scope is internally coherent.

Downgrade construction-level findings such as UI interaction details, copy,
accessibility polish, test-case enumeration, and code style into the
`constructionNotes` appendix. They do not enter the Issue Ledger, drive a
revision, or consume another sweep. Carry them with the later implementation
work order, where surface-specific review, code review, and acceptance gates
can evaluate them at the right altitude.

If a construction concern exposes a missing load-bearing contract, record the
contract gap rather than litigating the implementation detail. For example,
"the plan has no ownership rule for destructive actions" is structural;
"the confirmation button label is unclear" is a construction note.

## Cost Control (run the loop lean)

Adversarial review cost grows as reviewers × sweeps × artifact size. The
guarantees come from verification and attribution — not from re-running every
lane every round. Defaults:

- **Profile `light`**: one merged Engineering lane → one mandatory batched
  verifier → revise → one focused verification check → stop (**2 scheduled
  model jobs** by default). Do not activate D or E merely because the artifact
  touches a user-facing surface. There is no held-out sweep.
- **Profile `standard` (when any selection trigger matches)**: one merged
  Engineering lane + isolated F enumeration → one mandatory batched verifier
  → revise → one **focused verification sweep** → stop when clean (**3–4
  scheduled model jobs**). Split A/B/C only for an unusually large artifact
  whose blast radius spans multiple subsystems. Activate D or E only when UI
  design or product scope is the artifact's core subject. There is no held-out
  sweep.
- **Profile `release-gate` (only when the caller explicitly requests it)**:
  adds at most ONE held-out sweep after convergence. Reserve for
  launch-blocking architecture or irreversible migrations.
- **Final targeted sweep**: when every latest revision is a pure textual
  clarification with no semantic or contract change, the director may perform
  the focused check directly and record `finalSweep: "director-self"`. It
  consumes the logical sweep but schedules no additional model job. Otherwise
  schedule exactly one skeptic job and record `finalSweep: "mini-job"`.
- **Focused verification sweep**: from iteration 2 onward, never re-run the
  full panel fresh. Default to one skeptic job that verifies every open item
  against the revised artifact, plus F's cheap re-diff when F is active. Re-run
  a specialist lane separately only when its open item requires that context.
  Full-panel fresh eyes are the held-out sweep's job, and only the
  release-gate profile buys one.
- **Model tiering**: reviewers run on the cheapest capable workhorse tier;
  only the verifier merits a stronger tier and verifies each iteration's
  blocker candidates in one batch. Point reviewers at rubric files to read
  themselves instead of pasting full rubrics into every prompt.
- **Finding caps**: every reviewer lane returns at most its severity-sorted top
  10 findings. Summarize overflow under `residuals`; it does not disappear and
  does not trigger another sweep.
- **Residuals are a report, not a next round.** When the loop stops
  (converged, budget spent, or plateau), every remaining non-blocking item
  ships in the final report as a residuals list for the owner.
  Minor/suggestion items and REFUTED findings never justify another sweep —
  there is no state in which "one more sweep to be safe" is a valid reason to
  spend one.

### Profile Selection (deterministic)

Honor an explicit `release-gate` request first. Otherwise evaluate every row
before scheduling reviewers. Select `standard` if any of the five triggers is
true; select `light` only when all five are false. Never infer a release gate.

| # | Artifact feature | Result when true |
| ---: | --- | --- |
| 1 | Adds or changes a persistent database, schema, or storage contract | `standard` |
| 2 | Changes a cross-layer producer-to-consumer contract | `standard` |
| 3 | Touches a security surface, including prompt injection, authorization, permissions, or money flows | `standard` |
| 4 | Changes more than one module or independently owned subsystem | `standard` |
| 5 | Designs an irreversible migration or rollout | `standard` |
| - | All five rows are false | `light` |
| - | Caller explicitly requests a release gate | `release-gate` |

Examples: a one-surface copy-layout adjustment with no contract or persistence
change is `light`; a persisted field consumed across a service/client boundary
is `standard` even when the code diff is expected to be small.

## Inputs

1. Plan artifact: inline text or file path.
2. Context summary: problem, constraints, scope, acceptance criteria.
3. Relevant code/document references.
4. For iteration > 1: `originalSurfaceSnapshot`, `currentSurfaceSnapshot`,
   `latestRevisionDiff`.
5. Optional concern list.

## Reviewer Roles

| ID | Role | Focus |
| --- | --- | --- |
| ENG | Engineering | Merged A+B+C: architecture/contracts, completeness/risk, conventions/testability |
| A | Architecture & Feasibility | Architecture, feasibility, API/data contracts, integration, performance |
| B | Completeness & Risk | Requirements, edge cases, security, failures, migration, rollback |
| C | Quality & Conventions | Project conventions, testability, clarity, reuse, maintainability |
| D | UX/UI Design | User journeys, states, design-system compliance, platform parity |
| E | Product & Business Value | MVP scope, priority, business value, success metrics, rollout |
| F | Blind-Spot Reconstruction | Independent coverage enumeration from requirement + codebase, diffed against the plan |

Use ENG instead of separate A/B/C for `light` reviews and ordinary `standard`
reviews. Split A/B/C only when specialist isolation is justified by an
unusually large, multi-subsystem artifact; `release-gate` may use the split
panel. Activate D or E only when UI design or product scope is the artifact's
core subject. F is part of every `standard` and `release-gate` discovery sweep;
its blind reconstruction is what distinguishes those profiles from `light`.
The default `light` shape remains exactly ENG plus verifier. If the caller
explicitly adds F-lite, record the extra job and retain the light cap below.

**Reviewer F is structurally different: it hunts omissions, not defects.**
Every other reviewer reads the plan and attacks what it says; a plan's most
expensive failures are the things it never mentions, and those cannot be found
by reading the plan harder (real-world case study: a 728-line cross-platform
feature shipped with no language-source decision, an unreachable
rejection-reason journey, and no observability — none of which existed as
attackable text). F therefore runs a two-phase protocol: **Phase 1 blind** —
without reading the plan body, enumerate the coverage baseline from the
one-line requirement + codebase (entry-point/journey matrix, cross-layer
producer→consumer contracts, content-language matrix, state machine,
observability, platform parity), grounding every item in a real code location;
**Phase 2 diff** — read the plan and classify each item `covered` / `excluded`
(explicitly out of scope — fine) / `absent`. Grounded `absent` items become
findings. Full rubric in `references/reviewer-prompts.md`.

F's loop mechanics differ from other lanes, by design:

- **Phase 1 runs once, at the discovery sweep**, and the resulting coverage
  baseline is frozen into `attributionEvidence.coverageBaseline`. Later sweeps
  never re-enumerate: F only re-diffs the revised plan against the frozen
  baseline (cheap), and F never receives the revision changelog — the
  changelog would leak what the plan just added and re-anchor the diff.
- **Isolation is mechanical, not behavioral.** Phase 1 must run as an
  isolated subagent whose inputs physically exclude the plan body (one-line
  requirement + acceptance criteria + codebase access only); Phase 2 delivers
  the plan in a second message. Never run F inline in the context that
  authored or revised the plan — that context has already read every line,
  so its "blind" enumeration is fiction. If isolation is unavailable, set
  `blindProtocol: "compromised"` in the output and treat F findings as
  ordinary reviewer findings.
- **F findings do not increment `latentMissedStreak`.** An omission by
  definition existed in the original artifact, so a frozen-baseline item
  surfacing later must not trip the `review_process_defect` brake — that
  brake exists to catch defective sweeps, and F re-diffing a frozen baseline
  is the loop working as designed.

Profile-specific enumeration caps do not weaken the isolation protocol:

- `light` F-lite, when explicitly added, enumerates at most **25** items and
  covers only entry points/journeys and cross-layer contracts.
- `standard` F enumerates at most **40** items. Prioritize dimensions by the
  artifact type and list anything skipped as `unenumeratedDimensions`.
- `release-gate` retains the full F rubric within the hard sweep budget.

Every active F variant preserves mechanical Phase-1 isolation, a frozen
coverage baseline, the Phase-2 diff, and the exemption from
`latentMissedStreak`.

**Reviewer D is not generic.** When D is active, its prompt must require
reading the repo's design-system authority (tokens doc + UI review checklist +
surface-matched UI skills) before reviewing, plus an industry-benchmark UI
skill when available. D's findings must cite the specific design-system rule
violated, and D must run the screen × state matrix check. A plan that touches UI but does
not enumerate its screens and their loading/empty/error states is itself a
major finding. Full rubric in `references/reviewer-prompts.md`.

## Domain Skill Packs

Reviewers judge against knowledge, and this repo already encodes its domain
knowledge as skills. When freezing the review surface, map the plan's domains
to skills and inject them into the matching reviewer's prompt as required
reading. A reviewer without the domain pack produces generic findings that the
verifier will refute; a reviewer with it cites specific rules, which is what
makes findings survive.

Known mappings (scan the session's available-skills list for others — this
table is illustrative, not exhaustive):

Example mapping shape (replace with the target repo's actual skills):

| Plan touches | Reviewer | Required skill pack |
| --- | --- | --- |
| Any UI/UX surface | D | design-system authority doc + UI review checklist skill |
| The product's core domain pipeline | A, B | that domain's framework skill |
| Deployment, release, rollout steps | B, C | the repo's deploy charter + observability gate |
| User-facing message copy | D, E | the repo's user-facing copy rules |

Two rules keep this from bloating the loop: inject a pack only when the plan
actually touches that domain, and when an external-benchmark skill
conflicts with an internal authority (the repo's own design-system doc), the
internal authority wins — the external skill exists to raise the bar, not to
overrule the design system.

## Adversarial Structure

The loop is adversarial in both directions:

- **Reviewers attack the plan.** Their stance is "find the reasons this plan
  fails in production", not "give feedback". A +2 must be earned by a genuine
  failed attack, not granted by default.
- **A verifier attacks the findings.** Every critical/major finding goes to an
  independent skeptic whose only job is to refute it using the plan text and
  context. Verdicts: `CONFIRMED` / `REFUTED` / `NEEDS_DECISION`. Only
  `CONFIRMED` findings become open blockers. `REFUTED` findings are downgraded
  to suggestions with the refutation recorded.

  **Reviewer F coverage findings have their own evidence bar.** An F finding
  is evidenced by its *enumeration source* — a concrete
  entry point, producer→consumer contract pair, journey step, or state
  transition that demonstrably exists in the codebase or requirement. The
  verifier refutes it only by showing the plan covers it, explicitly excludes
  it, or the enumeration source does not exist. "The plan doesn't mention it"
  is the finding itself, never grounds to refute it as vague — the vagueness
  rule exists to kill unsupported opinions, not omission evidence.

Why both sides: attack-only review generates churn — plausible-sounding
blockers that restart the loop forever. Verification-only review goes soft.
Attack plus refutation is what makes "no blockers remain" mean something.

Across every profile preserve the hard budget ceiling, a mandatory independent
verifier, F's isolation protocol whenever F is active, bidirectional
adversarial review, and the convergence semantics. Profiles reduce cost; they
do not weaken those invariants.

Reviewers know their findings will face refutation. This is stated in their
prompt so they front-load evidence instead of padding the finding list.

## Convergence Loop

### 1. Bound Review Surface

Freeze a bounded review surface before the first reviewer runs. A review whose
scope can expand forever cannot converge. The surface includes: exact plan
files/sections under review, the context available to reviewers, active roles,
and explicit out-of-scope areas.

Review the entire bounded artifact, not only new or changed paragraphs.
Reviewers may mark blockers only inside this surface — unrelated documents,
files, tests, or harness behavior stay outside the blocker surface unless
explicitly listed as context. Findings that need external facts or broader
scope become `needs_decision` or `missing_evidence`, never `open`.

**When Reviewer F is active, the codebase is part of the frozen surface** as
coverage-enumeration context: a coverage gap grounded in in-scope code (an
entry point, contract pair, or journey the product demonstrably has) is a gap
*of the plan*, inside the surface — not scope expansion. Only facts about
unrelated systems or genuinely out-of-scope product areas remain
`scope_expansion`.

Store attribution evidence when the surface is frozen:

```json
{
  "attributionEvidence": {
    "originalSurfaceSnapshot": "path, hash, or stored text of the first reviewed surface",
    "currentSurfaceSnapshot": "path, hash, or stored text of the current surface",
    "latestRevisionDiff": "diff or section-level change summary from the previous iteration"
  }
}
```

These must allow a later comparison of original vs current vs latest change. A
prose changelog alone cannot classify whether a late blocker was introduced by
a revision or missed from the start.

### 2. Intake Checkpoint (before the first sweep)

Scan the context summary for gaps that would predictably prevent convergence.
They come in two classes with different handling:

- **Reviewability gaps** — missing acceptance criteria, undefined target
  platforms, ambiguous scope words ("optimize", "improve") with no measurable
  target. These only need *a* defensible answer for review to proceed.
- **Deferred decisions** — product, pricing, revenue-share, access-gating,
  legal, security-posture, or release choices the plan explicitly leaves
  undecided. These need *the owner's* answer; a review must never supply it.

Handling:

- **Interactive session**: batch both classes into one ask, at most 3
  questions (use AskUserQuestion when available). Fold answers into the
  context summary.
- **Headless/harness run**: do not wait for a human. Write each
  *reviewability gap* into the surface as an explicit `ASSUMPTION:` line and
  proceed — reviewers treat stated assumptions as given, so ambiguity cannot
  re-enter as oscillating findings. For each *deferred decision*, seed the
  ledger with a `needs_decision` item instead. Do not invent an assumption
  for a choice that moves money, access, legal exposure, or release posture:
  a loop that assumes "10% platform cut" can silently pass a plan no human
  approved. Review everything else normally; the loop's terminal state cannot
  be `passed` while `needs_decision` items remain — it exits `blocked` with
  the exact decision list (see Decision Checkpoint).

This is the only checkpoint before the loop. Never pause mid-sweep to ask
about an individual finding — that converts the convergence loop into an
unbounded conversation.

### 3. Discovery Sweep

Fresh full sweep. Each active reviewer receives only: the current plan
artifact, the context summary, its role rubric from
`references/reviewer-prompts.md`, and the JSON output format from
`references/scoring-rubric.md`. They review the whole artifact and must cite
evidence: section names, file paths, contracts, contradictions. Findings
without evidence are suggestions, not blocker candidates.

### 4. Verify Findings

Send all critical/major findings to the verifier (prompt in
`references/reviewer-prompts.md`). The verifier gets the plan, the context
summary, and the findings — not the reviewer's reasoning or score. For each
finding it must attempt a refutation and return `CONFIRMED`, `REFUTED`
(with the refuting evidence), or `NEEDS_DECISION` (valid concern, but the
answer is a product/human choice). When evidence is thin, refute — the cost of
a wrongly-dropped blocker is one missed comment; the cost of a wrongly-kept one
is a whole extra loop iteration.

### 5. Issue Ledger

Normalize verified findings into the Issue Ledger — the loop's only memory.
Never feed previous review prose into later reviewers.

```json
{
  "dedupeKey": "stable lowercase key",
  "severity": "critical|major|minor|suggestion",
  "status": "open|resolved|wontfix|needs_decision|missing_evidence|refuted|stale",
  "verification": "confirmed|refuted|needs_decision|not_required",
  "reviewer": "ENG|A|B|C|D|E|F",
  "firstSeenIteration": 1,
  "lastSeenIteration": 1,
  "materialRevisionAttempts": 0,
  "novelIssueSource": "none|revision_introduced|latent_missed|scope_expansion|unsupported",
  "evidence": "specific section/file/contract evidence",
  "finding": "what is wrong",
  "recommendation": "specific fix",
  "disposition": "why it is open/resolved/refuted/non-blocking"
}
```

Only `status: open` items with `verification: confirmed` and severity
critical/major are blockers. Minor and suggestion items never block, never
drive another iteration, and are reported at the end.

### 6. Revise

Before editing, the main agent must emit a `scopeDelta` against the frozen
surface:

```json
{
  "scopeDelta": {
    "persistedState": [],
    "externalSideEffects": [],
    "permissions": [],
    "publicAPIs": [],
    "lifecycleOwners": [],
    "targetPlatforms": []
  }
}
```

Each array lists responsibilities added or removed by the proposed revision.
An empty delta means the change only completes an already-frozen schema,
negative case, or error semantic. A non-empty added responsibility is not
automatically justified by a reviewer's recommendation. The agent must point
to the exact original acceptance item that already owns it. If it cannot, mark
the finding `needs_decision` or create deferred work; do not revise the current
artifact to absorb the new subsystem.

This is especially important when a narrow acceptance such as "the skill is
discoverable in every client and reinstall is idempotent" attracts a proposed
persistent installer transaction, migration database, fsync protocol, or new
cross-client owner. Those may be worthwhile designs, but they are a new review
surface rather than a repair to the current one.

After this boundary check, the main agent revises the plan. Produce a changelog
mapping every addressed blocker to a concrete change (format in
`references/scoring-rubric.md`) and include the `scopeDelta` disposition. Do
not broaden scope while revising unless the frozen acceptance boundary already
requires it or the owner explicitly approves a new surface. Increment
`materialRevisionAttempts` only when the change could plausibly resolve that
item.

### 7. Verification Sweep (focused)

Next iteration is a **focused sweep**, not a full-panel re-run (see Cost
Control). Schedule one skeptic by default to verify all open ledger items and
check the changed semantics for revision-introduced regressions; include F's
re-diff against its frozen baseline when F is active. Give the skeptic the
revised artifact, Issue Ledger statuses, revision changelog,
attributionEvidence, context summary, and relevant rubric. Re-run a specialist
lane only when an item cannot be assessed without that lane's context. New
critical/major findings still go through the verifier before entering the
ledger. Full-panel fresh coverage is reserved for a requested release gate.

Inspect the latest revision diff before scheduling the final targeted check.
When every change is a pure textual clarification and none changes semantics
or a contract, let the director perform the check and record
`finalSweep: "director-self"`. Otherwise schedule exactly one mini skeptic job
and record `finalSweep: "mini-job"`.

### 8. Attribute Late Findings

After discovery plus one verification sweep, every new confirmed critical/major
finding must be attributed from `attributionEvidence` (not reviewer memory)
before it affects convergence:

| `novelIssueSource` | Meaning | Gate behavior |
| --- | --- | --- |
| `revision_introduced` | Latest revision created it | Normal open blocker; reset `latentMissedStreak` — this is artifact quality, not a review miss |
| `latent_missed` | Existed in the original surface; earlier sweeps missed it | Open blocker; increment `latentMissedStreak`. Streak ≥ 2 across consecutive sweeps → `blocked` with `review_process_defect` — fix the review surface/rubric, don't revise the artifact forever |
| `scope_expansion` | Needs facts outside the frozen surface | Not `open` in this loop; `blocked` with `needs_decision`/`missing_evidence`, or restart with a new surface |
| `unsupported` | No concrete evidence | Minor/suggestion; never blocks |

Attribution note for Reviewer F: a coverage finding grounded in in-scope
codebase is classified by the surface rule above — it is latent artifact
incompleteness (open blocker), not `scope_expansion`, and it is exempt from
the `latentMissedStreak` counter (see Reviewer F mechanics).

If revisions keep introducing *different* `revision_introduced` blockers in the
same section after material fixes, that is artifact instability — `blocked`,
not more loops. If `attributionEvidence` is missing, return `blocked` with
`missing_evidence` instead of guessing.

### 9. Decision Checkpoint

When the ledger holds `needs_decision` items and no open fixable blockers
remain:

- **Interactive session**: batch all decision items into one question set for
  the user (AskUserQuestion, one call). Fold answers into the context summary
  and continue the loop with the budget unchanged.
- **Headless/harness run**: return `blocked` with `reasonCode:
  "needs_decision"` and the exact decision list.

Ask once per loop at most. If decisions remain unanswered, that is `blocked`,
not a re-ask.

### 10. Held-Out Sweep (release-gate profile only)

Under `light` and `standard` there is no held-out sweep: when no open blockers
remain after the focused verification sweep, the loop is converged — `passed`,
with residuals reported.

Under `release-gate`, run at most ONE held-out sweep before `passed`: a fresh
reviewer set receives only the final plan, context summary, and acceptance
criteria — no ledger, no changelog. When F was active, the held-out set
includes a fresh F running the full two-phase protocol (Phase 1: one-line
requirement, acceptance criteria, codebase; Phase 2: the final plan) — the
final gate must include fresh eyes on omissions, not only on stated text.
Held-out critical/major findings still go through the verifier.

- No confirmed blockers → converged, `passed`. Minor/suggestion findings are
  recorded as non-blocking notes; they do not reopen the loop.
- A confirmed blocker → revise once, send the fix through the verifier for
  that item only, then stop: `passed` if the ledger is clean, otherwise
  `blocked` with the ledger. There is never a second held-out sweep — a plan
  that keeps failing fresh eyes needs a human, not another sweep.

### 11. Stop Conditions

Return `blocked` when any of these holds:

- Iteration budget exhausted (`budget_exhausted`).
- Carryover blockers (open before the last revision) did not strictly shrink
  across consecutive iterations from iteration 3 onward (plateau).
- Same blocker open after 2 material revisions with no new fixable evidence.
- Reviewers oscillate between incompatible requirements not resolvable by
  technical evidence.
- Remaining blockers need a product/legal/security/release decision
  (headless), or the user left decision questions unanswered.
- Required code, data, or requirements are missing (`missing_evidence`).
- `latentMissedStreak >= 2` (`review_process_defect`).
- Revisions repeatedly introduce new critical/major blockers in the same
  section (artifact instability).
- The held-out sweep's confirmed blocker survived the post-revision
  re-verification (release-gate profile).

When blocked, include unresolved ledger items, attempted changes, and the
specific decision or evidence needed to resume.

## Gate Logic

| Condition | harnessStatus | Next action |
| --- | --- | --- |
| Confirmed open critical/major blockers, fixable, budget remains | `continue` | Revise, focused verification sweep |
| Finding refuted by verifier | no change | Downgrade to suggestion, record refutation |
| `needs_decision` items, interactive | `continue` | Decision checkpoint (one batched ask) |
| `needs_decision` items, headless or already asked | `blocked` | Stop with decision list |
| `latentMissedStreak >= 2` | `blocked` | Stop with `review_process_defect` |
| No open blockers, `light` profile | `passed` | Stop after focused verification; report residuals |
| No open blockers, `standard` profile | `passed` | Stop after focused verification; report residuals |
| No open blockers, `release-gate` profile, held-out not yet run | `continue` | Held-out sweep (max 1) |
| No confirmed blockers after held-out | `passed` | Stop |
| Budget exhausted / plateau / oscillation / instability / unresolved held-out blocker | `blocked` | Stop with unresolved ledger |

Review scores are reviewer opinions. The verified Issue Ledger is the
convergence state.

## Harness Output Contract

Every iteration ends with one JSON block:

```json
{
  "schemaVersion": "harness.review-loop.v3",
  "reviewType": "plan",
  "iteration": 3,
  "budget": {"maxSweeps": 3, "sweepsUsed": 2, "profile": "standard"},
  "finalSweep": "director-self|mini-job|held-out|not-run",
  "cost": {
    "jobs": 4,
    "wallClockMinutes": 18,
    "byStage": {
      "discovery": {"jobs": 2, "wallClockMinutes": 9},
      "verification": {"jobs": 1, "wallClockMinutes": 6},
      "finalSweep": {"jobs": 1, "wallClockMinutes": 3}
    }
  },
  "harnessStatus": "continue|passed|blocked",
  "reason": "short reason for the status",
  "reasonCode": "open_blockers|held_out_required|converged|plateau|oscillation|artifact_instability|missing_evidence|needs_decision|review_process_defect|reviewer_failure|budget_exhausted",
  "activeReviewers": ["ENG", "F"],
  "surfaceId": "stable hash or short name for the bounded review surface",
  "scores": {"ENG": 1, "F": 1},
  "convergence": {
    "openBlockers": 1,
    "confirmedFindings": 3,
    "refutedFindings": 2,
    "unresolvedDecisionItems": 0,
    "unresolvedEvidenceItems": 0,
    "newBlockers": 0,
    "reopenedBlockers": 0,
    "latentMissedStreak": 0,
    "novelIssuesBySource": {
      "revision_introduced": 0,
      "latent_missed": 0,
      "scope_expansion": 0,
      "unsupported": 0
    },
    "maxMaterialRevisionAttempts": 1,
    "heldOutSweepsUsed": 0,
    "plateauDetected": false,
    "reviewProcessDefect": false
  },
  "userCheckpoints": {
    "intakeAsked": false,
    "decisionAsked": false,
    "recordedAssumptions": []
  },
  "attributionEvidence": {
    "originalSurfaceSnapshot": "<path-or-hash-or-artifact-id>",
    "currentSurfaceSnapshot": "<path-or-hash-or-artifact-id>",
    "latestRevisionDiff": "<path-or-hash-or-artifact-id>"
  },
  "ledger": [],
  "constructionNotes": [],
  "residuals": [],
  "nextAction": {
    "type": "revise|focused_verification|director_self_check|held_out_sweep|ask_user|stop",
    "summary": "what the harness should do next"
  }
}
```

The harness stores this JSON as the Cell result and uses it to schedule (or
not schedule) the next iteration. `cost` is required on every iteration:
`jobs` counts scheduled model jobs, `wallClockMinutes` records elapsed wall
clock time, and `byStage` accounts for both by lifecycle stage. A
`director-self` final sweep records zero jobs for that stage while still
consuming the logical focused-verification sweep. `constructionNotes` and
`residuals` are required arrays; either may be empty.

## Failure Handling

- Retry a failed reviewer once with the same artifact and role.
- If it still fails, mark the role as a coverage gap and continue only if
  fewer than half of active reviewers failed; otherwise return `blocked` with
  `reviewer_failure`.
- Verifier failure: retry once; if it still fails, treat the affected findings
  as `needs_decision` rather than silently confirming or dropping them.
- JSON parse failure is a reviewer failure (fallback layers in
  `references/scoring-rubric.md`).

## References

- `references/reviewer-prompts.md`: role rubrics, adversarial preamble,
  verifier prompt, Reviewer D UI rubric.
- `references/scoring-rubric.md`: scoring, severity, verification verdicts,
  JSON parsing.
- `references/report-template.md`: final report format.

## Eval Seeds

When improving this skill with Skill Creator, build eval seeds covering:
termination under churn, adversarial refutation of weak findings, checkpoint
batching, missed-blocker discovery, anti-anchoring, held-out convergence, and
plateau exit. Include deterministic profile-selection and review-altitude
downgrade seeds whenever those contracts change.
