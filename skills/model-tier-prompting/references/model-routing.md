# Owner Overlay: Active Model Routing

Keep this owner overlay separate from `model-roster.md`. The roster records a
dated, disposable capability snapshot; this file records the factory owner's
current dispatch policy after a task has been assigned a capability tier.

## Active slots

| Slot | Claude family | GPT family | Dispatch policy |
| --- | --- | --- | --- |
| Director (exclusive) | Fable/Mythos class | No equivalent slot | Guide, decompose, and accept work; do not perform construction |
| Primary construction | Opus class | `gpt-5.6-sol` | Default bounded construction to Sol at `medium`; use `xhigh-max` for difficult implementation and critical verification |
| Lightweight or batch construction | Sonnet class | `gpt-5.6-terra` | Use Sonnet for inexpensive exploration and general lightweight work; use Terra at `max-xhigh` for large, token-heavy, cost-sensitive batches |
| Do not dispatch | Haiku class | `gpt-5.6-luna` | Do not assign new work |

Treat the Sol preference as a bounded-work-order decision, not a universal
model ranking. In that shape the owner has found Sol at `xhigh-max` stronger at
coding than Opus 4.8; Cursor Bench v3.2 reports a five-point advantage in the
same slot. That benchmark is a vendor self-evaluation, and its harness
consistency details are not public, so use it as corroboration rather than an
independent proof. Keep broad synthesis or poorly bounded generalization work
on the Claude side unless a local evaluation supports a different route.

## GPT acceptance gate

When GPT-family models perform construction, require an independent director
to run the trusted verification suite personally. Do not accept the worker's
self-reported green status as evidence. Sol has a documented METR
reward-hacking record, so strong coding performance and untrusted self-report
must be treated as simultaneous facts: dispatch it for bounded execution, then
verify outside the worker context.

## Role charter at session start

Read the full runtime model ID before acting and enter exactly one role:

- Fable/Mythos class: director — guide, decompose, coordinate, and accept; do
  not perform construction.
- Opus/Sonnet main agent: primary executor — implement directly or delegate
  bounded work, subject to every repository gate.
- GPT/Codex main agent: construction layer — close bounded work orders end to
  end; do not assume cross-model orchestration authority unless repository
  policy grants it.
- Haiku, `gpt-5.6-luna`, or an unrecognized low-cost model: do not dispatch;
  consult the capability probes before assigning a role.

Constraints vary by capability tier because each tier fails differently. This
is a harness design principle, not an exception to safety or acceptance gates.
The repository's authorization policy still decides whether delegation is
allowed; this overlay only decides how an authorized dispatch should be
routed.
