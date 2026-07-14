# Final Review Report Template

Use this template when generating the consolidated review report after the loop returns `passed` or `blocked`.

## Template

```markdown
# Plan Review Report

## Summary

| Reviewer | Role | Score | Verdict |
|----------|------|-------|---------|
| ENG | Engineering (merged A+B+C; when active) | +N | APPROVE |
| A | Architecture & Feasibility | +N | APPROVE |
| B | Completeness & Risk | +N | APPROVE |
| C | Quality & Conventions | +N | APPROVE |
| D | UX/UI Design | +N | APPROVE |
| E | Product & Business Value | +N | APPROVE |
| F | Blind-Spot Reconstruction | +N | APPROVE |

> Include only active reviewer rows. Use ENG instead of A/B/C when the merged
> Engineering lane ran.

**Overall Result**: APPROVED / APPROVED WITH NOTES / BLOCKED
**Profile**: light / standard / release-gate
**Review Iterations**: N (budget: N/N sweeps used)
**Final Sweep**: director-self / mini-job / held-out / not-run
**Cost**: N jobs · N wall-clock minutes · by stage: discovery N jobs/N min; verification N jobs/N min; final sweep N jobs/N min
**Harness Status**: passed / blocked
**Active Reviewers**: N (list active roles and deactivated reviewers with reason)
**Findings**: N confirmed / N refuted / N needs-decision / N residuals / N construction notes
**User Checkpoints**: intake asked yes/no · decisions asked yes/no · assumptions recorded: [list or none]

## Key Strengths

Consolidated from all reviewers:
- [Strength 1]
- [Strength 2]
- ...

## Non-blocking Suggestions (+1 comments)

Items from +1 reviewers that the author should consider (not required):

### From Reviewer X
- [Suggestion with recommendation]

### From Reviewer Y
- [Suggestion with recommendation]

## Construction Notes

Implementation-level observations carried to the later work order. These did
not enter the Issue Ledger or drive review iterations:

- [UI/copy/accessibility/test-enumeration/style note]

## Refuted Findings (if any)

Blocker candidates the verifier refuted — kept for transparency, none block:

| Reviewer | Original Severity | Finding | Refutation |
|----------|-------------------|---------|------------|
| [X] | major | [claim] | [quoted plan text or surface rule that refuted it] |

## Disputed Items (if any)

Items where reviewers significantly disagreed:

| Item | Reviewer A Opinion | Reviewer B Opinion | Resolution |
|------|-------------------|-------------------|------------|
| [Topic] | [View] | [View] | Needs human decision / Technical wins / UX wins |

## Coverage Gaps (if degraded mode)

> Only include this section if any reviewer was unavailable (failure/deactivation).

| Missing Reviewer | Role | Unreviewed Dimensions |
|-----------------|------|----------------------|
| [Reviewer] | [Role] | [What was not evaluated] |

## Revision History (if multiple iterations)

### Iteration 1 -> Iteration 2
| Reviewer | R1 Score | R2 Score | Key Changes |
|----------|----------|----------|-------------|
| A | +N | +N | [summary] |
| B | -N | +N | [summary of what was fixed] |
| ... | | | |

**Changelog**: [Summary of revisions made between iterations]

### Iteration 2 -> Iteration 3 (if applicable)
[Same format]

## Final Recommendation

[1-2 paragraph synthesized recommendation based on all reviewer feedback. Note any areas that deserve extra attention during implementation.]
```

## Usage Notes

- **APPROVED**: The loop returned `passed` with no open blockers after the
  profile's required final check (focused verification/director self-check for
  `light` or `standard`; held-out sweep for `release-gate`).
- **APPROVED WITH NOTES**: The loop returned `passed` and only non-blocking suggestions remain.
- **BLOCKED**: The loop returned `blocked` because of plateau, oscillation, missing evidence, external budget, or a required decision. Include an "Unresolved Issues" section:

```markdown
## Unresolved Issues (BLOCKED)

> This review did not converge automatically. The following issues remain:

| # | Reviewer | Severity | Source | Issue | Author Response |
|---|----------|----------|--------|-------|-----------------|
| 1 | B | major | revision_introduced / latent_missed / needs_decision / missing_evidence | [Issue description] | [Author's rationale for not addressing] |
| 2 | D | major | revision_introduced / latent_missed / needs_decision / missing_evidence | [Issue description] | [Author's rationale] |

**Decision Required**: Review the unresolved issues above and provide the missing decision, evidence, or scope change before resuming the loop.
```

- Intermediate review reports from earlier iterations are NOT included in the final output — only the consolidated final report is presented to the user.
- The review report does NOT authorize implementation — explicit user instruction is required to proceed.
